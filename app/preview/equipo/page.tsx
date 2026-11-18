"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck2, Check, ImagePlus, Lock, Pencil, ShieldCheck, Unlink, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PreviewShell } from "@/components/preview/preview-shell";
import { ColorPicker } from "@/components/preview/color-picker";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import { resizeImageToDataUrl } from "@/lib/preview/resize-image";
import { ROL_LABEL as SESION_ROL_LABEL, useSessionRole } from "@/lib/preview/session";
import { useGoogleConnection } from "@/lib/preview/google-connection";
import {
  AVATAR_ICONS,
  COLOR_PALETTE,
  MIEMBROS_INICIALES,
  PREVIEW_EQUIPO_KEY,
  type Miembro,
  type Rol,
} from "@/lib/preview/team-data";

const ROL_LABEL: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega · Solo lectura",
};

export default function EquipoPreviewPage() {
  const [miembros, setMiembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);
  // Simula la sesión activa con el selector "Viendo como" del panel lateral:
  // solo el propietario o un administrador pueden invitar y otorgar/cambiar
  // roles. Un editor o un estratega (viewer) no ven estos controles.
  const [sesionRol] = useSessionRole();
  const PUEDE_ADMINISTRAR = sesionRol === "owner" || sesionRol === "admin";
  const propietario = miembros.find((m) => m.rol === "owner");

  // Integraciones
  const [googleConectado, setGoogleConectado] = useGoogleConnection();

  function handleConectarGoogle() {
    if (!PUEDE_ADMINISTRAR) return;
    setGoogleConectado(true);
    toast.success(`Google conectado como ${propietario?.correo}`, {
      description: "El mismo correo con el que se registró el propietario. Cada evento nuevo se agenda ahí y los avisos salen de su bandeja de envío.",
    });
  }

  function handleDesconectarGoogle() {
    if (!PUEDE_ADMINISTRAR) return;
    setGoogleConectado(false);
    toast("Google Calendar desconectado");
  }

  // Invitar
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"admin" | "editor" | "viewer">("viewer");
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  function siguienteColorSugerido() {
    const usados = new Set(miembros.map((m) => m.color));
    return COLOR_PALETTE.find((c) => !usados.has(c)) ?? COLOR_PALETTE[0];
  }

  function abrirInvitar() {
    setColor(siguienteColorSugerido());
    setOpen(true);
  }

  function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !correo.trim()) return;

    setMiembros((prev) => [
      ...prev,
      { nombre: nombre.trim(), correo: correo.trim(), rol, estado: "Invitado", color },
    ]);
    setOpen(false);
    setNombre("");
    setCorreo("");
    setRol("viewer");
    toast.success(`Invitación enviada a ${correo}`, {
      description: `Rol: ${ROL_LABEL[rol]}. Se le representará con este color en toda la app.`,
    });
  }

  function handleCambiarRol(correoMiembro: string, nuevoRol: Rol) {
    if (!PUEDE_ADMINISTRAR) return;
    setMiembros((prev) => prev.map((m) => (m.correo === correoMiembro ? { ...m, rol: nuevoRol } : m)));
    const miembro = miembros.find((m) => m.correo === correoMiembro);
    toast.success(`${miembro?.nombre}: rol actualizado a ${ROL_LABEL[nuevoRol]}`);
  }

  // Editar miembro: nombre, foto, ícono y color
  const [editOpen, setEditOpen] = useState(false);
  const [editCorreo, setEditCorreo] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState(COLOR_PALETTE[0]);
  const [editFoto, setEditFoto] = useState<string | undefined>(undefined);
  const [editIcono, setEditIcono] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function abrirEditar(m: Miembro) {
    if (!PUEDE_ADMINISTRAR) return;
    setEditCorreo(m.correo);
    setEditNombre(m.nombre);
    setEditColor(m.color);
    setEditFoto(m.foto);
    setEditIcono(m.icono);
    setEditOpen(true);
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 128);
      setEditFoto(dataUrl);
      setEditIcono(undefined);
    } catch {
      toast.error("No se pudo procesar la imagen");
    }
  }

  function elegirIcono(ic: string) {
    setEditIcono((actual) => (actual === ic ? undefined : ic));
    setEditFoto(undefined);
  }

  function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editCorreo || !editNombre.trim()) return;
    setMiembros((prev) =>
      prev.map((m) =>
        m.correo === editCorreo
          ? { ...m, nombre: editNombre.trim(), color: editColor, foto: editFoto, icono: editIcono }
          : m,
      ),
    );
    setEditOpen(false);
    toast.success("Miembro actualizado", {
      description: "El cambio se refleja en Equipo, Monitoreo, Calendario y Clientes.",
    });
  }

  return (
    <PreviewShell active="Equipo">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Equipo</h1>
            <p className="text-sm text-muted-foreground">Productora Lean</p>
          </div>
          <Button className="glow-primary" onClick={abrirInvitar} disabled={!PUEDE_ADMINISTRAR}>
            <UserPlus className="size-4" />
            Invitar
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            Viendo como: <strong className="text-foreground">{SESION_ROL_LABEL[sesionRol]}</strong>.
            Solo el propietario o un administrador puede invitar miembros y otorgar o cambiar roles y
            permisos. Cada persona se representa con una foto, ícono o color propio en Equipo,
            Monitoreo, Calendario y Clientes — clic en su avatar para editarlo.
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
          <h3 className="text-sm font-semibold">Integraciones</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Se conecta con el mismo correo con el que el propietario se registró — ese es el
            administrador. Cada evento nuevo se agenda en su Google Calendar con enlace automático
            de Google Meet e invitaciones por correo a los asistentes.
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarCheck2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Google Calendar y Meet</p>
                {googleConectado ? (
                  <p className="text-xs text-muted-foreground">
                    Conectado como{" "}
                    <span className="font-medium text-foreground">{propietario?.correo}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Se conectará con{" "}
                    <span className="font-medium text-foreground">{propietario?.correo}</span>
                  </p>
                )}
              </div>
            </div>
            {googleConectado ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 border-success/40 text-success">
                  Conectado
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDesconectarGoogle}
                  disabled={!PUEDE_ADMINISTRAR}
                >
                  <Unlink className="size-3.5" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleConectarGoogle} disabled={!PUEDE_ADMINISTRAR}>
                Conectar Google Calendar
              </Button>
            )}
          </div>
          {googleConectado && (
            <p className="mt-3 text-xs text-muted-foreground">
              También funciona al revés: un evento creado directo en Google Calendar (o por Siri)
              se importa acá solo si el título tiene la palabra{" "}
              <span className="font-mono text-foreground">Flow</span> — así ningún evento personal
              se mezcla con el calendario del equipo.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Miembro</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left" />
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.correo} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(m)}
                        disabled={!PUEDE_ADMINISTRAR}
                        className="rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform enabled:hover:scale-105 disabled:cursor-default"
                        style={{ ["--tw-ring-color" as string]: m.color }}
                      >
                        <MemberAvatar
                          nombre={m.nombre}
                          color={m.color}
                          foto={m.foto}
                          icono={m.icono}
                          className="size-8"
                          textClassName="text-xs"
                        />
                      </button>
                      <div>
                        <p className="font-medium">{m.nombre}</p>
                        <p className="text-xs text-muted-foreground">{m.correo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.rol === "owner" || !PUEDE_ADMINISTRAR ? (
                      <Badge variant="secondary" className="gap-1">
                        {m.rol === "owner" && <Lock className="size-3" />}
                        {ROL_LABEL[m.rol]}
                      </Badge>
                    ) : (
                      <Select value={m.rol} onValueChange={(v) => handleCambiarRol(m.correo, v as Rol)}>
                        <SelectTrigger size="sm" className="w-[13rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Estratega · Solo lectura</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.estado === "Activo" ? (
                      <span className="flex items-center gap-1.5 text-xs text-success">
                        <span className="size-1.5 rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
                        Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-warning">
                        <span className="size-1.5 rounded-full bg-warning shadow-[0_0_6px_var(--warning)]" />
                        Invitación pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {PUEDE_ADMINISTRAR && (
                      <Button variant="ghost" size="icon-sm" onClick={() => abrirEditar(m)} title="Editar miembro">
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvitar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nombre-inv">Nombre</Label>
              <Input id="p-nombre-inv" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-correo-inv">Correo *</Label>
              <Input id="p-correo-inv" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as "admin" | "editor" | "viewer")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — control total</SelectItem>
                  <SelectItem value="editor">Editor — solo sus videos y agenda</SelectItem>
                  <SelectItem value="viewer">Estratega · Solo lectura — ve todo, no edita</SelectItem>
                </SelectContent>
              </Select>
              {rol === "viewer" && (
                <p className="text-xs text-muted-foreground">
                  Pensado para el estratega o el cliente final: ve clientes, monitoreo, calendario y
                  métricas, pero no puede cambiar nada.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Color que lo representará en toda la app</Label>
              <div className="flex items-center gap-3">
                <MemberAvatar nombre={nombre || "?"} color={color} className="size-9" textClassName="text-xs" />
                <ColorPicker value={color} onChange={setColor} />
              </div>
              <p className="text-xs text-muted-foreground">
                Podrá agregar su foto o un ícono después, editando su perfil desde Equipo.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="glow-primary">Enviar invitación</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar miembro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarEdicion} className="space-y-4">
            <div className="flex items-center gap-3">
              <MemberAvatar
                nombre={editNombre || "?"}
                color={editColor}
                foto={editFoto}
                icono={editIcono}
                className="size-14"
                textClassName="text-lg"
              />
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="size-3.5" />
                  {editFoto ? "Cambiar foto" : "Agregar foto"}
                </Button>
                {editFoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setEditFoto(undefined)}
                  >
                    <X className="size-3.5" />
                    Quitar foto
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-nombre-edit">Nombre</Label>
              <Input id="p-nombre-edit" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Ícono {editFoto && <span className="text-muted-foreground">(reemplaza la foto si eliges uno)</span>}</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => elegirIcono(ic)}
                    className={`flex size-8 items-center justify-center rounded-lg border text-base transition-colors ${
                      editIcono === ic
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background/40 hover:border-primary/40"
                    }`}
                  >
                    {editIcono === ic ? <Check className="size-3.5 text-primary" /> : ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <ColorPicker value={editColor} onChange={setEditColor} />
              <p className="text-xs text-muted-foreground">
                Se usa como fondo cuando no hay foto ni ícono, y como acento de su avatar.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="glow-primary">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PreviewShell>
  );
}
