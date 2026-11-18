"use server";

import { revalidatePath } from "next/cache";
import { requireModuleAccess } from "@/lib/period/resolve";
import {
  RESERVED_PORTFOLIO_SLUGS,
  getPortfoliosData,
  savePortfoliosData,
} from "@/lib/portfolio/store";
import type {
  PortfolioKind,
  PortfolioServiceItem,
  PortfolioShowcaseItem,
  PortfolioSocialLinks,
  PortfolioTheme,
  PublicPortfolioProfile,
} from "@/lib/portfolio/types";
import { getServerUser } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

export type PortfolioActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

function normalizeSafeUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export interface SavePortfolioInput {
  kind: PortfolioKind;
  slug: string;
  published: boolean;
  displayName: string;
  headline: string;
  bio: string;
  location?: string;
  availabilityLabel?: string;
  theme: PortfolioTheme;
  ctaLabel: string;
  ctaUrl?: string;
  whatsappNumber?: string;
  contactEmail?: string;
  socialLinks: PortfolioSocialLinks;
  services: PortfolioServiceItem[];
  customProjects: PortfolioShowcaseItem[];
}

export async function savePublicPortfolioAction(
  input: SavePortfolioInput,
): Promise<PortfolioActionResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("configuracion"),
    getServerUser(),
  ]);

  if (!user || !user.email) {
    return { ok: false, error: "Debes iniciar sesión para editar tu landing." };
  }

  if (
    input.kind === "agency" &&
    organization.role !== "owner" &&
    organization.role !== "admin"
  ) {
    return {
      ok: false,
      error: "Solo el Propietario o Administrador puede editar la landing de la agencia.",
    };
  }

  const nextSlug = slugify(input.slug);
  if (!nextSlug || nextSlug.length < 2) {
    return { ok: false, error: "El enlace personalizado debe tener al menos 2 caracteres válidos." };
  }
  if (RESERVED_PORTFOLIO_SLUGS.has(nextSlug)) {
    return { ok: false, error: `«${nextSlug}» es una ruta reservada. Elige otro enlace.` };
  }
  if (!input.displayName.trim()) {
    return { ok: false, error: "El nombre visible es obligatorio." };
  }

  const data = await getPortfoliosData(true);
  const targetId =
    input.kind === "agency" ? `org:${organization.id}` : `user:${user.id}`;

  const conflict = data.portfolios.find(
    (p) => p.id !== targetId && p.slug.toLowerCase() === nextSlug,
  );
  if (conflict) {
    return {
      ok: false,
      error: `El enlace /p/${nextSlug} ya está en uso por otra agencia o creador.`,
    };
  }

  const existing = data.portfolios.find((p) => p.id === targetId);
  const previousSlug = existing?.slug;

  const cleanSocial: PortfolioSocialLinks = {
    instagram: normalizeSafeUrl(input.socialLinks.instagram),
    tiktok: normalizeSafeUrl(input.socialLinks.tiktok),
    youtube: normalizeSafeUrl(input.socialLinks.youtube),
    linkedin: normalizeSafeUrl(input.socialLinks.linkedin),
    x: normalizeSafeUrl(input.socialLinks.x),
    website: normalizeSafeUrl(input.socialLinks.website),
  };

  const cleanServices = (input.services ?? [])
    .filter((s) => s.title.trim())
    .slice(0, 8)
    .map((s) => ({
      id: s.id || crypto.randomUUID(),
      title: s.title.trim(),
      description: s.description.trim(),
      priceLabel: s.priceLabel?.trim() || undefined,
    }));

  const cleanCustomProjects: PortfolioShowcaseItem[] = [];
  for (const p of (input.customProjects ?? []).slice(0, 12)) {
    const safeUrl = normalizeSafeUrl(p.videoUrl);
    if (!p.title.trim() || !safeUrl) continue;
    cleanCustomProjects.push({
      id: p.id || crypto.randomUUID(),
      title: p.title.trim(),
      category: p.category.trim() || "Reel / Video",
      videoUrl: safeUrl,
      description: p.description?.trim() || undefined,
    });
  }

  const updated: PublicPortfolioProfile = {
    id: targetId,
    kind: input.kind,
    ownerUserId: existing?.ownerUserId ?? user.id,
    organizationId: organization.id,
    slug: nextSlug,
    published: Boolean(input.published),
    displayName: input.displayName.trim(),
    headline: input.headline.trim(),
    bio: input.bio.trim(),
    location: input.location?.trim() || undefined,
    availabilityLabel: input.availabilityLabel?.trim() || undefined,
    avatarUrl: existing?.avatarUrl ?? organization.avatarUrl,
    theme: input.theme,
    ctaLabel: input.ctaLabel.trim() || "Contactar",
    ctaUrl: normalizeSafeUrl(input.ctaUrl),
    whatsappNumber: input.whatsappNumber?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    socialLinks: cleanSocial,
    services: cleanServices,
    customProjects: cleanCustomProjects,
    updatedAt: new Date().toISOString(),
  };

  const idx = data.portfolios.findIndex((p) => p.id === targetId);
  if (idx >= 0) data.portfolios[idx] = updated;
  else data.portfolios.push(updated);

  await savePortfoliosData(data);

  revalidatePath("/app/configuracion");
  revalidatePath("/app/bolsa");
  revalidatePath(`/p/${nextSlug}`);
  if (previousSlug && previousSlug !== nextSlug) {
    revalidatePath(`/p/${previousSlug}`);
  }

  return { ok: true, slug: nextSlug };
}
