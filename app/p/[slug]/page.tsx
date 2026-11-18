import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLandingView } from "@/components/portfolio/public-landing-view";
import { getResolvedPublicPortfolio } from "@/lib/portfolio/store";
import { getPlatformConfig } from "@/lib/platform/config";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, platformConfig, isSuperAdmin] = await Promise.all([
    params,
    getPlatformConfig(),
    isCurrentUserSuperAdmin(),
  ]);
  const allowed = platformConfig.permissions.publicPortfolios || isSuperAdmin;
  const resolved = allowed ? await getResolvedPublicPortfolio(slug) : null;
  if (!resolved) {
    return buildPageMetadata({
      title: "Portafolio no encontrado",
      description: "Este espacio público no está disponible en EditFlow.",
      path: `/p/${slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${resolved.profile.displayName} — ${resolved.profile.headline}`,
    description: resolved.profile.bio.slice(0, 155),
    path: `/p/${resolved.profile.slug}`,
  });
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, platformConfig, isSuperAdmin] = await Promise.all([
    params,
    getPlatformConfig(),
    isCurrentUserSuperAdmin(),
  ]);
  if (!platformConfig.permissions.publicPortfolios && !isSuperAdmin) {
    notFound();
  }
  const resolved = await getResolvedPublicPortfolio(slug);
  if (!resolved) {
    notFound();
  }

  return <PublicLandingView resolved={resolved} />;
}
