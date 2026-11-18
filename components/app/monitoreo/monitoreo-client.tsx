"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { markLocalMutation } from "@/lib/realtime/local-mutation";
import { Plus, Trash2, Link2, ExternalLink, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/preview/date-picker-field";
import { createVideo, updateVideo, deleteVideo, registrarAlertaVideo } from "@/lib/actions/videos";
import { formatDateEs } from "@/lib/utils/dates";
import { gradientePorProgreso } from "@/lib/utils/progress-color";
import { cn } from "@/lib/utils";
import type { MemberRole, VideoPriority, VideoStatus } from "@/types/database.types";

const PROGRESO_MIN = 10;
const PROGRESO_MAX = 100;
const PROGRESO_PASO = 10;

interface VideoRow {
  id: string;
  seq: number;
  title: string;
  client_id: string;
  editor_id: string | null;
  start_date: string | null;
  due_date: string | null;
  status: VideoStatus;
  priority: VideoPriority;
  progreso: number;
  progreso_inicio: string | null;
  progreso_actualizado: string | null;
  processed_link: string | null;
  clients: { name: string } | null;
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

interface MonitoreoClientProps {
  periodId: string | null;
  periodLabel: string | null;
  videos: VideoRow[];
  clientes: ClienteOpcion[];
  miembros: Miembro[];
  role: MemberRole;
}

const ESTADOS: Record<VideoStatus, { label: string; dot: string; text: string }> = {
  pendiente: { label: "Pendiente", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  edicion: { label: "Edición", dot: "bg-info shadow-[0_0_8px_var(--info)]", text: "text-info" },
  en_revision: { label: "En revisión", dot: "bg-warning shadow-[0_0_8px_var(--warning)]", text: "text-warning" },
  aprobado: { label: "Aprobado", dot: "bg-success shadow-[0_0_8px_var(--success)]", text: "text-success" },
  entregado: { label: "Entregado", dot: "bg-primary shadow-[0_0_8px_var(--primary)]", text: "text-primary" },
  cancelado: { label: "Cancelado", dot: "bg-danger", text: "text-danger" },
};

// "cancelado" es un estado administrativo (lo usa el arrastre automático de
// mes a mes) — no se ofrece como opción manual en el selector.
const ESTADOS_SELECCIONABLES: VideoStatus[] = ["pendiente", "edicion", "en_revision", "aprobado", "entregado"];

function nombreMiembro(m?: Miembro) {
  if (!m) return "—";
  return m.full_name || m.email;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

function Avatar({ miembro }: { miembro?: Miembro }) {
  if (!miembro) return <span className="pl-1.5 text-xs text-muted-foreground">Sin asignar</span>;
  const nombre = nombreMiembro(miembro);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
        style={{ backgroundColor: avatarColor(miembro.id) }}
      >
        {initials(nombre)}
      </span>
      <span className="truncate text-sm">{nombre}</span>
    </span>
  );
}

function toISODate(d?: Date) {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Medidor de avance de edición: solo corre (y se puede editar) mientras el
// video está en "edicion" — en cualquier otro estado se ve congelado ("no
// suma"), tal como se definió en la maqueta de /preview/monitoreo.
function ProgresoCell({
  video,
  onChange,
  disabled,
}: {
  video: VideoRow;
  onChange: (nuevoProgreso: number) => void;
  disabled?: boolean;
}) {
  const activo = video.status === "edicion";
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(video.progreso);
  const puedeEditarValor = activo && !disabled;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o && !puedeEditarValor) return;
        if (o) setValor(video.progreso);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild disabled={!puedeEditarValor}>
        <button
          type="button"
          disabled={!puedeEditarValor}
          className="flex w-32 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
        >
          <Progress
            value={video.progreso}
            className={cn("h-1.5", !activo && "opacity-40")}
            indicatorStyle={{ background: gradientePorProgreso(video.progreso) }}
          />
          <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {video.progreso}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Avance de edición</Label>
            <span className="font-mono text-sm font-semibold">{valor}%</span>
          </div>
          <Slider
            value={[valor]}
            min={PROGRESO_MIN}
            max={PROGRESO_MAX}
            step={PROGRESO_PASO}
            onValueChange={([v]) => setValor(v)}
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => {
              onChange(valor);
              setOpen(false);
            }}
          >
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Link del video final (archivo entregado): se pega acá cuando la edición
// está lista. Cualquiera que pueda editar (owner/admin/editor) lo puede
// cargar; un viewer solo lo ve/copia. La columna la toca el editor también,
// porque el trigger enforce_editor_video_columns lo permite.
function LinkCell({
  video,
  onSave,
  disabled,
}: {
  video: VideoRow;
  onSave: (link: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(video.processed_link ?? "");
  const [copiado, setCopiado] = useState(false);
  const tieneLink = Boolean(video.processed_link);

  async function copiar() {
    if (!video.processed_link) return;
    try {
      await navigator.clipboard.writeText(video.processed_link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {tieneLink && (
        <>
          <a
            href={video.processed_link ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir link del video final"
            className="flex size-6 items-center justify-center rounded-md text-primary transition-colors hover:bg-muted/50"
          >
            <ExternalLink className="size-3.5" />
          </a>
          <button
            type="button"
            onClick={copiar}
            title="Copiar link"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {copiado ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        </>
      )}

      {disabled ? (
        !tieneLink && <span className="pl-1 text-xs text-muted-foreground">—</span>
      ) : (
        <Popover
          open={open}
          onOpenChange={(o) => {
            if (o) setValor(video.processed_link ?? "");
            setOpen(o);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              title={tieneLink ? "Editar link" : "Agregar link del video final"}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <Link2 className="size-3.5" />
              {!tieneLink && <span>Link</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <Label className="text-xs">Link del video final</Label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="https://..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave(valor.trim());
                    setOpen(false);
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                {tieneLink && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onSave("");
                      setOpen(false);
                    }}
                  >
                    Quitar
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onSave(valor.trim());
                    setOpen(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

type OptimisticVideoPatch =
  | { type: "patch"; id: string; changes: Partial<VideoRow> }
  | { type: "remove"; id: string };

export function MonitoreoClient({ periodId, periodLabel, videos, clientes, miembros, role }: MonitoreoClientProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticVideos, applyOptimistic] = useOptimistic(
    videos,
    (state: VideoRow[], action: OptimisticVideoPatch) => {
      if (action.type === "remove") {
        return state.filter((v) => v.id !== action.id);
      }
      return state.map((v) => (v.id === action.id ? { ...v, ...action.changes } : v));
    },
  );

  // Crear y eliminar: owner/admin/editor (el editor solo ve/elimina sus
  // propios videos, lo acota RLS). El viewer es solo lectura.
  const puedeCrear = role !== "viewer";
  const puedeEliminar = role !== "viewer";
  const puedeEditar = role !== "viewer";
  // El resto de columnas (cliente, título, fechas) las bloquea el trigger
  // enforce_editor_video_columns en la base — un editor solo puede tocar
  // estado, observaciones y link procesado.
  const soloEstado = role === "editor";

  const miembroPorId = useMemo(() => new Map(miembros.map((m) => [m.id, m])), [miembros]);
  const responsables = useMemo(() => miembros.filter((m) => m.role !== "viewer"), [miembros]);

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoClienteId, setNuevoClienteId] = useState(clientes[0]?.id ?? "");
  const [nuevoEditorId, setNuevoEditorId] = useState("sin_asignar");
  const [nuevaPrioridad, setNuevaPrioridad] = useState<VideoPriority>("media");
  const [nuevoInicio, setNuevoInicio] = useState<Date | undefined>();
  const [nuevaEntrega, setNuevaEntrega] = useState<Date | undefined>();

  const [videoAEliminar, setVideoAEliminar] = useState<VideoRow | null>(null);

  // Alerta de estancamiento: si un video lleva más de 1 hora en edición sin
  // que su % avance, suena la alerta y sale un aviso. Diferimos 1.2s el
  // chequeo inicial para no competir con la navegación o los primeros clics.
  const alertadosRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const enEdicion = videos.filter((v) => v.status === "edicion" && v.progreso < 100);
    if (enEdicion.length === 0) return;

    function revisar() {
      const ahora = Date.now();
      for (const v of enEdicion) {
        const base = v.progreso_actualizado ?? v.progreso_inicio;
        const minutos = base ? (ahora - new Date(base).getTime()) / 60000 : 0;
        const estancado = base !== null && minutos >= 60;
        if (estancado && !alertadosRef.current.has(v.id)) {
          alertadosRef.current.add(v.id);
          void registrarAlertaVideo(v.id, "video_estancado");
        }
        if (!estancado) alertadosRef.current.delete(v.id);
      }
    }
    const initTimer = setTimeout(revisar, 1200);
    const interval = setInterval(revisar, 60_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [videos]);

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId || !nuevoTitulo.trim() || !nuevoClienteId) return;
    startTransition(async () => {
      const result = await createVideo({
        periodId,
        clientId: nuevoClienteId,
        title: nuevoTitulo,
        editorId: nuevoEditorId === "sin_asignar" ? null : nuevoEditorId,
        startDate: toISODate(nuevoInicio),
        dueDate: toISODate(nuevaEntrega),
        priority: nuevaPrioridad,
      });
      if (result.ok) {
        markLocalMutation();
        toast.success("Video registrado");
        setNuevoOpen(false);
        setNuevoTitulo("");
        setNuevoInicio(undefined);
        setNuevaEntrega(undefined);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCambiarEstado(video: VideoRow, status: VideoStatus) {
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: video.id, changes: { status } });
      const result = await updateVideo({ id: video.id, status });
      if (result.ok) markLocalMutation();
      else toast.error(result.error);
    });
  }

  function handleCambiarEncargado(video: VideoRow, editorId: string) {
    const resolvedEditorId = editorId === "sin_asignar" ? null : editorId;
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: video.id, changes: { editor_id: resolvedEditorId } });
      const result = await updateVideo({ id: video.id, editorId: resolvedEditorId });
      if (result.ok) markLocalMutation();
      else toast.error(result.error);
    });
  }

  function handleCambiarFecha(video: VideoRow, campo: "startDate" | "dueDate", fecha: Date) {
    const iso = toISODate(fecha);
    const dbKey = campo === "startDate" ? "start_date" : "due_date";
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: video.id, changes: { [dbKey]: iso } });
      const result = await updateVideo({ id: video.id, [campo]: iso });
      if (result.ok) markLocalMutation();
      else toast.error(result.error);
    });
  }

  function handleCambiarProgreso(video: VideoRow, progreso: number) {
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: video.id, changes: { progreso } });
      const result = await updateVideo({ id: video.id, progreso });
      if (result.ok) {
        markLocalMutation();
        if (progreso >= 100) {
          void registrarAlertaVideo(video.id, "video_completado");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCambiarLink(video: VideoRow, link: string) {
    const processedLink = link || null;
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: video.id, changes: { processed_link: processedLink } });
      const result = await updateVideo({ id: video.id, processedLink });
      if (result.ok) markLocalMutation();
      else toast.error(result.error);
    });
  }

  function handleEliminar() {
    if (!videoAEliminar) return;
    const targetId = videoAEliminar.id;
    setVideoAEliminar(null);
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: targetId });
      const result = await deleteVideo(targetId);
      if (result.ok) {
        markLocalMutation();
        toast.success("Video eliminado");
      } else {
        toast.error(result.error);
      }
    });
  }

  const colSpan = puedeEliminar ? 10 : 9;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Monitoreo</h1>
          <p className="text-sm text-muted-foreground">{periodLabel ?? "Sin periodo activo"}</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setNuevoOpen(true)} disabled={!periodId || clientes.length === 0}>
            <Plus className="size-4" />
            Nuevo video
          </Button>
        )}
      </div>

      {!periodId ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay un periodo abierto todavía.
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Este mes todavía no tiene clientes activados. Ve a Clientes para sumar al menos uno antes de registrar
          videos.
        </div>
      ) : (
        <div className="max-h-[calc(100dvh-260px)] min-h-[320px] overflow-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card/95">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-12 px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Video</th>
                <th className="px-3 py-2.5">Encargado</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Avance</th>
                <th className="px-3 py-2.5">Inicio</th>
                <th className="px-3 py-2.5">Entrega</th>
                <th className="px-3 py-2.5">Link</th>
                {puedeEliminar && <th className="w-10 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {optimisticVideos.map((video) => {
                const estilo = ESTADOS[video.status];
                return (
                  <tr key={video.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{video.seq}</td>
                    <td className="max-w-40 truncate px-3 py-2">{video.clients?.name ?? "—"}</td>
                    <td className="max-w-52 truncate px-3 py-2">{video.title}</td>
                    <td className="px-3 py-2">
                      {puedeEditar && !soloEstado ? (
                        <Select
                          value={video.editor_id ?? "sin_asignar"}
                          onValueChange={(v) => handleCambiarEncargado(video, v)}
                        >
                          <SelectTrigger size="sm" className="h-7 border-none bg-transparent px-1.5">
                            <Avatar miembro={miembroPorId.get(video.editor_id ?? "")} />
                          </SelectTrigger>
                          {/* position="popper": el trigger no usa <SelectValue />,
                              así que "item-aligned" no puede calcular su
                              posición y el menú termina en la esquina de la
                              página. */}
                          <SelectContent position="popper">
                            <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                            {responsables.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {nombreMiembro(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Avatar miembro={miembroPorId.get(video.editor_id ?? "")} />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {puedeEditar ? (
                        <Select
                          value={video.status}
                          onValueChange={(v) => handleCambiarEstado(video, v as VideoStatus)}
                        >
                          <SelectTrigger size="sm" className="h-7 border-none bg-transparent px-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className={`size-2 rounded-full ${estilo.dot}`} />
                              <span className={estilo.text}>{estilo.label}</span>
                            </span>
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {ESTADOS_SELECCIONABLES.map((s) => (
                              <SelectItem key={s} value={s}>
                                <span className="flex items-center gap-1.5">
                                  <span className={`size-2 rounded-full ${ESTADOS[s].dot}`} />
                                  {ESTADOS[s].label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full ${estilo.dot}`} />
                          <span className={estilo.text}>{estilo.label}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ProgresoCell
                        video={video}
                        onChange={(p) => handleCambiarProgreso(video, p)}
                        disabled={!puedeEditar}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {puedeEditar ? (
                        <DatePickerField
                          value={video.start_date ? new Date(`${video.start_date}T00:00:00`) : undefined}
                          onChange={(d) => handleCambiarFecha(video, "startDate", d)}
                          className="h-7 w-auto border-none bg-transparent px-1.5 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{formatDateEs(video.start_date)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {puedeEditar ? (
                        <DatePickerField
                          value={video.due_date ? new Date(`${video.due_date}T00:00:00`) : undefined}
                          onChange={(d) => handleCambiarFecha(video, "dueDate", d)}
                          className="h-7 w-auto border-none bg-transparent px-1.5 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{formatDateEs(video.due_date)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <LinkCell
                        video={video}
                        onSave={(link) => handleCambiarLink(video, link)}
                        disabled={!puedeEditar}
                      />
                    </td>
                    {puedeEliminar && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setVideoAEliminar(video)}
                          className="text-muted-foreground transition-colors hover:text-danger"
                          title="Eliminar video"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {optimisticVideos.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Todavía no hay videos registrados este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo video</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-titulo">Título *</Label>
              <Input id="nuevo-titulo" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={nuevoClienteId} onValueChange={setNuevoClienteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Encargado</Label>
                <Select value={nuevoEditorId} onValueChange={setNuevoEditorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {responsables.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {nombreMiembro(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha de inicio</Label>
                <DatePickerField value={nuevoInicio} onChange={setNuevoInicio} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de entrega</Label>
                <DatePickerField value={nuevaEntrega} onChange={setNuevaEntrega} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={nuevaPrioridad} onValueChange={(v) => setNuevaPrioridad(v as VideoPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Registrar video
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(videoAEliminar)} onOpenChange={(o) => !o && setVideoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este video?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{videoAEliminar?.title}&quot; se eliminará de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
