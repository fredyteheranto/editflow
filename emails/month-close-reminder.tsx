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

export interface MonthCloseReminderEmailProps {
  organizationName: string;
  periodLabel: string;
  diasRestantes: number;
  pendientes: number;
  enEdicion: number;
  atrasados: number;
  appUrl: string;
}

export default function MonthCloseReminderEmail({
  organizationName,
  periodLabel,
  diasRestantes,
  pendientes,
  enEdicion,
  atrasados,
  appUrl,
}: MonthCloseReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${periodLabel} cierra en ${diasRestantes} días — revisa antes de cerrar el mes`}</Preview>
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
          <Heading style={h1}>{periodLabel} está por terminar</Heading>
          <Text style={subtitle}>{organizationName}</Text>

          <Text style={paragraph}>
            Quedan <strong>{diasRestantes} días</strong> del mes y el periodo{" "}
            <strong>{periodLabel}</strong> todavía está abierto. Revisa que todo quede en
            orden antes de cerrarlo — una vez cerrado, los números quedan congelados.
          </Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Pendientes:</strong> {pendientes}
            </Text>
            <Text style={row}>
              <strong>En edición:</strong> {enEdicion}
            </Text>
            <Text style={row}>
              <strong>Atrasados:</strong> {atrasados}
            </Text>
          </Section>

          <Text style={paragraph}>
            Entra a <Link href={appUrl} style={link}>{appUrl}</Link> para revisar y cerrar
            el mes cuando esté listo.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Enviado por EditFlow a los propietarios/administradores de {organizationName}.
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
