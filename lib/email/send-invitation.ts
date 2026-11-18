import { render } from "@react-email/render";
import { type EmailSendResult, sendWithGmailOrResend } from "@/lib/email/transport";
import InvitationEmail, { type InvitationEmailProps } from "@/emails/invitation";

export interface SendInvitationInput extends InvitationEmailProps {
  to: string;
  /** Membership de quien invita — su token de Gmail se usa para mandar el correo. */
  senderMembershipId: string;
  inviterEmail: string;
  /** true si quien invita conectó Google con el scope gmail.send. */
  gmailSendAvailable: boolean;
}

export type SendInvitationResult = EmailSendResult;

/**
 * Manda la invitación con la marca EditFlow (asunto, logo y botón controlados
 * por la app). Usa el Gmail del invitador si conectó el scope `gmail.send`, y
 * cae automáticamente a Resend si Gmail falla o no está conectado.
 */
export async function sendInvitationEmail(input: SendInvitationInput): Promise<SendInvitationResult> {
  const { to, senderMembershipId, inviterEmail, gmailSendAvailable, ...templateProps } = input;
  const subject = `${templateProps.organizationName} te invita a colaborar`;
  const html = await render(InvitationEmail(templateProps));

  return sendWithGmailOrResend({
    to,
    subject,
    html,
    senderMembershipId,
    senderEmail: inviterEmail,
    gmailSendAvailable,
    replyTo: inviterEmail,
  });
}
