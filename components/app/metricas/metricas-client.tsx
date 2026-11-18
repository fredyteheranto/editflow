"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberRole } from "@/types/database.types";

const TODOS = "__todos__";
const MUTED_COLOR = "var(--muted-foreground)";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

interface ClientMonthRow {
  client_id: string;
  cliente: string;
  periodo: string;
  month_key: string;
  meta_mensual: number;
  finalizados: number;
  porcentaje_alcance_meta: number | null;
}

interface EditorMonthRow {
  editor_id: string;
  editor: string | null;
  periodo: string;
  month_key: string;
  videos_asignados: number;
  entregados: number;
}

interface ClienteOpcion {
  id: string;
  name: string;
}

interface Miembro {
  id: string;
  full_name: string | null;
  email: string;
  role: MemberRole;
}

type VideoStatus = "pendiente" | "edicion" | "en_revision" | "aprobado" | "entregado" | "cancelado";

interface VideoEnVivo {
  id: string;
  seq: number;
  title: string;
  status: VideoStatus;
  progreso: number;
  progreso_inicio: string | null;
  edicion_segundos: number | null;
  editor_id: string | null;
  due_date: string | null;
  clientName: string;
}

const ESTADO_VIVO: Record<VideoStatus, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "text-muted-foreground" },
  edicion: { label: "Edición", className: "text-info" },
  en_revision: { label: "En revisión", className: "text-warning" },
  aprobado: { label: "Aprobado", className: "text-success" },
  entregado: { label: "Entregado", className: "text-primary" },
  cancelado: { label: "Cancelado", className: "text-danger" },
};

// Formatea una duración en segundos como "2d 3h 15m", "3h 15m 20s", etc.
function formatearDuracion(segundos: number): string {
  if (segundos < 0) segundos = 0;
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Sección en vivo: cómo va cada editor este mes (en edición, pendientes,
 * revisión, entregados) y cuánto duró —o lleva— la edición de cada video.
 * El cronómetro corre en pantalla para los videos en edición; para los que
 * ya pasaron a revisión muestra la duración final medida por la base.
 */
function SeccionEnVivo({
  videos,
  miembros,
  periodLabel,
}: {
  videos: VideoEnVivo[];
  miembros: Miembro[];
  periodLabel: string | null;
}) {
  // Tic cada segundo para que el tiempo de los videos en edición avance solo.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const hayEnEdicion = videos.some((v) => v.status === "edicion" && v.progreso_inicio);
    if (!hayEnEdicion) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [videos]);

  const nombrePorId = useMemo(
    () => new Map(miembros.map((m) => [m.id, m.full_name || m.email])),
    [miembros],
  );

  function duracionVideo(v: VideoEnVivo): { texto: string; enCurso: boolean } | null {
    if (v.status === "edicion" && v.progreso_inicio) {
      const seg = Math.floor((ahora - new Date(v.progreso_inicio).getTime()) / 1000);
      return { texto: formatearDuracion(seg), enCurso: true };
    }
    if (v.edicion_segundos != null) {
      return { texto: formatearDuracion(v.edicion_segundos), enCurso: false };
    }
    return null;
  }

  // Resumen por editor.
  const porEditor = useMemo(() => {
    const mapa = new Map<
      string,
      { editor: string; edicion: number; pendientes: number; revision: number; entregados: number; durs: number[] }
    >();
    for (const v of videos) {
      const key = v.editor_id ?? "sin";
      const nombre = v.editor_id ? nombrePorId.get(v.editor_id) ?? "—" : "Sin asignar";
      const r = mapa.get(key) ?? {
        editor: nombre,
        edicion: 0,
        pendientes: 0,
        revision: 0,
        entregados: 0,
        durs: [],
      };
      if (v.status === "edicion") r.edicion += 1;
      else if (v.status === "pendiente") r.pendientes += 1;
      else if (v.status === "en_revision") r.revision += 1;
      else if (v.status === "aprobado" || v.status === "entregado") r.entregados += 1;
      if (v.edicion_segundos != null) r.durs.push(v.edicion_segundos);
      mapa.set(key, r);
    }
    return [...mapa.values()].map((r) => ({
      ...r,
      promedio: r.durs.length ? Math.round(r.durs.reduce((a, b) => a + b, 0) / r.durs.length) : null,
    }));
  }, [videos, nombrePorId]);

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay videos este mes todavía. En cuanto el equipo registre y edite videos, verás aquí su
        avance en tiempo real.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success/60" />
          <span className="relative size-2 rounded-full bg-success" />
        </span>
        <h2 className="text-sm font-semibold">En vivo — {periodLabel ?? "sin periodo"}</h2>
      </div>

      {/* Resumen por editor */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {porEditor.map((e) => (
          <div key={e.editor} className="rounded-xl border bg-card p-4">
            <p className="truncate text-sm font-medium">{e.editor}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                En edición: <span className="font-semibold text-info">{e.edicion}</span>
              </span>
              <span>
                Pendientes: <span className="font-semibold text-foreground">{e.pendientes}</span>
              </span>
              <span>
                En revisión: <span className="font-semibold text-warning">{e.revision}</span>
              </span>
              <span>
                Entregados: <span className="font-semibold text-success">{e.entregados}</span>
              </span>
            </div>
            {e.promedio != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Tiempo promedio de edición:{" "}
                <span className="font-semibold text-foreground">{formatearDuracion(e.promedio)}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabla de videos en vivo */}
      <div className="overflow-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">Cliente</th>
              <th className="px-3 py-2.5">Video</th>
              <th className="px-3 py-2.5">Editor</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Avance</th>
              <th className="px-3 py-2.5">Tiempo de edición</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => {
              const estilo = ESTADO_VIVO[v.status];
              const dur = duracionVideo(v);
              return (
                <tr key={v.id} className="border-b last:border-b-0">
                  <td className="max-w-40 truncate px-3 py-2">{v.clientName}</td>
                  <td className="max-w-52 truncate px-3 py-2">{v.title}</td>
                  <td className="max-w-40 truncate px-3 py-2 text-muted-foreground">
                    {v.editor_id ? nombrePorId.get(v.editor_id) ?? "—" : "Sin asignar"}
                  </td>
                  <td className={`px-3 py-2 ${estilo.className}`}>{estilo.label}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">{v.progreso}%</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">
                    {dur ? (
                      <span className={dur.enCurso ? "text-info" : "text-foreground"}>
                        {dur.texto}
                        {dur.enCurso && " ⏱"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
}

function descargarCSV(filas: Record<string, string | number>[], nombreArchivo: string) {
  if (filas.length === 0) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [columnas.join(","), ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(","))].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function MetricasClient({
  clientSeries,
  editorSeries,
  clientes,
  miembros,
  videosEnVivo,
  periodLabel,
}: {
  clientSeries: ClientMonthRow[];
  editorSeries: EditorMonthRow[];
  clientes: ClienteOpcion[];
  miembros: Miembro[];
  videosEnVivo: VideoEnVivo[];
  periodLabel: string | null;
}) {
  const [filtroCliente, setFiltroCliente] = useState(TODOS);
  const [filtroEditor, setFiltroEditor] = useState(TODOS);
  const hayFiltros = filtroCliente !== TODOS || filtroEditor !== TODOS;

  const editoresDisponibles = miembros.filter((m) => m.role !== "viewer");

  const clientSeriesFiltrada = useMemo(
    () => (filtroCliente === TODOS ? clientSeries : clientSeries.filter((r) => r.client_id === filtroCliente)),
    [clientSeries, filtroCliente],
  );

  const kpis = useMemo(() => {
    const totalFinalizados = clientSeriesFiltrada.reduce((s, r) => s + r.finalizados, 0);
    const totalMeta = clientSeriesFiltrada.reduce((s, r) => s + r.meta_mensual, 0);
    const cumplimiento = totalMeta > 0 ? Math.round((totalFinalizados / totalMeta) * 1000) / 10 : 0;
    const clientesDistintos = new Set(clientSeriesFiltrada.map((r) => r.client_id)).size;
    return { totalFinalizados, totalMeta, cumplimiento, clientesDistintos };
  }, [clientSeriesFiltrada]);

  const entregasPorMes = useMemo(() => {
    const porMes = new Map<string, { mes: string; entregados: number }>();
    for (const r of clientSeriesFiltrada) {
      const actual = porMes.get(r.month_key) ?? { mes: r.periodo, entregados: 0 };
      actual.entregados += r.finalizados;
      porMes.set(r.month_key, actual);
    }
    return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [clientSeriesFiltrada]);

  const porCliente = useMemo(() => {
    const base = filtroCliente === TODOS ? clientSeries : clientSeries.filter((r) => r.client_id === filtroCliente);
    const porId = new Map<string, { cliente: string; finalizados: number; meta: number }>();
    for (const r of base) {
      const actual = porId.get(r.client_id) ?? { cliente: r.cliente, finalizados: 0, meta: 0 };
      actual.finalizados += r.finalizados;
      actual.meta += r.meta_mensual;
      porId.set(r.client_id, actual);
    }
    return [...porId.values()].sort((a, b) => b.finalizados - a.finalizados);
  }, [clientSeries, filtroCliente]);

  const porEditor = useMemo(() => {
    const base = filtroEditor === TODOS ? editorSeries : editorSeries.filter((r) => r.editor_id === filtroEditor);
    const porId = new Map<string, { editor: string; videos: number; color: string }>();
    for (const r of base) {
      const nombre = r.editor ?? "Sin asignar";
      const actual = porId.get(r.editor_id) ?? {
        editor: nombre,
        videos: 0,
        color: r.editor ? avatarColor(r.editor_id) : MUTED_COLOR,
      };
      actual.videos += r.entregados;
      porId.set(r.editor_id, actual);
    }
    return [...porId.values()].filter((e) => e.videos > 0);
  }, [editorSeries, filtroEditor]);

  function limpiarFiltros() {
    setFiltroCliente(TODOS);
    setFiltroEditor(TODOS);
  }

  function exportar() {
    descargarCSV(
      clientSeriesFiltrada.map((r) => ({
        periodo: r.periodo,
        cliente: r.cliente,
        meta: r.meta_mensual,
        finalizados: r.finalizados,
        cumplimiento_pct: r.porcentaje_alcance_meta ?? 0,
      })),
      "editflow-metricas.csv",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Métricas</h1>
          <p className="text-sm text-muted-foreground">Histórico de todos los meses cerrados y abiertos.</p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={clientSeriesFiltrada.length === 0}>
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <SeccionEnVivo videos={videosEnVivo} miembros={miembros} periodLabel={periodLabel} />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <span className="text-xs font-medium text-muted-foreground">Filtrar métricas por:</span>
        <Select value={filtroCliente} onValueChange={setFiltroCliente}>
          <SelectTrigger size="sm" className="w-[11rem]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEditor} onValueChange={setFiltroEditor}>
          <SelectTrigger size="sm" className="w-[11rem]">
            <SelectValue placeholder="Editor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los editores</SelectItem>
            {editoresDisponibles.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
            <X className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {clientSeries.length === 0 && editorSeries.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Todavía no hay historial — cierra al menos un mes con videos entregados para empezar a ver métricas.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total entregado", value: kpis.totalFinalizados },
              { label: "% Cumplimiento", value: `${kpis.cumplimiento}%` },
              { label: "Meta acumulada", value: kpis.totalMeta },
              { label: "Clientes en el filtro", value: kpis.clientesDistintos },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Videos entregados por mes</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entregasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="entregados" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Finalizados por cliente</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCliente} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="cliente"
                      type="category"
                      width={110}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="finalizados" fill="var(--cyan)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Carga por editor</h3>
              <div className="mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porEditor} dataKey="videos" nameKey="editor" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {porEditor.map((entry) => (
                        <Cell key={entry.editor} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {porEditor.map((e) => (
                  <div key={e.editor} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: e.color }} />
                    {e.editor} · {e.videos}
                  </div>
                ))}
                {porEditor.length === 0 && <p className="text-muted-foreground">Sin entregas en este filtro.</p>}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Ranking de clientes</h3>
              <div className="mt-4 space-y-3">
                {porCliente.map((c, i) => (
                  <div key={c.cliente} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="w-36 truncate text-sm">{c.cliente}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                        style={{ width: `${Math.max(4, (c.finalizados / (c.meta || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {c.finalizados}/{c.meta}
                    </span>
                  </div>
                ))}
                {porCliente.length === 0 && <p className="text-sm text-muted-foreground">Sin datos todavía.</p>}
              </div>
            </div>
          </div>

          {hayFiltros && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                Meses incluidos en este filtro
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {clientSeriesFiltrada.map((r) => (
                    <tr key={`${r.client_id}-${r.month_key}`} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium">{r.cliente}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.periodo}</td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {r.finalizados} / {r.meta_mensual}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {r.porcentaje_alcance_meta ?? 0}%
                      </td>
                    </tr>
                  ))}
                  {clientSeriesFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Ningún mes coincide con este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
