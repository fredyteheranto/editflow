"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markLocalMutation } from "@/lib/realtime/local-mutation";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarIcon,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  MoreHorizontal,
  Package,
  PartyPopper,
  Plus,
  Radio,
  Truck,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePickerField } from "@/components/preview/time-picker-field";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar-events";
import { startGoogleConnect } from "@/lib/google/start-connect";
import { zonedDateParts, zonedTimeToUtcIso } from "@/lib/utils/timezone";
import type { EventType, MemberRole } from "@/types/database.types";

interface EventoFull {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  client_id: string | null;
  video_id: string | null;
  start_at: string;
  end_at: string;
  is_virtual: boolean;
}

interface Miembro {
  id: string;
  full_name: string | null;
  email: string;
  role: MemberRole;
}

interface CalendarioClientProps {
  periodId: string | null;
  periodLabel: string | null;
  year: number;
  month: number; // 1-12
  timezone: string;
  eventos: EventoFull[];
  miembros: Miembro[];
  asignadoPorEvento: Record<string, string>;
  invitadosPorEvento: Record<string, string[]>;
  conMeetPorEvento: Record<string, boolean>;
  meetUrlPorEvento: Record<string, string>;
  googleConectado: boolean;
  accountEmail?: string;
  puedeEditar: boolean;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TIPO_STYLE: Record<EventType, { label: string; icon: typeof Users; className: string }> = {
  reunion: { label: "Reunión", icon: Users, className: "bg-info/15 text-info ring-1 ring-info/40" },
  grabacion: { label: "Grabación", icon: Radio, className: "bg-violet/15 text-violet ring-1 ring-violet/40" },
  entrega: { label: "Entrega", icon: Truck, className: "bg-success/15 text-success ring-1 ring-success/40" },
  clase: { label: "Clase", icon: GraduationCap, className: "bg-warning/15 text-warning ring-1 ring-warning/40" },
  evento: { label: "Evento", icon: PartyPopper, className: "bg-cyan/15 text-cyan ring-1 ring-cyan/40" },
  otro: { label: "Otro", icon: MoreHorizontal, className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

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

function MiembroAvatar({ miembro, className = "size-3.5" }: { miembro?: Miembro; className?: string }) {
  if (!miembro) return null;
  const nombre = miembro.full_name || miembro.email;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${className}`}
      style={{ backgroundColor: avatarColor(miembro.id) }}
      title={nombre}
    >
      {initials(nombre)}
    </span>
  );
}

// Selector de día acotado al mes del período activo — no tiene sentido
// crear un evento fuera del mes que se está viendo. Sin Popover/Portal por
// la misma razón que TimePickerField: evita el conflicto con el Dialog que
// lo contiene.
function DiaPickerField({
  year,
  month,
  dia,
  onChange,
  disabled,
}: {
  year: number;
  month: number; // 1-12
  dia: number;
  onChange: (dia: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fecha = new Date(year, month - 1, dia);
  const mesActivo = new Date(year, month - 1, 1);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full justify-start gap-1.5 font-normal"
      >
        <CalendarIcon className="size-3.5" />
        {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
      </Button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-popover shadow-md ring-1 ring-foreground/10">
          <Calendar
            mode="single"
            selected={fecha}
            defaultMonth={mesActivo}
            disabled={(date) => date.getMonth() !== month - 1 || date.getFullYear() !== year}
            onSelect={(date) => {
              if (!date) return;
              onChange(date.getDate());
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

interface FormState {
  titulo: string;
  tipo: EventType;
  asignadoId: string;
  dia: number;
  hora: string;
  invitados: string[];
  borradorInvitado: string;
  conMeet: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseGuestDraft(
  existing: string[],
  draft: string,
): { ok: true; emails: string[] } | { ok: false; invalidEmail: string } {
  const tokens = draft
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    if (!EMAIL_RE.test(token)) {
      return { ok: false, invalidEmail: token };
    }
  }

  return {
    ok: true,
    emails: Array.from(new Set([...existing.map((e) => e.trim().toLowerCase()), ...tokens])),
  };
}

function InvitadosField({
  invitados,
  borrador,
  onBorradorChange,
  onCommitEmails,
  onRemoveEmail,
  disabled,
}: {
  invitados: string[];
  borrador: string;
  onBorradorChange: (value: string) => void;
  onCommitEmails: (emails: string[]) => void;
  onRemoveEmail: (email: string) => void;
  disabled?: boolean;
}) {
  function commitDraft(showInvalidToast: boolean) {
    if (!borrador.trim()) return;
    const parsed = parseGuestDraft(invitados, borrador);
    if (!parsed.ok) {
      if (showInvalidToast) toast.error(`Correo inválido: ${parsed.invalidEmail}`);
      return;
    }
    onCommitEmails(parsed.emails);
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <Label>Invitados (correos)</Label>
      <div className="flex min-w-0 gap-2">
        <Input
          type="text"
          inputMode="email"
          placeholder="persona@correo.com (separa varios con coma)"
          value={borrador}
          disabled={disabled}
          className="min-w-0 flex-1"
          onChange={(e) => onBorradorChange(e.target.value)}
          onBlur={() => commitDraft(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft(true);
            }
          }}
        />
        <Button type="button" variant="outline" className="shrink-0" onClick={() => commitDraft(true)} disabled={disabled}>
          Agregar
        </Button>
      </div>
      {invitados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {invitados.map((email) => (
            <Badge key={email} variant="secondary" className="max-w-full gap-1 break-all">
              <span className="truncate">{email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemoveEmail(email)}
                  className="shrink-0 text-muted-foreground hover:text-danger"
                  title="Quitar"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Cada correo escrito o agregado recibirá la invitación con el enlace directo de la reunión.
      </p>
    </div>
  );
}

function MeetDirectCard({ meetUrl }: { meetUrl: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(meetUrl);
      setCopiado(true);
      toast.success("Enlace de Google Meet copiado");
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="min-w-0 space-y-2.5 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-primary">
          <Video className="size-3.5 shrink-0" />
          <span className="truncate">Enlace de Google Meet listo</span>
        </span>
        <Button type="button" size="xs" variant="ghost" onClick={copiar} className="shrink-0 gap-1">
          {copiado ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          {copiado ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p
        className="rounded-md bg-background/70 px-2.5 py-1.5 font-mono text-[11px] break-all text-muted-foreground"
        title={meetUrl}
      >
        {meetUrl}
      </p>
      <a
        href={meetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ExternalLink className="size-4 shrink-0" />
        Unirse con Google Meet
      </a>
    </div>
  );
}

function EventoCamposForm({
  state,
  setState,
  year,
  month,
  responsables,
  disabled,
  meetUrl,
  googleConectado,
}: {
  state: FormState;
  setState: React.Dispatch<React.SetStateAction<FormState>>;
  year: number;
  month: number;
  responsables: Miembro[];
  disabled?: boolean;
  /** Link real de Google Meet del evento (al abrir uno existente). */
  meetUrl?: string | null;
  googleConectado: boolean;
}) {
  return (
    <div className="min-w-0 space-y-3.5">
      {meetUrl && <MeetDirectCard meetUrl={meetUrl} />}
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="titulo-evento">Título *</Label>
        <Input
          id="titulo-evento"
          value={state.titulo}
          onChange={(e) => setState((prev) => ({ ...prev, titulo: e.target.value }))}
          required
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={state.tipo}
            onValueChange={(v) => {
              const nextTipo = v as EventType;
              setState((prev) => ({
                ...prev,
                tipo: nextTipo,
                conMeet: nextTipo === "reunion" ? true : prev.conMeet,
              }));
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_STYLE).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>Responsable</Label>
          <Select
            value={state.asignadoId}
            onValueChange={(v) => setState((prev) => ({ ...prev, asignadoId: v }))}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {responsables.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-1.5">
                    <MiembroAvatar miembro={m} />
                    {m.full_name || m.email}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label>Fecha</Label>
          <DiaPickerField
            year={year}
            month={month}
            dia={state.dia}
            onChange={(dia) => setState((prev) => ({ ...prev, dia }))}
            disabled={disabled}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>Hora</Label>
          <TimePickerField
            value={state.hora}
            onChange={(hora) => setState((prev) => ({ ...prev, hora }))}
            disabled={disabled}
          />
        </div>
      </div>

      <InvitadosField
        invitados={state.invitados}
        borrador={state.borradorInvitado}
        onBorradorChange={(borradorInvitado) =>
          setState((prev) => ({ ...prev, borradorInvitado }))
        }
        onCommitEmails={(emails) =>
          setState((prev) => ({
            ...prev,
            invitados: Array.from(new Set([...prev.invitados, ...emails])),
            borradorInvitado: "",
            conMeet: emails.length > 0 ? true : prev.conMeet,
          }))
        }
        onRemoveEmail={(email) =>
          setState((prev) => ({
            ...prev,
            invitados: prev.invitados.filter((x) => x !== email),
          }))
        }
        disabled={disabled}
      />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Video className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <Label className="text-sm">Enlace de Google Meet</Label>
            <p className="text-xs text-muted-foreground">
              {meetUrl
                ? "Activo — enlace de Google Meet incluido al abrir el evento y en los correos."
                : googleConectado
                  ? "Se crea automáticamente en Google Calendar y se envía por correo a los invitados."
                  : "Conecta Google Calendar en Configuración para generar enlaces automáticos de Google Meet."}
            </p>
            {!googleConectado && !meetUrl && (
              <Link
                href="/app/configuracion"
                className="mt-1 inline-block text-xs font-medium text-primary underline underline-offset-2"
              >
                Conectar Google Calendar
              </Link>
            )}
          </div>
        </div>
        <Switch
          checked={state.conMeet}
          onCheckedChange={(conMeet) => setState((prev) => ({ ...prev, conMeet }))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function CalendarioClient({
  periodId,
  periodLabel,
  year,
  month,
  timezone,
  eventos,
  miembros,
  asignadoPorEvento,
  invitadosPorEvento,
  conMeetPorEvento,
  meetUrlPorEvento,
  googleConectado,
  accountEmail,
  puedeEditar,
}: CalendarioClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  async function handleConectarGoogle() {
    setConnectingGoogle(true);
    const { error } = await startGoogleConnect("/app/calendario", accountEmail);
    if (error) {
      toast.error("No se pudo iniciar la conexión con Google", { description: error });
      setConnectingGoogle(false);
    }
  }

  const responsables = useMemo(() => miembros.filter((m) => m.role !== "viewer"), [miembros]);
  const miembroPorId = useMemo(() => new Map(miembros.map((m) => [m.id, m])), [miembros]);
  const mesLabel = useMemo(
    () =>
      new Date(year, month - 1, 1)
        .toLocaleDateString("es-CO", { month: "long", year: "numeric" })
        .toUpperCase(),
    [year, month],
  );

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoState, setNuevoState] = useState<FormState>({
    titulo: "",
    tipo: "reunion",
    asignadoId: responsables[0]?.id ?? "",
    dia: 1,
    hora: "10:00",
    invitados: [],
    borradorInvitado: "",
    conMeet: true,
  });

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [eventoDetalle, setEventoDetalle] = useState<EventoFull | null>(null);
  const [detalleState, setDetalleState] = useState<FormState>({
    titulo: "",
    tipo: "reunion",
    asignadoId: "",
    dia: 1,
    hora: "10:00",
    invitados: [],
    borradorInvitado: "",
    conMeet: false,
  });

  const cells = useMemo(() => {
    const diasEnMes = new Date(year, month, 0).getDate();
    const leadingBlanks = new Date(year, month - 1, 1).getDay();
    return [...Array(leadingBlanks).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];
  }, [year, month]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<number, EventoFull[]>();
    for (const ev of eventos) {
      const { day } = zonedDateParts(ev.start_at, timezone);
      const lista = mapa.get(day);
      if (lista) lista.push(ev);
      else mapa.set(day, [ev]);
    }
    return mapa;
  }, [eventos, timezone]);

  function abrirNuevoEvento(dia: number) {
    if (!puedeEditar || !periodId) return;
    setNuevoState({
      titulo: "",
      tipo: "reunion",
      asignadoId: responsables[0]?.id ?? "",
      dia,
      hora: "10:00",
      invitados: [],
      borradorInvitado: "",
      conMeet: true,
    });
    setNuevoOpen(true);
  }

  function abrirDetalle(evento: EventoFull, e?: React.SyntheticEvent) {
    e?.stopPropagation();
    const { day, hour, minute } = zonedDateParts(evento.start_at, timezone);
    setEventoDetalle(evento);
    setDetalleState({
      titulo: evento.title,
      tipo: evento.type,
      asignadoId: asignadoPorEvento[evento.id] ?? "",
      dia: day,
      hora: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      invitados: invitadosPorEvento[evento.id] ?? [],
      borradorInvitado: "",
      conMeet: conMeetPorEvento[evento.id] ?? (evento.type === "reunion"),
    });
    setDetalleOpen(true);
  }

  function notifyDeliverySummary(res: {
    prefix: string;
    meetingUrl?: string | null;
    googleMeetStatus?: string;
    emailedCount?: number;
    failedRecipients?: string[];
  }) {
    const parts = [res.prefix];
    if (res.meetingUrl) parts.push("Google Meet listo");
    if ((res.emailedCount ?? 0) > 0) {
      parts.push(
        res.emailedCount === 1
          ? "1 notificación enviada por correo"
          : `${res.emailedCount} notificaciones enviadas por correo`,
      );
    }
    toast.success(parts.join(" · "));

    if (res.googleMeetStatus === "missing_google_connection") {
      toast.warning("Falta conectar Google Calendar para crear el enlace de Google Meet", {
        description: "La notificación por correo sí se envió. Conecta Google en Configuración para generar Meet automáticamente.",
        action: {
          label: "Conectar Google",
          onClick: () => router.push("/app/configuracion"),
        },
      });
    } else if (res.googleMeetStatus === "google_error") {
      toast.warning("No se pudo generar el enlace de Google Meet", {
        description: "Tu conexión de Google Calendar expiró o rechazó el evento. Reconéctala en Configuración.",
        action: {
          label: "Revisar Google",
          onClick: () => router.push("/app/configuracion"),
        },
      });
    }

    if (res.failedRecipients && res.failedRecipients.length > 0) {
      toast.warning(
        `Evento guardado, pero no se pudo enviar correo a: ${res.failedRecipients.join(", ")}`,
      );
    }
  }

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEditar || !nuevoState.titulo.trim()) return;
    const parsedGuests = parseGuestDraft(nuevoState.invitados, nuevoState.borradorInvitado);
    if (!parsedGuests.ok) {
      toast.error(`Revisa el correo del invitado: ${parsedGuests.invalidEmail}`);
      return;
    }

    const [hh, mm] = nuevoState.hora.split(":").map(Number);
    const startAt = zonedTimeToUtcIso(year, month, nuevoState.dia, hh, mm, timezone);
    const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
    const withMeet =
      nuevoState.conMeet || nuevoState.tipo === "reunion" || parsedGuests.emails.length > 0;

    startTransition(async () => {
      try {
        const res = await createCalendarEvent({
          title: nuevoState.titulo.trim(),
          type: nuevoState.tipo,
          startAt,
          endAt,
          assignedMembershipId: nuevoState.asignadoId || undefined,
          guestEmails: parsedGuests.emails,
          withMeet,
        });
        markLocalMutation();
        notifyDeliverySummary({
          prefix: `Evento creado para el ${nuevoState.dia}/${month}`,
          meetingUrl: res.meetingUrl,
          googleMeetStatus: res.googleMeetStatus,
          emailedCount: res.emailedCount,
          failedRecipients: res.failedRecipients,
        });
        setNuevoOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo crear el evento.");
      }
    });
  }

  function handleGuardarDetalle(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEditar || !eventoDetalle || !detalleState.titulo.trim()) return;
    const parsedGuests = parseGuestDraft(detalleState.invitados, detalleState.borradorInvitado);
    if (!parsedGuests.ok) {
      toast.error(`Revisa el correo del invitado: ${parsedGuests.invalidEmail}`);
      return;
    }

    const [hh, mm] = detalleState.hora.split(":").map(Number);
    const startAt = zonedTimeToUtcIso(year, month, detalleState.dia, hh, mm, timezone);
    const duracionMs = new Date(eventoDetalle.end_at).getTime() - new Date(eventoDetalle.start_at).getTime();
    const endAt = new Date(new Date(startAt).getTime() + Math.max(duracionMs, 30 * 60 * 1000)).toISOString();

    startTransition(async () => {
      const result = await updateCalendarEvent({
        id: eventoDetalle.id,
        title: detalleState.titulo.trim(),
        type: detalleState.tipo,
        startAt,
        endAt,
        assignedMembershipId: detalleState.asignadoId || undefined,
        guestEmails: parsedGuests.emails,
        withMeet: detalleState.conMeet,
      });
      if (result.ok) {
        markLocalMutation();
        notifyDeliverySummary({
          prefix: "Evento actualizado",
          meetingUrl: result.meetingUrl,
          googleMeetStatus: result.googleMeetStatus,
          emailedCount: result.emailedCount,
          failedRecipients: result.failedRecipients,
        });
        setDetalleOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleEliminarDetalle() {
    if (!puedeEditar || !eventoDetalle) return;
    startTransition(async () => {
      const result = await deleteCalendarEvent(eventoDetalle.id);
      if (result.ok) {
        markLocalMutation();
        toast.success("Evento eliminado");
        setDetalleOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const proximos = useMemo(() => {
    const ahoraMs = Date.now();
    return [...eventos]
      .filter((e) => new Date(e.start_at).getTime() >= ahoraMs)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 6);
  }, [eventos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            {periodLabel ?? mesLabel} · Clic en una fecha vacía para crear un evento, o en un evento para ver su
            detalle
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* La conexión de Google la gestiona solo el administrador. */}
          {puedeEditar &&
            (googleConectado ? (
              <Badge variant="outline" className="gap-1 border-success/40 text-success">
                <CalendarCheck2 className="size-3.5" />
                Google Calendar y Meet conectados
              </Badge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleConectarGoogle}
                disabled={connectingGoogle}
                className="gap-1.5 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
              >
                <AlertTriangle className="size-3.5" />
                {connectingGoogle ? "Conectando Google…" : "Falta conectar Google"}
              </Button>
            ))}
          <Button
            onClick={() => abrirNuevoEvento(nuevoState.dia || 1)}
            disabled={!puedeEditar || !periodId}
            title={!puedeEditar ? "Solo el propietario o un administrador puede crear eventos" : undefined}
          >
            <Plus className="size-4" />
            Nuevo evento
          </Button>
        </div>
      </div>

      {puedeEditar && !googleConectado && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="min-w-0 space-y-0.5 text-sm">
              <p className="font-semibold text-foreground">
                Aún no has conectado Google Calendar ni Google Meet
              </p>
              <p className="text-xs text-muted-foreground">
                Es importante conectarlo con tu correo ({accountEmail ?? "tu cuenta de EditFlow"}) para crear enlaces automáticos de Google Meet y enviar las invitaciones directamente desde Google Calendar.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={handleConectarGoogle} disabled={connectingGoogle} className="gap-1.5">
              <CalendarCheck2 className="size-4" />
              {connectingGoogle ? "Redirigiendo…" : "Conectar Google ahora"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/configuracion">Configuración</Link>
            </Button>
          </div>
        </div>
      )}

      {!periodId ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay un periodo abierto todavía. Abre un mes para empezar a agendar eventos.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="border-r p-2 text-center font-mono text-xs uppercase text-muted-foreground last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const eventosDelDia = day ? eventosPorDia.get(day) ?? [] : [];
                const puedeCrear = Boolean(day) && puedeEditar;
                return (
                  // No es <button>: cada evento adentro ya es un botón, y un
                  // <button> no puede contener otro <button>.
                  <div
                    key={i}
                    role={puedeCrear ? "button" : undefined}
                    tabIndex={puedeCrear ? 0 : undefined}
                    onClick={() => day && abrirNuevoEvento(day)}
                    onKeyDown={(e) => {
                      if (puedeCrear && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        abrirNuevoEvento(day as number);
                      }
                    }}
                    className={`min-h-24 min-w-0 space-y-1 border-b border-r p-2 text-left last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                      puedeCrear ? "cursor-pointer transition-colors hover:bg-primary/5" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <span className="font-mono text-xs text-muted-foreground">{day}</span>
                        {eventosDelDia.map((evento) => {
                          const style = TIPO_STYLE[evento.type];
                          const asignadoId = asignadoPorEvento[evento.id];
                          const asignado = asignadoId ? miembroPorId.get(asignadoId) : undefined;
                          const meetUrl = meetUrlPorEvento[evento.id];
                          return (
                            <div
                              key={evento.id}
                              className={`flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-opacity hover:opacity-90 ${style.className}`}
                            >
                              <button
                                type="button"
                                onClick={(e) => (evento.is_virtual ? e.stopPropagation() : abrirDetalle(evento, e))}
                                className="flex min-w-0 flex-1 items-center gap-1 text-left"
                                title={
                                  evento.is_virtual
                                    ? "Fecha de entrega — edítala desde Monitoreo"
                                    : meetUrl
                                      ? "Clic para abrir detalles o entrar a la reunión"
                                      : "Clic para ver detalle del evento"
                                }
                              >
                                {evento.is_virtual ? (
                                  <Package className="size-3 shrink-0" />
                                ) : (
                                  <style.icon className="size-3 shrink-0" />
                                )}
                                <span className="truncate">{evento.title}</span>
                                <MiembroAvatar miembro={asignado} />
                              </button>
                              {meetUrl && !evento.is_virtual && (
                                <a
                                  href={meetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Entrar directo a la reunión"
                                  className="inline-flex size-4 shrink-0 items-center justify-center rounded bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                                >
                                  <Video className="size-2.5" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Próximos eventos</h3>
              <div className="mt-3 space-y-3">
                {proximos.map((evento) => {
                  const style = TIPO_STYLE[evento.type];
                  const { day, hour, minute } = zonedDateParts(evento.start_at, timezone);
                  const meetUrl = meetUrlPorEvento[evento.id];
                  return (
                    <div
                      key={evento.id}
                      className="flex w-full items-start gap-2 rounded-md p-1 transition-colors hover:bg-muted/40"
                    >
                      <button
                        type="button"
                        onClick={() => !evento.is_virtual && abrirDetalle(evento)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${style.className}`}>
                          {evento.is_virtual ? <Package className="size-3.5" /> : <style.icon className="size-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{evento.title}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {day}/{month} · {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                          </p>
                        </div>
                      </button>
                      {meetUrl && !evento.is_virtual && (
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Entrar directo a la reunión"
                          className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Video className="size-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
                {proximos.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Sincronizado con Monitoreo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Cada video con fecha de entrega aparece aquí automáticamente, sin duplicar datos.
              </p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto overflow-x-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Nuevo evento — {nuevoState.dia}/{month}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrear} className="min-w-0 space-y-4">
            <EventoCamposForm
              state={nuevoState}
              setState={setNuevoState}
              year={year}
              month={month}
              responsables={responsables}
              disabled={!puedeEditar || isPending}
              googleConectado={googleConectado}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="glow-primary" disabled={!puedeEditar || isPending}>
                Crear evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto overflow-x-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{puedeEditar ? "Detalle del evento" : detalleState.titulo}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarDetalle} className="min-w-0 space-y-4">
            <EventoCamposForm
              state={detalleState}
              setState={setDetalleState}
              year={year}
              month={month}
              responsables={responsables}
              disabled={!puedeEditar || isPending}
              meetUrl={eventoDetalle ? meetUrlPorEvento[eventoDetalle.id] : undefined}
              googleConectado={googleConectado}
            />
            <DialogFooter>
              {puedeEditar ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger hover:text-danger sm:mr-auto"
                    onClick={handleEliminarDetalle}
                    disabled={isPending}
                  >
                    Eliminar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="glow-primary" disabled={isPending}>
                    Guardar cambios
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>
                  Cerrar
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
