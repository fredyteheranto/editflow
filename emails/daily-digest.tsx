import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { emailAssetBaseUrl } from "@/lib/email/transport";

export interface DigestKpi {
  label: string;
  value: string;
}

export interface DigestEventRow {
  title: string;
  timeLabel: string;
}

export interface DigestVideoRow {
  title: string;
  clientName: string;
  dueDateLabel: string;
}

export interface DailyDigestEmailProps {
  organizationName: string;
  periodLabel: string;
  dateLabel: string;
  kpis: DigestKpi[];
  eventosHoy: DigestEventRow[];
  videosAtrasados: DigestVideoRow[];
  appUrl: string;
}

export default function DailyDigestEmail({
  organizationName,
  periodLabel,
  dateLabel,
  kpis,
  eventosHoy,
  videosAtrasados,
  appUrl,
}: DailyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Resumen diario de {organizationName} — {dateLabel}</Preview>
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
          <Heading style={h1}>Resumen diario</Heading>
          <Text style={subtitle}>
            {organizationName} · {periodLabel} · {dateLabel}
          </Text>

          <Section style={kpiGrid}>
            {kpis.map((kpi) => (
              <div key={kpi.label} style={kpiCard}>
                <Text style={kpiValue}>{kpi.value}</Text>
                <Text style={kpiLabel}>{kpi.label}</Text>
              </div>
            ))}
          </Section>

          <Text style={sectionTitle}>Eventos de hoy</Text>
          <Section style={card}>
            {eventosHoy.length > 0 ? (
              eventosHoy.map((event, i) => (
                <Text key={i} style={row}>
                  {event.timeLabel} — {event.title}
                </Text>
              ))
            ) : (
              <Text style={row}>Sin eventos agendados para hoy.</Text>
            )}
          </Section>

          <Text style={sectionTitle}>Videos atrasados</Text>
          <Section style={card}>
            {videosAtrasados.length > 0 ? (
              videosAtrasados.map((video, i) => (
                <Text key={i} style={row}>
                  {video.title} ({video.clientName}) — vencía el {video.dueDateLabel}
                </Text>
              ))
            ) : (
              <Text style={row}>Sin videos atrasados. 🎉</Text>
            )}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Enviado por EditFlow. Entra a {appUrl} para ver el detalle completo del mes.
          </Text>
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
  maxWidth: "520px",
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

const kpiGrid = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
  margin: "0 0 20px",
};

const kpiCard = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "10px 14px",
  minWidth: "100px",
};

const kpiValue = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 700,
  margin: 0,
};

const kpiLabel = {
  color: "#9d97b3",
  fontSize: "11px",
  margin: 0,
};

const sectionTitle = {
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  margin: "0 0 8px",
};

const card = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "14px 18px",
  margin: "0 0 20px",
};

const row = {
  color: "#e5e2f0",
  fontSize: "13px",
  margin: "4px 0",
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
