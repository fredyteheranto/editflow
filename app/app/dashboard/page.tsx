import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  LineChart,
  Plus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModuleAccess, resolveActivePeriod } from "@/lib/period/resolve";
import { Button } from "@/components/ui/button";
import { ImportSheet } from "@/components/dashboard/import-sheet";
import { GoogleErrorAlert } from "@/components/shared/google-error-alert";
import { formatDateEs } from "@/lib/utils/dates";
import type { AppModuleKey } from "@/lib/platform/types";

interface KpiCard {
  key: string;
  label: string;
  suffix?: string;
  danger?: boolean;
}

const KPI_CARDS: KpiCard[] = [
  { key: "clientes_activos", label: "Clientes activos" },
  { key: "meta_total", label: "Meta total del mes" },
  { key: "total_videos", label: "Videos registrados" },
  { key: "entregados", label: "Entregados" },
  { key: "en_edicion", label: "En edición" },
  { key: "en_revision", label: "En revisión" },
  { key: "atrasados", label: "Atrasados", danger: true },
  { key: "cumplimiento_global", label: "% Cumplimiento", suffix: "%" },
];

const MODULOS: {
  key: AppModuleKey;
  href: string;
  label: string;
  icon: typeof Users;
  desc: string;
}[] = [
  { key: "clientes", href: "/app/clientes", label: "Clientes", icon: Users, desc: "clientes activos este mes" },
  { key: "monitoreo", href: "/app/monitoreo", label: "Monitoreo", icon: ClipboardList, desc: "videos en curso" },
  { key: "calendario", href: "/app/calendario", label: "Calendario", icon: CalendarDays, desc: "próximo evento" },
  { key: "metricas", href: "/app/metricas", label: "Métricas", icon: LineChart, desc: "cumplimiento del mes" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string; google_error_detail?: string }>;
}) {
  const [{ google_error: googleError, google_error_detail: googleErrorDetail }, { organization, permissions }] =
    await Promise.all([searchParams, requireModuleAccess("dashboard")]);
  const puedeGestionar = organization.role === "owner" || organization.role === "admin";
  const canUseMonitoreo = permissions.modules.includes("monitoreo");
  const visibleModules = MODULOS.filter((m) => permissions.modules.includes(m.key));
  const activePeriod = await resolveActivePeriod(organization.id);
  const supabase = await createClient();

  const [
    { data: kpis, error: kpisError },
    { data: proximosEventos, error: proximosEventosError },
    { data: videosAtrasados, error: videosAtrasadosError },
  ] = await Promise.all([
    activePeriod
      ? supabase.from("v_period_kpis").select("*").eq("period_id", activePeriod.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    activePeriod
      ? supabase
          .from("calendar_events")
          .select("id, title, start_at")
          .eq("period_id", activePeriod.id)
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: null, error: null }),
    activePeriod
      ? supabase
          .from("videos")
          .select("id, title, due_date, client_id, clients(name)")
          .eq("period_id", activePeriod.id)
          .lt("due_date", new Date().toISOString().slice(0, 10))
          .not("status", "in", "(aprobado,entregado,cancelado)")
          .order("due_date", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Un fallo de consulta (ej. desfase de esquema) dejaría el dashboard en
  // ceros sin pista — lo registramos en el log del servidor.
  for (const [label, error] of [
    ["v_period_kpis", kpisError],
    ["calendar_events", proximosEventosError],
    ["videos", videosAtrasadosError],
  ] as const) {
    if (error) console.error(`[dashboard] fallo al consultar ${label}:`, error.message);
  }

  return (
    <div className="space-y-6">
      <GoogleErrorAlert error={googleError} detail={googleErrorDetail} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="text-sm text-muted-foreground">
            {activePeriod ? activePeriod.label : "Sin periodo activo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {puedeGestionar && <ImportSheet />}
          {canUseMonitoreo && (
            <Button asChild>
              <Link href="/app/monitoreo?nuevo=1">
                <Plus className="size-4" />
                Nuevo video
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {KPI_CARDS.map(({ key, label, suffix, danger }) => {
          const raw = kpis?.[key as keyof typeof kpis];
          const value = typeof raw === "number" ? raw : 0;
          return (
            <div key={key} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${
                  danger && value > 0 ? "text-danger" : ""
                }`}
              >
                {value}
                {suffix ?? ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {visibleModules.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
            >
              <Icon className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">{label}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Entregas de esta semana</h3>
            <div className="mt-3 space-y-2">
              {proximosEventos && proximosEventos.length > 0 ? (
                proximosEventos.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{event.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateEs(event.start_at.slice(0, 10))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="size-4 text-danger" />
              Alertas
            </h3>
            <div className="mt-3 space-y-2">
              {videosAtrasados && videosAtrasados.length > 0 ? (
                videosAtrasados.map((video) => (
                  <div key={video.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{video.title}</span>
                    <span className="shrink-0 text-xs text-danger">
                      {formatDateEs(video.due_date)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin videos atrasados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
