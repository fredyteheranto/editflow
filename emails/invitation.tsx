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

export interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  roleLabel: string;
  inviteUrl: string;
}

export default function InvitationEmail({
  organizationName,
  inviterName,
  roleLabel,
  inviteUrl,
}: InvitationEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        {inviterName} te invitó a {organizationName} en EditFlow. Entra con tu enlace para empezar.
      </Preview>
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
          <Heading style={h1}>Te invitaron a colaborar</Heading>
          <Text style={subtitle}>{organizationName}</Text>

          <Text style={paragraph}>
            {inviterName} te invitó a unirte a <strong>{organizationName}</strong> en EditFlow como{" "}
            <strong>{roleLabel}</strong>. EditFlow es la herramienta donde el equipo organiza sus
            videos, clientes y calendario mes a mes.
          </Text>

          <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
            <Link href={inviteUrl} style={button}>
              Aceptar invitación
            </Link>
          </Section>

          <Text style={paragraph}>
            O copia y pega este enlace en tu navegador:
            <br />
            <Link href={inviteUrl} style={link}>
              {inviteUrl}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Enviado por EditFlow en nombre de {inviterName}. Si no esperabas esta invitación, puedes
            ignorar este correo sin problema.
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

const paragraph = {
  color: "#c7c2d9",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
};

const button = {
  backgroundColor: "#8B5CF6",
  borderRadius: "10px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 28px",
  textDecoration: "none",
};

const link = {
  color: "#8B5CF6",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
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
