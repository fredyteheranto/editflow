"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization, getEffectiveRolePermissions } from "@/lib/period/resolve";
import { CREATE_CLIENT_SCHEMA } from "@/lib/validations/client";

export interface ClientSummary {
  id: string;
  name: string;
  default_monthly_goal: number;
}

export async function listOrganizationClients(organizationId: string): Promise<ClientSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, default_monthly_goal")
    .eq("organization_id", organizationId)
    .eq("status", "activo")
    .order("name");

  return data ?? [];
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerClient(
  organizationId: string,
  periodId: string,
  formData: FormData,
): Promise<ActionResult> {
  const perms = await getEffectiveRolePermissions();
  if (!perms.canCreateClients) {
    return { ok: false, error: "Tu rol no tiene permiso para crear clientes." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = CREATE_CLIENT_SCHEMA.safeParse({
    ...raw,
    deliveryFormats: formData.getAll("deliveryFormats"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const d = parsed.data;

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      organization_id: organizationId,
      name: d.name,
      brand_name: d.brandName || null,
      industry: d.industry || null,
      contact_name: d.contactName || null,
      contact_email: d.contactEmail || null,
      contact_phone: d.contactPhone || null,
      website: d.website || null,
      social_links: {
        instagram: d.instagram ?? "",
        tiktok: d.tiktok ?? "",
        youtube: d.youtube ?? "",
      },
      brand_description: d.brandDescription || null,
      target_audience: d.targetAudience || null,
      tone_of_voice: d.toneOfVoice || null,
      objectives: d.objectives || null,
      do_not_do: d.doNotDo || null,
      delivery_formats: d.deliveryFormats ?? [],
      default_monthly_goal: d.monthlyGoal,
      default_strategist: d.strategist || "Productora",
      assets_drive_url: d.assetsUrl || null,
      notes: d.notes || null,
    })
    .select("id")
    .single();

  if (error || !client) {
    return { ok: false, error: error?.message ?? "No se pudo crear el cliente." };
  }

  const { error: activationError } = await supabase.from("client_periods").insert({
    organization_id: organizationId,
    period_id: periodId,
    client_id: client.id,
    monthly_goal: d.monthlyGoal,
    strategist: d.strategist || "Productora",
  });

  if (activationError) {
    return { ok: false, error: activationError.message };
  }

  revalidatePath("/app/clientes");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

export async function updateClient(clientId: string, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CREATE_CLIENT_SCHEMA.safeParse({
    ...raw,
    deliveryFormats: formData.getAll("deliveryFormats"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from("clients")
    .update({
      name: d.name,
      brand_name: d.brandName || null,
      industry: d.industry || null,
      contact_name: d.contactName || null,
      contact_email: d.contactEmail || null,
      contact_phone: d.contactPhone || null,
      website: d.website || null,
      social_links: {
        instagram: d.instagram ?? "",
        tiktok: d.tiktok ?? "",
        youtube: d.youtube ?? "",
      },
      brand_description: d.brandDescription || null,
      target_audience: d.targetAudience || null,
      tone_of_voice: d.toneOfVoice || null,
      objectives: d.objectives || null,
      do_not_do: d.doNotDo || null,
      delivery_formats: d.deliveryFormats ?? [],
      default_monthly_goal: d.monthlyGoal,
      default_strategist: d.strategist || "Productora",
      assets_drive_url: d.assetsUrl || null,
      notes: d.notes || null,
    })
    .eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/clientes");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

/**
 * Borra la ficha del cliente para siempre, junto con TODOS sus videos de
 * TODOS los meses (incluidos los cerrados) — videos.client_id y
 * client_periods.client_id tienen on delete cascade. No hay vuelta atrás;
 * la confirmación vive en el AlertDialog de edit-client-sheet.tsx.
 */
export async function deleteClient(clientId: string): Promise<ActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para eliminar clientes." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("organization_id", org.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/clientes");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/metricas");
  return { ok: true };
}

export async function activateClientInPeriod(
  organizationId: string,
  periodId: string,
  clientId: string,
  monthlyGoal: number,
  strategist: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_periods").upsert(
    {
      organization_id: organizationId,
      period_id: periodId,
      client_id: clientId,
      monthly_goal: monthlyGoal,
      strategist,
      active: true,
    },
    { onConflict: "period_id,client_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/clientes");
  return { ok: true };
}

export async function deactivateClientInPeriod(
  periodId: string,
  clientId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_periods")
    .update({ active: false })
    .eq("period_id", periodId)
    .eq("client_id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/clientes");
  return { ok: true };
}
