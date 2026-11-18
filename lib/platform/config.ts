import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ALL_APP_MODULES,
  DEFAULT_PLATFORM_CONFIG,
  EXTRA_APP_MODULES,
  type ConfigurableRole,
  type ExtraAppModuleKey,
  type PlatformConfig,
  type RolePermissionRule,
} from "@/lib/platform/types";

const CONFIG_BUCKET = "editflow-platform";
const CONFIG_OBJECT_PATH = "site-config.json";
const CACHE_TTL_MS = 15_000;

let memoryCache: { config: PlatformConfig; loadedAt: number } | null = null;

function mergeRoleRule(
  base: RolePermissionRule,
  incoming?: Partial<RolePermissionRule>,
): RolePermissionRule {
  const validModules = Array.isArray(incoming?.modules)
    ? incoming.modules.filter((m): m is RolePermissionRule["modules"][number] =>
        ALL_APP_MODULES.includes(m),
      )
    : base.modules;

  return {
    modules: validModules.includes("dashboard") ? validModules : ["dashboard", ...validModules],
    canCreateClients: incoming?.canCreateClients ?? base.canCreateClients,
    canCreateVideos: incoming?.canCreateVideos ?? base.canCreateVideos,
    canDeleteOwnVideos: incoming?.canDeleteOwnVideos ?? base.canDeleteOwnVideos,
    canInviteMembers: incoming?.canInviteMembers ?? base.canInviteMembers,
  };
}

export function normalizePlatformConfig(raw: Partial<PlatformConfig> | null | undefined): PlatformConfig {
  if (!raw) return structuredClone(DEFAULT_PLATFORM_CONFIG);

  const roles: Record<ConfigurableRole, RolePermissionRule> = {
    admin: mergeRoleRule(DEFAULT_PLATFORM_CONFIG.permissions.roles.admin, raw.permissions?.roles?.admin),
    editor: mergeRoleRule(DEFAULT_PLATFORM_CONFIG.permissions.roles.editor, raw.permissions?.roles?.editor),
    viewer: mergeRoleRule(DEFAULT_PLATFORM_CONFIG.permissions.roles.viewer, raw.permissions?.roles?.viewer),
  };

  const publicModules = Object.fromEntries(
    EXTRA_APP_MODULES.map((mod) => [
      mod,
      typeof raw.permissions?.publicModules?.[mod] === "boolean"
        ? raw.permissions.publicModules[mod]
        : DEFAULT_PLATFORM_CONFIG.permissions.publicModules[mod],
    ]),
  ) as Record<ExtraAppModuleKey, boolean>;

  return {
    site: {
      ...DEFAULT_PLATFORM_CONFIG.site,
      ...raw.site,
      announcementBanner: {
        ...DEFAULT_PLATFORM_CONFIG.site.announcementBanner,
        ...raw.site?.announcementBanner,
      },
    },
    home: {
      ...DEFAULT_PLATFORM_CONFIG.home,
      ...raw.home,
      modules:
        Array.isArray(raw.home?.modules) && raw.home.modules.length > 0
          ? raw.home.modules
          : DEFAULT_PLATFORM_CONFIG.home.modules,
      faqs: Array.isArray(raw.home?.faqs) ? raw.home.faqs : DEFAULT_PLATFORM_CONFIG.home.faqs,
    },
    permissions: {
      allowSelfSignup:
        raw.permissions?.allowSelfSignup ?? DEFAULT_PLATFORM_CONFIG.permissions.allowSelfSignup,
      publicModules,
      publicPortfolios:
        typeof raw.permissions?.publicPortfolios === "boolean"
          ? raw.permissions.publicPortfolios
          : DEFAULT_PLATFORM_CONFIG.permissions.publicPortfolios,
      roles,
    },
    ditto: {
      ...DEFAULT_PLATFORM_CONFIG.ditto,
      ...raw.ditto,
      publicEnabled:
        typeof raw.ditto?.publicEnabled === "boolean"
          ? raw.ditto.publicEnabled
          : DEFAULT_PLATFORM_CONFIG.ditto.publicEnabled,
      customGuides: Array.isArray(raw.ditto?.customGuides)
        ? raw.ditto.customGuides
        : DEFAULT_PLATFORM_CONFIG.ditto.customGuides,
    },
    superAdminEmails: [],
  };
}

/**
 * Lee la configuración global de la plataforma desde Supabase Storage privado
 * (con caché corta en memoria para no penalizar la navegación). Si aún no
 * existe archivo guardado, devuelve la configuración por defecto.
 */
export async function getPlatformConfig(forceFresh = false): Promise<PlatformConfig> {
  if (!forceFresh && memoryCache && Date.now() - memoryCache.loadedAt < CACHE_TTL_MS) {
    return memoryCache.config;
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage.from(CONFIG_BUCKET).download(CONFIG_OBJECT_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text) as Partial<PlatformConfig>;
      const normalized = normalizePlatformConfig(parsed);
      memoryCache = { config: normalized, loadedAt: Date.now() };
      return normalized;
    }
  } catch (err) {
    console.warn("[platform-config] usando valores por defecto:", err);
  }

  const fallback = normalizePlatformConfig(null);
  memoryCache = { config: fallback, loadedAt: Date.now() };
  return fallback;
}

/**
 * Persiste la configuración global en Supabase Storage privado (creando el
 * bucket si es la primera vez) y limpia inmediatamente la caché en memoria.
 */
export async function savePlatformConfig(nextConfig: PlatformConfig): Promise<PlatformConfig> {
  const normalized = normalizePlatformConfig(nextConfig);
  const admin = createServiceRoleClient();

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((b) => b.name === CONFIG_BUCKET);
  if (!exists) {
    const { error: bucketErr } = await admin.storage.createBucket(CONFIG_BUCKET, {
      public: false,
      allowedMimeTypes: ["application/json"],
    });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      throw new Error(`No se pudo preparar almacenamiento de configuración: ${bucketErr.message}`);
    }
  }

  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const { error: uploadErr } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(CONFIG_OBJECT_PATH, blob, { upsert: true, contentType: "application/json" });

  if (uploadErr) {
    throw new Error(`No se pudo guardar la configuración global: ${uploadErr.message}`);
  }

  memoryCache = { config: normalized, loadedAt: Date.now() };
  return normalized;
}
