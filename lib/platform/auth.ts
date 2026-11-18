import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export const SOLE_SUPER_ADMIN_EMAIL = "jockersnniper@gmail.com";

export const ROOT_SUPER_ADMIN_EMAILS = [SOLE_SUPER_ADMIN_EMAIL] as const;

export async function isSuperAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return email.trim().toLowerCase() === SOLE_SUPER_ADMIN_EMAIL;
}

/**
 * Verifica por request HTTP si el usuario autenticado es el único Super Admin
 * autorizado de la plataforma.
 */
export const isCurrentUserSuperAdmin = cache(async (): Promise<boolean> => {
  const user = await getServerUser();
  if (!user) return false;
  return isSuperAdminEmail(user.email);
});

export async function requireSuperAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect("/crear-espacio?modo=acceso&next=/super-admin");
  }
  const ok = await isSuperAdminEmail(user.email);
  if (!ok) {
    redirect("/app/dashboard");
  }
  return user;
}
