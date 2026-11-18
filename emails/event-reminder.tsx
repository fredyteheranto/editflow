import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { emailAssetBaseUrl } from "@/lib/email/transport";

export interface EventReminderEmailProps {
  eventTitle: string;
  eventTypeLabel: string;
  dateLabel: string;
  timeLabel: string;
  minutesBefore: number;
  organizationName: string;
  location?: string;
  meetingUrl?: string;
}

export default function EventReminderEmail({
  eventTitle,
  eventTypeLabel,
  dateLabel,
  timeLabel,
  minutesBefore,
  organizationName,
  location,
  meetingUrl,
}: EventReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${eventTitle} empieza en ${minutesBefore} minutos`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${emailAssetBaseUrl()}/logo-mark.png`}
            width="32"
            height="32"
            alt="EditFlow"
            style={{ marginBottom: "12px" }}
          />
          <Text style={brand}>
            Edit<span style={{ color: "#8B5CF6" }}>Flow</span>
          </Text>
          <Heading style={h1}>{eventTitle}</Heading>
          <Text style={subtitle}>
            {eventTypeLabel} · {organizationName}
          </Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Empieza en:</strong> {minutesBefore} minutos
            </Text>
            <Text style={row}>
              <strong>Fecha:</strong> {dateLabel}
            </Text>
            <Text style={row}>
              <strong>Hora:</strong> {timeLabel}
            </Text>
            {location && (
              <Text style={row}>
                <strong>Lugar:</strong> {location}
              </Text>
            )}
          </Section>

          <Text style={paragraph}>
            {meetingUrl ? (
              <>
                Únete desde aquí:{" "}
                <Link href={meetingUrl} style={link}>
                  {meetingUrl}
                </Link>
              </>
            ) : (
              "Recordatorio automático de EditFlow."
            )}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Enviado por EditFlow — recordatorio de calendario.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0b0a12",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: "32px 0",
};

const container = {
  backgroundColor: "#15131f",
  borderRadius: "16px",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "480px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const brand = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 24px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 4px",
};

const subtitle = {
  color: "#9d97b3",
  fontSize: "13px",
  margin: "0 0 20px",
};

const card = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "0 0 20px",
};

const row = {
  color: "#e5e2f0",
  fontSize: "14px",
  margin: "4px 0",
};

const paragraph = {
  color: "#c7c2d9",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 20px",
};

const link = {
  color: "#8B5CF6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "20px 0",
};

const footer = {
  color: "#6b6580",
  fontSize: "12px",
  margin: 0,
};
