import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "./env";

// fetch sin caché: sin esto, el runtime de fetch de Next puede quedarse con
// una respuesta vieja de una consulta a Supabase y una página recién
// mutada (ej. un video nuevo) no aparece hasta refrescar en una pestaña
// sin caché (incógnito). Todas las consultas de servidor deben ser
// siempre en vivo, nunca cacheadas.
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

/**
 * Cliente para Server Components / Server Actions / Route Handlers.
 * Respeta la sesión del usuario y por tanto las políticas RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    global: { fetch: noStoreFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente con la service role key: ignora RLS por completo.
 * Solo para tareas de servidor de confianza (crons, envío de correos,
 * triggers administrativos). Nunca exponer al cliente.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    global: { fetch: noStoreFetch },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // El cliente de service role no maneja sesión de usuario.
      },
    },
  });
}

/**
 * Usuario autenticado memoizado por request HTTP (React.cache) para evitar
 * múltiples viajes de red a Supabase Auth entre Layout y Page en la misma navegación.
 */
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
