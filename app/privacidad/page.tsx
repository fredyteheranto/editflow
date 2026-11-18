import Link from "next/link";
import Image from "next/image";
import { LegalLinks } from "@/components/shared/legal-links";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Política de Privacidad y Tratamiento de Datos",
  description:
    "Política de Privacidad, uso de cookies, integración de Google y tratamiento de datos personales de EditFlow.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: noviembre de 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Qué es EditFlow</h2>
          <p className="mt-2">
            EditFlow es una herramienta de gestión para agencias y productoras de video: organiza
            clientes, videos, calendario y métricas de equipo por periodos mensuales. La operan
            Lian Films Studio y sus desarrolladores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Qué datos recopilamos</h2>
          <p className="mt-2">Al usar EditFlow guardamos:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Datos de cuenta: nombre, correo y foto de perfil (si inicias sesión con Google).
            </li>
            <li>
              Datos que tú o tu equipo ingresan: clientes, briefs, videos, estados de edición,
              eventos de calendario, mensajes de invitación.
            </li>
            <li>
              Si conectas tu cuenta de Google: el token de acceso/actualización de OAuth, necesario
              para operar en tu nombre (ver sección 3).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            3. Uso de los datos de Google (Sign-In y Google Calendar)
          </h2>
          <p className="mt-2">
            EditFlow solicita permiso explícito de Google únicamente para las funciones que tú
            autorizas, y siempre sobre tu propia cuenta de Google (nunca sobre una ajena):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Inicio de sesión con Google</strong> (
              <code className="text-xs">openid email profile</code>): usamos tu nombre, correo y
              foto de perfil para autenticarte de forma segura en EditFlow.
            </li>
            <li>
              <strong className="text-foreground">Google Calendar</strong> (
              <code className="text-xs">calendar.events</code>): lee únicamente los eventos de tu
              calendario que contienen la palabra clave &quot;Flow&quot; en el título o la
              descripción, y los refleja dentro de EditFlow (reuniones, grabaciones, entregas).
              También crea o actualiza eventos y enlaces de Google Meet en tu calendario cuando
              programas una reunión desde EditFlow. No leemos ni modificamos ningún otro evento
              de tu calendario, ni accedemos a tu bandeja de Gmail.
            </li>
          </ul>
          <p className="mt-2">
            El uso que hace EditFlow de los datos recibidos de las APIs de Google cumple con la{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Política de Datos de Usuario de los Servicios de API de Google
            </a>
            , incluidos los requisitos de Uso Limitado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Dónde se guardan los datos</h2>
          <p className="mt-2">
            Toda la información vive en una base de datos de Supabase (Postgres) dedicada a esta
            aplicación, con acceso restringido por los permisos de cada usuario dentro de su
            organización. Los tokens de Google se guardan cifrados en tránsito y en reposo, y solo
            los usa el servidor de EditFlow para hacer las llamadas descritas en la sección 3.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Con quién compartimos datos</h2>
          <p className="mt-2">
            No vendemos ni compartimos tus datos con terceros para publicidad. Los únicos
            proveedores que procesan datos en nuestro nombre son: Supabase (base de datos y
            autenticación), Vercel (hosting), Resend (envío de correo transaccional) y Google
            (autenticación y, con tu conexión explícita, Calendar/Gmail).
          </p>
        </section>

        <section id="cookies" className="scroll-mt-20">
          <h2 className="text-base font-semibold text-foreground">
            6. Uso de Cookies y almacenamiento local
          </h2>
          <p className="mt-2">
            EditFlow utiliza únicamente cookies esenciales y de preferencias; no empleamos cookies
            publicitarias ni de rastreo de terceros:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Cookies técnicas esenciales</strong>: necesarias
              para mantener tu sesión autenticada con Supabase (correo o Google) y
              proteger el flujo OAuth.
            </li>
            <li>
              <strong className="text-foreground">Preferencias de la aplicación</strong>: recuerdan
              tu periodo mensual activo (<code className="text-xs">editflow_periodo</code>), el tema
              visual elegido y tu decisión en el banner de cookies.
            </li>
          </ul>
        </section>

        <section id="tratamiento-datos" className="scroll-mt-20">
          <h2 className="text-base font-semibold text-foreground">
            7. Tratamiento de Datos Personales
          </h2>
          <p className="mt-2">
            El responsable del tratamiento de los datos personales ingresados en EditFlow es Lian
            Films Studio. Al registrarte, aceptar el aviso de cookies o usar la plataforma,
            autorizas de manera previa, expresa e informada el tratamiento de tus datos para:
            gestionar tu cuenta y organización, coordinar entregas de video y calendario, y enviar
            notificaciones operativas del equipo.
          </p>
          <p className="mt-2">
            Como titular de los datos puedes ejercer en cualquier momento tus derechos a conocer,
            actualizar, rectificar y suprimir tu información, así como revocar la autorización
            otorgada o solicitar una copia de tus datos, escribiendo a{" "}
            <a
              href="mailto:dev@editflow.click"
              className="text-primary underline-offset-2 hover:underline"
            >
              dev@editflow.click
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Tus controles</h2>
          <p className="mt-2">
            Puedes desconectar tu cuenta de Google en cualquier momento desde
            Configuración → Integración de Google → Desconectar. Esto revoca el acceso y borra el
            token guardado. Puedes pedir la eliminación completa de tu cuenta y tus datos
            escribiendo a <a href="mailto:dev@editflow.click" className="text-primary underline-offset-2 hover:underline">dev@editflow.click</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Contacto</h2>
          <p className="mt-2">
            Preguntas sobre esta política o sobre tratamiento de datos:{" "}
            <a href="mailto:dev@editflow.click" className="text-primary underline-offset-2 hover:underline">dev@editflow.click</a>.
          </p>
        </section>
      </div>

      <footer className="mt-12 border-t border-border/60 pt-6">
        <LegalLinks />
      </footer>
    </div>
  );
}
