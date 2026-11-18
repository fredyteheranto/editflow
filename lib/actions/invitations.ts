"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveOrganization, getEffectiveRolePermissions } from "@/lib/period/resolve";
import { appUrl } from "@/lib/supabase/env";
import { GMAIL_SEND_SCOPE } from "@/lib/google/gmail";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import type { InvitationStatus, MemberRole } from "@/types/database.types";

const ROL_LABEL: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega (solo lectura)",
};

export interface InvitationDetails {
  organizationName: string;
  email: string;
  role: MemberRole;
  status: InvitationStatus;
  expiresAt: string;
  fullName: string | null;
}

export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const [{ data, error }, { data: invRow }] = await Promise.all([
    supabase.rpc("get_invitation", { p_token: token }),
    admin.from("invitations").select("full_name").eq("token", token).maybeSingle(),
  ]);

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return {
    organizationName: row.organization_name,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    fullName: invRow?.full_name?.trim() || null,
  };
}

export interface PendingInvitation {
  token: string;
  organizationName: string;
  role: MemberRole;
  expiresAt: string;
}

/**
 * Invitaciones pendientes para el correo de la sesión actual. Se usa después del
 * magic link (sin token en la URL) para que, si alguien fue invitado, aterrice
 * directo en ese espacio en vez de en el formulario de "crear mi propio espacio".
 */
export async function getMyPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_pending_invitations");

  if (error || !data) return [];

  return data.map((row) => ({
    token: row.token,
    organizationName: row.organization_name,
    role: row.role,
    expiresAt: row.expires_at,
  }));
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export type InviteAuthResult =
  | { ok: true }
  | { ok: false; error: string; code?: "already_registered" };

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión con el correo invitado antes de aceptar." };
  }

  const admin = createServiceRoleClient();
  const [{ data: invData }, { data: invRow }] = await Promise.all([
    supabase.rpc("get_invitation", { p_token: token }),
    admin.from("invitations").select("organization_id, full_name, invited_by").eq("token", token).maybeSingle(),
  ]);

  const inv = invData?.[0];
  if (!inv) {
    return { ok: false, error: "La invitación no existe o ya no está disponible." };
  }
  if (inv.status === "revocada") {
    return { ok: false, error: "Esta invitación fue revocada." };
  }
  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return {
      ok: false,
      error: `Esta invitación pertenece a ${inv.email}, pero estás conectado como ${user.email ?? "otra cuenta"}.`,
    };
  }

  const preferredName =
    invRow?.full_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email ||
    inv.email;

  const { data: orgId, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_full_name: preferredName,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (invRow?.full_name?.trim() && (orgId || invRow.organization_id)) {
    await admin
      .from("memberships")
      .update({ full_name: invRow.full_name.trim(), email: inv.email })
      .eq("organization_id", orgId ?? invRow.organization_id)
      .eq("user_id", user.id);
  }

  revalidatePath("/app");
  redirect("/app/dashboard");
}

/**
 * El invitado entra con su correo (el mismo de la invitación) y una
 * contraseña que él crea. Si es la primera vez, se crea su cuenta ya
 * confirmada (sin correo de confirmación); si ya la tenía, inicia sesión con
 * la misma contraseña. Luego acepta la invitación. Así puede volver a entrar
 * con correo+contraseña cada vez, sin usar el link de invitación de nuevo.
 */
export async function registrarConInvitacion(
  token: string,
  password: string,
  fullName?: string,
): Promise<InviteAuthResult> {
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data: invData } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = invData?.[0];
  if (!inv) return { ok: false, error: "La invitación no existe o ya no está disponible." };
  if (inv.status === "revocada") return { ok: false, error: "Esta invitación fue revocada." };

  const admin = createServiceRoleClient();
  const { data: invRow } = await admin
    .from("invitations")
    .select("organization_id, full_name, invited_by")
    .eq("token", token)
    .maybeSingle();

  const email = inv.email;
  const resolvedName = fullName?.trim() || invRow?.full_name?.trim() || email;

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: resolvedName },
  });

  if (createErr) {
    if (/registered|already|exist/i.test(createErr.message)) {
      return {
        ok: false,
        code: "already_registered",
        error: "Ya tienes una cuenta con este correo. Inicia sesión con tu contraseña o con Google.",
      };
    }
    return { ok: false, error: createErr.message };
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    return { ok: false, error: signErr.message };
  }

  const { data: orgId, error: acceptErr } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_full_name: resolvedName,
  });
  if (acceptErr) return { ok: false, error: acceptErr.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && (orgId || invRow?.organization_id)) {
    await admin
      .from("memberships")
      .update({ full_name: resolvedName, email })
      .eq("organization_id", orgId ?? invRow?.organization_id ?? "")
      .eq("user_id", user.id);
  }

  redirect("/app/dashboard");
}

export async function iniciarSesionConInvitacion(
  token: string,
  password: string,
): Promise<InviteAuthResult> {
  if (password.length < 4) {
    return { ok: false, error: "Ingresa tu contraseña." };
  }

  const supabase = await createClient();
  const { data: invData } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = invData?.[0];
  if (!inv) return { ok: false, error: "La invitación no existe o ya no está disponible." };
  if (inv.status === "revocada") return { ok: false, error: "Esta invitación fue revocada." };

  const email = inv.email;
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    return {
      ok: false,
      error:
        "Contraseña incorrecta. Si te registraste con Google, usa «Continuar con Google» o solicita restablecer tu contraseña.",
    };
  }

  const admin = createServiceRoleClient();
  const [{ data: invRow }, { data: { user } }] = await Promise.all([
    admin.from("invitations").select("organization_id, full_name, invited_by").eq("token", token).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const resolvedName =
    invRow?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    email;

  const { data: orgId, error: acceptErr } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_full_name: resolvedName,
  });
  if (acceptErr) return { ok: false, error: acceptErr.message };

  if (user && invRow?.full_name?.trim() && (orgId || invRow?.organization_id)) {
    await admin
      .from("memberships")
      .update({ full_name: invRow.full_name.trim(), email })
      .eq("organization_id", orgId ?? invRow?.organization_id ?? "")
      .eq("user_id", user.id);
  }

  redirect("/app/dashboard");
}

export async function signOutAndReturnToInvite(token: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/invitacion/${encodeURIComponent(token)}`);
}

export type CreateInvitationResult =
  | { ok: true; link: string; emailSent: boolean; emailError?: string }
  | { ok: false; error: string };

async function sendInvitationNotification(params: {
  organizationId: string;
  organizationName: string;
  invitedEmail: string;
  role: MemberRole;
  token: string;
}): Promise<{ emailSent: boolean; emailError?: string; link: string }> {
  const link = `${appUrl()}/invitacion/${params.token}`;
  let emailSent = false;
  let emailError: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inviter } = await supabase
      .from("memberships")
      .select("id, email, full_name")
      .eq("organization_id", params.organizationId)
      .eq("active", true)
      .eq("user_id", user?.id ?? "")
      .maybeSingle();

    let gmailSendAvailable = false;
    if (inviter) {
      const { data: conn } = await supabase
        .from("google_oauth_tokens")
        .select("scope")
        .eq("membership_id", inviter.id)
        .maybeSingle();
      gmailSendAvailable = Boolean(conn?.scope?.includes(GMAIL_SEND_SCOPE));
    }

    const inviterEmail = inviter?.email || user?.email || "notificaciones@editflow.click";
    const inviterName = inviter?.full_name || user?.email || "Tu equipo";

    const result = await sendInvitationEmail({
      to: params.invitedEmail,
      senderMembershipId: inviter?.id ?? "",
      inviterEmail,
      gmailSendAvailable,
      organizationName: params.organizationName,
      inviterName,
      roleLabel: ROL_LABEL[params.role],
      inviteUrl: link,
    });
    emailSent = result.sent;
    if (!result.sent) {
      emailError = result.error;
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Error inesperado al enviar el correo.";
    console.error("[sendInvitationNotification] no se pudo enviar el correo de invitación", err);
  }

  return { emailSent, emailError, link };
}

/**
 * Crea la invitación y manda al invitado un correo de EditFlow con el enlace
 * de ingreso (/invitacion/[token]). Intenta salir desde el Gmail conectado
 * del invitador si tiene permisos válidos y cae automáticamente a Resend si
 * Gmail no está conectado o falló.
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: MemberRole,
  fullName: string,
): Promise<CreateInvitationResult> {
  const [org, perms] = await Promise.all([requireActiveOrganization(), getEffectiveRolePermissions()]);
  if ((org.role !== "owner" && org.role !== "admin") || !perms.canInviteMembers) {
    return { ok: false, error: "No tienes permiso para invitar miembros." };
  }
  if (!fullName.trim()) {
    return { ok: false, error: "Ponle un nombre al invitado — así aparecerá en la app." };
  }

  const supabase = await createClient();
  const invitedEmail = email.trim().toLowerCase();
  if (!invitedEmail || !invitedEmail.includes("@")) {
    return { ok: false, error: "Ingresa un correo electrónico válido." };
  }

  const { data: existingMember } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .ilike("email", invitedEmail)
    .maybeSingle();

  if (existingMember) {
    return { ok: false, error: `${invitedEmail} ya forma parte activa del equipo.` };
  }

  // Revoca invitaciones pendientes anteriores del mismo correo para evitar duplicados.
  await supabase
    .from("invitations")
    .update({ status: "revocada" })
    .eq("organization_id", organizationId)
    .eq("status", "pendiente")
    .ilike("email", invitedEmail);

  const { data, error } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, email: invitedEmail, role, full_name: fullName.trim() })
    .select("token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la invitación." };
  }

  const { link, emailSent, emailError } = await sendInvitationNotification({
    organizationId,
    organizationName: org.name,
    invitedEmail,
    role,
    token: data.token,
  });

  revalidatePath("/app/equipo");
  return { ok: true, link, emailSent, emailError };
}

export async function resendInvitation(invitationId: string): Promise<CreateInvitationResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede reenviar invitaciones." };
  }

  const supabase = await createClient();
  const { data: inv, error } = await supabase
    .from("invitations")
    .select("id, organization_id, email, role, token, status")
    .eq("id", invitationId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (error || !inv) {
    return { ok: false, error: "Invitación no encontrada." };
  }
  if (inv.status !== "pendiente") {
    return { ok: false, error: "Solo se pueden reenviar invitaciones pendientes." };
  }

  const { link, emailSent, emailError } = await sendInvitationNotification({
    organizationId: inv.organization_id,
    organizationName: org.name,
    invitedEmail: inv.email,
    role: inv.role,
    token: inv.token,
  });

  return { ok: true, link, emailSent, emailError };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede revocar invitaciones." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revocada" })
    .eq("id", invitationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/equipo");
  return { ok: true };
}
