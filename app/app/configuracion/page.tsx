import { GoogleCalendarConnection } from "@/components/settings/google-calendar-connection";
import { PortfolioLandingEditor } from "@/components/settings/portfolio-landing-editor";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { GoogleErrorAlert } from "@/components/shared/google-error-alert";
import { getOrPrepareMyPortfolios } from "@/lib/portfolio/store";
import { getPlatformConfig } from "@/lib/platform/config";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import { appUrl } from "@/lib/supabase/env";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { requireModuleAccess } from "@/lib/period/resolve";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string; google_error_detail?: string }>;
}) {
  const [
    { google_error: googleError, google_error_detail: googleErrorDetail },
    { organization: org },
    user,
    platformConfig,
    isSuperAdmin,
  ] = await Promise.all([
    searchParams,
    requireModuleAccess("configuracion"),
    getServerUser(),
    getPlatformConfig(),
    isCurrentUserSuperAdmin(),
  ]);
  const showPortfolioSection = isSuperAdmin || platformConfig.permissions.publicPortfolios;
  const puedeGestionar = org.role === "owner" || org.role === "admin";
  const supabase = await createClient();

  const [{ data: googleConnection }, { data: perfil }, { data: orgRow }] = await Promise.all([
    supabase.from("google_oauth_tokens").select("google_email").eq("membership_id", org.membershipId).maybeSingle(),
    supabase
      .from("memberships")
      .select("full_name, avatar_url, bio, phone")
      .eq("id", org.membershipId)
      .maybeSingle(),
    supabase.from("organizations").select("slug").eq("id", org.id).maybeSingle(),
  ]);

  const miCorreo = user?.email ?? "";
  const { agencyPortfolio, creatorPortfolio } = user
    ? await getOrPrepareMyPortfolios({
        userId: user.id,
        userEmail: miCorreo,
        memberName: perfil?.full_name || org.memberName || miCorreo,
        avatarUrl: perfil?.avatar_url ?? org.avatarUrl,
        bio: perfil?.bio ?? null,
        phone: perfil?.phone ?? null,
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: orgRow?.slug ?? null,
        canManageAgency: puedeGestionar,
      })
    : { agencyPortfolio: null, creatorPortfolio: null };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Mi perfil</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Tu nombre y tu foto son los que aparecen en la app. La biografía y el teléfono son
          opcionales.
        </p>
        <ProfileSettings
          userId={user?.id ?? ""}
          email={miCorreo}
          fullName={perfil?.full_name ?? ""}
          avatarUrl={perfil?.avatar_url ?? null}
          bio={perfil?.bio ?? null}
          phone={perfil?.phone ?? null}
          puedeEditarNombre={puedeGestionar}
        />
      </section>

      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Integración de Google</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Conecta <span className="font-medium text-foreground">tu cuenta de Google</span> (el
          mismo correo con el que ingresas a EditFlow). Es la cuenta donde se sincronizan tus
          eventos y reuniones con Google Meet.
        </p>

        {googleError && (
          <div className="mt-3">
            <GoogleErrorAlert
              error={googleError}
              detail={googleErrorDetail}
              accountEmail={miCorreo}
              showSettingsLink={false}
            />
          </div>
        )}

        <div className="mt-4">
          <GoogleCalendarConnection
            connected={Boolean(googleConnection)}
            googleEmail={googleConnection?.google_email}
            accountEmail={miCorreo}
          />
        </div>
        {googleConnection && (
          <p className="mt-3 text-xs text-muted-foreground">
            También funciona al revés: un evento creado directo en tu Google Calendar (o por Siri)
            se importa acá solo si el título o la descripción tiene la palabra{" "}
            <span className="font-mono text-foreground">Flow</span> — así ningún evento personal se
            mezcla con el del equipo. Se revisa cada 10 minutos.
          </p>
        )}
      </section>

      {showPortfolioSection && creatorPortfolio && (
        <section className="rounded-xl border border-border/70 bg-card/60 p-5">
          <PortfolioLandingEditor
            agencyPortfolio={agencyPortfolio}
            creatorPortfolio={creatorPortfolio}
            appBaseUrl={appUrl()}
          />
        </section>
      )}
    </div>
  );
}
