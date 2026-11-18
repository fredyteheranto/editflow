import Link from "next/link";
import Image from "next/image";
import { AccountForm } from "@/components/auth/account-form";
import { LegalLinks } from "@/components/shared/legal-links";
import { getPlatformConfig } from "@/lib/platform/config";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Iniciar sesión o crear espacio",
  robots: NOINDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function CrearEspacioPage({
  searchParams,
}: PageProps<"/crear-espacio">) {
  const [params, config] = await Promise.all([
    searchParams,
    getPlatformConfig(),
  ]);
  const modo = params.modo === "acceso" ? "acceso" : "iniciar";
  const next = typeof params.next === "string" ? params.next : "/crear-espacio/espacio";
  const signupClosed = !config.permissions.allowSelfSignup && modo === "iniciar";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          {modo === "acceso" ? "Ingresa a tu espacio" : "Crea tu espacio"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {modo === "acceso"
            ? "Usa el mismo correo con el que te registraste."
            : "Empieza con tu nombre y tu correo. El resto toma un minuto."}
        </p>

        <div className="mt-8">
          {signupClosed ? (
            <div className="space-y-4 rounded-xl border bg-card p-5 text-center text-sm">
              <p className="text-muted-foreground">
                El registro libre de nuevos espacios está pausado temporalmente por administración.
                Si ya tienes cuenta o recibiste invitación, inicia sesión.
              </p>
              <Link
                href="/crear-espacio?modo=acceso"
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Ya tengo cuenta
              </Link>
            </div>
          ) : (
            <AccountForm next={next} modo={modo} />
          )}
        </div>

        {params.error === "auth" && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-center text-sm text-danger">
            {typeof params.error_detail === "string" && params.error_detail.trim().length > 0 ? (
              <>
                <p>No se pudo completar el acceso con Google. Puedes ingresar con tu correo abajo.</p>
                <p className="mt-1 text-xs text-muted-foreground">{params.error_detail}</p>
              </>
            ) : (
              <p>El enlace no es válido o ya expiró. Solicita uno nuevo.</p>
            )}
          </div>
        )}
      </div>

      <footer className="mt-12">
        <LegalLinks />
      </footer>
    </div>
  );
}
