import { buildRankings, getTalentHubData } from "@/lib/bolsa/store";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import type {
  PublicPortfolioProfile,
  PublicPortfoliosData,
  ResolvedPublicPortfolio,
} from "@/lib/portfolio/types";

const CONFIG_BUCKET = "editflow-platform";
const PORTFOLIO_OBJECT_PATH = "public-portfolios.json";
const CACHE_TTL_MS = 5_000;

export const RESERVED_PORTFOLIO_SLUGS = new Set([
  "app",
  "api",
  "auth",
  "crear-espacio",
  "invitacion",
  "preview",
  "privacidad",
  "restablecer",
  "super-admin",
  "terminos",
  "robots",
  "sitemap",
]);

let portfolioCache: { data: PublicPortfoliosData; loadedAt: number } | null = null;

function normalizePortfoliosData(
  raw: Partial<PublicPortfoliosData> | null | undefined,
): PublicPortfoliosData {
  if (!raw || !Array.isArray(raw.portfolios)) {
    return { portfolios: [] };
  }
  return { portfolios: raw.portfolios };
}

export async function getPortfoliosData(forceFresh = false): Promise<PublicPortfoliosData> {
  if (!forceFresh && portfolioCache && Date.now() - portfolioCache.loadedAt < CACHE_TTL_MS) {
    return portfolioCache.data;
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage.from(CONFIG_BUCKET).download(PORTFOLIO_OBJECT_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text()) as Partial<PublicPortfoliosData>;
      const normalized = normalizePortfoliosData(parsed);
      portfolioCache = { data: normalized, loadedAt: Date.now() };
      return normalized;
    }
  } catch (err) {
    console.warn("[portfolio] usando catálogo vacío:", err);
  }

  const fallback: PublicPortfoliosData = { portfolios: [] };
  portfolioCache = { data: fallback, loadedAt: Date.now() };
  return fallback;
}

export async function savePortfoliosData(
  nextData: PublicPortfoliosData,
): Promise<PublicPortfoliosData> {
  const normalized = normalizePortfoliosData(nextData);
  const admin = createServiceRoleClient();

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((b) => b.name === CONFIG_BUCKET);
  if (!exists) {
    const { error: bucketErr } = await admin.storage.createBucket(CONFIG_BUCKET, {
      public: false,
      allowedMimeTypes: ["application/json"],
    });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      throw new Error(`No se pudo crear almacenamiento de portafolios: ${bucketErr.message}`);
    }
  }

  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const { error } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(PORTFOLIO_OBJECT_PATH, blob, { upsert: true, contentType: "application/json" });

  if (error) {
    throw new Error(`No se pudo guardar portafolio público: ${error.message}`);
  }

  portfolioCache = { data: normalized, loadedAt: Date.now() };
  return normalized;
}

function buildAvailableSlug(
  desiredRaw: string,
  takenSlugs: Set<string>,
  fallbackSeed: string,
): string {
  const base = slugify(desiredRaw) || slugify(fallbackSeed) || "espacio";
  const safeBase = RESERVED_PORTFOLIO_SLUGS.has(base) ? `${base}-studio` : base;
  if (!takenSlugs.has(safeBase)) return safeBase;

  for (let i = 2; i < 50; i++) {
    const candidate = `${safeBase}-${i}`;
    if (!takenSlugs.has(candidate)) return candidate;
  }
  return `${safeBase}-${crypto.randomUUID().slice(0, 4)}`;
}

export async function getOrPrepareMyPortfolios(params: {
  userId: string;
  userEmail: string;
  memberName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug?: string | null;
  canManageAgency: boolean;
}): Promise<{
  agencyPortfolio: PublicPortfolioProfile | null;
  creatorPortfolio: PublicPortfolioProfile;
}> {
  const data = await getPortfoliosData(true);
  const taken = new Set(data.portfolios.map((p) => p.slug.toLowerCase()));
  let changed = false;

  const userKey = `user:${params.userId}`;
  let creatorPortfolio = data.portfolios.find((p) => p.id === userKey);
  if (!creatorPortfolio) {
    const defaultSlug = buildAvailableSlug(
      params.memberName || params.userEmail.split("@")[0] || "creador",
      taken,
      params.userId.slice(0, 6),
    );
    taken.add(defaultSlug);
    creatorPortfolio = {
      id: userKey,
      kind: "creator",
      ownerUserId: params.userId,
      organizationId: params.organizationId,
      slug: defaultSlug,
      published: true,
      displayName: params.memberName || params.userEmail,
      headline: "Editor audiovisual & Storytelling para marcas",
      bio:
        params.bio?.trim() ||
        "Creo contenido de alto impacto en Reels, TikTok y YouTube optimizado para retención y conversión.",
      availabilityLabel: "Disponible para proyectos",
      avatarUrl: params.avatarUrl,
      theme: "violet",
      ctaLabel: "Contactar para proyecto",
      whatsappNumber: params.phone ?? "",
      contactEmail: params.userEmail,
      socialLinks: {},
      services: [
        {
          id: crypto.randomUUID(),
          title: "Edición de Reels / Shorts",
          description: "Ritmo dinámico, subtítulos animados y sound design de retención.",
          priceLabel: "Por video o paquete",
        },
      ],
      customProjects: [],
      updatedAt: new Date().toISOString(),
    };
    data.portfolios.push(creatorPortfolio);
    changed = true;
  }

  let agencyPortfolio: PublicPortfolioProfile | null = null;
  if (params.canManageAgency) {
    const orgKey = `org:${params.organizationId}`;
    agencyPortfolio = data.portfolios.find((p) => p.id === orgKey) ?? null;
    if (!agencyPortfolio) {
      const orgSlug = buildAvailableSlug(
        params.organizationSlug || params.organizationName,
        taken,
        `agencia-${params.organizationId.slice(0, 6)}`,
      );
      taken.add(orgSlug);
      agencyPortfolio = {
        id: orgKey,
        kind: "agency",
        ownerUserId: params.userId,
        organizationId: params.organizationId,
        slug: orgSlug,
        published: true,
        displayName: params.organizationName,
        headline: "Productora audiovisual & Agencia de contenido",
        bio: `Equipo creativo de ${params.organizationName}. Producción y postproducción de video con flujo profesional y entregas puntuales.`,
        availabilityLabel: "Agenda abierta para marcas",
        avatarUrl: params.avatarUrl,
        theme: "cyan",
        ctaLabel: "Solicitar cotización",
        whatsappNumber: params.phone ?? "",
        contactEmail: params.userEmail,
        socialLinks: {},
        services: [
          {
            id: crypto.randomUUID(),
            title: "Plan Mensual de Contenido Vertical",
            description: "Paquetes mensuales de Reels, TikToks y Shorts listos para publicar.",
            priceLabel: "Plan mensual",
          },
          {
            id: crypto.randomUUID(),
            title: "Edición YouTube & Comerciales",
            description: "Narrativa long-form, color grading y motion graphics.",
            priceLabel: "A medida",
          },
        ],
        customProjects: [],
        updatedAt: new Date().toISOString(),
      };
      data.portfolios.push(agencyPortfolio);
      changed = true;
    }
  }

  if (changed) {
    await savePortfoliosData(data);
  }

  return { agencyPortfolio, creatorPortfolio };
}

export async function getResolvedPublicPortfolio(
  rawSlug: string,
): Promise<ResolvedPublicPortfolio | null> {
  const normalizedSlug = slugify(rawSlug);
  if (!normalizedSlug) return null;

  const [portfoliosData, talentHub] = await Promise.all([
    getPortfoliosData(),
    getTalentHubData(),
  ]);

  const profile = portfoliosData.portfolios.find(
    (p) => p.slug.toLowerCase() === normalizedSlug && p.published,
  );
  if (!profile) return null;

  const { rankedProjects, creatorRankings } = buildRankings(talentHub);

  const projects =
    profile.kind === "agency"
      ? rankedProjects.filter((p) => p.organizationId === profile.organizationId)
      : rankedProjects.filter((p) => p.authorUserId === profile.ownerUserId);

  const creatorRanking =
    profile.kind === "creator"
      ? creatorRankings.find((c) => c.userId === profile.ownerUserId) ?? null
      : null;

  const badges =
    profile.kind === "agency"
      ? talentHub.skillValidations.filter((b) =>
          projects.some((p) => p.authorUserId === b.userId),
        )
      : talentHub.skillValidations.filter((b) => b.userId === profile.ownerUserId);

  const openJobs =
    profile.kind === "agency"
      ? talentHub.jobs.filter(
          (j) => j.organizationId === profile.organizationId && j.status === "abierta",
        )
      : [];

  return {
    profile,
    projects,
    creatorRanking,
    badges,
    openJobs,
  };
}
