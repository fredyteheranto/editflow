import { createClient, getServerUser } from "@/lib/supabase/server";
import { requireModuleAccess } from "@/lib/period/resolve";
import { EquipoClient } from "@/components/app/equipo/equipo-client";

export default async function EquipoPage() {
  const [{ organization: org, permissions }, user] = await Promise.all([
    requireModuleAccess("equipo"),
    getServerUser(),
  ]);
  const supabase = await createClient();

  const [{ data: miembros }, { data: invitaciones }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, full_name, email, role, avatar_url")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("role")
      .order("full_name"),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at, token")
      .eq("organization_id", org.id)
      .eq("status", "pendiente")
      .order("created_at", { ascending: false }),
  ]);

  const puedeGestionar =
    (org.role === "owner" || org.role === "admin") && permissions.canInviteMembers;

  return (
    <EquipoClient
      organizationId={org.id}
      miembros={miembros ?? []}
      invitaciones={invitaciones ?? []}
      currentUserEmail={user?.email ?? null}
      puedeGestionar={puedeGestionar}
    />
  );
}
