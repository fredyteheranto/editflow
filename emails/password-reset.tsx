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

export interface PasswordResetEmailProps {
  resetUrl: string;
}

export default function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Restablece tu contraseña de EditFlow. El enlace caduca en una hora.</Preview>
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
          <Heading style={h1}>Restablecer tu contraseña</Heading>

          <Text style={paragraph}>
            Recibimos una solicitud para restablecer tu contraseña de EditFlow. Haz clic en el botón
            para crear una nueva. El enlace caduca en una hora.
          </Text>

          <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
            <Link href={resetUrl} style={button}>
              Restablecer contraseña
            </Link>
          </Section>

          <Text style={paragraph}>
            O copia y pega este enlace en tu navegador:
            <br />
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Si no solicitaste este cambio, ignora este correo — tu contraseña no cambia.
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

const brand = { color: "#ffffff", fontSize: "14px", fontWeight: 600, margin: "0 0 24px" };
const h1 = { color: "#ffffff", fontSize: "22px", fontWeight: 700, margin: "0 0 12px" };
const paragraph = { color: "#c7c2d9", fontSize: "14px", lineHeight: "22px", margin: "0 0 16px" };
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
const link = { color: "#8B5CF6", textDecoration: "underline", wordBreak: "break-all" as const };
const hr = { borderColor: "rgba(255,255,255,0.08)", margin: "20px 0" };
const footer = { color: "#6b6580", fontSize: "12px", margin: 0 };
