import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InterviewRoomClient } from "@/components/bolsa/interview-room-client";
import { buildRankings, getTalentHubData } from "@/lib/bolsa/store";
import { requireModuleAccess } from "@/lib/period/resolve";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import { getServerUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Interview en Vivo · Bolsa de Empleo · EditFlow",
  description:
    "Sala de interview en vivo con validación práctica de skills y portfolio del candidato.",
};

export default async function EntrevistaPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const [{ applicationId }, { organization }, user, isSuperAdmin, data] = await Promise.all([
    params,
    requireModuleAccess("bolsa"),
    getServerUser(),
    isCurrentUserSuperAdmin(),
    getTalentHubData(true),
  ]);

  if (!user) {
    redirect("/crear-espacio");
  }

  const application = data.applications.find((a) => a.id === applicationId);
  if (!application || !application.interview) {
    redirect("/app/bolsa");
  }

  const job = data.jobs.find((j) => j.id === application.jobId);
  if (!job) {
    redirect("/app/bolsa");
  }

  const canAccess =
    application.applicantUserId === user.id ||
    job.publisherUserId === user.id ||
    job.organizationId === organization.id ||
    isSuperAdmin;

  if (!canAccess) {
    redirect("/app/bolsa");
  }

  const isInterviewer =
    job.publisherUserId === user.id ||
    (job.organizationId === organization.id &&
      (organization.role === "owner" || organization.role === "admin"));

  const { rankedProjects, creatorRankings } = buildRankings(data);
  const candidateRanking =
    creatorRankings.find((c) => c.userId === application.applicantUserId) ?? null;
  const candidateBadges = data.skillValidations.filter(
    (b) => b.userId === application.applicantUserId,
  );
  const attachedProjects = rankedProjects.filter((p) =>
    application.attachedProjectIds.includes(p.id),
  );

  return (
    <InterviewRoomClient
      application={application}
      job={job}
      candidateRanking={candidateRanking}
      candidateBadges={candidateBadges}
      attachedProjects={attachedProjects}
      isInterviewer={isInterviewer}
      viewerName={organization.memberName || user.email || "Usuario EditFlow"}
    />
  );
}
