import { resolveActivePeriod, getEffectiveRolePermissions, requireActiveOrganization } from "@/lib/period/resolve";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/actions/calendar-events";
import { createVideo } from "@/lib/actions/videos";
import { createClient, getServerUser } from "@/lib/supabase/server";
import type { DittoMeetingCard, DittoPendingFollowUp } from "@/lib/ditto/guides";
import { EVENT_TYPE_LABEL } from "@/lib/utils/event-type-label";
import { zonedDateParts, zonedTimeToUtcIso } from "@/lib/utils/timezone";
import type { EventType } from "@/types/database.types";

export interface DittoCommandResult {
  handled: boolean;
  reply: string;
  steps?: string[];
  cta?: { label: string; href: string };
  suggestions?: string[];
  mutated?: boolean;
  meetingCard?: DittoMeetingCard;
  pendingFollowUp?: DittoPendingFollowUp;
}

const WEEKDAYS_ES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const MONTHS_ES: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sep: 9,
  sept: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

function foldAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stripWakePrefix(message: string): string {
  return message
    .trim()
    .replace(
      /^(?:ey|hey|oye|hola|ok|buenas|por favor|disculpa)?[\s,]*(?:ditto|asistente)\b[\s,.:;!-]*/i,
      "",
    )
    .replace(/^(?:por favor|puedes|podrias|me puedes|ayudame a|quiero que)\s+/i, "")
    .trim();
}

function addDaysToParts(
  year: number,
  month: number,
  day: number,
  daysToAdd: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + daysToAdd, 12, 0, 0));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function extractTime(rawText: string): {
  hour: number;
  minute: number;
  cleanedText: string;
} | null {
  const folded = foldAccents(rawText);

  // Mediodia / medianoche
  const middayMatch = /\b(?:al\s+)?medio\s*dia\b/i.exec(folded);
  if (middayMatch) {
    const cleaned =
      rawText.slice(0, middayMatch.index) +
      " " +
      rawText.slice(middayMatch.index + middayMatch[0].length);
    return { hour: 12, minute: 0, cleanedText: cleaned.trim() };
  }

  // Expresión explícita: "a las 4pm", "a las 4:30 de la tarde", "16:00", "4 p.m."
  const timeRe =
    /(?:\ba\s+la[s]?\s+)?(\d{1,2})(?::(\d{2})|\s+y\s+(media|cuarto))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|de\s+la\s+(?:manana|tarde|noche|madrugada)|hrs?|hs?)\b|\ba\s+la[s]?\s+(\d{1,2})(?::(\d{2})|\s+y\s+(media|cuarto))?\b|\b(\d{1,2}):(\d{2})\b/i;

  const match = timeRe.exec(folded);
  if (!match) return null;

  let hour = Number(match[1] ?? match[5] ?? match[8]);
  let minute = 0;

  const minDigits = match[2] ?? match[6] ?? match[9];
  const wordFrac = match[3] ?? match[7];
  if (minDigits) minute = Number(minDigits);
  else if (wordFrac === "media") minute = 30;
  else if (wordFrac === "cuarto") minute = 15;

  if (Number.isNaN(hour) || hour > 23 || minute > 59) return null;

  const mer = (match[4] ?? "").replace(/\./g, "").trim();
  if (mer.includes("pm") || mer.includes("p m") || mer.includes("tarde") || mer.includes("noche")) {
    if (hour < 12) hour += 12;
  } else if (mer.includes("am") || mer.includes("a m") || mer.includes("manana") || mer.includes("madrugada")) {
    if (hour === 12) hour = 0;
  } else if (!mer && hour >= 1 && hour <= 6) {
    // Horario laboral por defecto si dice "a las 4" sin am/pm.
    hour += 12;
  }

  const cleanedText = (
    rawText.slice(0, match.index) +
    " " +
    rawText.slice(match.index + match[0].length)
  )
    .replace(/\s+/g, " ")
    .trim();

  return { hour, minute, cleanedText };
}

function extractDateParts(
  cleanedTextWithoutTime: string,
  timeZone: string,
  targetHour = 10,
): {
  year: number;
  month: number;
  day: number;
  explicitlySpecified: boolean;
  cleanedText: string;
} {
  const nowParts = zonedDateParts(new Date().toISOString(), timeZone);
  const folded = foldAccents(cleanedTextWithoutTime);
  const stripSpan = (idx: number, len: number) =>
    (cleanedTextWithoutTime.slice(0, idx) + " " + cleanedTextWithoutTime.slice(idx + len))
      .replace(/\s+/g, " ")
      .trim();

  // 1. Pasado mañana
  const pasadoMatch = /\b(?:para\s+)?pasado\s+manana\b/i.exec(folded);
  if (pasadoMatch) {
    const next = addDaysToParts(nowParts.year, nowParts.month, nowParts.day, 2);
    return { ...next, explicitlySpecified: true, cleanedText: stripSpan(pasadoMatch.index, pasadoMatch[0].length) };
  }

  // 2. Mañana (ya sin "de la mañana" porque extractTime la quitó)
  const tomorrowMatch = /\b(?:para\s+)?manana\b/i.exec(folded);
  if (tomorrowMatch) {
    const next = addDaysToParts(nowParts.year, nowParts.month, nowParts.day, 1);
    return { ...next, explicitlySpecified: true, cleanedText: stripSpan(tomorrowMatch.index, tomorrowMatch[0].length) };
  }

  // 3. Hoy
  const todayMatch = /\b(?:para\s+)?hoy\b/i.exec(folded);
  if (todayMatch) {
    return {
      year: nowParts.year,
      month: nowParts.month,
      day: nowParts.day,
      explicitlySpecified: true,
      cleanedText: stripSpan(todayMatch.index, todayMatch[0].length),
    };
  }

  // 4. Día de la semana ("el viernes", "este lunes", "próximo miércoles")
  const weekdayRe =
    /\b(?:(?:para|este|el|del?)\s+)?(?:(proximo|siguiente)\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/i;
  const wdMatch = weekdayRe.exec(folded);
  if (wdMatch) {
    const isNextWeekFlag = Boolean(wdMatch[1]);
    const targetDow = WEEKDAYS_ES[wdMatch[2]];
    const todayDow = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12)).getUTCDay();
    let diff = (targetDow - todayDow + 7) % 7;
    if (diff === 0 && (isNextWeekFlag || nowParts.hour >= targetHour)) {
      diff = 7;
    } else if (isNextWeekFlag && diff <= 2) {
      diff += 7;
    }
    const next = addDaysToParts(nowParts.year, nowParts.month, nowParts.day, diff);
    return { ...next, explicitlySpecified: true, cleanedText: stripSpan(wdMatch.index, wdMatch[0].length) };
  }

  // 5. "25 de noviembre" / "el 25 de nov"
  const monthTextRe =
    /\b(?:(?:para|el)\s+)?(\d{1,2})\s+de\s+(enero|ene|febrero|feb|marzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|ago|septiembre|setiembre|sep|sept|octubre|oct|noviembre|nov|diciembre|dic)(?:\s+de\s+(\d{4}))?\b/i;
  const mtMatch = monthTextRe.exec(folded);
  if (mtMatch) {
    const dayNum = Number(mtMatch[1]);
    const monthNum = MONTHS_ES[mtMatch[2]];
    let yearNum = mtMatch[3] ? Number(mtMatch[3]) : nowParts.year;
    if (!mtMatch[3] && monthNum < nowParts.month) yearNum += 1;
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      return {
        year: yearNum,
        month: monthNum,
        day: dayNum,
        explicitlySpecified: true,
        cleanedText: stripSpan(mtMatch.index, mtMatch[0].length),
      };
    }
  }

  // 6. Numérica ISO o DD/MM
  const isoRe = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
  const isoMatch = isoRe.exec(folded);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
      explicitlySpecified: true,
      cleanedText: stripSpan(isoMatch.index, isoMatch[0].length),
    };
  }

  const dmyRe = /\b(?:(?:para|el)\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
  const dmyMatch = dmyRe.exec(folded);
  if (dmyMatch) {
    const dayNum = Number(dmyMatch[1]);
    const monthNum = Number(dmyMatch[2]);
    let yearNum = dmyMatch[3] ? Number(dmyMatch[3]) : nowParts.year;
    if (yearNum < 100) yearNum += 2000;
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return {
        year: yearNum,
        month: monthNum,
        day: dayNum,
        explicitlySpecified: true,
        cleanedText: stripSpan(dmyMatch.index, dmyMatch[0].length),
      };
    }
  }

  // 7. "el 25" (día dentro del mes actual o siguiente)
  const bareDayRe = /\b(?:para\s+el|el)\s+(\d{1,2})\b/i;
  const bdMatch = bareDayRe.exec(folded);
  if (bdMatch) {
    const dayNum = Number(bdMatch[1]);
    if (dayNum >= 1 && dayNum <= 31) {
      let monthNum = nowParts.month;
      let yearNum = nowParts.year;
      if (dayNum < nowParts.day) {
        monthNum += 1;
        if (monthNum > 12) {
          monthNum = 1;
          yearNum += 1;
        }
      }
      return {
        year: yearNum,
        month: monthNum,
        day: dayNum,
        explicitlySpecified: true,
        cleanedText: stripSpan(bdMatch.index, bdMatch[0].length),
      };
    }
  }

  // Fallback: hoy (o mañana si esa hora ya pasó hoy)
  const shouldMoveTomorrow =
    nowParts.hour > targetHour || (nowParts.hour === targetHour && nowParts.minute >= 30);
  const fallback = shouldMoveTomorrow
    ? addDaysToParts(nowParts.year, nowParts.month, nowParts.day, 1)
    : { year: nowParts.year, month: nowParts.month, day: nowParts.day };

  return {
    ...fallback,
    explicitlySpecified: false,
    cleanedText: cleanedTextWithoutTime,
  };
}

function detectEventType(text: string): { type: EventType; baseLabel: string } {
  const folded = foldAccents(text);
  if (/\b(grabacion|rodaje|shoot|filmar|grabar)\b/.test(folded)) {
    return { type: "grabacion", baseLabel: "Grabación" };
  }
  if (/\b(entrega|publicar|entregar)\b/.test(folded)) {
    return { type: "entrega", baseLabel: "Entrega" };
  }
  if (/\b(clase|capacitacion|taller|mentoria)\b/.test(folded)) {
    return { type: "clase", baseLabel: "Clase" };
  }
  if (/\b(recordatorio|acuerdame|recuerdame|aviso)\b/.test(folded)) {
    return { type: "otro", baseLabel: "Recordatorio" };
  }
  if (/\b(evento|fiesta|lanzamiento|aniversario)\b/.test(folded)) {
    return { type: "evento", baseLabel: "Evento" };
  }
  return { type: "reunion", baseLabel: "Reunión" };
}

function extractEmails(text: string): string[] {
  return Array.from(
    new Set(
      (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []).map((e) =>
        e.toLowerCase(),
      ),
    ),
  );
}

function cleanPersonOrSubject(text: string): {
  participantName?: string;
  titleText: string;
} {
  let working = text
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " ")
    .replace(/\b(?:por|via|con\s+enlace\s+de)\s+(?:google\s+)?meet\b/gi, " ")
    .replace(
      /^(?:agendar?|agendame|programar?|programame|crear?|creame|anotar?|anotame|registrar?|registrame|reservar?|reservame|recuerdame|recordarme?|poner|ponme)\s+/i,
      "",
    )
    .replace(
      /^(?:una?|el|la)\s+(?:reuni[oó]n|junta|call|llamada|meet|grabaci[oó]n|rodaje|entrega|clase|capacitaci[oó]n|taller|evento|recordatorio|aviso|cita)\b[\s:.-]*/i,
      "",
    )
    .replace(/^(?:de\s+|sobre\s+|para\s+)/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const conMatch =
    /\bcon\s+([a-záéíóúñ][a-záéíóúñ0-9\s]{1,35}?)(?:\s+(?:para|sobre|acerca|y\s+a|a\s+las?|el\s+|en\s+|por\s+)|[,.!?;]|$)/i.exec(
      working,
    );

  const participantName = conMatch?.[1]?.trim();

  working = working
    .replace(/\b(?:para|y|a|al|del?)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return { participantName, titleText: working };
}

function capitalizePhrase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function matchPersonByName<T extends { email?: string | null; name?: string | null }>(
  list: T[],
  rawName?: string,
): T | undefined {
  if (!rawName) return undefined;
  const target = foldAccents(rawName).trim();
  if (!target || target.length < 2) return undefined;

  const exact = list.find((item) => foldAccents(item.name ?? "").trim() === target);
  if (exact) return exact;

  const wordMatch = list.find((item) => {
    const n = foldAccents(item.name ?? "");
    const local = foldAccents((item.email ?? "").split("@")[0] ?? "");
    return n.split(/\s+/).some((w) => w === target) || local === target;
  });
  if (wordMatch) return wordMatch;

  return list.find((item) => {
    const n = foldAccents(item.name ?? "");
    const local = foldAccents((item.email ?? "").split("@")[0] ?? "");
    return (n && (n.includes(target) || target.includes(n))) || (local && local.includes(target));
  });
}

function isCalendarActionRequest(stripped: string): boolean {
  const folded = foldAccents(stripped);
  if (/^(como|donde|por que|cual|que es|cuando se)\b/.test(folded)) return false;

  const hasVerb =
    /\b(agendar?|agendame|programar?|programame|crear?|creame|anotar?|anotame|registrar?|registrame|reservar?|reservame|recuerdame|recordar|poner|ponme|coordina|coordinar)\b/.test(
      folded,
    );
  const hasCalendarNoun =
    /\b(reunion|junta|call|llamada|meet|grabacion|rodaje|clase|capacitacion|taller|evento|recordatorio|aviso|cita|entrega)\b/.test(
      folded,
    );
  const hasVideoNoun = /\b(video|reel|short|clip)\b/.test(folded);

  if (hasVideoNoun && !hasCalendarNoun) return false;
  return hasVerb && (hasCalendarNoun || Boolean(extractTime(stripped)));
}

function isVideoActionRequest(stripped: string): boolean {
  const folded = foldAccents(stripped);
  if (/^(como|donde|por que)\b/.test(folded)) return false;
  const hasVerb =
    /\b(agendar?|agendame|programar?|programame|crear?|creame|anotar?|anotame|registrar?|registrame|subir|agregar?)\b/.test(
      folded,
    );
  const hasVideoNoun = /\b(video|reel|short|clip)\b/.test(folded);
  return hasVerb && hasVideoNoun;
}

function isListAgendaRequest(stripped: string): boolean {
  const folded = foldAccents(stripped);
  return (
    /\b(que|cuales|ver|muestrame|dime|lista|mis)\b/.test(folded) &&
    /\b(reuniones|eventos|agenda|calendario|citas|pendiente hoy)\b/.test(folded) &&
    !/\bcomo\b/.test(folded)
  );
}

function isCancelLastEventRequest(stripped: string): boolean {
  const folded = foldAccents(stripped);
  return /\b(cancela|cancelar|elimina|eliminar|borra|borrar)\b/.test(folded) &&
    /\b(esa|ese|ultima|ultimo|reunion|evento|agendamiento)\b/.test(folded);
}

function formatWhenEs(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

async function handleScheduleCalendarCommand(
  stripped: string,
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult> {
  if (org.role !== "owner" && org.role !== "admin") {
    return {
      handled: true,
      reply:
        "Para agendar eventos o reuniones en el Calendario necesitas rol de Propietario o Administrador. Como Editor sí puedes pedirme que registre videos en Monitoreo (por ejemplo: «Registra un video Reel Promo para entrega el viernes»).",
      cta: { label: "Ver Calendario", href: "/app/calendario" },
    };
  }

  const timeParsed = extractTime(stripped);
  const hour = timeParsed?.hour ?? 10;
  const minute = timeParsed?.minute ?? 0;
  const afterTimeText = timeParsed?.cleanedText ?? stripped;

  const dateParsed = extractDateParts(afterTimeText, org.timezone, hour);
  const startAt = zonedTimeToUtcIso(
    dateParsed.year,
    dateParsed.month,
    dateParsed.day,
    hour,
    minute,
    org.timezone,
  );
  const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();

  const { type, baseLabel } = detectEventType(stripped);
  const explicitEmails = extractEmails(stripped);
  const { participantName, titleText } = cleanPersonOrSubject(dateParsed.cleanedText);

  const supabase = await createClient();
  const [{ data: miembros }, { data: clientes }, { data: orgEventsWithAttendees }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, full_name, email")
      .eq("organization_id", org.id)
      .eq("active", true),
    supabase
      .from("clients")
      .select("id, name, contact_name, contact_email")
      .eq("organization_id", org.id)
      .eq("status", "activo"),
    supabase
      .from("calendar_events")
      .select("id, event_attendees(email)")
      .eq("organization_id", org.id)
      .order("start_at", { ascending: false })
      .limit(30),
  ]);

  const pastAttendees = (orgEventsWithAttendees ?? []).flatMap(
    (ev) => (ev.event_attendees as unknown as { email: string }[] | null) ?? [],
  );

  let matchedEmail: string | undefined;
  let matchedMemberId: string | undefined;
  let matchedSourceLabel: string | undefined;

  if (participantName && explicitEmails.length === 0) {
    const memberCandidate = matchPersonByName(
      (miembros ?? []).map((m) => ({
        id: m.id,
        name: m.full_name || m.email.split("@")[0],
        email: m.email,
      })),
      participantName,
    );

    if (memberCandidate) {
      matchedEmail = memberCandidate.email;
      matchedMemberId = memberCandidate.id;
      matchedSourceLabel = memberCandidate.name ?? memberCandidate.email;
    } else {
      const clientCandidate = matchPersonByName(
        (clientes ?? []).flatMap((c) => [
          ...(c.contact_email
            ? [{ name: c.contact_name || c.name, email: c.contact_email, label: c.name }]
            : []),
          ...(c.contact_email && c.contact_name && c.name !== c.contact_name
            ? [{ name: c.name, email: c.contact_email, label: c.name }]
            : []),
        ]),
        participantName,
      );

      if (clientCandidate?.email) {
        matchedEmail = clientCandidate.email;
        matchedSourceLabel = `${participantName} (${clientCandidate.label})`;
      } else {
        const pastCandidate = matchPersonByName(
          Array.from(
            new Set((pastAttendees ?? []).map((a) => a.email.toLowerCase())),
          ).map((email) => ({ name: email.split("@")[0], email })),
          participantName,
        );
        if (pastCandidate?.email) {
          matchedEmail = pastCandidate.email;
          matchedSourceLabel = pastCandidate.email;
        }
      }
    }
  }

  const allEmails = Array.from(
    new Set([
      ...explicitEmails,
      ...(matchedEmail ? [matchedEmail.toLowerCase()] : []),
    ]),
  );

  const rawTitle = titleText
    ? `${baseLabel} ${titleText.startsWith("con ") || titleText.startsWith("de ") || titleText.startsWith("sobre ") ? titleText : `· ${titleText}`}`
    : participantName
      ? `${baseLabel} con ${capitalizePhrase(participantName)}`
      : baseLabel;

  const finalTitle = capitalizePhrase(rawTitle.replace(/\s+/g, " ").trim());
  const wantsMeet = type === "reunion" || allEmails.length > 0;

  const result = await createCalendarEvent({
    title: finalTitle,
    type,
    startAt,
    endAt,
    assignedMembershipId: matchedMemberId,
    guestEmails: allEmails,
    withMeet: wantsMeet,
  });

  const whenLabel = formatWhenEs(startAt, org.timezone);
  const steps: string[] = [`Fecha y hora: ${whenLabel}`];
  if (result.meetingUrl) {
    steps.push("Enlace de Google Meet generado automáticamente.");
  } else if (result.googleMeetStatus === "missing_google_connection") {
    steps.push("Conecta tu Google Calendar en Configuración para generar enlaces automáticos de Google Meet.");
  } else if (result.googleMeetStatus === "google_error") {
    steps.push("No se pudo generar Google Meet (reconecta Google Calendar en Configuración).");
  }
  if (result.emailedCount > 0) {
    const sentList = allEmails.filter((e) => !result.failedRecipients.includes(e));
    steps.push(`Notificación enviada por correo a: ${sentList.join(", ")}`);
  }
  if (matchedSourceLabel && matchedEmail) {
    steps.push(`Contacto detectado automáticamente: ${matchedSourceLabel}`);
  }
  if (result.failedRecipients.length > 0) {
    steps.push(`No se pudo enviar correo a: ${result.failedRecipients.join(", ")}`);
  }

  let reply = `¡Listo! Agendé «${finalTitle}» para el ${whenLabel}.`;
  let pendingFollowUp: DittoPendingFollowUp | undefined;
  let suggestions: string[] = [
    "¿Qué reuniones tengo esta semana?",
    "Cancela esa reunión",
  ];

  if (participantName && allEmails.length === 0) {
    reply += ` No encontré un correo guardado para ${capitalizePhrase(participantName)} en tu equipo o clientes; si quieres enviarle la invitación ahora mismo, respóndeme su correo (por ejemplo: saul@correo.com).`;
    pendingFollowUp = {
      type: "attach_guest_email",
      eventId: result.id,
      eventTitle: finalTitle,
    };
    suggestions = ["Cancela esa reunión", "¿Qué reuniones tengo esta semana?"];
  } else if (result.googleMeetStatus === "missing_google_connection" && wantsMeet) {
    reply += " Conecta Google Calendar en Configuración para que también genere el enlace de Google Meet automáticamente.";
  } else if (!timeParsed) {
    reply += " Como no especificaste hora exacta, la dejé a las 10:00 a. m. (puedes editarla en Calendario).";
  }

  const cta =
    result.googleMeetStatus === "missing_google_connection" && allEmails.length > 0
      ? { label: "Conectar Google Calendar", href: "/app/configuracion" }
      : { label: "Ver en Calendario", href: "/app/calendario" };

  return {
    handled: true,
    reply,
    steps,
    cta,
    suggestions,
    mutated: true,
    meetingCard: {
      title: finalTitle,
      whenLabel,
      meetingUrl: result.meetingUrl,
      emailedRecipients: allEmails.filter((e) => !result.failedRecipients.includes(e)),
    },
    pendingFollowUp,
  };
}

async function handleAttachEmailFollowUp(
  rawMessage: string,
  followUp: DittoPendingFollowUp,
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult | null> {
  if (followUp.type !== "attach_guest_email" || !followUp.eventId) return null;
  const emails = extractEmails(rawMessage);
  if (emails.length === 0) return null;

  if (org.role !== "owner" && org.role !== "admin") return null;

  const supabase = await createClient();
  const [{ data: existing }, { data: attendeeRows }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, description, type, start_at, end_at, client_id, video_id, color")
      .eq("id", followUp.eventId)
      .eq("organization_id", org.id)
      .maybeSingle(),
    supabase
      .from("event_attendees")
      .select("email, membership_id")
      .eq("event_id", followUp.eventId),
  ]);

  if (!existing) {
    return {
      handled: true,
      reply: "No encontré ese evento en tu calendario (pudo haber sido eliminado).",
      cta: { label: "Ir al Calendario", href: "/app/calendario" },
    };
  }

  const mergedEmails = Array.from(
    new Set([
      ...(attendeeRows ?? []).filter((a) => !a.membership_id).map((a) => a.email.toLowerCase()),
      ...emails,
    ]),
  );

  const assignedRow = (attendeeRows ?? []).find(
    (a) => a.membership_id && a.membership_id !== org.membershipId,
  );

  const updated = await updateCalendarEvent({
    id: existing.id,
    title: existing.title,
    description: existing.description ?? undefined,
    type: existing.type,
    startAt: existing.start_at,
    endAt: existing.end_at,
    clientId: existing.client_id ?? undefined,
    videoId: existing.video_id ?? undefined,
    color: existing.color ?? undefined,
    assignedMembershipId: assignedRow?.membership_id ?? undefined,
    guestEmails: mergedEmails,
    withMeet: true,
  });

  if (!updated.ok) {
    return {
      handled: true,
      reply: `No pude actualizar el evento: ${updated.error}`,
      cta: { label: "Abrir Calendario", href: "/app/calendario" },
    };
  }

  const whenLabel = formatWhenEs(existing.start_at, org.timezone);
  const sentEmails = emails.filter((e) => !(updated.failedRecipients ?? []).includes(e));

  return {
    handled: true,
    reply:
      sentEmails.length > 0
        ? `¡Listo! Agregué a ${sentEmails.join(", ")} a «${existing.title}» y le envié la invitación con el enlace de la reunión.`
        : `Agregué el correo a «${existing.title}», pero falló el envío por email.`,
    steps: [
      `Evento: ${existing.title} (${whenLabel})`,
      ...(updated.meetingUrl ? [`Google Meet: ${updated.meetingUrl}`] : []),
      ...(updated.googleMeetStatus === "missing_google_connection"
        ? ["Conecta tu Google Calendar en Configuración para incluir enlace de Google Meet."]
        : []),
    ],
    cta: { label: "Ver en Calendario", href: "/app/calendario" },
    mutated: true,
    meetingCard: {
      title: existing.title,
      whenLabel,
      meetingUrl: updated.meetingUrl,
      emailedRecipients: sentEmails,
    },
  };
}

async function handleScheduleVideoCommand(
  stripped: string,
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult> {
  const perms = await getEffectiveRolePermissions();
  if (org.role === "viewer" || !perms.canCreateVideos) {
    return {
      handled: true,
      reply: "Tu rol actual no tiene permisos para registrar videos en Monitoreo.",
      cta: { label: "Ver Monitoreo", href: "/app/monitoreo" },
    };
  }

  const activePeriod = await resolveActivePeriod(org.id);
  if (!activePeriod) {
    return {
      handled: true,
      reply: "No hay un periodo mensual abierto todavía. Abre un mes primero para poder registrar videos.",
      cta: { label: "Abrir un mes", href: "/app/periodos/nuevo" },
    };
  }

  const timeParsed = extractTime(stripped);
  const dateParsed = extractDateParts(timeParsed?.cleanedText ?? stripped, org.timezone, timeParsed?.hour ?? 10);
  const dueDate = dateParsed.explicitlySpecified
    ? `${dateParsed.year}-${String(dateParsed.month).padStart(2, "0")}-${String(dateParsed.day).padStart(2, "0")}`
    : null;

  const supabase = await createClient();
  const [{ data: clientPeriods }, { data: miembros }] = await Promise.all([
    supabase
      .from("client_periods")
      .select("client_id, clients(id, name)")
      .eq("period_id", activePeriod.id)
      .eq("active", true),
    supabase
      .from("memberships")
      .select("id, full_name, email, role")
      .eq("organization_id", org.id)
      .eq("active", true),
  ]);

  const activeClients = (clientPeriods ?? [])
    .map((cp) => cp.clients as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  if (activeClients.length === 0) {
    return {
      handled: true,
      reply: "No tienes clientes activos en este periodo. Registra o activa un cliente primero para asignarle el video.",
      cta: { label: "Ir a Clientes", href: "/app/clientes" },
    };
  }

  const folded = foldAccents(dateParsed.cleanedText);
  const matchedClient =
    activeClients.find((c) => folded.includes(foldAccents(c.name))) ??
    (activeClients.length === 1 ? activeClients[0] : undefined);

  const cleaned = dateParsed.cleanedText
    .replace(
      /^(?:agendar?|agendame|programar?|programame|crear?|creame|anotar?|anotame|registrar?|registrame|subir|agregar?)\s+/i,
      "",
    )
    .replace(/^(?:un|el)\s+(?:video|reel|short|clip)\b[\s:.-]*/i, "")
    .trim();

  let titleCandidate = cleaned
    .replace(/\b(?:llamado|titulado|sobre)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (matchedClient) {
    const clientRegex = new RegExp(`\\b(?:para|de|cliente)\\s+${matchedClient.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    titleCandidate = titleCandidate.replace(clientRegex, "").trim();
  }
  const finalTitle = capitalizePhrase(titleCandidate) || "Video programado desde Ditto";

  if (!matchedClient) {
    const listNames = activeClients.map((c) => c.name).join(", ");
    return {
      handled: true,
      reply: `¿A qué cliente quieres asignar el video «${finalTitle}»? Tus clientes activos este mes son: ${listNames}.`,
      pendingFollowUp: {
        type: "clarify_video_client",
        videoTitle: finalTitle,
        dueDate,
      },
      suggestions: activeClients.slice(0, 3).map((c) => c.name),
    };
  }

  const conMatch = /\bcon\s+([a-záéíóúñ0-9\s]{2,30})/i.exec(stripped);
  const editorCandidate = conMatch
    ? matchPersonByName(
        (miembros ?? [])
          .filter((m) => m.role !== "viewer")
          .map((m) => ({ id: m.id, name: m.full_name || m.email.split("@")[0], email: m.email })),
        conMatch[1],
      )
    : undefined;

  const res = await createVideo({
    periodId: activePeriod.id,
    clientId: matchedClient.id,
    title: finalTitle,
    editorId: editorCandidate?.id ?? null,
    dueDate,
    priority: "media",
  });

  if (!res.ok) {
    return {
      handled: true,
      reply: `No pude registrar el video: ${res.error}`,
      cta: { label: "Ir a Monitoreo", href: "/app/monitoreo" },
    };
  }

  return {
    handled: true,
    reply: `¡Video registrado en Monitoreo! «${finalTitle}» quedó asignado al cliente ${matchedClient.name}${dueDate ? ` con fecha de entrega ${dueDate}` : ""}.`,
    steps: [
      `Cliente: ${matchedClient.name}`,
      ...(editorCandidate ? [`Encargado: ${editorCandidate.name}`] : []),
      ...(dueDate ? [`Fecha límite: ${dueDate}`] : []),
    ],
    cta: { label: "Ver en Monitoreo", href: "/app/monitoreo" },
    mutated: true,
    suggestions: ["¿Cómo muevo el % de avance?", "Agenda una reunión el viernes a las 4pm"],
  };
}

async function handleClarifyVideoClientFollowUp(
  rawMessage: string,
  followUp: DittoPendingFollowUp,
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult | null> {
  if (followUp.type !== "clarify_video_client" || !followUp.videoTitle) return null;
  const activePeriod = await resolveActivePeriod(org.id);
  if (!activePeriod) return null;

  const supabase = await createClient();
  const { data: clientPeriods } = await supabase
    .from("client_periods")
    .select("client_id, clients(id, name)")
    .eq("period_id", activePeriod.id)
    .eq("active", true);

  const activeClients = (clientPeriods ?? [])
    .map((cp) => cp.clients as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const target = foldAccents(rawMessage).trim();
  const matched = activeClients.find(
    (c) => foldAccents(c.name) === target || foldAccents(c.name).includes(target) || target.includes(foldAccents(c.name)),
  );
  if (!matched) return null;

  const res = await createVideo({
    periodId: activePeriod.id,
    clientId: matched.id,
    title: followUp.videoTitle,
    dueDate: followUp.dueDate ?? null,
    priority: "media",
  });

  if (!res.ok) {
    return {
      handled: true,
      reply: `No pude registrar el video: ${res.error}`,
      cta: { label: "Ver Monitoreo", href: "/app/monitoreo" },
    };
  }

  return {
    handled: true,
    reply: `¡Listo! Registré «${followUp.videoTitle}» para ${matched.name}${followUp.dueDate ? ` (entrega ${followUp.dueDate})` : ""}.`,
    cta: { label: "Ver en Monitoreo", href: "/app/monitoreo" },
    mutated: true,
  };
}

async function handleListAgendaCommand(
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, type, start_at, meeting_url")
    .eq("organization_id", org.id)
    .gte("start_at", nowIso)
    .order("start_at", { ascending: true })
    .limit(6);

  if (!events || events.length === 0) {
    return {
      handled: true,
      reply: "No tienes reuniones ni eventos próximos agendados por ahora. Puedes pedirme: «Agenda una reunión mañana a las 3pm».",
      cta: { label: "Abrir Calendario", href: "/app/calendario" },
      suggestions: ["Agenda una reunión mañana a las 3pm"],
    };
  }

  const steps = events.map((ev) => {
    const label = EVENT_TYPE_LABEL[ev.type] ?? ev.type;
    const when = formatWhenEs(ev.start_at, org.timezone);
    const meetUrl =
      ev.meeting_url && !ev.meeting_url.includes("meet.jit.si") ? ev.meeting_url : null;
    return `${label}: ${ev.title} — ${when}${meetUrl ? ` · Google Meet: ${meetUrl}` : ""}`;
  });

  return {
    handled: true,
    reply: `Tienes ${events.length} evento(s) próximo(s) en ${org.name}:`,
    steps,
    cta: { label: "Abrir Calendario", href: "/app/calendario" },
    suggestions: ["Agenda una reunión el viernes a las 4pm"],
  };
}

async function handleCancelEventCommand(
  followUp: DittoPendingFollowUp | undefined,
  org: Awaited<ReturnType<typeof requireActiveOrganization>>,
): Promise<DittoCommandResult | null> {
  if (!followUp?.eventId) return null;
  if (org.role !== "owner" && org.role !== "admin") return null;

  const res = await deleteCalendarEvent(followUp.eventId);
  if (!res.ok) {
    return {
      handled: true,
      reply: `No pude cancelar «${followUp.eventTitle ?? "el evento"}»: ${res.error}`,
      cta: { label: "Abrir Calendario", href: "/app/calendario" },
    };
  }

  return {
    handled: true,
    reply: `Listo, cancelé «${followUp.eventTitle ?? "la reunión"}» del calendario.`,
    cta: { label: "Ver Calendario", href: "/app/calendario" },
    mutated: true,
  };
}

export async function tryExecuteDittoCommand(params: {
  message: string;
  pendingFollowUp?: DittoPendingFollowUp;
}): Promise<DittoCommandResult | null> {
  const stripped = stripWakePrefix(params.message);
  if (!stripped) return null;

  const isFollowUpEmail =
    params.pendingFollowUp?.type === "attach_guest_email" && extractEmails(stripped).length > 0;
  const isFollowUpClient = params.pendingFollowUp?.type === "clarify_video_client";
  const wantsCancel = isCancelLastEventRequest(stripped);
  const wantsAgenda = isListAgendaRequest(stripped);
  const wantsVideo = isVideoActionRequest(stripped);
  const wantsCalendar = isCalendarActionRequest(stripped);

  if (!isFollowUpEmail && !isFollowUpClient && !wantsCancel && !wantsAgenda && !wantsVideo && !wantsCalendar) {
    return null;
  }

  const user = await getServerUser();
  if (!user) {
    return {
      handled: true,
      reply: "Para que pueda agendar reuniones o programar videos por ti, inicia sesión primero en tu espacio de EditFlow.",
      cta: { label: "Iniciar sesión", href: "/crear-espacio" },
    };
  }

  const org = await requireActiveOrganization();

  if (wantsCancel && params.pendingFollowUp?.eventId) {
    const cancelRes = await handleCancelEventCommand(params.pendingFollowUp, org);
    if (cancelRes) return cancelRes;
  }

  if (isFollowUpEmail && params.pendingFollowUp) {
    const followRes = await handleAttachEmailFollowUp(stripped, params.pendingFollowUp, org);
    if (followRes) return followRes;
  }

  if (isFollowUpClient && params.pendingFollowUp) {
    const clientRes = await handleClarifyVideoClientFollowUp(stripped, params.pendingFollowUp, org);
    if (clientRes) return clientRes;
  }

  if (wantsAgenda) {
    return handleListAgendaCommand(org);
  }

  if (wantsVideo) {
    return handleScheduleVideoCommand(stripped, org);
  }

  if (wantsCalendar) {
    return handleScheduleCalendarCommand(stripped, org);
  }

  return null;
}
