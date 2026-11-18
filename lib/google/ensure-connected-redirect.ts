/**
 * A dónde mandar a alguien justo después de crear su espacio: entra directo
 * al dashboard sin bloquear el registro con la pantalla de permisos extendidos
 * de Google (Calendar/Gmail). Si todavía no conectó Google, el banner global
 * dentro de /app y Configuración lo guían para conectarlo cuando quiera.
 */
export async function redirectTargetAfterAuth(): Promise<string> {
  return "/app/dashboard";
}
