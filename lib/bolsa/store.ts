import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  CreatorRankingRow,
  RankedProject,
  TalentHubData,
  TalentProject,
} from "@/lib/bolsa/types";

const CONFIG_BUCKET = "editflow-platform";
const HUB_OBJECT_PATH = "talent-hub.json";
const CACHE_TTL_MS = 5_000;

let hubCache: { data: TalentHubData; loadedAt: number } | null = null;

const EMPTY_HUB: TalentHubData = {
  projects: [],
  jobs: [],
  applications: [],
  skillValidations: [],
};

function normalizeHubData(raw: Partial<TalentHubData> | null | undefined): TalentHubData {
  if (!raw) return structuredClone(EMPTY_HUB);
  return {
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
    applications: Array.isArray(raw.applications) ? raw.applications : [],
    skillValidations: Array.isArray(raw.skillValidations) ? raw.skillValidations : [],
  };
}

export async function getTalentHubData(forceFresh = false): Promise<TalentHubData> {
  if (!forceFresh && hubCache && Date.now() - hubCache.loadedAt < CACHE_TTL_MS) {
    return hubCache.data;
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage.from(CONFIG_BUCKET).download(HUB_OBJECT_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text()) as Partial<TalentHubData>;
      const normalized = normalizeHubData(parsed);
      hubCache = { data: normalized, loadedAt: Date.now() };
      return normalized;
    }
  } catch (err) {
    console.warn("[bolsa] usando almacenamiento inicial vacío:", err);
  }

  const fallback = structuredClone(EMPTY_HUB);
  hubCache = { data: fallback, loadedAt: Date.now() };
  return fallback;
}

export async function saveTalentHubData(nextData: TalentHubData): Promise<TalentHubData> {
  const normalized = normalizeHubData(nextData);
  const admin = createServiceRoleClient();

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((b) => b.name === CONFIG_BUCKET);
  if (!exists) {
    const { error: bucketErr } = await admin.storage.createBucket(CONFIG_BUCKET, {
      public: false,
      allowedMimeTypes: ["application/json"],
    });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      throw new Error(`No se pudo crear almacenamiento de Bolsa: ${bucketErr.message}`);
    }
  }

  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const { error } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(HUB_OBJECT_PATH, blob, { upsert: true, contentType: "application/json" });

  if (error) {
    throw new Error(`No se pudo guardar información de Bolsa: ${error.message}`);
  }

  hubCache = { data: normalized, loadedAt: Date.now() };
  return normalized;
}

/**
 * Calcula puntaje bayesiano ponderado para evitar que un proyecto con un solo 5.0
 * supere automáticamente a uno con múltiples reseñas altas, sumando además un
 * ligero bono por certificaciones de skills validadas.
 */
function weightedRatingScore(avg: number, count: number, validatedCount: number): number {
  const m = 2;
  const priorMean = 3.8;
  const bayesian =
    count === 0 ? priorMean * 0.75 : (count / (count + m)) * avg + (m / (count + m)) * priorMean;
  const skillBonus = Math.min(validatedCount * 0.15, 0.6);
  return Math.round((bayesian + skillBonus) * 100) / 100;
}

export function buildRankings(data: TalentHubData): {
  rankedProjects: RankedProject[];
  creatorRankings: CreatorRankingRow[];
} {
  const badgesByUser = new Map<string, TalentHubData["skillValidations"]>();
  for (const badge of data.skillValidations) {
    const existing = badgesByUser.get(badge.userId) ?? [];
    // Mantener una insignia única por skillId (la más reciente/alta)
    const idx = existing.findIndex((b) => b.skillId === badge.skillId);
    if (idx === -1) existing.push(badge);
    else if (badge.scorePct >= existing[idx].scorePct) existing[idx] = badge;
    badgesByUser.set(badge.userId, existing);
  }

  const projectAvg = (p: TalentProject) => {
    if (p.ratings.length === 0) return { avg: 0, count: 0 };
    const sum = p.ratings.reduce((acc, r) => acc + r.stars, 0);
    return {
      avg: Math.round((sum / p.ratings.length) * 10) / 10,
      count: p.ratings.length,
    };
  };

  const unsortedProjects = data.projects.map((p) => {
    const { avg, count } = projectAvg(p);
    const authorBadges = badgesByUser.get(p.authorUserId) ?? [];
    const rankingScore = weightedRatingScore(avg, count, authorBadges.length);
    return {
      ...p,
      ratingAvg: avg,
      ratingCount: count,
      rankingScore,
      authorBadges,
    };
  });

  unsortedProjects.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const rankedProjects: RankedProject[] = unsortedProjects.map((p, i) => ({
    ...p,
    rank: i + 1,
  }));

  // Ranking agregado por creador/talento
  const creatorMap = new Map<
    string,
    {
      userId: string;
      email: string;
      name: string;
      organizationName: string;
      projectCount: number;
      ratingSum: number;
      ratingCount: number;
    }
  >();

  for (const p of data.projects) {
    const cur = creatorMap.get(p.authorUserId) ?? {
      userId: p.authorUserId,
      email: p.authorEmail,
      name: p.authorName,
      organizationName: p.organizationName,
      projectCount: 0,
      ratingSum: 0,
      ratingCount: 0,
    };
    cur.projectCount += 1;
    cur.ratingCount += p.ratings.length;
    cur.ratingSum += p.ratings.reduce((acc, r) => acc + r.stars, 0);
    creatorMap.set(p.authorUserId, cur);
  }

  for (const badge of data.skillValidations) {
    if (!creatorMap.has(badge.userId)) {
      creatorMap.set(badge.userId, {
        userId: badge.userId,
        email: badge.userEmail,
        name: badge.userName,
        organizationName: "Talento EditFlow",
        projectCount: 0,
        ratingSum: 0,
        ratingCount: 0,
      });
    }
  }

  const creatorRows = Array.from(creatorMap.values())
    .map((c) => {
      const avg = c.ratingCount > 0 ? Math.round((c.ratingSum / c.ratingCount) * 10) / 10 : 0;
      const badges = badgesByUser.get(c.userId) ?? [];
      const rankingScore =
        c.projectCount > 0
          ? weightedRatingScore(avg, c.ratingCount, badges.length)
          : Math.round(badges.length * 0.5 * 100) / 100;
      return {
        userId: c.userId,
        email: c.email,
        name: c.name,
        organizationName: c.organizationName,
        projectCount: c.projectCount,
        ratingAvg: avg,
        ratingCount: c.ratingCount,
        validatedSkillCount: badges.length,
        badges,
        rankingScore,
      };
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
      return b.validatedSkillCount - a.validatedSkillCount;
    });

  const creatorRankings: CreatorRankingRow[] = creatorRows.map((c, idx) => ({
    ...c,
    rank: idx + 1,
  }));

  return { rankedProjects, creatorRankings };
}
