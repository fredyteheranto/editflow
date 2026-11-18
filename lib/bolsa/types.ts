export type JobModality = "remoto" | "hibrido" | "presencial";
export type JobEmploymentType = "freelance" | "tiempo_completo" | "por_proyecto";
export type ApplicationStatus = "postulado" | "entrevista" | "aprobado" | "rechazado";
export type InterviewStatus = "programada" | "en_vivo" | "finalizada";

export interface ProjectRating {
  userId: string;
  userName: string;
  stars: number; // 1..5
  comment?: string;
  updatedAt: string;
}

export interface TalentProject {
  id: string;
  authorUserId: string;
  authorEmail: string;
  authorName: string;
  organizationId: string;
  organizationName: string;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  skills: string[];
  ratings: ProjectRating[];
  createdAt: string;
}

export interface SkillValidationBadge {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  skillId: string;
  skillLabel: string;
  scorePct: number;
  method: "evaluacion" | "entrevista";
  verifiedBy?: string;
  verifiedAt: string;
}

export interface LiveInterviewInfo {
  id: string;
  scheduledAt: string;
  roomSlug: string;
  googleMeetUrl?: string | null;
  status: InterviewStatus;
  notes?: string;
  technicalScore?: number;
  validatedSkills?: string[];
  updatedAt: string;
}

export interface JobVacancy {
  id: string;
  organizationId: string;
  organizationName: string;
  publisherUserId: string;
  publisherEmail: string;
  publisherName: string;
  title: string;
  description: string;
  modality: JobModality;
  employmentType: JobEmploymentType;
  budgetLabel: string;
  requiredSkills: string[];
  minRating: number;
  status: "abierta" | "cerrada";
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantUserId: string;
  applicantEmail: string;
  applicantName: string;
  coverMessage: string;
  attachedProjectIds: string[];
  status: ApplicationStatus;
  interview?: LiveInterviewInfo;
  createdAt: string;
}

export interface TalentHubData {
  projects: TalentProject[];
  jobs: JobVacancy[];
  applications: JobApplication[];
  skillValidations: SkillValidationBadge[];
}

export interface RankedProject extends TalentProject {
  ratingAvg: number;
  ratingCount: number;
  rankingScore: number;
  rank: number;
  authorBadges: SkillValidationBadge[];
}

export interface CreatorRankingRow {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
  projectCount: number;
  ratingAvg: number;
  ratingCount: number;
  validatedSkillCount: number;
  badges: SkillValidationBadge[];
  rankingScore: number;
  rank: number;
}
