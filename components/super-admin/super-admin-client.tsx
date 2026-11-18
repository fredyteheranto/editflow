"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Building2,
  FileText,
  Globe,
  Plus,
  Save,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HomeCmsTab, PermissionsTab } from "@/components/super-admin/cms-permissions-tabs";
import {
  OrganizationsTab,
  UsersAndInvitesTab,
  type AdminAuthUserRow,
  type AdminInvitationRow,
  type AdminMembershipRow,
  type AdminOrgRow,
} from "@/components/super-admin/directory-users-tabs";
import {
  saveDittoConfigAction,
  saveSiteSettingsAction,
} from "@/lib/actions/super-admin";
import type { DittoGuideItem, PlatformConfig } from "@/lib/platform/types";

interface SuperAdminStats {
  organizations: number;
  users: number;
  activeMemberships: number;
  clients: number;
  videos: number;
  pendingInvitations: number;
}

export function SuperAdminClient({
  initialConfig,
  rootSuperAdmins,
  stats,
  organizations,
  memberships,
  users,
  invitations,
}: {
  initialConfig: PlatformConfig;
  rootSuperAdmins: readonly string[];
  stats: SuperAdminStats;
  organizations: AdminOrgRow[];
  memberships: AdminMembershipRow[];
  users: AdminAuthUserRow[];
  invitations: AdminInvitationRow[];
}) {
  const [site, setSite] = useState(initialConfig.site);
  const [ditto, setDitto] = useState(initialConfig.ditto);
  const [isPending, startTransition] = useTransition();

  function handleSaveSite() {
    startTransition(async () => {
      const res = await saveSiteSettingsAction(site);
      if (res.ok) toast.success("Configuración global guardada.");
      else toast.error(res.error);
    });
  }

  function updateGuide(idx: number, patch: Partial<DittoGuideItem>) {
    setDitto((prev) => ({
      ...prev,
      customGuides: prev.customGuides.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  }

  function addGuide() {
    setDitto((prev) => ({
      ...prev,
      customGuides: [
        ...prev.customGuides,
        {
          id: `guide-${Date.now()}`,
          title: "Nueva guía de Ditto",
          routePattern: "/app/dashboard",
          summary: "Explica aquí qué logra el usuario en esta pantalla.",
          steps: ["Paso 1", "Paso 2"],
          keywords: ["ayuda", "guia"],
          ctaLabel: "Ir al Dashboard",
          ctaHref: "/app/dashboard",
        },
      ],
    }));
  }

  function removeGuide(idx: number) {
    setDitto((prev) => ({
      ...prev,
      customGuides: prev.customGuides.filter((_, i) => i !== idx),
    }));
  }

  function handleSaveDitto() {
    startTransition(async () => {
      const res = await saveDittoConfigAction(ditto);
      if (res.ok) toast.success("Asistente Ditto actualizado.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Super Admin — EditFlow</h1>
            <Badge>Control total</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra sitio, contenidos CMS, permisos por rol, organizaciones, usuarios y al asistente Ditto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Ver sitio público</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/app/dashboard" className="gap-1.5">
              <ArrowLeft className="size-3.5" />
              Ir a mi workspace
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Organizaciones", stats.organizations],
          ["Usuarios Auth", stats.users],
          ["Miembros activos", stats.activeMemberships],
          ["Clientes", stats.clients],
          ["Videos", stats.videos],
          ["Invitaciones pend.", stats.pendingInvitations],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-3.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{val}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="plataforma" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="plataforma" className="gap-1.5">
            <Globe className="size-3.5" /> Plataforma
          </TabsTrigger>
          <TabsTrigger value="cms" className="gap-1.5">
            <FileText className="size-3.5" /> Contenidos CMS
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-1.5">
            <Shield className="size-3.5" /> Permisos
          </TabsTrigger>
          <TabsTrigger value="organizaciones" className="gap-1.5">
            <Building2 className="size-3.5" /> Organizaciones
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="size-3.5" /> Usuarios e Invitaciones
          </TabsTrigger>
          <TabsTrigger value="ditto" className="gap-1.5">
            <Bot className="size-3.5" /> Asistente Ditto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plataforma" className="space-y-6">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Ajustes generales, SEO y mantenimiento</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre de marca</Label>
                <Input
                  value={site.brandName}
                  onChange={(e) => setSite({ ...site, brandName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Título SEO del Home</Label>
                <Input
                  value={site.seoTitle}
                  onChange={(e) => setSite({ ...site, seoTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Meta descripción SEO</Label>
                <Textarea
                  rows={2}
                  value={site.seoDescription}
                  onChange={(e) => setSite({ ...site, seoDescription: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox
                  checked={site.maintenanceMode}
                  onCheckedChange={(v) => setSite({ ...site, maintenanceMode: Boolean(v) })}
                />
                <span>Activar modo mantenimiento en /app (solo Super Admins pueden entrar)</span>
              </label>
              <Input
                value={site.maintenanceMessage}
                onChange={(e) => setSite({ ...site, maintenanceMessage: e.target.value })}
                placeholder="Mensaje durante mantenimiento"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox
                  checked={site.announcementBanner.enabled}
                  onCheckedChange={(v) =>
                    setSite({
                      ...site,
                      announcementBanner: { ...site.announcementBanner, enabled: Boolean(v) },
                    })
                  }
                />
                <span>Mostrar banner de anuncio global dentro de EditFlow</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  className="sm:col-span-2"
                  placeholder="Texto del aviso global..."
                  value={site.announcementBanner.text}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      announcementBanner: { ...site.announcementBanner, text: e.target.value },
                    })
                  }
                />
                <Select
                  value={site.announcementBanner.tone}
                  onValueChange={(tone) =>
                    setSite({
                      ...site,
                      announcementBanner: {
                        ...site.announcementBanner,
                        tone: tone as "info" | "warning" | "success",
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativo (azul/violeta)</SelectItem>
                    <SelectItem value="warning">Advertencia (ámbar)</SelectItem>
                    <SelectItem value="success">Positivo (verde)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Etiqueta de botón opcional"
                  value={site.announcementBanner.linkLabel}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      announcementBanner: {
                        ...site.announcementBanner,
                        linkLabel: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="URL de enlace opcional (ej. /app/configuracion)"
                  value={site.announcementBanner.linkHref}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      announcementBanner: {
                        ...site.announcementBanner,
                        linkHref: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <Button type="button" onClick={handleSaveSite} disabled={isPending} className="gap-1.5">
              <Save className="size-4" />
              {isPending ? "Guardando…" : "Guardar ajustes globales"}
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Super Usuario autorizado</h3>
            <div className="flex flex-wrap gap-2">
              {rootSuperAdmins.map((email) => (
                <Badge key={email} variant="default">
                  {email} (único Super Admin)
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Solo esta cuenta tiene acceso al panel de Super Admin y a funciones ocultas mientras no
              se publiquen para los demás usuarios.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="cms">
          <HomeCmsTab initialHome={initialConfig.home} />
        </TabsContent>

        <TabsContent value="permisos">
          <PermissionsTab
            initialPermissions={initialConfig.permissions}
            initialDittoPublic={initialConfig.ditto.publicEnabled}
          />
        </TabsContent>

        <TabsContent value="organizaciones">
          <OrganizationsTab organizations={organizations} memberships={memberships} />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersAndInvitesTab
            users={users}
            organizations={organizations}
            invitations={invitations}
          />
        </TabsContent>

        <TabsContent value="ditto" className="space-y-6">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Configuración de Ditto (Asistente Virtual)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={ditto.enabled}
                  onCheckedChange={(v) => setDitto({ ...ditto, enabled: Boolean(v) })}
                />
                <span>Activar asistente Ditto (para Super Admin)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={ditto.publicEnabled}
                  onCheckedChange={(v) => setDitto({ ...ditto, publicEnabled: Boolean(v) })}
                />
                <span>Mostrar Ditto a los demás usuarios y público</span>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox
                  checked={ditto.showOnPublicPages}
                  onCheckedChange={(v) => setDitto({ ...ditto, showOnPublicPages: Boolean(v) })}
                />
                <span>Mostrar también en Home y páginas públicas (cuando sea público)</span>
              </label>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={ditto.assistantName}
                  onChange={(e) => setDitto({ ...ditto, assistantName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Input
                  value={ditto.tagline}
                  onChange={(e) => setDitto({ ...ditto, tagline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mensaje de bienvenida</Label>
                <Textarea
                  rows={2}
                  value={ditto.welcomeMessage}
                  onChange={(e) => setDitto({ ...ditto, welcomeMessage: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Guías interactivas y respuestas de Ditto</h3>
              <Button type="button" size="sm" variant="outline" onClick={addGuide}>
                <Plus className="size-3.5" />
                Agregar guía
              </Button>
            </div>
            <div className="space-y-3">
              {ditto.customGuides.map((g, idx) => (
                <div key={g.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={g.title}
                      onChange={(e) => updateGuide(idx, { title: e.target.value })}
                      placeholder="Título de guía"
                    />
                    <Input
                      className="max-w-48 font-mono text-xs"
                      value={g.routePattern}
                      onChange={(e) => updateGuide(idx, { routePattern: e.target.value })}
                      placeholder="/app/monitoreo"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => removeGuide(idx)}
                      aria-label="Eliminar guía"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={g.summary}
                    onChange={(e) => updateGuide(idx, { summary: e.target.value })}
                    placeholder="Resumen"
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Pasos (uno por línea)
                    </Label>
                    <Textarea
                      rows={3}
                      value={g.steps.join("\n")}
                      onChange={(e) =>
                        updateGuide(idx, {
                          steps: e.target.value.split(/\r?\n/).filter((s) => s.trim()),
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={g.keywords.join(", ")}
                      onChange={(e) =>
                        updateGuide(idx, {
                          keywords: e.target.value
                            .split(",")
                            .map((k) => k.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Palabras clave separadas por coma"
                    />
                    <Input
                      value={g.ctaLabel ?? ""}
                      onChange={(e) => updateGuide(idx, { ctaLabel: e.target.value })}
                      placeholder="Texto del botón (opcional)"
                    />
                    <Input
                      value={g.ctaHref ?? ""}
                      onChange={(e) => updateGuide(idx, { ctaHref: e.target.value })}
                      placeholder="Enlace (ej. /app/equipo)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="button" onClick={handleSaveDitto} disabled={isPending} className="gap-1.5">
            <Save className="size-4" />
            {isPending ? "Guardando…" : "Guardar configuración de Ditto"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
