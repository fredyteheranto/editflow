"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Plus,
  Star,
  Trophy,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyToJobAction,
  publishJobAction,
  scheduleLiveInterviewAction,
  toggleJobStatusAction,
} from "@/lib/actions/bolsa";
import { SKILL_CATALOG } from "@/lib/bolsa/skills";
import type {
  CreatorRankingRow,
  JobApplication,
  JobEmploymentType,
  JobModality,
  JobVacancy,
  RankedProject,
} from "@/lib/bolsa/types";

const MODALITY_LABEL: Record<JobModality, string> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
};

const TYPE_LABEL: Record<JobEmploymentType, string> = {
  freelance: "Freelance",
  tiempo_completo: "Tiempo completo",
  por_proyecto: "Por proyecto",
};

export function JobsAndInterviewsTabs({
  mode,
  jobs,
  applications,
  myProjects,
  creators,
  currentUserId,
  currentOrgId,
  currentRole,
}: {
  mode: "vacantes" | "postulaciones";
  jobs: JobVacancy[];
  applications: JobApplication[];
  myProjects: RankedProject[];
  creators: CreatorRankingRow[];
  currentUserId: string;
  currentOrgId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const creatorMap = new Map(creators.map((c) => [c.userId, c]));
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  // Crear vacante
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modality, setModality] = useState<JobModality>("remoto");
  const [employmentType, setEmploymentType] = useState<JobEmploymentType>("freelance");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(["Premiere Pro"]);

  // Postularme
  const [applyingJob, setApplyingJob] = useState<JobVacancy | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [attachedIds, setAttachedIds] = useState<string[]>([]);

  // Agendar entrevista
  const [interviewApp, setInterviewApp] = useState<JobApplication | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });

  function toggleRequiredSkill(skill: string) {
    setRequiredSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill].slice(0, 6),
    );
  }

  function handlePublishJob(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await publishJobAction({
        title,
        description,
        modality,
        employmentType,
        budgetLabel,
        requiredSkills,
        minRating: Number(minRating) || 0,
      });
      if (res.ok) {
        toast.success("Vacante publicada.");
        setNewJobOpen(false);
        setTitle("");
        setDescription("");
        setBudgetLabel("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!applyingJob) return;
    startTransition(async () => {
      const res = await applyToJobAction({
        jobId: applyingJob.id,
        coverMessage,
        attachedProjectIds: attachedIds,
      });
      if (res.ok) {
        toast.success("Postulación enviada con tu ranking y portafolio.");
        setApplyingJob(null);
        setCoverMessage("");
        setAttachedIds([]);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewApp) return;
    startTransition(async () => {
      const iso = scheduledLocal ? new Date(scheduledLocal).toISOString() : new Date().toISOString();
      const res = await scheduleLiveInterviewAction({
        applicationId: interviewApp.id,
        scheduledAt: iso,
      });
      if (res.ok) {
        toast.success("Interview en vivo programada. Redirigiendo a la sala…");
        setInterviewApp(null);
        router.push(res.interviewUrl);
      } else {
        toast.error(res.error);
      }
    });
  }

  if (mode === "postulaciones") {
    const myApps = applications.filter((a) => a.applicantUserId === currentUserId);
    const managedApps = applications.filter((a) => {
      const j = jobMap.get(a.jobId);
      if (!j) return false;
      return (
        j.publisherUserId === currentUserId ||
        (j.organizationId === currentOrgId && (currentRole === "owner" || currentRole === "admin"))
      );
    });

    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-base font-semibold">Mis postulaciones y entrevistas ({myApps.length})</h2>
          {myApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no te has postulado a ninguna vacante. Explora las oportunidades abiertas en la pestaña Vacantes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {myApps.map((app) => {
                const job = jobMap.get(app.jobId);
                return (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5"
                  >
                    <div>
                      <p className="font-medium">{job?.title ?? "Vacante"}</p>
                      <p className="text-xs text-muted-foreground">
                        {job?.organizationName} · Estado:{" "}
                        <strong className="capitalize text-foreground">{app.status}</strong>
                      </p>
                    </div>
                    {app.interview && (
                      <Button asChild size="sm" className="gap-1.5">
                        <Link href={`/app/bolsa/entrevista/${app.id}`}>
                          <Video className="size-4" />
                          Entrar a Interview en vivo
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {managedApps.length > 0 && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold">
              Candidatos a tus vacantes ({managedApps.length})
            </h2>
            <div className="space-y-3">
              {managedApps.map((app) => {
                const job = jobMap.get(app.jobId);
                const stats = creatorMap.get(app.applicantUserId);
                return (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{app.applicantName}</span>
                        {stats && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Trophy className="size-3 text-warning" /> Top #{stats.rank} · ★{" "}
                            {stats.ratingAvg.toFixed(1)}
                          </Badge>
                        )}
                        {stats && stats.validatedSkillCount > 0 && (
                          <Badge variant="outline" className="gap-1 text-xs text-success">
                            <Award className="size-3" /> {stats.validatedSkillCount} skill(s) validados
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Para: <strong className="text-foreground">{job?.title}</strong> · &ldquo;{app.coverMessage}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.interview ? (
                        <Button asChild size="sm" className="gap-1.5">
                          <Link href={`/app/bolsa/entrevista/${app.id}`}>
                            <Video className="size-4" />
                            Abrir Interview en vivo
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setInterviewApp(app)}>
                          <CalendarClock className="size-4" />
                          Programar / Iniciar Interview
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <InterviewModal
          interviewApp={interviewApp}
          setInterviewApp={setInterviewApp}
          scheduledLocal={scheduledLocal}
          setScheduledLocal={setScheduledLocal}
          onSubmit={handleScheduleInterview}
          isPending={isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Oportunidades publicadas por productoras y agencias. Tu Top Ranking y Skills Validados destacan tu perfil.
        </p>
        <Button onClick={() => setNewJobOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Publicar vacante
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Briefcase className="mx-auto size-8 text-primary/70" />
          <p className="mt-2 font-medium">Aún no hay vacantes publicadas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Publica la primera oportunidad laboral o freelance para recibir candidatos con skills validados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const jobApps = applications
              .filter((a) => a.jobId === job.id)
              .sort((a, b) => {
                const ra = creatorMap.get(a.applicantUserId)?.rankingScore ?? 0;
                const rb = creatorMap.get(b.applicantUserId)?.rankingScore ?? 0;
                return rb - ra;
              });
            const canManageJob =
              job.publisherUserId === currentUserId ||
              (job.organizationId === currentOrgId &&
                (currentRole === "owner" || currentRole === "admin"));
            const alreadyApplied = jobApps.some((a) => a.applicantUserId === currentUserId);

            return (
              <div key={job.id} className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{job.title}</h3>
                      <Badge variant={job.status === "abierta" ? "default" : "secondary"}>
                        {job.status === "abierta" ? "Abierta" : "Cerrada"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {job.organizationName} ·{" "}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {MODALITY_LABEL[job.modality]}
                      </span>{" "}
                      · {TYPE_LABEL[job.employmentType]} · <strong className="text-foreground">{job.budgetLabel}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageJob && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await toggleJobStatusAction(job.id);
                            if (!r.ok) toast.error(r.error);
                          })
                        }
                      >
                        {job.status === "abierta" ? "Cerrar vacante" : "Reabrir"}
                      </Button>
                    )}
                    {job.status === "abierta" && !alreadyApplied && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setAttachedIds(myProjects.slice(0, 2).map((p) => p.id));
                          setApplyingJob(job);
                        }}
                      >
                        Postularme
                      </Button>
                    )}
                    {alreadyApplied && (
                      <Badge variant="outline" className="gap-1 text-success">
                        <CheckCircle2 className="size-3" /> Postulado
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{job.description}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  {job.requiredSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                  {job.minRating > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Star className="size-3 fill-warning text-warning" /> Mín. {job.minRating}★
                    </Badge>
                  )}
                </div>

                {canManageJob && jobApps.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Candidatos ordenados por Ranking ({jobApps.length})
                    </p>
                    {jobApps.map((app) => {
                      const stats = creatorMap.get(app.applicantUserId);
                      return (
                        <div
                          key={app.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/40 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{app.applicantName}</span>
                            {stats && (
                              <Badge variant="outline" className="text-[10px]">
                                Top #{stats.rank} · ★ {stats.ratingAvg.toFixed(1)} ·{" "}
                                {stats.validatedSkillCount} skills
                              </Badge>
                            )}
                            <span className="text-muted-foreground truncate max-w-xs">
                              &ldquo;{app.coverMessage}&rdquo;
                            </span>
                          </div>
                          {app.interview ? (
                            <Button asChild size="xs" className="gap-1">
                              <Link href={`/app/bolsa/entrevista/${app.id}`}>
                                <Video className="size-3" />
                                Ir a Interview en vivo
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setInterviewApp(app)}
                            >
                              <Video className="size-3" />
                              Interview en vivo
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Publicar Vacante */}
      <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar vacante u oportunidad</DialogTitle>
            <DialogDescription>
              Recibe editores y estrategas con proyectos valorados y skills validados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishJob} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título de la vacante *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Editor Senior de Reels y YouTube Shorts"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Modalidad</Label>
                <Select value={modality} onValueChange={(v) => setModality(v as JobModality)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contrato</Label>
                <Select
                  value={employmentType}
                  onValueChange={(v) => setEmploymentType(v as JobEmploymentType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="tiempo_completo">Tiempo completo</SelectItem>
                    <SelectItem value="por_proyecto">Por proyecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estrellas mín.</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Cualquiera</SelectItem>
                    <SelectItem value="3">3+ estrellas</SelectItem>
                    <SelectItem value="4">4+ estrellas</SelectItem>
                    <SelectItem value="4.5">4.5+ estrellas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Presupuesto / compensación</Label>
              <Input
                value={budgetLabel}
                onChange={(e) => setBudgetLabel(e.target.value)}
                placeholder="Ej. USD $600/mes o $25 por reel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción y entregables esperados *</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Volumen semanal, estilo visual, herramientas requeridas..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skills requeridos</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {SKILL_CATALOG.map((skill) => (
                  <label key={skill} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={requiredSkills.includes(skill)}
                      onCheckedChange={() => toggleRequiredSkill(skill)}
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewJobOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Publicando…" : "Publicar vacante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Postularme */}
      <Dialog open={Boolean(applyingJob)} onOpenChange={(o) => !o && setApplyingJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Postularme a: {applyingJob?.title}</DialogTitle>
            <DialogDescription>{applyingJob?.organizationName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mensaje para el equipo seleccionador *</Label>
              <Textarea
                rows={3}
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                placeholder="Cuéntales tu experiencia y disponibilidad..."
                required
              />
            </div>
            {myProjects.length > 0 && (
              <div className="space-y-1.5">
                <Label>Adjuntar proyectos de tu portafolio</Label>
                <div className="space-y-1.5">
                  {myProjects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={attachedIds.includes(p.id)}
                        onCheckedChange={() =>
                          setAttachedIds((prev) =>
                            prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                          )
                        }
                      />
                      <span>
                        #{p.rank} · {p.title} ({p.ratingAvg.toFixed(1)}★)
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApplyingJob(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Enviar postulación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InterviewModal
        interviewApp={interviewApp}
        setInterviewApp={setInterviewApp}
        scheduledLocal={scheduledLocal}
        setScheduledLocal={setScheduledLocal}
        onSubmit={handleScheduleInterview}
        isPending={isPending}
      />
    </div>
  );
}

function InterviewModal({
  interviewApp,
  setInterviewApp,
  scheduledLocal,
  setScheduledLocal,
  onSubmit,
  isPending,
}: {
  interviewApp: JobApplication | null;
  setInterviewApp: (app: JobApplication | null) => void;
  scheduledLocal: string;
  setScheduledLocal: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={Boolean(interviewApp)} onOpenChange={(o) => !o && setInterviewApp(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Programar Interview en vivo</DialogTitle>
          <DialogDescription>
            Se creará la sala en vivo (y Google Meet si tienes Google conectado) y avisaremos a{" "}
            <strong>{interviewApp?.applicantName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInterviewApp(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              <Video className="size-4" />
              {isPending ? "Creando sala…" : "Crear y abrir sala"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
