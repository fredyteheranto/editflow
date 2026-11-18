import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Solo /app/* requiere sesión. El resto (Home, crear-espacio, invitación,
 * api públicas) no debe depender de Supabase estar configurado para cargar.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app") && !pathname.startsWith("/super-admin")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/crear-espacio";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
