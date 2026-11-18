import { createClient } from "@/lib/supabase/server";
import { requireModuleAccess, resolveActivePeriod } from "@/lib/period/resolve";
import { MonitoreoClient } from "@/components/app/monitoreo/monitoreo-client";

export default async function MonitoreoPage() {
  const { organization: org } = await requireModuleAccess("monitoreo");
  const activePeriod = await resolveActivePeriod(org.id);
  const supabase = await createClient();

  const [
    { data: videos, error: videosError },
    { data: clientPeriods, error: clientPeriodsError },
    { data: miembros, error: miembrosError },
  ] = await Promise.all([
    activePeriod
      ? supabase
          .from("videos")
          .select(
            "id, seq, title, client_id, editor_id, start_date, due_date, status, priority, progreso, progreso_inicio, progreso_actualizado, processed_link, clients(name)",
          )
          .eq("period_id", activePeriod.id)
          .order("seq", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    activePeriod
      ? supabase
          .from("client_periods")
          .select("client_id, clients(id, name)")
          .eq("period_id", activePeriod.id)
          .eq("active", true)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("memberships")
      .select("id, full_name, email, role")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
  ]);

  // Si una consulta falla (ej. desfase de esquema entre las migraciones y la
  // base desplegada), Supabase devuelve data: null y la página mostraría una
  // tabla vacía sin pista alguna. Lo dejamos en el log del servidor para que
  // un problema de datos no se vea como "simplemente no hay nada".
  for (const [label, error] of [
    ["videos", videosError],
    ["client_periods", clientPeriodsError],
    ["memberships", miembrosError],
  ] as const) {
    if (error) console.error(`[monitoreo] fallo al consultar ${label}:`, error.message);
  }

  const clientes = (clientPeriods ?? [])
    .map((cp) => cp.clients as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const videosNormalizados = (videos ?? []).map((v) => ({
    ...v,
    clients: v.clients as unknown as { name: string } | null,
  }));

  return (
    <MonitoreoClient
      periodId={activePeriod?.id ?? null}
      periodLabel={activePeriod?.label ?? null}
      videos={videosNormalizados}
      clientes={clientes}
      miembros={miembros ?? []}
      role={org.role}
    />
  );
}
