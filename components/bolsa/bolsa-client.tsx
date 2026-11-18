"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, Briefcase, Globe, Sparkles, Star, Trophy, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingAndProjectsTab, SkillValidationTab } from "@/components/bolsa/skills-and-ranking-tabs";
import { JobsAndInterviewsTabs } from "@/components/bolsa/jobs-and-interviews-tabs";
import type {
  CreatorRankingRow,
  JobApplication,
  JobVacancy,
  RankedProject,
  SkillValidationBadge,
} from "@/lib/bolsa/types";

export function BolsaClient({
  rankedProjects,
  creatorRankings,
  jobs,
  applications,
  skillValidations,
  currentUserId,
  currentOrgId,
  currentRole,
}: {
  rankedProjects: RankedProject[];
  creatorRankings: CreatorRankingRow[];
  jobs: JobVacancy[];
  applications: JobApplication[];
  skillValidations: SkillValidationBadge[];
  currentUserId: string;
  currentOrgId: string;
  currentRole: string;
}) {
  const [tab, setTab] = useState("ranking");

  const myCreator = useMemo(
    () => creatorRankings.find((c) => c.userId === currentUserId) ?? null,
    [creatorRankings, currentUserId],
  );
  const myProjects = useMemo(
    () => rankedProjects.filter((p) => p.authorUserId === currentUserId),
    [rankedProjects, currentUserId],
  );
  const myValidations = useMemo(
    () => skillValidations.filter((b) => b.userId === currentUserId),
    [skillValidations, currentUserId],
  );

  const openJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "abierta").length,
    [jobs],
  );

  const relevantApplicationsCount = useMemo(() => {
    const myJobIds = new Set(
      jobs
        .filter((j) => j.publisherUserId === currentUserId || j.organizationId === currentOrgId)
        .map((j) => j.id),
    );
    return applications.filter(
      (a) => a.applicantUserId === currentUserId || myJobIds.has(a.jobId),
    ).length;
  }, [applications, jobs, currentUserId, currentOrgId]);

  const scheduledInterviewsCount = useMemo(
    () => applications.filter((a) => Boolean(a.interview)).length,
    [applications],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3.5 text-warning" />
              Talento Audiovisual & Ranking Top
            </Badge>
            {myCreator && myCreator.rank <= 3 && (
              <Badge className="gap-1 bg-warning/15 text-warning hover:bg-warning/20">
                <Trophy className="size-3.5" />
                Top #{myCreator.rank} del Ranking
              </Badge>
            )}
            <Button asChild size="xs" variant="outline" className="gap-1">
              <Link href="/app/configuracion#landing-publica">
                <Globe className="size-3" />
                Mi Landing Pública (/p/...)
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bolsa de Empleo, Proyectos y Skills
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Publica tus proyectos de edición, recibe valoraciones por estrellas para escalar al
            Top Ranking, valida tus skills técnicos y postúlate a vacantes con interview en vivo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-background px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Trophy className="size-3.5 text-warning" />
              Tu posición Top
            </p>
            <p className="mt-0.5 text-lg font-bold">
              {myCreator ? `#${myCreator.rank}` : "Sin rango"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {myCreator ? `${myCreator.ratingAvg} ★ (${myCreator.ratingCount})` : "Publica un reel"}
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Star className="size-3.5 text-primary" />
              Proyectos
            </p>
            <p className="mt-0.5 text-lg font-bold">{rankedProjects.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {myProjects.length} tuyos
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Briefcase className="size-3.5 text-primary" />
              Vacantes activas
            </p>
            <p className="mt-0.5 text-lg font-bold">{openJobsCount}</p>
            <p className="text-[11px] text-muted-foreground">
              {jobs.length} publicadas
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Award className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Skills validados
            </p>
            <p className="mt-0.5 text-lg font-bold">{myValidations.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {scheduledInterviewsCount} interviews
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/70 p-1 sm:w-fit">
          <TabsTrigger value="ranking" className="gap-1.5 px-3 py-1.5">
            <Trophy className="size-4" />
            Ranking y Proyectos ({rankedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="vacantes" className="gap-1.5 px-3 py-1.5">
            <Briefcase className="size-4" />
            Vacantes ({openJobsCount})
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5 px-3 py-1.5">
            <Award className="size-4" />
            Validación de Skills ({myValidations.length})
          </TabsTrigger>
          <TabsTrigger value="postulaciones" className="gap-1.5 px-3 py-1.5">
            <Video className="size-4" />
            Postulaciones e Interviews ({relevantApplicationsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <RankingAndProjectsTab
            projects={rankedProjects}
            creators={creatorRankings}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="vacantes">
          <JobsAndInterviewsTabs
            mode="vacantes"
            jobs={jobs}
            applications={applications}
            myProjects={myProjects}
            creators={creatorRankings}
            currentUserId={currentUserId}
            currentOrgId={currentOrgId}
            currentRole={currentRole}
          />
        </TabsContent>

        <TabsContent value="skills">
          <SkillValidationTab myValidations={myValidations} />
        </TabsContent>

        <TabsContent value="postulaciones">
          <JobsAndInterviewsTabs
            mode="postulaciones"
            jobs={jobs}
            applications={applications}
            myProjects={myProjects}
            creators={creatorRankings}
            currentUserId={currentUserId}
            currentOrgId={currentOrgId}
            currentRole={currentRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
