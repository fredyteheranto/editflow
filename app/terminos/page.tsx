import Link from "next/link";
import Image from "next/image";
import { LegalLinks } from "@/components/shared/legal-links";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Condiciones del Servicio",
  description:
    "Condiciones del Servicio, uso de cuentas, roles e integración con Google en EditFlow.",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Condiciones del Servicio</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: noviembre de 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Aceptación</h2>
          <p className="mt-2">
            Al crear una cuenta o usar EditFlow aceptas estos términos. Si no estás de acuerdo, no
            uses la aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. El servicio</h2>
          <p className="mt-2">
            EditFlow es una herramienta de gestión para agencias y productoras de video: clientes,
            monitoreo de videos, calendario y métricas, organizados por periodos mensuales.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Cuentas y roles</h2>
          <p className="mt-2">
            Quien crea una organización es su propietario y puede invitar a otras personas con un
            rol (administrador, editor, estratega). Cada quien es responsable de la información que
            ingresa y de mantener su contraseña a salvo. El propietario/administrador puede remover
            a un miembro en cualquier momento.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Conexión con Google</h2>
          <p className="mt-2">
            Puedes iniciar sesión con correo o con Google. Conectar tu cuenta de Google
            Calendar es opcional y puedes desconectarla cuando quieras desde
            la aplicación. El detalle de qué hacemos con esos datos y permisos está en la{" "}
            <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">Política de Privacidad</Link>{" "}
            y en el{" "}
            <Link href="/privacidad#tratamiento-datos" className="text-primary underline-offset-2 hover:underline">Tratamiento de Datos Personales</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Uso aceptable</h2>
          <p className="mt-2">
            No está permitido usar EditFlow para enviar spam, contenido ilegal, o para acceder a
            cuentas de Google que no sean las propias. Nos reservamos el derecho de suspender una
            cuenta que incumpla esto.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Disponibilidad</h2>
          <p className="mt-2">
            EditFlow se ofrece &quot;tal cual&quot;, sin garantía de disponibilidad continua. No nos
            hacemos responsables por pérdidas derivadas de interrupciones del servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Cambios</h2>
          <p className="mt-2">
            Podemos actualizar estos términos; los cambios importantes se avisarán dentro de la
            aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Contacto</h2>
          <p className="mt-2">
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
