import Link from "next/link";
import { createClient, getServerUser } from "@/lib/supabase/server";
import {
  getEffectiveRolePermissions,
  listPeriods,
  requireActiveOrganization,
  resolveActivePeriod,
} from "@/lib/period/resolve";
import { getPlatformConfig } from "@/lib/platform/config";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import { DittoRoleBridge } from "@/components/ditto/ditto-context";
import { signOutAction } from "@/lib/actions/auth";
import { ShieldAlert } from "lucide-react";
import { currentYearMonthInTimezone } from "@/lib/utils/dates";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { GoogleConnectBanner } from "@/components/shared/google-connect-banner";
import { RealtimeRefresher } from "@/components/app/realtime-refresher";
import { PeriodSwitcher } from "@/components/period/period-switcher";
import { OpenCurrentMonthBanner } from "@/components/period/open-current-month-banner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Espacio de trabajo",
  robots: NOINDEX_ROBOTS,
};

// Todo lo que cuelga de /app depende de datos que mutan por acción del
// usuario (videos, periodos, clientes...) — nunca debe quedar estático ni
// cacheado, para que un cambio se refleje de inmediato sin tener que abrir
// una pestaña nueva/incógnita.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireActiveOrganization();
  const supabase = await createClient();

  const [
    periods,
    activePeriod,
    { data: notificaciones },
    platformConfig,
    isSuperAdmin,
    permissions,
    { data: googleToken },
    user,
  ] = await Promise.all([
    listPeriods(organization.id),
    resolveActivePeriod(organization.id),
    supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at, type")
      .eq("membership_id", organization.membershipId)
      .order("created_at", { ascending: false })
      .limit(30),
    getPlatformConfig(),
    isCurrentUserSuperAdmin(),
    getEffectiveRolePermissions(),
    supabase
      .from("google_oauth_tokens")
      .select("membership_id, refresh_token, expires_at")
      .eq("membership_id", organization.membershipId)
      .maybeSingle(),
    getServerUser(),
  ]);

  if (platformConfig.site.maintenanceMode && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">EditFlow en mantenimiento</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {platformConfig.site.maintenanceMessage}
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  const memberName = organization.memberName;

  const canManagePeriods = organization.role === "owner" || organization.role === "admin";

  const { year: currentYear, month: currentMonth } = currentYearMonthInTimezone(organization.timezone);
  const currentMonthOpen = periods.some((p) => p.year === currentYear && p.month === currentMonth);
  const banner = platformConfig.site.announcementBanner;

  const googleMissing = !googleToken;
  const googleExpired =
    Boolean(googleToken) &&
    !googleToken?.refresh_token &&
    new Date(googleToken!.expires_at).getTime() <= Date.now();
  const needsGoogleConnect = googleMissing || googleExpired;

  return (
    <SidebarProvider>
      <DittoRoleBridge role={isSuperAdmin ? "super_admin" : organization.role} />
      <RealtimeRefresher organizationId={organization.id} />
      <AppSidebar
        memberName={memberName}
        avatarUrl={organization.avatarUrl}
        membershipId={organization.membershipId}
        notificaciones={notificaciones ?? []}
        allowedModules={permissions.modules}
        isSuperAdmin={isSuperAdmin}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <PeriodSwitcher
            periods={periods}
            activePeriodId={activePeriod?.id ?? null}
            canManage={canManagePeriods}
          />
          {activePeriod?.status === "cerrado" && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Mes cerrado — solo lectura
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {banner.enabled && banner.text.trim() && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs ${
              banner.tone === "warning"
                ? "bg-warning/15 text-warning"
                : banner.tone === "success"
                  ? "bg-success/15 text-success"
                  : "bg-primary/10 text-primary"
            }`}
          >
            <span>{banner.text}</span>
            {banner.linkHref && banner.linkLabel && (
              <Link href={banner.linkHref} className="font-semibold underline underline-offset-2">
                {banner.linkLabel}
              </Link>
            )}
          </div>
        )}

        {!currentMonthOpen && canManagePeriods && (
          <OpenCurrentMonthBanner organizationId={organization.id} year={currentYear} month={currentMonth} />
        )}

        {needsGoogleConnect && (
          <GoogleConnectBanner
            accountEmail={user?.email ?? undefined}
            role={organization.role}
            reason={googleExpired ? "expired" : "not_connected"}
            canOpenSettings={permissions.modules.includes("configuracion")}
          />
        )}

        {!activePeriod ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="text-lg font-medium">Aún no tienes ningún mes abierto</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Abre tu primer mes para empezar a registrar clientes y videos.
            </p>
            <Link
              href="/app/periodos/nuevo"
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Abrir mi primer mes
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
