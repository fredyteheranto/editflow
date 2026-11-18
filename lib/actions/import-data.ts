"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization, resolveActivePeriod } from "@/lib/period/resolve";

export interface ImportRow {
  cliente: string;
  video?: string;
  inicio?: string | null;
  entrega?: string | null;
}

export type ImportResult =
  | { ok: true; clientesCreados: number; clientesActivados: number; videosCreados: number }
  | { ok: false; error: string };

// Intenta convertir un valor del sheet (string o número serial de Excel) a
// una fecha YYYY-MM-DD. Devuelve null si no se puede interpretar.
function parseFecha(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const s = String(valor).trim();
  if (!s) return null;

  // Número serial de Excel (días desde 1899-12-30).
  if (/^\d{4,6}$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }

  // ISO ya listo.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY o DD-MM-YYYY.
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    let anio = m[3];
    if (anio.length === 2) anio = `20${anio}`;
    return `${anio}-${mes}-${dia}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Importa clientes y videos desde las filas de un Google Sheet / Excel ya
 * mapeadas en el navegador. Crea los clientes que no existan (y los activa en
 * el mes abierto) y registra sus videos en monitoreo. Solo owner/admin.
 */
export async function importarDatos(rows: ImportRow[]): Promise<ImportResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede importar datos." };
  }
  const activePeriod = await resolveActivePeriod(org.id);
  if (!activePeriod) {
    return { ok: false, error: "Abre un mes antes de importar (no hay periodo activo)." };
  }
  if (!rows || rows.length === 0) {
    return { ok: false, error: "El archivo no tiene filas para importar." };
  }

  const supabase = await createClient();

  // Clientes ya existentes en la organización, por nombre.
  const { data: existentes } = await supabase
    .from("clients")
    .select("id, name")
    .eq("organization_id", org.id);
  const idPorNombre = new Map((existentes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

  const nombresClientes = Array.from(
    new Set(rows.map((r) => r.cliente?.trim()).filter((n): n is string => Boolean(n))),
  );

  // Batch insert de clientes nuevos (1 sola consulta en vez de N consultas en ciclo).
  const clientesFaltantes = nombresClientes.filter((nombre) => !idPorNombre.has(nombre.toLowerCase()));
  let clientesCreados = 0;

  if (clientesFaltantes.length > 0) {
    const { data: nuevos, error: clientesErr } = await supabase
      .from("clients")
      .insert(clientesFaltantes.map((name) => ({ organization_id: org.id, name })))
      .select("id, name");

    if (clientesErr) {
      return { ok: false, error: clientesErr.message };
    }
    for (const c of nuevos ?? []) {
      idPorNombre.set(c.name.trim().toLowerCase(), c.id);
      clientesCreados += 1;
    }
  }

  // Batch upsert en client_periods (1 sola consulta para activar todos).
  const periodRows = nombresClientes
    .map((nombre) => idPorNombre.get(nombre.toLowerCase()))
    .filter((clientId): clientId is string => Boolean(clientId))
    .map((client_id) => ({
      organization_id: org.id,
      period_id: activePeriod.id,
      client_id,
      active: true,
      monthly_goal: 0,
      strategist: "Productora",
    }));

  let clientesActivados = 0;
  if (periodRows.length > 0) {
    const { error: cpError } = await supabase
      .from("client_periods")
      .upsert(periodRows, { onConflict: "period_id,client_id" });
    if (!cpError) clientesActivados = periodRows.length;
  }

  // Videos.
  const videos = rows
    .filter((r) => r.video?.trim() && r.cliente?.trim())
    .map((r) => {
      const clientId = idPorNombre.get(r.cliente.trim().toLowerCase());
      if (!clientId) return null;
      return {
        organization_id: org.id,
        period_id: activePeriod.id,
        client_id: clientId,
        title: r.video!.trim(),
        start_date: parseFecha(r.inicio),
        due_date: parseFecha(r.entrega),
        priority: "media" as const,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  let videosCreados = 0;
  if (videos.length > 0) {
    const { data: ins, error } = await supabase.from("videos").insert(videos).select("id");
    if (error) return { ok: false, error: error.message };
    videosCreados = ins?.length ?? 0;
  }

  revalidatePath("/app/clientes");
  revalidatePath("/app/monitoreo");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/metricas");

  return { ok: true, clientesCreados, clientesActivados, videosCreados };
}
