import { createServiceRoleClient } from "@/lib/supabase/server";
import { ROOT_SUPER_ADMIN_EMAILS, isSuperAdminEmail, requireSuperAdmin } from "@/lib/platform/auth";
import { getPlatformConfig } from "@/lib/platform/config";
import { SuperAdminClient } from "@/components/super-admin/super-admin-client";
import { DittoRoleBridge } from "@/components/ditto/ditto-context";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Super Admin",
  robots: NOINDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  const admin = createServiceRoleClient();
  const [
    config,
    { data: orgs },
    { data: memberships },
    { data: invitations },
    { data: authUsersData },
    { count: clientsCount },
    { count: videosCount },
  ] = await Promise.all([
    getPlatformConfig(true),
    admin
      .from("organizations")
      .select("id, name, slug, owner_email, timezone, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("memberships")
      .select("id, organization_id, user_id, email, full_name, role, active")
      .order("created_at", { ascending: false }),
    admin
      .from("invitations")
      .select("id, organization_id, email, full_name, role, status, token, created_at, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("clients").select("id", { count: "exact", head: true }),
    admin.from("videos").select("id", { count: "exact", head: true }),
  ]);

  const authUsers = authUsersData?.users ?? [];
  const mappedUsers = await Promise.all(
    authUsers.map(async (u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
      providers: Array.isArray(u.app_metadata?.providers)
        ? (u.app_metadata.providers as string[])
        : [],
      confirmed: Boolean(u.email_confirmed_at),
      lastSignInAt: u.last_sign_in_at ?? null,
      isSuperAdmin: await isSuperAdminEmail(u.email),
    })),
  );

  const mappedInvitations = (invitations ?? []).map((inv) => ({
    id: inv.id,
    organization_id: inv.organization_id,
    organizationName: (inv.organizations as unknown as { name: string } | null)?.name ?? "—",
    email: inv.email,
    full_name: inv.full_name,
    role: inv.role,
    status: inv.status,
    token: inv.token,
    created_at: inv.created_at,
  }));

  const pendingInvitationsCount = mappedInvitations.filter((i) => i.status === "pendiente").length;

  return (
    <>
      <DittoRoleBridge role="super_admin" />
      <SuperAdminClient
        initialConfig={config}
        rootSuperAdmins={ROOT_SUPER_ADMIN_EMAILS}
        stats={{
          organizations: orgs?.length ?? 0,
          users: mappedUsers.length,
          activeMemberships: (memberships ?? []).filter((m) => m.active).length,
          clients: clientsCount ?? 0,
          videos: videosCount ?? 0,
          pendingInvitations: pendingInvitationsCount,
        }}
        organizations={orgs ?? []}
        memberships={memberships ?? []}
        users={mappedUsers}
        invitations={mappedInvitations}
      />
    </>
  );
}
