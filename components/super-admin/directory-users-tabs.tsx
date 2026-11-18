"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Mail, Plus, Send, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminAddMemberToOrgAction,
  adminCreateOrganizationAction,
  adminCreateUserAction,
  adminDeleteOrganizationAction,
  adminDeleteUserAction,
  adminResendInvitationAction,
  adminRevokeInvitationAction,
  adminUpdateMembershipAction,
  adminUpdateOrganizationAction,
} from "@/lib/actions/super-admin";
import type { InvitationStatus, MemberRole } from "@/types/database.types";

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  timezone: string;
  created_at: string;
}

export interface AdminMembershipRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: MemberRole;
  active: boolean;
}

export interface AdminAuthUserRow {
  id: string;
  email: string;
  fullName: string | null;
  providers: string[];
  confirmed: boolean;
  lastSignInAt: string | null;
  isSuperAdmin: boolean;
}

export interface AdminInvitationRow {
  id: string;
  organization_id: string;
  organizationName: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  status: InvitationStatus;
  token: string;
  created_at: string;
}

export function OrganizationsTab({
  organizations,
  memberships,
}: {
  organizations: AdminOrgRow[];
  memberships: AdminMembershipRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [timezone, setTimezone] = useState("America/Bogota");
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await adminCreateOrganizationAction({
        name,
        ownerEmail,
        timezone,
      });
      if (res.ok) {
        toast.success("Organización creada");
        setName("");
        setOwnerEmail("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleRename(orgId: string) {
    const nextName = editingNames[orgId]?.trim();
    if (!nextName) return;
    startTransition(async () => {
      const res = await adminUpdateOrganizationAction(orgId, { name: nextName });
      if (res.ok) {
        toast.success("Nombre actualizado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDeleteOrg(org: AdminOrgRow) {
    if (!window.confirm(`¿Eliminar permanentemente "${org.name}" y todos sus datos?`)) return;
    startTransition(async () => {
      const res = await adminDeleteOrganizationAction(org.id);
      if (res.ok) {
        toast.success("Organización eliminada");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Nuevo espacio / organización</Label>
          <Input
            placeholder="Ej. Studio Norte"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Correo del propietario</Label>
          <Input
            type="email"
            placeholder="dueno@correo.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Zona horaria</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Bogota">America/Bogota</SelectItem>
              <SelectItem value="America/Mexico_City">America/Mexico_City</SelectItem>
              <SelectItem value="America/Lima">America/Lima</SelectItem>
              <SelectItem value="America/Argentina/Buenos_Aires">America/Buenos_Aires</SelectItem>
              <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending} className="w-full gap-1.5">
            <Plus className="size-4" />
            Crear espacio
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {organizations.map((org) => {
          const orgMembers = memberships.filter((m) => m.organization_id === org.id);
          return (
            <div key={org.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <Input
                    className="h-8 w-56 font-semibold"
                    value={editingNames[org.id] ?? org.name}
                    onChange={(e) =>
                      setEditingNames((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || !editingNames[org.id]?.trim()}
                    onClick={() => handleRename(org.id)}
                  >
                    Renombrar
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{org.timezone}</Badge>
                  <span>Dueño: {org.owner_email}</span>
                  <span>· {orgMembers.filter((m) => m.active).length} activos</span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => handleDeleteOrg(org)}
                    disabled={isPending}
                    title="Eliminar organización"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {orgMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.full_name || m.email}</p>
                      <p className="truncate text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={m.role}
                        onValueChange={(role) =>
                          startTransition(async () => {
                            const r = await adminUpdateMembershipAction(m.id, {
                              role: role as MemberRole,
                            });
                            if (r.ok) {
                              toast.success("Rol actualizado");
                              router.refresh();
                            } else toast.error(r.error);
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">owner</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="editor">editor</SelectItem>
                          <SelectItem value="viewer">estratega</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="xs"
                        variant={m.active ? "outline" : "secondary"}
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await adminUpdateMembershipAction(m.id, { active: !m.active });
                            if (r.ok) {
                              toast.success(m.active ? "Desactivado" : "Reactivado");
                              router.refresh();
                            } else toast.error(r.error);
                          })
                        }
                      >
                        {m.active ? "Activo" : "Inactivo"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UsersAndInvitesTab({
  users,
  organizations,
  invitations,
}: {
  users: AdminAuthUserRow[];
  organizations: AdminOrgRow[];
  invitations: AdminInvitationRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [assignOrgId, setAssignOrgId] = useState(organizations[0]?.id ?? "");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState<MemberRole>("editor");

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await adminCreateUserAction({
        email: newEmail,
        fullName: newName,
        password: newPassword,
      });
      if (r.ok) {
        toast.success("Usuario creado y confirmado");
        setNewEmail("");
        setNewName("");
        setNewPassword("");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignOrgId || !assignEmail) return;
    startTransition(async () => {
      const r = await adminAddMemberToOrgAction({
        organizationId: assignOrgId,
        email: assignEmail,
        role: assignRole,
      });
      if (r.ok) {
        toast.success("Usuario vinculado a la organización");
        setAssignEmail("");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleCreateUser} className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="size-4 text-primary" />
            Crear usuario directo
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Nombre"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Correo"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Clave (mín. 6)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            Crear cuenta confirmada
          </Button>
        </form>

        <form onSubmit={handleAssign} className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-primary" />
            Vincular usuario existente a un espacio
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={assignOrgId} onValueChange={setAssignOrgId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="email"
              placeholder="Correo registrado"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              required
            />
            <Select value={assignRole} onValueChange={(v) => setAssignRole(v as MemberRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">owner</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="editor">editor</SelectItem>
                <SelectItem value="viewer">estratega</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={isPending || !assignOrgId}>
            Agregar al equipo
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Usuarios registrados ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5">Proveedores</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.fullName || u.email}</span>
                      {u.isSuperAdmin && (
                        <Badge className="gap-1">
                          <ShieldCheck className="size-3" /> Super Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {u.providers.join(", ") || "email"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <Badge variant={u.confirmed ? "outline" : "secondary"}>
                      {u.confirmed ? "Confirmado" : "Pendiente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={isPending || u.isSuperAdmin}
                      title={
                        u.isSuperAdmin ? "No puedes borrar un Super Admin desde aquí" : "Eliminar usuario"
                      }
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar definitivamente a ${u.email}?`)) return;
                        startTransition(async () => {
                          const r = await adminDeleteUserAction(u.id);
                          if (r.ok) {
                            toast.success("Usuario eliminado");
                            router.refresh();
                          } else toast.error(r.error);
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Todas las invitaciones ({invitations.length})</h3>
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{inv.email}</span>
                <span className="text-muted-foreground">· {inv.organizationName}</span>
                <Badge variant="outline">{inv.role}</Badge>
                <Badge variant={inv.status === "pendiente" ? "default" : "secondary"}>
                  {inv.status}
                </Badge>
              </div>
              {inv.status === "pendiente" && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await adminResendInvitationAction(inv.id);
                        if (r.ok) toast.success(`Invitación reenviada a ${inv.email}`);
                        else toast.error(r.error);
                      })
                    }
                  >
                    <Send className="size-3" />
                    Reenviar
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await adminRevokeInvitationAction(inv.id);
                        if (r.ok) {
                          toast.success("Invitación revocada");
                          router.refresh();
                        } else toast.error(r.error);
                      })
                    }
                  >
                    <X className="size-3" />
                    Revocar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
