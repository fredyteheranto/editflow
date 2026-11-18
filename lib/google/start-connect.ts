import { createClient } from "@/lib/supabase/client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/**
 * Arranca el OAuth de Google pidiendo Google Calendar (calendar.events), y
 * vuelve a /auth/callback?...&google_calendar=1 (que guarda el token vía
 * saveGoogleCalendarConnection). Si la cuenta ya tiene identidad de Google
 * vinculada usa signInWithOAuth para re-solicitar permisos sin romper la
 * identidad si el usuario cancela; si solo tiene correo/contraseña usa
 * linkIdentity.
 */
export async function startGoogleConnect(
  nextPath: string,
  accountEmail?: string,
): Promise<{ error?: string }> {
  let supabase;
  try {
    supabase = createClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo inicializar Supabase." };
  }

  const oauthOptions = {
    scopes: CALENDAR_SCOPE,
    queryParams: {
      access_type: "offline",
      prompt: "consent",
      ...(accountEmail ? { login_hint: accountEmail } : {}),
    },
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}&google_calendar=1`,
  };

  const { data: identidades, error: idError } = await supabase.auth.getUserIdentities();
  if (idError) {
    return { error: idError.message };
  }

  const todas = identidades?.identities ?? [];
  const googleIdentity = todas.find((i: { provider: string }) => i.provider === "google");

  let error: { message: string } | null = null;

  if (googleIdentity) {
    ({ error } = await supabase.auth.signInWithOAuth({ provider: "google", options: oauthOptions }));
  } else {
    ({ error } = await supabase.auth.linkIdentity({ provider: "google", options: oauthOptions }));
  }

  if (error) {
    if (/manual linking/i.test(error.message)) {
      return {
        error:
          "Falta activar «Manual Linking» en Supabase Auth -> Settings para vincular Google a cuentas creadas con correo.",
      };
    }
    return { error: error.message };
  }

  return {};
}
