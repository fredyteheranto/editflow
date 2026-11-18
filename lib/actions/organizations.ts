"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, withRandomSuffix } from "@/lib/utils/slug";
import { monthLabelEs } from "@/lib/utils/dates";
import { redirectTargetAfterAuth } from "@/lib/google/ensure-connected-redirect";
import { CREATE_ORGANIZATION_SCHEMA } from "@/lib/validations/organization";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  const parsed = CREATE_ORGANIZATION_SCHEMA.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    timezone: formData.get("timezone") || "America/Bogota",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const baseSlug = slugify(parsed.data.name) || "espacio";
  const slug = withRandomSuffix(baseSlug);

  const { data: organizationId, error } = await supabase.rpc("create_organization_with_owner", {
    p_name: parsed.data.name,
    p_slug: slug,
    p_owner_email: user.email,
    p_timezone: parsed.data.timezone,
    p_full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email,
  });

  if (error || !organizationId) {
    return { ok: false, error: error?.message ?? "No se pudo crear el espacio." };
  }

  // create_organization_with_owner() abre el mes en curso llamando a
  // open_period() en la base, cuyo label sale en inglés (depende del
  // locale del servidor Postgres) — se corrige acá al español.
  const { data: periodoAbierto } = await supabase
    .from("periods")
    .select("id, year, month")
    .eq("organization_id", organizationId)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (periodoAbierto) {
    const label = `${monthLabelEs(periodoAbierto.month).toUpperCase()} ${periodoAbierto.year}`;
    await supabase.from("periods").update({ label }).eq("id", periodoAbierto.id);
  }

  // Conexión automática de Google: si el owner creó la cuenta con Google
  // (otorgando los permisos de Calendar/Gmail en el mismo signup), guardamos
  // su token ya ligado a su nueva membresía — sin un paso de "conectar" aparte.
  // Si entró por link mágico (sin token de Google todavía), el redirect de
  // abajo lo manda a /crear-espacio/conectar-google, que dispara el
  // consentimiento solo — así cualquier cuenta nueva queda lista para
  // mandar/recibir invitaciones y notificaciones por correo desde el
  // primer momento, sin tener que ir a buscarlo a Configuración.
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.provider_token) {
      const googleIdentity = user.identities?.find((i) => i.provider === "google");
      const googleEmail =
        (googleIdentity?.identity_data?.email as string | undefined) ?? user.email ?? "";
      if (googleEmail && googleEmail.toLowerCase() === user.email.toLowerCase()) {
        const { data: ownerMem } = await supabase
          .from("memberships")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (ownerMem) {
          const expiresAt = session.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : new Date(Date.now() + 3600_000).toISOString();
          await supabase.from("google_oauth_tokens").upsert(
            {
              membership_id: ownerMem.id,
              organization_id: organizationId,
              google_email: googleEmail,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token ?? undefined,
              expires_at: expiresAt,
              scope: "https://www.googleapis.com/auth/calendar.events",
            },
            { onConflict: "membership_id" },
          );
        }
      }
    }
  } catch (err) {
    console.error("[createOrganization] no se pudo guardar la conexión de Google", err);
  }

  redirect(await redirectTargetAfterAuth());
}

export interface MyOrganization {
  id: string;
  name: string;
  role: string;
}

export async function getMyOrganizations(): Promise<MyOrganization[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name)")
    .eq("active", true);

  if (!data) return [];

  return data
    .filter((row) => row.organizations)
    .map((row) => {
      const org = row.organizations as unknown as { id: string; name: string };
      return { id: org.id, name: org.name, role: row.role };
    });
}
