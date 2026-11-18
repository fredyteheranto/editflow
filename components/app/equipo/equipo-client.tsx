"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Mail, Send, Trash2, UserPlus, X } from "lucide-react";
import { markLocalMutation } from "@/lib/realtime/local-mutation";
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
import { createInvitation, resendInvitation, revokeInvitation } from "@/lib/actions/invitations";
import { updateMemberRole, removeMember } from "@/lib/actions/memberships";
import type { MemberRole } from "@/types/database.types";

interface Miembro {
  id: string;
  full_name: string | null;
  email: string;
  role: MemberRole;
  avatar_url: string | null;
}

interface Invitacion {
  id: string;
  email: string;
  role: MemberRole;
  expires_at: string;
  token: string;
}

interface EquipoClientProps {
  organizationId: string;
  miembros: Miembro[];
  invitaciones: Invitacion[];
  currentUserEmail: string | null;
  puedeGestionar: boolean;
}

const ROL_LABEL: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega",
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

function copyToClipboard(text: string, mensaje: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(mensaje))
    .catch(() => toast.error("No se pudo copiar el link."));
}

export function EquipoClient({
  organizationId,
  miembros,
  invitaciones,
  currentUserEmail,
  puedeGestionar,
}: EquipoClientProps) {
  const [isPending, startTransition] = useTransition();

  const [invitarOpen, setInvitarOpen] = useState(false);
  const [inviteNombre, setInviteNombre] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("editor");

  const [miembroAEliminar, setMiembroAEliminar] = useState<Miembro | null>(null);

  const spamHint = "Dile a tu invitado que verifique también la carpeta de spam o correo no deseado.";

  function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteNombre.trim()) return;
    startTransition(async () => {
      const result = await createInvitation(organizationId, inviteEmail, inviteRole, inviteNombre);
      if (result.ok) {
        markLocalMutation();
        const correo = inviteEmail.trim();
        setInvitarOpen(false);
        setInviteEmail("");
        setInviteNombre("");
        if (result.emailSent) {
          toast.success(`Invitación enviada por correo a ${correo}.`, {
            description: spamHint,
            duration: 8000,
          });
        } else {
          copyToClipboard(
            result.link,
            "Invitación creada — el correo no se pudo enviar; el link quedó copiado para compartirlo.",
          );
          if (result.emailError) {
            toast.warning("Detalle del envío de correo", { description: result.emailError });
          }
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCambiarRol(miembro: Miembro, role: MemberRole) {
    startTransition(async () => {
      const result = await updateMemberRole(miembro.id, role);
      if (result.ok) markLocalMutation();
      else toast.error(result.error);
    });
  }

  function handleEliminar() {
    if (!miembroAEliminar) return;
    startTransition(async () => {
      const result = await removeMember(miembroAEliminar.id);
      if (result.ok) {
        markLocalMutation();
        toast.success("Miembro removido del equipo");
        setMiembroAEliminar(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRevocar(invitacion: Invitacion) {
    startTransition(async () => {
      const result = await revokeInvitation(invitacion.id);
      if (result.ok) {
        markLocalMutation();
        toast.success("Invitación revocada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleReenviar(invitacion: Invitacion) {
    startTransition(async () => {
      const result = await resendInvitation(invitacion.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.emailSent) {
        toast.success(`Correo de invitación reenviado a ${invitacion.email}.`, {
          description: spamHint,
          duration: 8000,
        });
      } else {
        copyToClipboard(
          result.link,
          "No se pudo enviar el correo — el link quedó copiado para compartirlo.",
        );
        if (result.emailError) {
          toast.warning("Detalle del envío", { description: result.emailError });
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground">Quién tiene acceso a tu organización y con qué rol.</p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => setInvitarOpen(true)}>
            <UserPlus className="size-4" />
            Invitar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Miembro</th>
              <th className="px-4 py-2.5">Rol</th>
              {puedeGestionar && <th className="w-10 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => {
              const nombre = m.full_name || m.email;
              const esUno = m.email === currentUserEmail;
              const esOwner = m.role === "owner";
              return (
                <tr key={m.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: avatarColor(m.id) }}
                      >
                        {initials(nombre)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {nombre}
                          {esUno && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {puedeGestionar && !esOwner ? (
                      <Select value={m.role} onValueChange={(v) => handleCambiarRol(m, v as MemberRole)} disabled={isPending}>
                        <SelectTrigger size="sm" className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Estratega</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{ROL_LABEL[m.role]}</Badge>
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="px-4 py-2.5">
                      {!esOwner && !esUno && (
                        <button
                          type="button"
                          onClick={() => setMiembroAEliminar(m)}
                          className="text-muted-foreground transition-colors hover:text-danger"
                          title="Remover del equipo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {puedeGestionar && invitaciones.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">Invitaciones pendientes</h3>
          <p className="mt-1 text-xs text-muted-foreground">{spamHint}</p>
          <div className="mt-3 space-y-2">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{inv.email}</span>
                  <Badge variant="outline" className="shrink-0">
                    {ROL_LABEL[inv.role]}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Reenviar invitación por correo"
                    onClick={() => handleReenviar(inv)}
                    disabled={isPending}
                  >
                    <Send className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Copiar link de invitación"
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/invitacion/${inv.token}`, "Link copiado.")
                    }
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Revocar invitación"
                    onClick={() => handleRevocar(inv)}
                    disabled={isPending}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={invitarOpen} onOpenChange={setInvitarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar a tu equipo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvitar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-nombre">Nombre</Label>
              <Input
                id="invite-nombre"
                placeholder="Luis Pérez"
                value={inviteNombre}
                onChange={(e) => setInviteNombre(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Con este nombre aparecerá en la app. El invitado no puede cambiarlo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Correo</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="persona@correo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — control total</SelectItem>
                  <SelectItem value="editor">Editor — edita sus propios videos</SelectItem>
                  <SelectItem value="viewer">Estratega — gestiona clientes y briefs, el resto solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Enviaremos un correo con el enlace de invitación para que cree su cuenta o inicie sesión
              y entre al equipo. {spamHint}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInvitarOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Crear invitación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(miembroAEliminar)} onOpenChange={(o) => !o && setMiembroAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover a {miembroAEliminar?.full_name || miembroAEliminar?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pierde acceso a esta organización de inmediato. Su historial de videos y eventos pasados se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
