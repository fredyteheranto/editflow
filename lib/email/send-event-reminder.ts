import { render } from "@react-email/render";
import { sendResendEmail } from "@/lib/email/transport";
import EventReminderEmail, { type EventReminderEmailProps } from "@/emails/event-reminder";

export interface SendEventReminderInput extends EventReminderEmailProps {
  to: string;
}

/** Recordatorio automático de EditFlow — siempre por Resend, no es un correo "de" nadie. */
export async function sendEventReminderEmail(input: SendEventReminderInput) {
  const { to, ...templateProps } = input;
  const html = await render(EventReminderEmail(templateProps));

  return sendResendEmail({
    to,
    subject: `EditFlow · ${templateProps.eventTitle} empieza en ${templateProps.minutesBefore} minutos`,
    html,
  });
}
