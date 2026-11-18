"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { getPlatformConfig, savePlatformConfig } from "@/lib/platform/config";
import type { PlatformConfig } from "@/lib/platform/types";
import type { MemberRole } from "@/types/database.types";
import { slugify, withRandomSuffix } from "@/lib/utils/slug";
import { monthLabelEs } from "@/lib/utils/dates";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { appUrl } from "@/lib/supabase/env";

export type SuperAdminResult = { ok: true } | { ok: false; error: string };

function revalidateEverything() {
  revalidatePath("/", "layout");
  revalidatePath("/app", "layout");
  revalidatePath("/p", "layout");
  revalidatePath("/super-admin");
}

export async function saveSiteSettingsAction(site: PlatformConfig["site"]): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const current = await getPlatformConfig(true);
  await savePlatformConfig({ ...current, site });
  revalidateEverything();
  return { ok: true };
}

export async function saveHomeCmsAction(home: PlatformConfig["home"]): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const current = await getPlatformConfig(true);
  await savePlatformConfig({ ...current, home });
  revalidateEverything();
  return { ok: true };
}

export async function savePermissionsAction(
  permissions: PlatformConfig["permissions"],
  dittoPublicEnabled?: boolean,
): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const current = await getPlatformConfig(true);
  await savePlatformConfig({
    ...current,
    permissions,
    ...(typeof dittoPublicEnabled === "boolean"
      ? { ditto: { ...current.ditto, publicEnabled: dittoPublicEnabled } }
      : {}),
  });
  revalidateEverything();
  return { ok: true };
}

export async function saveDittoConfigAction(ditto: PlatformConfig["ditto"]): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const current = await getPlatformConfig(true);
  await savePlatformConfig({ ...current, ditto });
  revalidateEverything();
  return { ok: true };
}

export async function saveSuperAdminsAction(): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  return {
    ok: false,
    error: "El único Super Admin autorizado en la plataforma es jockersnniper@gmail.com.",
  };
}

export async function adminCreateOrganizationAction(input: {
  name: string;
  ownerEmail: string;
  timezone: string;
}): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const name = input.name.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!name || !ownerEmail) return { ok: false, error: "Nombre y correo del dueño son obligatorios." };

  const admin = createServiceRoleClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerUser = usersData?.users.find((u) => u.email?.toLowerCase() === ownerEmail);
  if (!ownerUser) {
    return {
      ok: false,
      error: `El usuario ${ownerEmail} no existe aún en Auth. Créalo primero en la pestaña Usuarios.`,
    };
  }

  const slug = withRandomSuffix(slugify(name) || "espacio");
  const { data: org, error } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      owner_email: ownerEmail,
      timezone: input.timezone || "America/Bogota",
    })
    .select("id")
    .single();

  if (error || !org) {
    return { ok: false, error: error?.message ?? "No se pudo crear la organización." };
  }

  const fullName = (ownerUser.user_metadata?.full_name as string | undefined) ?? ownerEmail;
  await admin.from("memberships").insert({
    organization_id: org.id,
    user_id: ownerUser.id,
    email: ownerEmail,
    full_name: fullName,
    role: "owner",
    active: true,
  });

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  await admin.from("periods").insert({
    organization_id: org.id,
    year,
    month,
    label: `${monthLabelEs(month).toUpperCase()} ${year}`,
    status: "abierto",
    opened_by: ownerUser.id,
  });

  revalidateEverything();
  return { ok: true };
}

export async function adminUpdateOrganizationAction(
  organizationId: string,
  patch: { name?: string; timezone?: string },
): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const admin = createServiceRoleClient();
  const updateData: { name?: string; timezone?: string } = {};
  if (patch.name?.trim()) updateData.name = patch.name.trim();
  if (patch.timezone) updateData.timezone = patch.timezone;

  const { error } = await admin.from("organizations").update(updateData).eq("id", organizationId);
  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminDeleteOrganizationAction(organizationId: string): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const admin = createServiceRoleClient();
  const { error } = await admin.from("organizations").delete().eq("id", organizationId);
  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminUpdateMembershipAction(
  membershipId: string,
  patch: { role?: MemberRole; active?: boolean; full_name?: string },
): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const admin = createServiceRoleClient();
  const { error } = await admin.from("memberships").update(patch).eq("id", membershipId);
  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminAddMemberToOrgAction(input: {
  organizationId: string;
  email: string;
  role: MemberRole;
  fullName?: string;
}): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const email = input.email.trim().toLowerCase();
  const admin = createServiceRoleClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const targetUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);
  if (!targetUser) {
    return { ok: false, error: `No existe una cuenta con el correo ${email}.` };
  }

  const resolvedName =
    input.fullName?.trim() || (targetUser.user_metadata?.full_name as string | undefined) || email;

  const { error } = await admin.from("memberships").upsert(
    {
      organization_id: input.organizationId,
      user_id: targetUser.id,
      email,
      full_name: resolvedName,
      role: input.role,
      active: true,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminCreateUserAction(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email || input.password.length < 6) {
    return { ok: false, error: "Correo válido y contraseña de al menos 6 caracteres obligatorios." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() || email },
  });

  if (error) return { ok: false, error: error.message };

  revalidateEverything();
  return { ok: true };
}

export async function adminDeleteUserAction(userId: string): Promise<SuperAdminResult> {
  const current = await requireSuperAdmin();
  if (current.id === userId) {
    return { ok: false, error: "No puedes eliminar tu propia cuenta mientras estás conectado." };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminRevokeInvitationAction(invitationId: string): Promise<SuperAdminResult> {
  await requireSuperAdmin();
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("invitations")
    .update({ status: "revocada" })
    .eq("id", invitationId);
  if (error) return { ok: false, error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function adminResendInvitationAction(invitationId: string): Promise<SuperAdminResult> {
  const current = await requireSuperAdmin();
  const admin = createServiceRoleClient();
  const { data: inv, error } = await admin
    .from("invitations")
    .select("id, email, role, token, status, organizations(name)")
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !inv) return { ok: false, error: "Invitación no encontrada." };
  if (inv.status !== "pendiente") return { ok: false, error: "La invitación ya no está pendiente." };

  const orgName = (inv.organizations as unknown as { name: string } | null)?.name ?? "EditFlow";
  const roleMap: Record<MemberRole, string> = {
    owner: "Propietario",
    admin: "Administrador",
    editor: "Editor",
    viewer: "Estratega (solo lectura)",
  };

  const res = await sendInvitationEmail({
    to: inv.email,
    senderMembershipId: "",
    inviterEmail: current.email ?? "notificaciones@editflow.click",
    gmailSendAvailable: false,
    organizationName: orgName,
    inviterName: (current.user_metadata?.full_name as string | undefined) ?? "Equipo EditFlow",
    roleLabel: roleMap[inv.role],
    inviteUrl: `${appUrl()}/invitacion/${inv.token}`,
  });

  if (!res.sent) {
    return { ok: false, error: res.error };
  }
  return { ok: true };
}
