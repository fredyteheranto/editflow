import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { getPlatformConfig } from "@/lib/platform/config";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import {
  ALL_APP_MODULES,
  BASIC_APP_MODULES,
  EXTRA_APP_MODULES,
  type AppModuleKey,
  type ConfigurableRole,
  type RolePermissionRule,
} from "@/lib/platform/types";
import type { Database } from "@/types/database.types";

export const ACTIVE_PERIOD_COOKIE = "editflow_periodo";

export interface ActiveOrganization {
  id: string;
  name: string;
  role: Database["public"]["Enums"]["member_role"];
  timezone: string;
  ownerEmail: string;
  /** Id de la membresía del usuario actual en esta organización. */
  membershipId: string;
  memberName: string;
  avatarUrl: string | null;
}

export interface ActivePeriod {
  id: string;
  label: string;
  year: number;
  month: number;
  status: Database["public"]["Enums"]["period_status"];
}

/**
 * MVP: toma la primera organización activa del usuario (memoizada por request).
 * Incluye nombre y avatar de la membresía para evitar consultar `memberships`
 * por separado en el layout.
 */
export const requireActiveOrganization = cache(async (): Promise<ActiveOrganization> => {
  const user = await getServerUser();

  if (!user) {
    redirect("/crear-espacio");
  }

  const supabase = await createClient();

  // Filtrar por user_id es CRÍTICO: RLS deja ver todas las membresías de la
  // organización, así que sin esto .limit(1) podía devolver la membresía de
  // otro miembro.
  const { data } = await supabase
    .from("memberships")
    .select("id, role, full_name, avatar_url, organizations(id, name, timezone, owner_email)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const org = data?.organizations as unknown as
    | { id: string; name: string; timezone: string; owner_email: string }
    | null
    | undefined;

  if (!data || !org) {
    redirect("/crear-espacio/espacio");
  }

  return {
    id: org.id,
    name: org.name,
    role: data.role,
    timezone: org.timezone,
    ownerEmail: org.owner_email,
    membershipId: data.id,
    memberName:
      data.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Usuario",
    avatarUrl: data.avatar_url ?? null,
  };
});

export const listPeriods = cache(async (organizationId: string): Promise<ActivePeriod[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("periods")
    .select("id, label, year, month, status")
    .eq("organization_id", organizationId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return data ?? [];
});

export const resolveActivePeriod = cache(
  async (organizationId: string, requestedPeriodId?: string): Promise<ActivePeriod | null> => {
    const periods = await listPeriods(organizationId);
    if (periods.length === 0) return null;

    if (requestedPeriodId) {
      const match = periods.find((p) => p.id === requestedPeriodId);
      if (match) return match;
    }

    const cookieStore = await cookies();
    const cookiePeriodId = cookieStore.get(ACTIVE_PERIOD_COOKIE)?.value;
    if (cookiePeriodId) {
      const match = periods.find((p) => p.id === cookiePeriodId);
      if (match) return match;
    }

    return periods.find((p) => p.status === "abierto") ?? periods[0];
  },
);

const OWNER_FULL_RULE: RolePermissionRule = {
  modules: [...ALL_APP_MODULES],
  canCreateClients: true,
  canCreateVideos: true,
  canDeleteOwnVideos: true,
  canInviteMembers: true,
};

export const getEffectiveRolePermissions = cache(async (): Promise<RolePermissionRule> => {
  const [org, config, isSuperAdmin] = await Promise.all([
    requireActiveOrganization(),
    getPlatformConfig(),
    isCurrentUserSuperAdmin(),
  ]);

  if (isSuperAdmin) {
    return OWNER_FULL_RULE;
  }

  const publiclyAllowedExtras = EXTRA_APP_MODULES.filter(
    (mod) => config.permissions.publicModules[mod],
  );
  const allowedPool = new Set<AppModuleKey>([
    ...BASIC_APP_MODULES,
    ...publiclyAllowedExtras,
  ]);

  if (org.role === "owner") {
    return {
      ...OWNER_FULL_RULE,
      modules: ALL_APP_MODULES.filter((mod) => allowedPool.has(mod)),
    };
  }

  const roleRule = config.permissions.roles[org.role as ConfigurableRole] ?? OWNER_FULL_RULE;
  const filteredModules = roleRule.modules.filter((mod) => allowedPool.has(mod));
  return {
    ...roleRule,
    modules: filteredModules.includes("dashboard")
      ? filteredModules
      : ["dashboard", ...filteredModules],
  };
});

export async function requireModuleAccess(moduleKey: AppModuleKey) {
  const [org, perms] = await Promise.all([
    requireActiveOrganization(),
    getEffectiveRolePermissions(),
  ]);

  if (moduleKey !== "dashboard" && !perms.modules.includes(moduleKey)) {
    redirect("/app/dashboard");
  }

  return { organization: org, permissions: perms };
}
