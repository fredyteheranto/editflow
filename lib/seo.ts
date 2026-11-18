import type { Metadata } from "next";

export const SITE_NAME = "EditFlow";
export const SITE_TITLE = "EditFlow — Software para productoras y equipos de edición de video";
export const SITE_DESCRIPTION =
  "Reemplaza el Google Sheet manual: controla editores de video, clientes, entregas, calendario con Google Meet y métricas mensuales en una sola plataforma.";

export const SITE_KEYWORDS = [
  "control de editores de video",
  "gestión de productora audiovisual",
  "software para agencias de contenido",
  "seguimiento de edición de video",
  "flujo de trabajo postproducción",
  "calendario de grabaciones y entregas",
  "alternativa a Google Sheets para editores",
  "gestión de clientes de video",
  "métricas de productividad editores",
  "EditFlow",
];

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

/**
 * Resuelve la URL pública base para canonicals, Open Graph (redes sociales),
 * sitemap.xml y robots.txt en local, Vercel o Azure.
 */
export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (envUrl || "http://localhost:3000").replace(/\/+$/, "");
}

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: NOINDEX_ROBOTS } : {}),
    openGraph: {
      type: "website",
      locale: "es_CO",
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
