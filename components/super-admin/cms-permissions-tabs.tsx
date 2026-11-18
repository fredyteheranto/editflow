"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Lock, Plus, Save, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ALL_APP_MODULES,
  EXTRA_APP_MODULES,
  type AppModuleKey,
  type ConfigurableRole,
  type ExtraAppModuleKey,
  type PlatformConfig,
} from "@/lib/platform/types";
import {
  saveHomeCmsAction,
  savePermissionsAction,
} from "@/lib/actions/super-admin";

const MODULE_LABELS: Record<AppModuleKey, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  monitoreo: "Monitoreo",
  calendario: "Calendario",
  metricas: "Métricas",
  bolsa: "Bolsa de Empleo",
  equipo: "Equipo",
  configuracion: "Configuración",
};

const ROLE_NAMES: Record<ConfigurableRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega",
};

export function HomeCmsTab({
  initialHome,
}: {
  initialHome: PlatformConfig["home"];
}) {
  const [home, setHome] = useState(initialHome);
  const [isPending, startTransition] = useTransition();

  function updateModule(index: number, field: "titulo" | "descripcion", value: string) {
    setHome((prev) => ({
      ...prev,
      modules: prev.modules.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  }

  function updateFaq(index: number, field: "pregunta" | "respuesta", value: string) {
    setHome((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));
  }

  function addFaq() {
    setHome((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { pregunta: "Nueva pregunta", respuesta: "Escribe aquí la respuesta." }],
    }));
  }

  function removeFaq(index: number) {
    setHome((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const res = await saveHomeCmsAction(home);
      if (res.ok) toast.success("Contenidos del Home actualizados en vivo.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Portada (Hero del sitio)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Etiqueta superior (Badge)</Label>
            <Input
              value={home.heroBadge}
              onChange={(e) => setHome({ ...home, heroBadge: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Título (inicio)</Label>
            <Input
              value={home.heroTitlePrefix}
              onChange={(e) => setHome({ ...home, heroTitlePrefix: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Palabra destacada (degradado)</Label>
            <Input
              value={home.heroTitleHighlight}
              onChange={(e) => setHome({ ...home, heroTitleHighlight: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Título (cierre)</Label>
            <Input
              value={home.heroTitleSuffix}
              onChange={(e) => setHome({ ...home, heroTitleSuffix: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtítulo</Label>
            <Textarea
              rows={2}
              value={home.heroSubtitle}
              onChange={(e) => setHome({ ...home, heroSubtitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Botón principal</Label>
            <Input
              value={home.heroPrimaryCta}
              onChange={(e) => setHome({ ...home, heroPrimaryCta: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Botón secundario</Label>
            <Input
              value={home.heroSecondaryCta}
              onChange={(e) => setHome({ ...home, heroSecondaryCta: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Tarjetas de Módulos</h3>
        <div className="space-y-1.5">
          <Label>Título de sección</Label>
          <Input
            value={home.modulesIntroTitle}
            onChange={(e) => setHome({ ...home, modulesIntroTitle: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {home.modules.map((mod, idx) => (
            <div key={mod.key} className="space-y-2 rounded-lg border p-3">
              <Input
                value={mod.titulo}
                onChange={(e) => updateModule(idx, "titulo", e.target.value)}
                placeholder="Título"
              />
              <Textarea
                rows={2}
                value={mod.descripcion}
                onChange={(e) => updateModule(idx, "descripcion", e.target.value)}
                placeholder="Descripción"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Preguntas frecuentes (Home + Ditto)</h3>
          <Button type="button" size="sm" variant="outline" onClick={addFaq}>
            <Plus className="size-3.5" />
            Agregar FAQ
          </Button>
        </div>
        <div className="space-y-3">
          {home.faqs.map((faq, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={faq.pregunta}
                  onChange={(e) => updateFaq(idx, "pregunta", e.target.value)}
                  placeholder="Pregunta"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => removeFaq(idx)}
                  aria-label="Eliminar FAQ"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={faq.respuesta}
                onChange={(e) => updateFaq(idx, "respuesta", e.target.value)}
                placeholder="Respuesta"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Label>Texto del pie de página</Label>
        <Input
          value={home.footerText}
          onChange={(e) => setHome({ ...home, footerText: e.target.value })}
        />
      </div>

      <Button type="button" onClick={handleSave} disabled={isPending} className="gap-1.5">
        <Save className="size-4" />
        {isPending ? "Guardando…" : "Guardar contenidos del sitio"}
      </Button>
    </div>
  );
}

const EXTRA_MODULE_INFO: Record<ExtraAppModuleKey, { title: string; description: string }> = {
  monitoreo: {
    title: "Monitoreo de videos",
    description: "Módulo /app/monitoreo, tabla de producción y tarjeta en Dashboard.",
  },
  bolsa: {
    title: "Bolsa de Empleo y Ranking",
    description: "Módulo /app/bolsa, vacantes, skills y entrevistas en vivo.",
  },
  configuracion: {
    title: "Configuración y Perfil",
    description: "Módulo /app/configuracion en Soporte y enlace Mi perfil.",
  },
};

function isExtraModule(mod: AppModuleKey): mod is ExtraAppModuleKey {
  return (EXTRA_APP_MODULES as readonly string[]).includes(mod);
}

export function PermissionsTab({
  initialPermissions,
  initialDittoPublic,
}: {
  initialPermissions: PlatformConfig["permissions"];
  initialDittoPublic: boolean;
}) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [dittoPublic, setDittoPublic] = useState(initialDittoPublic);
  const [isPending, startTransition] = useTransition();

  function togglePublicModule(mod: ExtraAppModuleKey) {
    setPermissions((prev) => ({
      ...prev,
      publicModules: {
        ...prev.publicModules,
        [mod]: !prev.publicModules[mod],
      },
    }));
  }

  function toggleModule(role: ConfigurableRole, mod: AppModuleKey) {
    if (mod === "dashboard") return;
    setPermissions((prev) => {
      const current = prev.roles[role].modules;
      const nextModules = current.includes(mod)
        ? current.filter((m) => m !== mod)
        : [...current, mod];
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [role]: { ...prev.roles[role], modules: nextModules },
        },
      };
    });
  }

  function toggleCapability(
    role: ConfigurableRole,
    key: "canCreateClients" | "canCreateVideos" | "canDeleteOwnVideos" | "canInviteMembers",
  ) {
    setPermissions((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: { ...prev.roles[role], [key]: !prev.roles[role][key] },
      },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const res = await savePermissionsAction(permissions, dittoPublic);
      if (res.ok) toast.success("Permisos y visibilidad pública guardados.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">
            Visibilidad pública de módulos y funciones extra
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Los demás usuarios siempre ven lo básico (<strong>Dashboard</strong>,{" "}
            <strong>Clientes</strong>, <strong>Calendario</strong>, <strong>Métricas</strong> y en
            Soporte <strong>Equipo</strong>). Todo lo demás solo lo ve el Super Admin hasta que
            decidas mostrarlo al público activándolo aquí:
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {EXTRA_APP_MODULES.map((mod) => {
            const visible = permissions.publicModules[mod];
            const info = EXTRA_MODULE_INFO[mod];
            return (
              <label
                key={mod}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    checked={visible}
                    onCheckedChange={() => togglePublicModule(mod)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{info.title}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                <Badge variant={visible ? "default" : "secondary"} className="shrink-0 gap-1">
                  {visible ? <Eye className="size-3" /> : <Lock className="size-3" />}
                  {visible ? "Público" : "Solo Super Admin"}
                </Badge>
              </label>
            );
          })}

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={permissions.publicPortfolios}
                onCheckedChange={(v) =>
                  setPermissions({ ...permissions, publicPortfolios: Boolean(v) })
                }
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Espacios Públicos y Portafolios</p>
                <p className="text-xs text-muted-foreground">
                  Páginas públicas /p/[slug] y editor de portafolio en Configuración.
                </p>
              </div>
            </div>
            <Badge
              variant={permissions.publicPortfolios ? "default" : "secondary"}
              className="shrink-0 gap-1"
            >
              {permissions.publicPortfolios ? <Eye className="size-3" /> : <Lock className="size-3" />}
              {permissions.publicPortfolios ? "Público" : "Solo Super Admin"}
            </Badge>
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={dittoPublic}
                onCheckedChange={(v) => setDittoPublic(Boolean(v))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Asistente Ditto</p>
                <p className="text-xs text-muted-foreground">
                  Widget y consultas IA de Ditto para todos los usuarios y público.
                </p>
              </div>
            </div>
            <Badge variant={dittoPublic ? "default" : "secondary"} className="shrink-0 gap-1">
              {dittoPublic ? <Eye className="size-3" /> : <Lock className="size-3" />}
              {dittoPublic ? "Público" : "Solo Super Admin"}
            </Badge>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Registro público abierto (/crear-espacio)</h3>
          <p className="text-xs text-muted-foreground">
            Si lo desactivas, nadie podrá crear espacios nuevos libremente; solo podrán entrar cuentas
            existentes o por invitación.
          </p>
        </div>
        <Checkbox
          checked={permissions.allowSelfSignup}
          onCheckedChange={(v) => setPermissions({ ...permissions, allowSelfSignup: Boolean(v) })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["admin", "editor", "viewer"] as ConfigurableRole[]).map((role) => {
          const rule = permissions.roles[role];
          return (
            <div key={role} className="space-y-4 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{ROLE_NAMES[role]}</h3>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Secciones visibles</p>
                {ALL_APP_MODULES.map((mod) => {
                  const blockedByGlobal =
                    isExtraModule(mod) && !permissions.publicModules[mod];
                  return (
                    <label key={mod} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={rule.modules.includes(mod)}
                        disabled={mod === "dashboard"}
                        onCheckedChange={() => toggleModule(role, mod)}
                      />
                      <span>{MODULE_LABELS[mod]}</span>
                      {blockedByGlobal && (
                        <span className="text-[10px] text-muted-foreground">(Solo Super Admin)</span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Capacidades operativas</p>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={rule.canCreateClients}
                    onCheckedChange={() => toggleCapability(role, "canCreateClients")}
                  />
                  <span>Puede crear/activar clientes</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={rule.canCreateVideos}
                    onCheckedChange={() => toggleCapability(role, "canCreateVideos")}
                  />
                  <span>Puede registrar videos</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={rule.canDeleteOwnVideos}
                    onCheckedChange={() => toggleCapability(role, "canDeleteOwnVideos")}
                  />
                  <span>Puede eliminar sus videos</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={rule.canInviteMembers}
                    onCheckedChange={() => toggleCapability(role, "canInviteMembers")}
                  />
                  <span>Puede invitar/gestionar equipo</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        El Super Admin (jockersnniper@gmail.com) siempre ve y controla todos los módulos y funciones.
        El propietario (owner) de cada espacio ve los módulos básicos más los que publiques arriba.
      </p>

      <Button type="button" onClick={handleSave} disabled={isPending} className="gap-1.5">
        <Save className="size-4" />
        {isPending ? "Guardando…" : "Guardar permisos globales"}
      </Button>
    </div>
  );
}
