import { render } from "@react-email/render";
import { type EmailSendResult, sendWithGmailOrResend } from "@/lib/email/transport";
import PasswordResetEmail from "@/emails/password-reset";

export interface SendPasswordResetInput {
  to: string;
  resetUrl: string;
  /** Membership del owner cuyo Gmail se usa para enviar (si conectó gmail.send). */
  senderMembershipId: string | null;
  senderEmail: string | null;
  gmailSendAvailable: boolean;
}

export type SendPasswordResetResult = EmailSendResult;

/**
 * Manda el correo de "restablecer contraseña" con la marca EditFlow (asunto,
 * logo y botón controlados por la app). Prefiere el Gmail del owner de la
 * organización del usuario; cae a Resend. Si no hay transporte, no envía.
 */
export async function sendPasswordResetEmail(input: SendPasswordResetInput): Promise<SendPasswordResetResult> {
  const subject = "EditFlow · Restablecer contraseña";
  const html = await render(PasswordResetEmail({ resetUrl: input.resetUrl }));

  return sendWithGmailOrResend({
    to: input.to,
    subject,
    html,
    senderMembershipId: input.senderMembershipId,
    senderEmail: input.senderEmail,
    gmailSendAvailable: input.gmailSendAvailable,
  });
}
