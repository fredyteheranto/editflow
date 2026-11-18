"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Mail,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInterviewEvaluationAction } from "@/lib/actions/bolsa";
import { SKILL_CATALOG } from "@/lib/bolsa/skills";
import type {
  ApplicationStatus,
  CreatorRankingRow,
  InterviewStatus,
  JobApplication,
  JobVacancy,
  RankedProject,
  SkillValidationBadge,
} from "@/lib/bolsa/types";

const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  programada: "Programada",
  en_vivo: "En vivo",
  finalizada: "Finalizada",
};

const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  postulado: "Postulado",
  entrevista: "En entrevista",
  aprobado: "Aprobado",
  rechazado: "No seleccionado",
};

export function InterviewRoomClient({
  application,
  job,
  candidateRanking,
  candidateBadges,
  attachedProjects,
  isInterviewer,
  viewerName,
}: {
  application: JobApplication;
  job: JobVacancy;
  candidateRanking: CreatorRankingRow | null;
  candidateBadges: SkillValidationBadge[];
  attachedProjects: RankedProject[];
  isInterviewer: boolean;
  viewerName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const interview = application.interview!;

  const [callMounted, setCallMounted] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>(interview.status);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(application.status);
  const [technicalScore, setTechnicalScore] = useState<number>(interview.technicalScore ?? 4);
  const [validatedSkills, setValidatedSkills] = useState<string[]>(
    interview.validatedSkills ?? [],
  );
  const [notes, setNotes] = useState<string>(interview.notes ?? "");

  const jitsiBaseUrl = `https://meet.jit.si/${encodeURIComponent(interview.roomSlug)}`;
  const jitsiEmbedUrl = `${jitsiBaseUrl}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(viewerName)}`;

  function toggleSkill(skill: string) {
    setValidatedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill],
    );
  }

  function handleSaveEvaluation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateInterviewEvaluationAction({
        applicationId: application.id,
        interviewStatus,
        applicationStatus,
        notes,
        technicalScore,
        validatedSkills,
      });

      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar la evaluación.");
        return;
      }

      toast.success("Evaluación guardada y skills validados actualizados.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
              <Link href="/app/bolsa">
                <ArrowLeft className="size-4" />
                Volver a Bolsa de Empleo
              </Link>
            </Button>
            <Badge variant="outline" className="gap-1">
              <Briefcase className="size-3" />
              {job.organizationName}
            </Badge>
            <Badge
              variant={interview.status === "en_vivo" ? "default" : "secondary"}
              className="gap-1"
            >
              <Video className="size-3" />
              {INTERVIEW_STATUS_LABEL[interview.status]}
            </Badge>
            <Badge variant="outline">{APPLICATION_STATUS_LABEL[application.status]}</Badge>
          </div>

          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Interview en Vivo · {job.title}
          </h1>

          <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              Programada:{" "}
              {new Date(interview.scheduledAt).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span>·</span>
            <span>Candidato: {application.applicantName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {interview.googleMeetUrl && (
            <Button asChild variant="outline" className="gap-1.5">
              <a
                href={interview.googleMeetUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-4" />
                Abrir Google Meet
              </a>
            </Button>
          )}

          <Button
            type="button"
            variant={callMounted ? "destructive" : "default"}
            className="gap-1.5"
            onClick={() => setCallMounted((prev) => !prev)}
          >
            {callMounted ? (
              <>
                <VideoOff className="size-4" />
                Salir de cámara en vivo
              </>
            ) : (
              <>
                <Video className="size-4" />
                Iniciar / Unirse a cámara en vivo
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Escenario de videollamada (izquierda) */}
        <div className="space-y-4 lg:col-span-7">
          {callMounted ? (
            <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
              <iframe
                src={jitsiEmbedUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="h-[520px] w-full border-0"
                title={`Sala de entrevista en vivo para ${job.title}`}
              />
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Video className="size-7" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="text-lg font-semibold">Sala de entrevista en vivo lista</h2>
                <p className="text-sm text-muted-foreground">
                  Conéctate con cámara y micrófono integrados desde EditFlow o abre el enlace en
                  Google Meet / ventana externa cuando ambas partes estén listas.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" onClick={() => setCallMounted(true)} className="gap-1.5">
                  <Video className="size-4" />
                  Iniciar / Unirse a cámara en vivo
                </Button>
                <Button asChild variant="outline" className="gap-1.5">
                  <a href={jitsiBaseUrl} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="size-4" />
                    Abrir sala externa
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Resumen de evaluación actual visible para ambos participantes */}
          {(interview.notes || interview.technicalScore || (interview.validatedSkills?.length ?? 0) > 0) && (
            <div className="space-y-3 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Resultado y Validación en Entrevista</h3>
                {typeof interview.technicalScore === "number" && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3.5 fill-warning text-warning" />
                    Prueba en vivo: {interview.technicalScore}/5
                  </Badge>
                )}
              </div>
              {interview.validatedSkills && interview.validatedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {interview.validatedSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="size-3" />
                      {skill} validado en vivo
                    </Badge>
                  ))}
                </div>
              )}
              {interview.notes && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {interview.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho: Candidato, Portfolio y Rúbrica de Validación */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{application.applicantName}</h2>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3.5" />
                  {application.applicantEmail}
                </p>
              </div>

              {candidateRanking ? (
                <Badge className="gap-1 bg-warning/15 text-warning hover:bg-warning/20">
                  <Trophy className="size-3.5" />
                  Top #{candidateRanking.rank} · {candidateRanking.ratingAvg} ★
                </Badge>
              ) : (
                <Badge variant="outline">Nuevo en ranking</Badge>
              )}
            </div>

            {application.coverMessage && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                {application.coverMessage}
              </div>
            )}

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Award className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Skills validados ({candidateBadges.length})
              </p>
              {candidateBadges.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no registra insignias de validación.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {candidateBadges.map((badge) => (
                    <Badge
                      key={badge.id}
                      variant="secondary"
                      className="gap-1 text-xs"
                    >
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                      {badge.skillLabel} ({badge.scorePct}%)
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Proyectos adjuntos ({attachedProjects.length})
              </p>
              {attachedProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No adjuntó reels específicos en la postulación.
                </p>
              ) : (
                <div className="space-y-2">
                  {attachedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-2 rounded-xl border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          #{project.rank} · {project.category} · {project.ratingAvg} ★ (
                          {project.ratingCount})
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
                        <a
                          href={project.videoUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <ExternalLink className="size-3.5" />
                          Ver
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isInterviewer && (
            <form onSubmit={handleSaveEvaluation} className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">
                    Evaluación y Validación Práctica
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Evalúa la prueba técnica en vivo y emite insignias verificadas de skill.
                  </p>
                </div>
                {applicationStatus === "aprobado" && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link href="/app/equipo">
                      <UserPlus className="size-3.5" />
                      Invitar a Equipo
                    </Link>
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="interview-status">Estado de la sala</Label>
                  <Select
                    value={interviewStatus}
                    onValueChange={(v) => setInterviewStatus(v as InterviewStatus)}
                  >
                    <SelectTrigger id="interview-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="en_vivo">En vivo</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="application-status">Decisión de postulación</Label>
                  <Select
                    value={applicationStatus}
                    onValueChange={(v) => setApplicationStatus(v as ApplicationStatus)}
                  >
                    <SelectTrigger id="application-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postulado">Postulado</SelectItem>
                      <SelectItem value="entrevista">En entrevista</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">No seleccionado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Calificación técnica en vivo ({technicalScore}/5 ★)</Label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTechnicalScore(score)}
                      className="rounded-lg border p-2 transition hover:bg-muted"
                      aria-label={`Calificar con ${score} estrellas`}
                    >
                      <Star
                        className={`size-5 ${
                          score <= technicalScore
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Validar skills prácticos en esta entrevista</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_CATALOG.map((skill) => {
                    const checked = validatedSkills.includes(skill);
                    return (
                      <label
                        key={skill}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSkill(skill)}
                        />
                        <span className="truncate">{skill}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interview-notes">Notas y feedback de entrevista</Label>
                <Textarea
                  id="interview-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre ritmo, retención, uso de proxies, color, comunicación y disponibilidad..."
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full gap-1.5">
                <CheckCircle2 className="size-4" />
                {isPending
                  ? "Guardando evaluación..."
                  : "Guardar evaluación y validar skills"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
