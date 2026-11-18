import { toPlainText } from "@react-email/render";
import { Resend } from "resend";
import { sendGmailMessage } from "@/lib/google/gmail";
import { appUrl, emailFrom } from "@/lib/supabase/env";

const PUBLIC_FALLBACK_URL = "https://www.editflow.click";

/**
 * URL base para activos embebidos en correos (p. ej. el logo): en local evita
 * emitir http://localhost, ya que los clientes de correo externos no lo alcanzan.
 */
export function emailAssetBaseUrl(): string {
  const base = appUrl();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base)) {
    return PUBLIC_FALLBACK_URL;
  }
  return base;
}

/**
 * Extrae la dirección de envío y construye la cabecera From de EditFlow.
 */
function resolveFromAddress(): string {
  const raw = emailFrom().trim();
  const match = raw.match(/<(.+)>/);
  return (match?.[1] ?? raw).trim() || "notificaciones@editflow.click";
}

export function buildEditFlowFromHeader(): string {
  return `EditFlow <${resolveFromAddress()}>`;
}

/**
 * Evita poner un Reply-To de webmail gratuito (ej. @gmail.com) cuando el From
 * es de dominio propio (@editflow.click), ya que dispara filtros anti-spam.
 */
function resolveAlignedReplyTo(replyTo?: string): string | undefined {
  if (!replyTo) return undefined;
  const fromDomain = resolveFromAddress().split("@")[1]?.toLowerCase();
  const replyDomain = replyTo.trim().split("@")[1]?.toLowerCase();
  if (!fromDomain || !replyDomain) return undefined;
  return fromDomain === replyDomain ? replyTo.trim() : undefined;
}

export type EmailSendResult =
  | { sent: true; transport: "gmail" | "resend"; id?: string }
  | { sent: false; reason: "no-transport" | "send-failed"; error: string };

/**
 * Envía un correo vía Resend verificando `{ data, error }`, ya que el SDK de
 * Resend retorna los errores en la respuesta en lugar de lanzar excepciones.
 * Incluye versión `text/plain` automática para mejorar la entregabilidad.
 */
export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      sent: false,
      reason: "no-transport",
      error: "RESEND_API_KEY no está configurada.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const alignedReplyTo = resolveAlignedReplyTo(params.replyTo);
    const text = toPlainText(params.html);
    const { data, error } = await resend.emails.send({
      from: buildEditFlowFromHeader(),
      to: params.to,
      ...(alignedReplyTo ? { replyTo: alignedReplyTo } : {}),
      subject: params.subject,
      html: params.html,
      text,
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
      },
    });

    if (error || !data?.id) {
      const msg = error?.message ?? "Resend no devolvió identificador de envío.";
      console.error("[resend] fallo al enviar correo:", msg, error);
      return { sent: false, reason: "send-failed", error: msg };
    }

    return { sent: true, transport: "resend", id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado al enviar con Resend.";
    console.error("[resend] excepción al enviar correo:", err);
    return { sent: false, reason: "send-failed", error: msg };
  }
}

/**
 * Intenta enviar desde la cuenta de Gmail del remitente si tiene permiso válido
 * y cae automáticamente a Resend si Gmail no está disponible o falla.
 */
export async function sendWithGmailOrResend(params: {
  to: string;
  subject: string;
  html: string;
  senderMembershipId?: string | null;
  senderEmail?: string | null;
  gmailSendAvailable?: boolean;
  replyTo?: string;
}): Promise<EmailSendResult> {
  if (params.gmailSendAvailable && params.senderMembershipId && params.senderEmail) {
    try {
      const sent = await sendGmailMessage(params.senderMembershipId, {
        fromName: "EditFlow",
        fromEmail: params.senderEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      if (sent) return { sent: true, transport: "gmail" };
      console.warn("[email] Gmail devolvió false, usando respaldo Resend.");
    } catch (err) {
      console.warn("[email] Gmail falló (token vencido o revocado), usando respaldo Resend:", err);
    }
  }

  return sendResendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });
}
