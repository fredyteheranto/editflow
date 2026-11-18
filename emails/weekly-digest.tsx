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
import type { DigestKpi } from "@/emails/daily-digest";
import { emailAssetBaseUrl } from "@/lib/email/transport";

export interface DigestRankingRow {
  name: string;
  pct: number | null;
}

export interface WeeklyDigestEmailProps {
  organizationName: string;
  periodLabel: string;
  dateLabel: string;
  kpis: DigestKpi[];
  clientesRanking: DigestRankingRow[];
  editoresRanking: DigestRankingRow[];
  appUrl: string;
}

export default function WeeklyDigestEmail({
  organizationName,
  periodLabel,
  dateLabel,
  kpis,
  clientesRanking,
  editoresRanking,
  appUrl,
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Resumen semanal de {organizationName} — {periodLabel}</Preview>
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
          <Heading style={h1}>Resumen semanal</Heading>
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

          <Text style={sectionTitle}>Avance por cliente (mes en curso)</Text>
          <Section style={card}>
            {clientesRanking.length > 0 ? (
              clientesRanking.map((row, i) => (
                <Text key={i} style={row2}>
                  {row.name} — {row.pct ?? 0}% de la meta
                </Text>
              ))
            ) : (
              <Text style={row2}>Sin clientes activos este mes.</Text>
            )}
          </Section>

          <Text style={sectionTitle}>Cumplimiento por editor</Text>
          <Section style={card}>
            {editoresRanking.length > 0 ? (
              editoresRanking.map((row, i) => (
                <Text key={i} style={row2}>
                  {row.name} — {row.pct ?? 0}% a tiempo
                </Text>
              ))
            ) : (
              <Text style={row2}>Sin videos asignados este mes.</Text>
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

const row2 = {
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
