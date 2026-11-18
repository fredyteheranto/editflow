import { render } from "@react-email/render";
import { sendResendEmail } from "@/lib/email/transport";
import WeeklyDigestEmail, { type WeeklyDigestEmailProps } from "@/emails/weekly-digest";

export interface SendWeeklyDigestInput extends WeeklyDigestEmailProps {
  to: string;
}

export async function sendWeeklyDigestEmail(input: SendWeeklyDigestInput) {
  const { to, ...templateProps } = input;
  const html = await render(WeeklyDigestEmail(templateProps));

  return sendResendEmail({
    to,
    subject: `EditFlow · Resumen semanal — ${templateProps.organizationName}`,
    html,
  });
}
