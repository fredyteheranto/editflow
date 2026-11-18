import { render } from "@react-email/render";
import { sendResendEmail } from "@/lib/email/transport";
import DailyDigestEmail, { type DailyDigestEmailProps } from "@/emails/daily-digest";

export interface SendDailyDigestInput extends DailyDigestEmailProps {
  to: string;
}

export async function sendDailyDigestEmail(input: SendDailyDigestInput) {
  const { to, ...templateProps } = input;
  const html = await render(DailyDigestEmail(templateProps));

  return sendResendEmail({
    to,
    subject: `EditFlow · Resumen diario — ${templateProps.organizationName}`,
    html,
  });
}
