import { createServiceRoleClient } from "@/lib/supabase/server";
import { googleClientId, googleClientSecret } from "@/lib/supabase/env";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Cambia un refresh_token de Google por un access_token nuevo. Se llama
 * directo contra Google (no pasa por Supabase Auth) porque el token
 * original se obtuvo en el login/conexión y necesitamos poder renovarlo
 * después, sin que el usuario esté presente (ej. desde un server action).
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`No se pudo renovar el token de Google (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

/**
 * Devuelve un access_token válido para la conexión de Google de un MIEMBRO,
 * renovándolo si ya expiró. Devuelve null si ese miembro no conectó su
 * Google — quien llama decide si eso bloquea la acción o solo se salta el
 * paso de Google. Usa service role a propósito: al crear un evento, el
 * owner/admin necesita leer el token de OTRO miembro (el asignado) para
 * escribir en el calendario de esa persona.
 */
export async function getValidAccessToken(membershipId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: tokenRow } = await supabase
    .from("google_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 60_000; // margen de 1 min
  if (stillValid) return tokenRow.access_token;

  if (!tokenRow.refresh_token) {
    // El access_token expiró y no hay refresh_token (Google solo lo entrega
    // la primera vez que se autoriza con prompt=consent): hay que reconectar.
    return null;
  }

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  await supabase
    .from("google_oauth_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("membership_id", membershipId);

  return refreshed.access_token;
}

export interface GoogleCalendarEventInput {
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string; // ISO
  timeZone: string;
}

export interface GoogleCalendarEventResult {
  googleEventId: string;
  htmlLink: string;
}

/**
 * Crea el evento en el Google Calendar PROPIO del miembro indicado (su
 * calendario primario), usando su propio token. No se agregan asistentes:
 * cada persona tiene su propia copia en su propio calendario, así que no se
 * manda ninguna invitación cruzada.
 */
export async function createGoogleCalendarEvent(
  membershipId: string,
  event: GoogleCalendarEventInput,
): Promise<GoogleCalendarEventResult | null> {
  const accessToken = await getValidAccessToken(membershipId);
  if (!accessToken) return null;

  const res = await fetch(GOOGLE_CALENDAR_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startAt, timeZone: event.timeZone },
      end: { dateTime: event.endAt, timeZone: event.timeZone },
    }),
  });

  if (!res.ok) {
    console.error("Google Calendar API error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return { googleEventId: data.id, htmlLink: data.htmlLink };
}

export interface GoogleMeetingInput extends GoogleCalendarEventInput {
  /** Correos invitados a la reunión (equipo o externos). */
  attendeeEmails: string[];
  /** Si true, se pide a Google un enlace de Google Meet para el evento. */
  withMeet: boolean;
}

export interface GoogleMeetingResult extends GoogleCalendarEventResult {
  /** URL del Google Meet, si se pidió y Google lo creó. */
  meetLink: string | null;
}

/**
 * Crea UNA reunión en el calendario del organizador con todos los invitados
 * como asistentes y, si se pide, un enlace de Google Meet. Con asistentes,
 * usa sendUpdates=all para que Google agregue el evento en su calendario y
 * les envíe la invitación oficial de Meet, además de la notificación por correo
 * de EditFlow. Devuelve también el hangoutLink.
 */
export async function createGoogleMeetingEvent(
  organizerMembershipId: string,
  event: GoogleMeetingInput,
): Promise<GoogleMeetingResult | null> {
  const accessToken = await getValidAccessToken(organizerMembershipId);
  if (!accessToken) return null;

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    start: { dateTime: event.startAt, timeZone: event.timeZone },
    end: { dateTime: event.endAt, timeZone: event.timeZone },
    attendees: event.attendeeEmails.map((email) => ({ email })),
  };
  if (event.withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const sendUpdates = event.attendeeEmails.length > 0 ? "all" : "none";
  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?sendUpdates=${sendUpdates}&conferenceDataVersion=1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Google Meet event error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const videoEntryUrl = Array.isArray(data.conferenceData?.entryPoints)
    ? data.conferenceData.entryPoints.find(
        (ep: { entryPointType?: string; uri?: string }) => ep.entryPointType === "video" && ep.uri,
      )?.uri
    : undefined;
  return {
    googleEventId: data.id,
    htmlLink: data.htmlLink,
    meetLink: data.hangoutLink ?? videoEntryUrl ?? null,
  };
}

/**
 * Borra un evento del Google Calendar del miembro. Silencioso si no hay
 * conexión. Con notifyAttendees=true (para reuniones con invitados) Google
 * manda el aviso de cancelación a cada asistente.
 */
export async function deleteGoogleCalendarEvent(
  membershipId: string,
  googleEventId: string,
  notifyAttendees = false,
): Promise<void> {
  const accessToken = await getValidAccessToken(membershipId);
  if (!accessToken) return;

  const query = notifyAttendees ? "?sendUpdates=all" : "";
  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${googleEventId}${query}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 410 && res.status !== 404) {
    console.error("Google Calendar delete error", res.status, await res.text());
  }
}

export interface GoogleRawEvent {
  id: string;
  status: string; // "confirmed" | "cancelled" | ...
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: { email: string }[];
}

export interface ListEventsResult {
  events: GoogleRawEvent[];
  nextSyncToken: string | null;
  /** El syncToken guardado ya no sirve (Google respondió 410 Gone): hay que
   *  reintentar sin él, arrancando de cero desde `timeMin`. */
  needsFullResync: boolean;
}

/**
 * Trae los eventos del calendario conectado. Con syncToken solo devuelve lo
 * que cambió desde la última corrida (incluye cancelaciones); sin él, es la
 * primera sincronización y se acota a partir de `timeMinIso` para no
 * importar años de eventos viejos.
 */
export async function listCalendarEvents(
  membershipId: string,
  { syncToken, timeMinIso }: { syncToken?: string | null; timeMinIso: string },
): Promise<ListEventsResult | null> {
  const accessToken = await getValidAccessToken(membershipId);
  if (!accessToken) return null;

  const events: GoogleRawEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ maxResults: "250", singleEvents: "true" });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      params.set("timeMin", timeMinIso);
      params.set("orderBy", "startTime");
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 410) {
      return { events: [], nextSyncToken: null, needsFullResync: true };
    }
    if (!res.ok) {
      console.error("Google Calendar list error", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken, needsFullResync: false };
}
