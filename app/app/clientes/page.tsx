import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModuleAccess, resolveActivePeriod } from "@/lib/period/resolve";
import { ComingSoon } from "@/components/shared/coming-soon";
import { RegisterClientSheet } from "@/components/clients/register-client-sheet";
import { ActivateExistingClient } from "@/components/clients/activate-existing-client";
import { ClientGrid } from "@/components/clients/client-grid";
import type { ClientFull } from "@/components/clients/edit-client-sheet";

export default async function ClientesPage() {
  const { organization, permissions } = await requireModuleAccess("clientes");
  const activePeriod = await resolveActivePeriod(organization.id);

  if (!activePeriod) {
    return (
      <ComingSoon
        icon={Users}
        title="Sin periodo activo"
        description="Abre un mes desde el selector superior para empezar a registrar clientes."
      />
    );
  }

  const supabase = await createClient();

  const [{ data: summary }, { data: activeClientIds }, { data: allClients }] = await Promise.all([
    supabase.from("v_client_summary").select("*").eq("period_id", activePeriod.id).order("cliente"),
    supabase.from("client_periods").select("client_id").eq("period_id", activePeriod.id).eq("active", true),
    supabase
      .from("clients")
      .select(
        "id, name, default_monthly_goal, brand_name, industry, contact_name, contact_email, contact_phone, social_links, brand_description, target_audience, do_not_do, delivery_formats, default_strategist, assets_drive_url, notes",
      )
      .eq("organization_id", organization.id)
      .eq("status", "activo")
      .order("name"),
  ]);

  const activeIds = new Set((activeClientIds ?? []).map((c) => c.client_id));
  const inactiveClients = (allClients ?? []).filter((c) => !activeIds.has(c.id));
  // Estratega (viewer) gestiona clientes y briefs igual que owner/admin,
  // pero no puede eliminarlos (ver canDelete en EditClientSheet).
  const canManage = organization.role === "owner" || organization.role === "admin" || organization.role === "viewer";
  const canDelete = organization.role === "owner" || organization.role === "admin";
  const clientsById = Object.fromEntries(
    (allClients ?? []).map((c) => [c.id, c as unknown as ClientFull]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{activePeriod.label}</p>
        </div>
        <div className="flex gap-2">
          {canManage && permissions.canCreateClients && (
            <ActivateExistingClient
              organizationId={organization.id}
              periodId={activePeriod.id}
              candidates={inactiveClients}
            />
          )}
          {permissions.canCreateClients && (
            <RegisterClientSheet organizationId={organization.id} periodId={activePeriod.id} />
          )}
        </div>
      </div>

      {!summary || summary.length === 0 ? (
        <ComingSoon
          icon={Users}
          title="Sin clientes este mes"
          description="Registra tu primer cliente o activa uno de tu cartera histórica para empezar."
        />
      ) : (
        <ClientGrid summary={summary} clientsById={clientsById} canManage={canManage} canDelete={canDelete} />
      )}
    </div>
  );
}
