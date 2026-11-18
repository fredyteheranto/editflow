import type { CreatorRankingRow, JobVacancy, RankedProject, SkillValidationBadge } from "@/lib/bolsa/types";

export type PortfolioKind = "agency" | "creator";
export type PortfolioTheme = "violet" | "emerald" | "amber" | "cyan" | "rose";

export interface PortfolioServiceItem {
  id: string;
  title: string;
  description: string;
  priceLabel?: string;
}

export interface PortfolioShowcaseItem {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  description?: string;
}

export interface PortfolioSocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  website?: string;
}

export interface PublicPortfolioProfile {
  id: string; // "org:<orgId>" | "user:<userId>"
  kind: PortfolioKind;
  ownerUserId: string;
  organizationId: string;
  slug: string;
  published: boolean;
  displayName: string;
  headline: string;
  bio: string;
  location?: string;
  availabilityLabel?: string;
  avatarUrl?: string | null;
  theme: PortfolioTheme;
  ctaLabel: string;
  ctaUrl?: string;
  whatsappNumber?: string;
  contactEmail?: string;
  socialLinks: PortfolioSocialLinks;
  services: PortfolioServiceItem[];
  customProjects: PortfolioShowcaseItem[];
  updatedAt: string;
}

export interface PublicPortfoliosData {
  portfolios: PublicPortfolioProfile[];
}

export interface ResolvedPublicPortfolio {
  profile: PublicPortfolioProfile;
  projects: RankedProject[];
  creatorRanking: CreatorRankingRow | null;
  badges: SkillValidationBadge[];
  openJobs: JobVacancy[];
}
