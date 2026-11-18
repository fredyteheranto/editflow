import { createClient } from "@/lib/supabase/server";
import { requireModuleAccess, resolveActivePeriod } from "@/lib/period/resolve";
import { MetricasClient } from "@/components/app/metricas/metricas-client";

export default async function MetricasPage() {
  const { organization: org } = await requireModuleAccess("metricas");
  const activePeriod = await resolveActivePeriod(org.id);
  const supabase = await createClient();

  const [{ data: clientSeries }, { data: editorSeries }, { data: clientes }, { data: miembros }, { data: videosVivo }] =
    await Promise.all([
      supabase
        .from("v_client_month_series")
        .select("*")
        .eq("organization_id", org.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true }),
      supabase
        .from("v_editor_month_series")
        .select("*")
        .eq("organization_id", org.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true }),
      supabase.from("clients").select("id, name").eq("organization_id", org.id).order("name"),
      supabase
        .from("memberships")
        .select("id, full_name, email, role")
        .eq("organization_id", org.id)
        .eq("active", true)
        .order("full_name"),
      activePeriod
        ? supabase
            .from("videos")
            .select(
              "id, seq, title, status, progreso, progreso_inicio, edicion_segundos, editor_id, due_date, clients(name)",
            )
            .eq("period_id", activePeriod.id)
            .order("seq", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

  const videosEnVivo = (videosVivo ?? []).map((v) => ({
    id: v.id,
    seq: v.seq,
    title: v.title,
    status: v.status,
    progreso: v.progreso,
    progreso_inicio: v.progreso_inicio,
    edicion_segundos: v.edicion_segundos,
    editor_id: v.editor_id,
    due_date: v.due_date,
    clientName: (v.clients as unknown as { name: string } | null)?.name ?? "—",
  }));

  return (
    <MetricasClient
      clientSeries={clientSeries ?? []}
      editorSeries={editorSeries ?? []}
      clientes={clientes ?? []}
      miembros={miembros ?? []}
      videosEnVivo={videosEnVivo}
      periodLabel={activePeriod?.label ?? null}
    />
  );
}
