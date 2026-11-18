import { render } from "@react-email/render";
import { sendWithGmailOrResend } from "@/lib/email/transport";
import EventNotificationEmail, {
  type EventNotificationEmailProps,
} from "@/emails/event-notification";

export interface SendEventNotificationInput extends EventNotificationEmailProps {
  to: string;
  /** Correo del miembro que envía (quien creó el evento). */
  senderEmail: string;
  /** Membership del remitente — su token de Gmail es el que se usa. */
  senderMembershipId: string;
  /** true si el remitente conectó Google con el scope gmail.send. */
  gmailSendAvailable: boolean;
}

/**
 * Manda la notificación del evento. Si el remitente (quien crea el evento)
 * conectó Gmail con el scope de envío, sale literalmente desde su bandeja de
 * envío — si no, cae a Resend. Si no hay ningún transporte, no envía.
 */
export async function sendEventNotificationEmail(input: SendEventNotificationInput) {
  const { to, senderEmail, senderMembershipId, gmailSendAvailable, eventTitle, ...templateProps } = input;
  const subject = `EditFlow · ${eventTitle}`;
  const html = await render(EventNotificationEmail({ eventTitle, ...templateProps }));

  const result = await sendWithGmailOrResend({
    to,
    subject,
    html,
    senderMembershipId,
    senderEmail,
    gmailSendAvailable,
    replyTo: senderEmail,
  });
  return { transport: result.sent ? result.transport : ("none" as const) };
}
