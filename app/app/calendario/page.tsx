import { createClient, getServerUser } from "@/lib/supabase/server";
import { requireModuleAccess, resolveActivePeriod } from "@/lib/period/resolve";
import { CalendarioClient } from "@/components/app/calendario/calendario-client";
import { GoogleErrorAlert } from "@/components/shared/google-error-alert";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string; google_error_detail?: string }>;
}) {
  const [{ google_error: googleError, google_error_detail: googleErrorDetail }, { organization: org }, user] =
    await Promise.all([
      searchParams,
      requireModuleAccess("calendario"),
      getServerUser(),
    ]);
  const activePeriod = await resolveActivePeriod(org.id);
  const supabase = await createClient();

  const hoy = new Date();

  const [{ data: eventos }, { data: miembros }, { data: googleConnection }] = await Promise.all([
    activePeriod
      ? supabase
          .from("v_calendar_events_full")
          .select("*")
          .eq("period_id", activePeriod.id)
          .order("start_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("memberships")
      .select("id, full_name, email, role")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("google_oauth_tokens")
      .select("google_email, refresh_token, expires_at")
      .eq("membership_id", org.membershipId)
      .maybeSingle(),
  ]);

  const googleConectado = Boolean(
    googleConnection &&
      (googleConnection.refresh_token ||
        new Date(googleConnection.expires_at).getTime() > Date.now()),
  );

  const puedeEditar = org.role === "owner" || org.role === "admin";
  const ownerMembership = (miembros ?? []).find((m) => m.role === "owner");

  // Solo los eventos reales tienen fila en event_attendees (los virtuales
  // "delivery-*" se sintetizan desde videos y no existen en calendar_events).
  const eventIds = (eventos ?? []).filter((e) => !e.is_virtual).map((e) => e.id);
  const [{ data: attendeeRows }, { data: meetingRows }] = eventIds.length
    ? await Promise.all([
        supabase.from("event_attendees").select("event_id, membership_id, email").in("event_id", eventIds),
        supabase.from("calendar_events").select("id, meeting_url").in("id", eventIds),
      ])
    : [
        { data: [] as { event_id: string; membership_id: string | null; email: string }[] },
        { data: [] as { id: string; meeting_url: string | null }[] },
      ];

  // El "responsable" visible es el asistente que no es el propietario (el
  // propietario siempre queda como asistente para recibir todos los avisos).
  // Los asistentes sin membership_id son invitados externos (correos sueltos).
  const asignadoPorEvento: Record<string, string> = {};
  const invitadosPorEvento: Record<string, string[]> = {};
  for (const row of attendeeRows ?? []) {
    if (
      row.membership_id &&
      row.membership_id !== ownerMembership?.id &&
      !asignadoPorEvento[row.event_id]
    ) {
      asignadoPorEvento[row.event_id] = row.membership_id;
      continue;
    }
    if (
      row.email &&
      row.membership_id !== ownerMembership?.id &&
      row.membership_id !== asignadoPorEvento[row.event_id]
    ) {
      invitadosPorEvento[row.event_id] = [...(invitadosPorEvento[row.event_id] ?? []), row.email];
    }
  }

  const conMeetPorEvento: Record<string, boolean> = {};
  const meetUrlPorEvento: Record<string, string> = {};
  for (const row of meetingRows ?? []) {
    if (row.meeting_url && !row.meeting_url.includes("meet.jit.si")) {
      conMeetPorEvento[row.id] = true;
      meetUrlPorEvento[row.id] = row.meeting_url;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <GoogleErrorAlert
        error={googleError}
        detail={googleErrorDetail}
        accountEmail={user?.email ?? undefined}
      />
      <CalendarioClient
        periodId={activePeriod?.id ?? null}
        periodLabel={activePeriod?.label ?? null}
        year={activePeriod?.year ?? hoy.getFullYear()}
        month={activePeriod?.month ?? hoy.getMonth() + 1}
        timezone={org.timezone}
        eventos={eventos ?? []}
        miembros={miembros ?? []}
        asignadoPorEvento={asignadoPorEvento}
        invitadosPorEvento={invitadosPorEvento}
        conMeetPorEvento={conMeetPorEvento}
        meetUrlPorEvento={meetUrlPorEvento}
        googleConectado={googleConectado}
        accountEmail={user?.email ?? undefined}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
