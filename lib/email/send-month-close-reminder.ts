import { render } from "@react-email/render";
import { sendResendEmail } from "@/lib/email/transport";
import MonthCloseReminderEmail, {
  type MonthCloseReminderEmailProps,
} from "@/emails/month-close-reminder";

export interface SendMonthCloseReminderInput extends MonthCloseReminderEmailProps {
  to: string;
}

export async function sendMonthCloseReminderEmail(input: SendMonthCloseReminderInput) {
  const { to, ...templateProps } = input;
  const html = await render(MonthCloseReminderEmail(templateProps));

  return sendResendEmail({
    to,
    subject: `EditFlow · ${templateProps.periodLabel} cierra en ${templateProps.diasRestantes} días`,
    html,
  });
}
