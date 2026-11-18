import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Aviso unificado cuando el retorno OAuth de Google Calendar/Gmail no pudo
 * completarse (correo distinto al de la cuenta o rechazo/verificación en Google).
 */
export function GoogleErrorAlert({
  error,
  detail,
  accountEmail,
  showSettingsLink = true,
}: {
  error?: string;
  detail?: string;
  accountEmail?: string;
  showSettingsLink?: boolean;
}) {
  if (error === "email_mismatch") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          {accountEmail ? (
            <>
              Esa cuenta de Google no es <span className="font-medium">{accountEmail}</span> — el
              correo con el que ingresas a EditFlow. Elige exactamente esa cuenta para conectar tu
              Google Calendar.
            </>
          ) : (
            <>
              No se conectó Google Calendar porque elegiste una cuenta distinta al correo con el
              que ingresas a EditFlow.
            </>
          )}
          {showSettingsLink && (
            <>
              {" "}
              Puedes intentarlo de nuevo desde{" "}
              <Link href="/app/configuracion" className="font-medium underline underline-offset-2">
                Configuración
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  if (error === "missing_token" || error === "save_error" || error === "no_membership") {
    const reasonText =
      error === "missing_token"
        ? "Google no entregó el token de acceso de Calendar. Asegúrate de aceptar el permiso de calendario en la pantalla de Google."
        : error === "no_membership"
          ? "No se encontró una organización activa para vincular la cuenta de Google."
          : "No se pudo guardar la conexión de Google en la base de datos.";
    return (
      <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>{reasonText}</p>
      </div>
    );
  }

  if (error === "oauth_error") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>
          <span className="font-medium">No se completó la autorización con Google.</span> Puedes
          seguir usando EditFlow normalmente (las notificaciones también se envían por correo de
          respaldo){detail ? ` · ${detail}` : ""}.
        </p>
      </div>
    );
  }

  return null;
}
