"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { requireModuleAccess } from "@/lib/period/resolve";
import { createGoogleMeetingEvent } from "@/lib/google/calendar";
import { sendWithGmailOrResend } from "@/lib/email/transport";
import { appUrl } from "@/lib/supabase/env";
import { getSkillTrackById } from "@/lib/bolsa/skills";
import { getTalentHubData, saveTalentHubData } from "@/lib/bolsa/store";
import type {
  ApplicationStatus,
  InterviewStatus,
  JobEmploymentType,
  JobModality,
} from "@/lib/bolsa/types";

export type BolsaResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : ({ ok: true } & T) | { ok: false; error: string };

function revalidateBolsa(applicationId?: string) {
  revalidatePath("/app/bolsa");
  if (applicationId) revalidatePath(`/app/bolsa/entrevista/${applicationId}`);
}

export async function publishProjectAction(input: {
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  skills: string[];
}): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const title = input.title.trim();
  const description = input.description.trim();
  const videoUrl = input.videoUrl.trim();
  if (!title || !description || !videoUrl) {
    return { ok: false, error: "Título, descripción y enlace del video/reel son obligatorios." };
  }

  const data = await getTalentHubData(true);
  data.projects.unshift({
    id: crypto.randomUUID(),
    authorUserId: user.id,
    authorEmail: user.email ?? "",
    authorName: organization.memberName,
    organizationId: organization.id,
    organizationName: organization.name,
    title,
    description,
    videoUrl,
    category: input.category || "Reels / Shorts",
    skills: input.skills.slice(0, 6),
    ratings: [],
    createdAt: new Date().toISOString(),
  });

  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function deleteProjectAction(projectId: string): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Sesión requerida." };

  const data = await getTalentHubData(true);
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return { ok: false, error: "Proyecto no encontrado." };

  const canDelete =
    project.authorUserId === user.id ||
    ((organization.role === "owner" || organization.role === "admin") &&
      project.organizationId === organization.id);
  if (!canDelete) return { ok: false, error: "No tienes permiso para eliminar este proyecto." };

  data.projects = data.projects.filter((p) => p.id !== projectId);
  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function rateProjectAction(input: {
  projectId: string;
  stars: number;
  comment?: string;
}): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Debes iniciar sesión para calificar." };

  const stars = Math.round(input.stars);
  if (stars < 1 || stars > 5) {
    return { ok: false, error: "La valoración debe ser entre 1 y 5 estrellas." };
  }

  const data = await getTalentHubData(true);
  const project = data.projects.find((p) => p.id === input.projectId);
  if (!project) return { ok: false, error: "Proyecto no encontrado." };
  if (project.authorUserId === user.id) {
    return { ok: false, error: "No puedes calificar tu propio proyecto." };
  }

  const existingIdx = project.ratings.findIndex((r) => r.userId === user.id);
  const nextRating = {
    userId: user.id,
    userName: organization.memberName,
    stars,
    comment: input.comment?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) project.ratings[existingIdx] = nextRating;
  else project.ratings.unshift(nextRating);

  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function publishJobAction(input: {
  title: string;
  description: string;
  modality: JobModality;
  employmentType: JobEmploymentType;
  budgetLabel: string;
  requiredSkills: string[];
  minRating: number;
}): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) {
    return { ok: false, error: "Título y descripción de la vacante son obligatorios." };
  }

  const data = await getTalentHubData(true);
  data.jobs.unshift({
    id: crypto.randomUUID(),
    organizationId: organization.id,
    organizationName: organization.name,
    publisherUserId: user.id,
    publisherEmail: user.email ?? "",
    publisherName: organization.memberName,
    title,
    description,
    modality: input.modality,
    employmentType: input.employmentType,
    budgetLabel: input.budgetLabel.trim() || "A convenir",
    requiredSkills: input.requiredSkills.slice(0, 6),
    minRating: Math.max(0, Math.min(5, Number(input.minRating) || 0)),
    status: "abierta",
    createdAt: new Date().toISOString(),
  });

  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function toggleJobStatusAction(jobId: string): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Sesión requerida." };

  const data = await getTalentHubData(true);
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job) return { ok: false, error: "Vacante no encontrada." };

  const isOwnerOrAdmin =
    job.publisherUserId === user.id ||
    (job.organizationId === organization.id &&
      (organization.role === "owner" || organization.role === "admin"));
  if (!isOwnerOrAdmin) return { ok: false, error: "No tienes permiso para modificar esta vacante." };

  job.status = job.status === "abierta" ? "cerrada" : "abierta";
  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function applyToJobAction(input: {
  jobId: string;
  coverMessage: string;
  attachedProjectIds: string[];
}): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Debes iniciar sesión para postularte." };

  const data = await getTalentHubData(true);
  const job = data.jobs.find((j) => j.id === input.jobId);
  if (!job) return { ok: false, error: "Vacante no encontrada." };
  if (job.status !== "abierta") return { ok: false, error: "Esta vacante ya fue cerrada." };

  const duplicate = data.applications.find(
    (a) => a.jobId === input.jobId && a.applicantUserId === user.id,
  );
  if (duplicate) return { ok: false, error: "Ya enviaste tu postulación a esta vacante." };

  data.applications.unshift({
    id: crypto.randomUUID(),
    jobId: input.jobId,
    applicantUserId: user.id,
    applicantEmail: user.email ?? "",
    applicantName: organization.memberName,
    coverMessage: input.coverMessage.trim() || "Me interesa esta oportunidad.",
    attachedProjectIds: input.attachedProjectIds,
    status: "postulado",
    createdAt: new Date().toISOString(),
  });

  await saveTalentHubData(data);
  revalidateBolsa();
  return { ok: true };
}

export async function scheduleLiveInterviewAction(input: {
  applicationId: string;
  scheduledAt: string;
}): Promise<BolsaResult<{ interviewUrl: string }>> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Sesión requerida." };

  const data = await getTalentHubData(true);
  const application = data.applications.find((a) => a.id === input.applicationId);
  if (!application) return { ok: false, error: "Postulación no encontrada." };

  const job = data.jobs.find((j) => j.id === application.jobId);
  if (!job) return { ok: false, error: "Vacante no encontrada." };

  const allowed =
    job.publisherUserId === user.id ||
    (job.organizationId === organization.id &&
      (organization.role === "owner" || organization.role === "admin"));
  if (!allowed) return { ok: false, error: "Solo quien publicó la vacante puede agendar entrevista." };

  const startIso = input.scheduledAt || new Date().toISOString();
  const endIso = new Date(new Date(startIso).getTime() + 45 * 60_000).toISOString();

  let googleMeetUrl: string | null = null;
  try {
    const meet = await createGoogleMeetingEvent(organization.membershipId, {
      title: `Interview EditFlow: ${job.title} (${application.applicantName})`,
      description: `Entrevista en vivo y validación de skills desde EditFlow Bolsa de Empleo.`,
      startAt: startIso,
      endAt: endIso,
      timeZone: organization.timezone,
      attendeeEmails: application.applicantEmail ? [application.applicantEmail] : [],
      withMeet: true,
    });
    googleMeetUrl = meet?.meetLink ?? null;
  } catch {
    googleMeetUrl = null;
  }

  const roomSlug = `editflow-interview-${application.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
  application.status = "entrevista";
  application.interview = {
    id: crypto.randomUUID(),
    scheduledAt: startIso,
    roomSlug,
    googleMeetUrl,
    status: "programada",
    updatedAt: new Date().toISOString(),
  };

  await saveTalentHubData(data);

  const interviewPath = `/app/bolsa/entrevista/${application.id}`;
  const fullInterviewUrl = `${appUrl()}${interviewPath}`;

  // Notificar en app si el candidato tiene membresía + enviar correo de invitación a entrevista
  try {
    const admin = createServiceRoleClient();
    const { data: targetMems } = await admin
      .from("memberships")
      .select("id, organization_id")
      .ilike("email", application.applicantEmail)
      .eq("active", true)
      .limit(1);

    const targetMem = targetMems?.[0];
    if (targetMem) {
      await admin.from("notifications").insert({
        organization_id: targetMem.organization_id,
        recipient_email: application.applicantEmail,
        membership_id: targetMem.id,
        type: "interview_live",
        title: `Interview en vivo: ${job.title}`,
        body: `${job.organizationName} te invitó a entrevista en vivo.`,
        link: interviewPath,
      });
    }

    if (application.applicantEmail) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2>¡Te citaron a una Interview en vivo en EditFlow!</h2>
          <p>Hola <strong>${application.applicantName}</strong>,</p>
          <p><strong>${job.organizationName}</strong> programó tu entrevista para la vacante <strong>${job.title}</strong>.</p>
          <p><a href="${fullInterviewUrl}" style="display:inline-block;padding:12px 18px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Entrar a la Interview en vivo</a></p>
          ${googleMeetUrl ? `<p>También puedes abrir el enlace directo de Google Meet: <a href="${googleMeetUrl}">${googleMeetUrl}</a></p>` : ""}
        </div>
      `;
      await sendWithGmailOrResend({
        to: application.applicantEmail,
        subject: `EditFlow · Interview en vivo para ${job.title}`,
        html,
      });
    }
  } catch (err) {
    console.warn("[bolsa] aviso de entrevista no entregado:", err);
  }

  revalidateBolsa(application.id);
  return { ok: true, interviewUrl: interviewPath };
}

export async function updateInterviewEvaluationAction(input: {
  applicationId: string;
  interviewStatus: InterviewStatus;
  applicationStatus: ApplicationStatus;
  notes: string;
  technicalScore: number;
  validatedSkills: string[];
}): Promise<BolsaResult> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Sesión requerida." };

  const data = await getTalentHubData(true);
  const application = data.applications.find((a) => a.id === input.applicationId);
  if (!application || !application.interview) {
    return { ok: false, error: "Entrevista no encontrada." };
  }
  const job = data.jobs.find((j) => j.id === application.jobId);
  if (!job) return { ok: false, error: "Vacante no encontrada." };

  const allowed =
    job.publisherUserId === user.id ||
    (job.organizationId === organization.id &&
      (organization.role === "owner" || organization.role === "admin"));
  if (!allowed) {
    return { ok: false, error: "Solo el entrevistador de la organización puede evaluar." };
  }

  application.status = input.applicationStatus;
  application.interview = {
    ...application.interview,
    status: input.interviewStatus,
    notes: input.notes.trim(),
    technicalScore: Math.max(1, Math.min(5, Math.round(input.technicalScore))),
    validatedSkills: input.validatedSkills,
    updatedAt: new Date().toISOString(),
  };

  // Emitir insignias de validación práctica en entrevista para cada skill marcado
  for (const skillLabel of input.validatedSkills) {
    const skillId = `live-${skillLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const existing = data.skillValidations.find(
      (b) => b.userId === application.applicantUserId && b.skillId === skillId,
    );
    const badgeData = {
      id: existing?.id ?? crypto.randomUUID(),
      userId: application.applicantUserId,
      userEmail: application.applicantEmail,
      userName: application.applicantName,
      skillId,
      skillLabel,
      scorePct: Math.max(80, Math.round((input.technicalScore / 5) * 100)),
      method: "entrevista" as const,
      verifiedBy: `${organization.memberName} (${job.organizationName})`,
      verifiedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, badgeData);
    else data.skillValidations.unshift(badgeData);
  }

  await saveTalentHubData(data);
  revalidateBolsa(application.id);
  return { ok: true };
}

export async function submitSkillAssessmentAction(input: {
  skillId: string;
  answers: number[];
}): Promise<BolsaResult<{ passed: boolean; scorePct: number; skillLabel: string }>> {
  const [{ organization }, user] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
  ]);
  if (!user) return { ok: false, error: "Debes iniciar sesión para validar un skill." };

  const track = getSkillTrackById(input.skillId);
  if (!track) return { ok: false, error: "Evaluación de skill no encontrada." };

  let correct = 0;
  track.questions.forEach((q, idx) => {
    if (input.answers[idx] === q.correctIndex) correct += 1;
  });

  const scorePct = Math.round((correct / track.questions.length) * 100);
  const passed = scorePct >= track.passingScorePct;

  if (passed) {
    const data = await getTalentHubData(true);
    const existingIdx = data.skillValidations.findIndex(
      (b) => b.userId === user.id && b.skillId === track.id,
    );
    const badge = {
      id: existingIdx >= 0 ? data.skillValidations[existingIdx].id : crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email ?? "",
      userName: organization.memberName,
      skillId: track.id,
      skillLabel: track.label,
      scorePct,
      method: "evaluacion" as const,
      verifiedBy: "Evaluación práctica EditFlow",
      verifiedAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) data.skillValidations[existingIdx] = badge;
    else data.skillValidations.unshift(badge);

    await saveTalentHubData(data);
    revalidateBolsa();
  }

  return { ok: true, passed, scorePct, skillLabel: track.label };
}
