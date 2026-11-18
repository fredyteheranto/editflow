"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import {
  createGoogleCalendarEvent,
  createGoogleMeetingEvent,
  deleteGoogleCalendarEvent,
  type GoogleMeetingResult,
} from "@/lib/google/calendar";
import { GMAIL_SEND_SCOPE } from "@/lib/google/gmail";
import { sendEventNotificationEmail } from "@/lib/email/send-event-notification";
import { EVENT_TYPE_LABEL } from "@/lib/utils/event-type-label";
import type { EventType } from "@/types/database.types";

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  type: string;
  startAt: string; // ISO
  endAt: string; // ISO
  clientId?: string;
  videoId?: string;
  color?: string;
  assignedMembershipId?: string;
  /** Correos invitados a la reunión (equipo o externos). */
  guestEmails?: string[];
  /** Si true (por defecto en reuniones o con invitados), crea enlace de Google Meet. */
  withMeet?: boolean;
}

export type GoogleMeetStatus =
  | "created"
  | "not_requested"
  | "missing_google_connection"
  | "google_error";

export interface CreateCalendarEventResult {
  id: string;
  meetingUrl: string | null;
  meetProvider: "google" | null;
  googleMeetStatus: GoogleMeetStatus;
  googleCalendarLink: string | null;
  emailedCount: number;
  failedRecipients: string[];
}

export type CalendarActionResult =
  | {
      ok: true;
      meetingUrl?: string | null;
      meetProvider?: "google" | null;
      googleMeetStatus?: GoogleMeetStatus;
      googleCalendarLink?: string | null;
      emailedCount?: number;
      failedRecipients?: string[];
    }
  | { ok: false; error: string };

export interface UpdateCalendarEventInput extends CreateCalendarEventInput {
  id: string;
}

interface Miembro {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  notify_calendar: boolean;
}

function formatDateTimeEs(iso: string, timezone: string) {
  const date = new Date(iso);
  const dateLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return { dateLabel, timeLabel };
}

function dedupAsistentes(lista: (Miembro | undefined)[]): Miembro[] {
  return lista.filter(
    (m, i, arr): m is Miembro =>
      Boolean(m) && arr.findIndex((x) => x?.email.toLowerCase() === m?.email.toLowerCase()) === i,
  );
}

function normalizarInvitados(guestEmails?: string[]): string[] {
  const tokens = (guestEmails ?? []).flatMap((entry) => entry.split(/[\s,;]+/));
  return Array.from(
    new Set(
      tokens
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  );
}

function resolveCreatorMember(
  miembros: Miembro[] | null,
  membershipId: string,
  userEmail?: string | null,
): Miembro | undefined {
  if (!miembros) return undefined;
  return (
    miembros.find((m) => m.id === membershipId) ??
    (userEmail
      ? miembros.find((m) => m.email.toLowerCase() === userEmail.toLowerCase())
      : undefined)
  );
}

function buildAttendeeRows(params: {
  eventId: string;
  miembros: Miembro[];
  asistentesEquipo: Miembro[];
  invitados: string[];
  esReunion: boolean;
}) {
  const memberByEmail = new Map(params.miembros.map((m) => [m.email.toLowerCase(), m]));
  const rowsByEmail = new Map<
    string,
    { event_id: string; membership_id?: string; email: string; notify: boolean }
  >();

  for (const m of params.asistentesEquipo) {
    const key = m.email.toLowerCase();
    rowsByEmail.set(key, {
      event_id: params.eventId,
      membership_id: m.id,
      email: m.email,
      notify: params.esReunion ? false : m.notify_calendar,
    });
  }

  for (const email of params.invitados) {
    if (rowsByEmail.has(email)) continue;
    const matchedMember = memberByEmail.get(email);
    rowsByEmail.set(email, {
      event_id: params.eventId,
      ...(matchedMember ? { membership_id: matchedMember.id } : {}),
      email,
      notify: false,
    });
  }

  return Array.from(rowsByEmail.values());
}

/**
 * Busca qué miembro (creador primero; si no tiene Google conectado, owner o
 * algún admin del mismo espacio) tiene token de Google Calendar activo.
 */
async function resolveGoogleCalendarOrganizerId(
  admin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  miembros: Miembro[],
  preferredMembershipId?: string,
): Promise<string | null> {
  const { data: orgTokens } = await admin
    .from("google_oauth_tokens")
    .select("membership_id")
    .eq("organization_id", organizationId);

  if (!orgTokens || orgTokens.length === 0) return null;
  const connectedIds = new Set(orgTokens.map((t) => t.membership_id));

  if (preferredMembershipId && connectedIds.has(preferredMembershipId)) {
    return preferredMembershipId;
  }

  const fallbackOwnerOrAdmin = miembros.find(
    (m) => (m.role === "owner" || m.role === "admin") && connectedIds.has(m.id),
  );
  return fallbackOwnerOrAdmin?.id ?? null;
}

async function resolveGoogleMeetingForEvent(params: {
  admin: ReturnType<typeof createServiceRoleClient>;
  organizationId: string;
  eventId: string;
  miembros: Miembro[];
  organizer?: Miembro;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  invitationEmails: string[];
  wantsMeet: boolean;
  existingGoogleMeetUrl?: string | null;
}): Promise<{
  meetingUrl: string | null;
  googleHtmlLink: string | null;
  meetProvider: "google" | null;
  googleMeetStatus: GoogleMeetStatus;
}> {
  const googleOrganizerId = await resolveGoogleCalendarOrganizerId(
    params.admin,
    params.organizationId,
    params.miembros,
    params.organizer?.id,
  );

  if (!googleOrganizerId) {
    const preserved =
      params.wantsMeet && params.existingGoogleMeetUrl?.includes("meet.google.com")
        ? params.existingGoogleMeetUrl
        : null;
    return {
      meetingUrl: preserved,
      googleHtmlLink: null,
      meetProvider: preserved ? "google" : null,
      googleMeetStatus: params.wantsMeet
        ? preserved
          ? "created"
          : "missing_google_connection"
        : "not_requested",
    };
  }

  let googleMeeting: GoogleMeetingResult | null = null;
  let apiFailed = false;

  try {
    googleMeeting = await createGoogleMeetingEvent(googleOrganizerId, {
      title: params.title,
      description: params.description,
      startAt: params.startAt,
      endAt: params.endAt,
      timeZone: params.timeZone,
      attendeeEmails: params.invitationEmails,
      withMeet: params.wantsMeet,
    });
    if (!googleMeeting) apiFailed = true;
  } catch (err) {
    apiFailed = true;
    console.warn("[calendar] Error al crear evento en Google Calendar/Meet:", err);
  }

  const preservedGoogleUrl =
    params.wantsMeet && params.existingGoogleMeetUrl?.includes("meet.google.com")
      ? params.existingGoogleMeetUrl
      : null;

  const meetingUrl = googleMeeting?.meetLink ?? preservedGoogleUrl ?? null;

  await params.admin
    .from("calendar_events")
    .update({
      ...(googleMeeting
        ? {
            google_event_id: googleMeeting.googleEventId,
            google_html_link: googleMeeting.htmlLink,
            google_organizer_membership_id: googleOrganizerId,
          }
        : {}),
      meeting_url: meetingUrl,
    })
    .eq("id", params.eventId);

  const googleMeetStatus: GoogleMeetStatus = !params.wantsMeet
    ? "not_requested"
    : meetingUrl
      ? "created"
      : apiFailed
        ? "google_error"
        : "missing_google_connection";

  return {
    meetingUrl,
    googleHtmlLink: googleMeeting?.htmlLink ?? null,
    meetProvider: meetingUrl ? "google" : null,
    googleMeetStatus,
  };
}

async function dispatchEventInvitations(params: {
  admin: ReturnType<typeof createServiceRoleClient>;
  organizationName: string;
  creator?: Miembro;
  fallbackSenderEmail?: string | null;
  asignado?: Miembro;
  recipientEmails: string[];
  eventTitle: string;
  eventType: string;
  startAt: string;
  timezone: string;
  meetingUrl?: string | null;
  googleHtmlLink?: string | null;
}): Promise<{ emailedCount: number; failedRecipients: string[] }> {
  const uniqueEmails = Array.from(
    new Set(params.recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );
  if (uniqueEmails.length === 0) {
    return { emailedCount: 0, failedRecipients: [] };
  }

  let gmailSendAvailable = false;
  if (params.creator) {
    const { data: creatorConn } = await params.admin
      .from("google_oauth_tokens")
      .select("scope")
      .eq("membership_id", params.creator.id)
      .maybeSingle();
    gmailSendAvailable = Boolean(creatorConn?.scope?.includes(GMAIL_SEND_SCOPE));
  }

  const { dateLabel, timeLabel } = formatDateTimeEs(params.startAt, params.timezone);
  const eventTypeLabel = EVENT_TYPE_LABEL[params.eventType] ?? params.eventType;
  const senderEmail = params.creator?.email ?? params.fallbackSenderEmail ?? "";
  const ownerName = params.creator?.full_name ?? (senderEmail || params.organizationName);

  const results = await Promise.all(
    uniqueEmails.map(async (email) => {
      try {
        const res = await sendEventNotificationEmail({
          to: email,
          senderMembershipId: params.creator?.id ?? "",
          senderEmail,
          gmailSendAvailable,
          ownerName,
          organizationName: params.organizationName,
          eventTitle: params.eventTitle,
          eventTypeLabel,
          dateLabel,
          timeLabel,
          recipientIsOwner: false,
          assignedToName: params.asignado?.full_name ?? params.asignado?.email,
          meetLink: params.meetingUrl ?? undefined,
          googleCalendarLink: params.googleHtmlLink ?? undefined,
        });
        return { email, sent: res.transport !== "none" };
      } catch (err) {
        console.error(`[calendar] Fallo al enviar invitación a ${email}:`, err);
        return { email, sent: false };
      }
    }),
  );

  const emailedCount = results.filter((r) => r.sent).length;
  const failedRecipients = results.filter((r) => !r.sent).map((r) => r.email);
  return { emailedCount, failedRecipients };
}

/**
 * Crea el evento en EditFlow, crea la reunión en Google Calendar con Google
 * Meet (si hay conexión Google en el espacio) y envía la notificación por
 * correo a todos los invitados y al responsable.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CreateCalendarEventResult> {
  const [org, user] = await Promise.all([requireActiveOrganization(), getServerUser()]);
  const supabase = await createClient();

  const [{ data: event, error: insertError }, { data: miembrosRaw }] = await Promise.all([
    supabase
      .from("calendar_events")
      .insert({
        organization_id: org.id,
        title: input.title,
        description: input.description,
        type: input.type as EventType,
        client_id: input.clientId,
        video_id: input.videoId,
        start_at: input.startAt,
        end_at: input.endAt,
        color: input.color,
      })
      .select("id")
      .single(),
    supabase
      .from("memberships")
      .select("id, email, full_name, role, notify_calendar")
      .eq("organization_id", org.id)
      .eq("active", true),
  ]);

  if (insertError || !event) {
    throw new Error(insertError?.message ?? "No se pudo crear el evento.");
  }

  const miembros = (miembrosRaw as Miembro[] | null) ?? [];
  const propietario = miembros.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? miembros.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const creador = resolveCreatorMember(miembros, org.membershipId, user?.email);

  const invitados = normalizarInvitados(input.guestEmails);
  const wantsMeet = input.withMeet ?? (input.type === "reunion" || invitados.length > 0);
  const esReunion = invitados.length > 0 || wantsMeet || input.type === "reunion";
  const asistentesEquipo = dedupAsistentes([propietario, asignado]);

  const attendeeRows = buildAttendeeRows({
    eventId: event.id,
    miembros,
    asistentesEquipo,
    invitados,
    esReunion,
  });

  const notificarMiembros = miembros.filter(
    (m) =>
      m.id !== creador?.id &&
      (invitados.includes(m.email.toLowerCase()) || (asignado && m.id === asignado.id)),
  );

  const admin = createServiceRoleClient();
  const dbWrites: PromiseLike<unknown>[] = [
    supabase.from("event_reminders").insert({ event_id: event.id, minutes_before: 60 }),
  ];

  if (notificarMiembros.length > 0) {
    const { dateLabel, timeLabel } = formatDateTimeEs(input.startAt, org.timezone);
    const tipoLabel = EVENT_TYPE_LABEL[input.type] ?? input.type;
    dbWrites.push(
      admin.from("notifications").insert(
        notificarMiembros.map((m) => ({
          organization_id: org.id,
          recipient_email: m.email,
          membership_id: m.id,
          type: "calendar_event",
          title: `Nuevo evento: ${input.title}`,
          body: `${tipoLabel} · ${dateLabel} a las ${timeLabel}`,
          link: "/app/calendario",
        })),
      ),
    );
  }

  if (attendeeRows.length > 0) {
    dbWrites.push(supabase.from("event_attendees").insert(attendeeRows));
  }

  await Promise.all(dbWrites);

  const creatorEmail = creador?.email.toLowerCase() ?? user?.email?.toLowerCase() ?? "";
  const invitationEmails = Array.from(
    new Set(
      [
        ...invitados,
        ...(asignado && asignado.id !== creador?.id && (esReunion || asignado.notify_calendar)
          ? [asignado.email.toLowerCase()]
          : []),
      ].filter((e) => e && e !== creatorEmail),
    ),
  );

  if (esReunion) {
    const { meetingUrl, googleHtmlLink, meetProvider, googleMeetStatus } =
      await resolveGoogleMeetingForEvent({
        admin,
        organizationId: org.id,
        eventId: event.id,
        miembros,
        organizer: creador,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        timeZone: org.timezone,
        invitationEmails,
        wantsMeet,
      });

    const { emailedCount, failedRecipients } = await dispatchEventInvitations({
      admin,
      organizationName: org.name,
      creator: creador,
      fallbackSenderEmail: user?.email,
      asignado,
      recipientEmails: invitationEmails,
      eventTitle: input.title,
      eventType: input.type,
      startAt: input.startAt,
      timezone: org.timezone,
      meetingUrl,
      googleHtmlLink,
    });

    revalidatePath("/app/calendario");
    revalidatePath("/app/dashboard");
    return {
      id: event.id,
      meetingUrl,
      meetProvider,
      googleMeetStatus,
      googleCalendarLink: googleHtmlLink,
      emailedCount,
      failedRecipients,
    };
  }

  // ----- Evento normal: espejo a Google Calendar + correo si aplica -----
  let emailedCount = 0;
  let failedRecipients: string[] = [];
  if (invitationEmails.length > 0) {
    const dispatched = await dispatchEventInvitations({
      admin,
      organizationName: org.name,
      creator: creador,
      fallbackSenderEmail: user?.email,
      asignado,
      recipientEmails: invitationEmails,
      eventTitle: input.title,
      eventType: input.type,
      startAt: input.startAt,
      timezone: org.timezone,
    });
    emailedCount = dispatched.emailedCount;
    failedRecipients = dispatched.failedRecipients;
  }

  if (asistentesEquipo.length > 0) {
    const googleEvent = {
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      timeZone: org.timezone,
    };
    after(async () => {
      const bgAdmin = createServiceRoleClient();
      await Promise.all(
        asistentesEquipo.map(async (m) => {
          try {
            const r = await createGoogleCalendarEvent(m.id, googleEvent);
            if (r) {
              await bgAdmin
                .from("event_attendees")
                .update({ google_event_id: r.googleEventId, google_html_link: r.htmlLink })
                .eq("event_id", event.id)
                .eq("membership_id", m.id);
            }
          } catch (err) {
            console.warn("[calendar] No se pudo reflejar evento en Google Calendar:", err);
          }
        }),
      );
    });
  }

  revalidatePath("/app/calendario");
  revalidatePath("/app/dashboard");
  return {
    id: event.id,
    meetingUrl: null,
    meetProvider: null,
    googleMeetStatus: "not_requested",
    googleCalendarLink: null,
    emailedCount,
    failedRecipients,
  };
}

/**
 * Actualiza el evento, recrea o mantiene su Google Meet y envía notificación
 * por correo a los invitados agregados (o a todos si se generó el Meet).
 */
export async function updateCalendarEvent(
  input: UpdateCalendarEventInput,
): Promise<CalendarActionResult> {
  const [org, user] = await Promise.all([requireActiveOrganization(), getServerUser()]);
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para editar eventos." };
  }

  const supabase = await createClient();

  const [{ data: existing }, { data: espejosViejos }, { data: miembrosRaw }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, meeting_url, google_event_id, google_organizer_membership_id")
      .eq("id", input.id)
      .eq("organization_id", org.id)
      .maybeSingle(),
    supabase
      .from("event_attendees")
      .select("membership_id, email, google_event_id")
      .eq("event_id", input.id),
    supabase
      .from("memberships")
      .select("id, email, full_name, role, notify_calendar")
      .eq("organization_id", org.id)
      .eq("active", true),
  ]);

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  const oldAttendeeEmails = new Set(
    (espejosViejos ?? []).map((a) => a.email.toLowerCase()),
  );

  const [{ error: updateError }] = await Promise.all([
    supabase
      .from("calendar_events")
      .update({
        title: input.title,
        description: input.description,
        type: input.type as EventType,
        client_id: input.clientId ?? null,
        video_id: input.videoId ?? null,
        start_at: input.startAt,
        end_at: input.endAt,
        color: input.color,
        google_event_id: null,
        google_html_link: null,
        meeting_url: null,
        google_organizer_membership_id: null,
      })
      .eq("id", input.id),
    supabase.from("event_attendees").delete().eq("event_id", input.id),
    supabase.from("event_reminders").delete().eq("event_id", input.id),
  ]);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const miembros = (miembrosRaw as Miembro[] | null) ?? [];
  const propietario = miembros.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? miembros.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const creador = resolveCreatorMember(miembros, org.membershipId, user?.email);

  const invitados = normalizarInvitados(input.guestEmails);
  const wantsMeet = input.withMeet ?? (input.type === "reunion" || invitados.length > 0);
  const esReunion = invitados.length > 0 || wantsMeet || input.type === "reunion";
  const asistentesEquipo = dedupAsistentes([propietario, asignado]);

  const attendeeRows = buildAttendeeRows({
    eventId: input.id,
    miembros,
    asistentesEquipo,
    invitados,
    esReunion,
  });

  await Promise.all([
    supabase.from("event_reminders").insert({ event_id: input.id, minutes_before: 60 }),
    attendeeRows.length > 0
      ? supabase.from("event_attendees").insert(attendeeRows)
      : Promise.resolve(null),
  ]);

  const admin = createServiceRoleClient();
  const creatorEmail = creador?.email.toLowerCase() ?? user?.email?.toLowerCase() ?? "";
  const allInvitees = Array.from(
    new Set(
      [
        ...invitados,
        ...(asignado && asignado.id !== creador?.id && esReunion
          ? [asignado.email.toLowerCase()]
          : []),
      ].filter((e) => e && e !== creatorEmail),
    ),
  );

  let meetingUrl: string | null = null;
  let googleHtmlLink: string | null = null;
  let meetProvider: "google" | null = null;
  let googleMeetStatus: GoogleMeetStatus = "not_requested";

  if (esReunion) {
    const resolved = await resolveGoogleMeetingForEvent({
      admin,
      organizationId: org.id,
      eventId: input.id,
      miembros,
      organizer: creador,
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      timeZone: org.timezone,
      invitationEmails: allInvitees,
      wantsMeet,
      existingGoogleMeetUrl: existing.meeting_url,
    });
    meetingUrl = resolved.meetingUrl;
    googleHtmlLink = resolved.googleHtmlLink;
    meetProvider = resolved.meetProvider;
    googleMeetStatus = resolved.googleMeetStatus;
  }

  const newlyAddedOrMeetActivated = allInvitees.filter(
    (email) =>
      !oldAttendeeEmails.has(email) ||
      (Boolean(meetingUrl) && !existing.meeting_url?.includes("meet.google.com")),
  );

  const { emailedCount, failedRecipients } = await dispatchEventInvitations({
    admin,
    organizationName: org.name,
    creator: creador,
    fallbackSenderEmail: user?.email,
    asignado,
    recipientEmails: newlyAddedOrMeetActivated,
    eventTitle: input.title,
    eventType: input.type,
    startAt: input.startAt,
    timezone: org.timezone,
    meetingUrl,
    googleHtmlLink,
  });

  after(async () => {
    const deletes: Promise<unknown>[] = (espejosViejos ?? [])
      .filter((a): a is { membership_id: string; email: string; google_event_id: string } =>
        Boolean(a.membership_id && a.google_event_id),
      )
      .map((a) =>
        deleteGoogleCalendarEvent(a.membership_id, a.google_event_id).catch((err) => {
          console.warn("[calendar] Error al eliminar espejo de Google Calendar:", err);
        }),
      );
    if (existing.google_event_id && existing.google_organizer_membership_id) {
      deletes.push(
        deleteGoogleCalendarEvent(
          existing.google_organizer_membership_id,
          existing.google_event_id,
          true,
        ).catch((err) => {
          console.warn("[calendar] Error al eliminar reunión previa de Google Calendar:", err);
        }),
      );
    }
    await Promise.all(deletes);

    if (!esReunion && asistentesEquipo.length > 0) {
      const bgAdmin = createServiceRoleClient();
      const googleEvent = {
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        timeZone: org.timezone,
      };
      await Promise.all(
        asistentesEquipo.map(async (m) => {
          try {
            const r = await createGoogleCalendarEvent(m.id, googleEvent);
            if (r) {
              await bgAdmin
                .from("event_attendees")
                .update({ google_event_id: r.googleEventId, google_html_link: r.htmlLink })
                .eq("event_id", input.id)
                .eq("membership_id", m.id);
            }
          } catch (err) {
            console.warn("[calendar] Error al recrear evento normal en Google:", err);
          }
        }),
      );
    }
  });

  revalidatePath("/app/calendario");
  revalidatePath("/app/dashboard");
  return {
    ok: true,
    meetingUrl,
    meetProvider,
    googleMeetStatus,
    googleCalendarLink: googleHtmlLink,
    emailedCount,
    failedRecipients,
  };
}

export async function deleteCalendarEvent(eventId: string): Promise<CalendarActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para eliminar eventos." };
  }

  const supabase = await createClient();

  const [{ data: existing }, { data: espejos }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, google_event_id, google_organizer_membership_id")
      .eq("id", eventId)
      .eq("organization_id", org.id)
      .maybeSingle(),
    supabase.from("event_attendees").select("membership_id, google_event_id").eq("event_id", eventId),
  ]);

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) {
    return { ok: false, error: error.message };
  }

  after(async () => {
    const deletes: Promise<unknown>[] = (espejos ?? [])
      .filter((a): a is { membership_id: string; google_event_id: string } =>
        Boolean(a.membership_id && a.google_event_id),
      )
      .map((a) =>
        deleteGoogleCalendarEvent(a.membership_id, a.google_event_id).catch(() => undefined),
      );
    if (existing.google_event_id && existing.google_organizer_membership_id) {
      deletes.push(
        deleteGoogleCalendarEvent(
          existing.google_organizer_membership_id,
          existing.google_event_id,
          true,
        ).catch(() => undefined),
      );
    }
    await Promise.all(deletes);
  });

  revalidatePath("/app/calendario");
  revalidatePath("/app/dashboard");
  return { ok: true };
}
