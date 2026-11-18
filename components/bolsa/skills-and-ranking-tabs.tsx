"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Medal,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Trophy,
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
  deleteProjectAction,
  publishProjectAction,
  rateProjectAction,
  submitSkillAssessmentAction,
} from "@/lib/actions/bolsa";
import { PROJECT_CATEGORIES, SKILL_CATALOG, SKILL_TRACKS, type SkillTrack } from "@/lib/bolsa/skills";
import type {
  CreatorRankingRow,
  RankedProject,
  SkillValidationBadge,
} from "@/lib/bolsa/types";

function renderStars(avg: number) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${avg} estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < Math.round(avg) ? "fill-warning text-warning" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

export function RankingAndProjectsTab({
  projects,
  creators,
  currentUserId,
}: {
  projects: RankedProject[];
  creators: CreatorRankingRow[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__todas__");

  const [publishOpen, setPublishOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState<string>(PROJECT_CATEGORIES[0]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Premiere Pro"]);

  const [ratingTarget, setRatingTarget] = useState<RankedProject | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (categoryFilter !== "__todas__" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [projects, search, categoryFilter]);

  const topThreeCreators = creators.slice(0, 3);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill].slice(0, 6),
    );
  }

  function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await publishProjectAction({
        title,
        description,
        videoUrl,
        category,
        skills: selectedSkills,
      });
      if (res.ok) {
        toast.success("Proyecto publicado en el portafolio y Ranking.");
        setPublishOpen(false);
        setTitle("");
        setDescription("");
        setVideoUrl("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleRate(e: React.FormEvent) {
    e.preventDefault();
    if (!ratingTarget) return;
    startTransition(async () => {
      const res = await rateProjectAction({
        projectId: ratingTarget.id,
        stars,
        comment,
      });
      if (res.ok) {
        toast.success("Valoración registrada — Ranking actualizado.");
        setRatingTarget(null);
        setComment("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar proyecto, creador o skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todas__">Todas las categorías</SelectItem>
              {PROJECT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setPublishOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Publicar proyecto
        </Button>
      </div>

      {/* Podio Top Ranking de Creadores */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-warning" />
            <h2 className="text-base font-semibold">Top Ranking por Estrellas y Skills Validados</h2>
          </div>
          <span className="text-xs text-muted-foreground">{creators.length} talento(s) en ranking</span>
        </div>

        {topThreeCreators.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay creadores en el Top. Publica tu primer proyecto o valida un skill para estrenar el podio.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {topThreeCreators.map((c) => (
              <div
                key={c.userId}
                className={`rounded-xl border p-4 ${
                  c.rank === 1 ? "border-warning/50 bg-warning/5" : "bg-background/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={c.rank === 1 ? "default" : "secondary"} className="gap-1">
                    <Medal className="size-3" /> Top #{c.rank}
                  </Badge>
                  <span className="font-mono text-xs font-semibold text-primary">
                    Score {c.rankingScore}
                  </span>
                </div>
                <p className="mt-2 truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.organizationName}</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {renderStars(c.ratingAvg)}
                  <span className="font-semibold tabular-nums">{c.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted-foreground">({c.ratingCount} votos)</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {c.projectCount} proyecto(s)
                  </Badge>
                  {c.badges.slice(0, 2).map((b) => (
                    <Badge key={b.id} variant="secondary" className="gap-1 text-[10px]">
                      <CheckCircle2 className="size-2.5 text-success" />
                      {b.skillLabel}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proyectos publicados */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary/70" />
          <p className="mt-2 font-medium">Aún no hay proyectos en esta vista</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube tu reel o edición destacada para recibir estrellas de otros equipos y subir en el Top.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const isMine = project.authorUserId === currentUserId;
            return (
              <div key={project.id} className="flex flex-col rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={project.rank <= 3 ? "default" : "outline"}>
                      #{project.rank} Top
                    </Badge>
                    <Badge variant="secondary">{project.category}</Badge>
                  </div>
                  {isMine && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await deleteProjectAction(project.id);
                          if (r.ok) toast.success("Proyecto eliminado");
                          else toast.error(r.error);
                        })
                      }
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <h3 className="mt-3 font-semibold">{project.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Por <strong className="text-foreground">{project.authorName}</strong> ·{" "}
                  {project.organizationName}
                </p>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {project.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {project.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                  {project.authorBadges.slice(0, 2).map((b) => (
                    <Badge key={b.id} variant="secondary" className="gap-1 text-[10px]">
                      <Award className="size-2.5 text-success" />
                      {b.skillLabel}
                    </Badge>
                  ))}
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t mt-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    {renderStars(project.ratingAvg)}
                    <span className="font-semibold tabular-nums">
                      {project.ratingCount > 0 ? project.ratingAvg.toFixed(1) : "—"}
                    </span>
                    <span className="text-muted-foreground">({project.ratingCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button asChild size="xs" variant="outline" className="gap-1">
                      <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                        Ver reel
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                    {!isMine && (
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => {
                          const myPrev = project.ratings.find((r) => r.userId === currentUserId);
                          setStars(myPrev?.stars ?? 5);
                          setComment(myPrev?.comment ?? "");
                          setRatingTarget(project);
                        }}
                      >
                        Valorar ★
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Publicar Proyecto */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar proyecto en tu portafolio</DialogTitle>
            <DialogDescription>
              Comparte un reel o video editado para recibir estrellas y escalar en el Top Ranking.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublish} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título del proyecto *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Reel dinámico de alto impacto para marca fitness"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Enlace del video / reel *</Label>
                <Input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/... o Drive / Vimeo"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción y enfoque técnico *</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué técnica aplicaste (ritmo, color, motion graphics, sound design)..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skills aplicados (máx. 6)</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {SKILL_CATALOG.map((skill) => (
                  <label key={skill} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={selectedSkills.includes(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPublishOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Publicando…" : "Publicar proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Valorar Proyecto */}
      <Dialog open={Boolean(ratingTarget)} onOpenChange={(o) => !o && setRatingTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Valorar proyecto</DialogTitle>
            <DialogDescription>{ratingTarget?.title}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRate} className="space-y-4">
            <div className="space-y-2">
              <Label>Calificación en estrellas</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStars(value)}
                    className="rounded-md p-1 hover:bg-muted"
                    aria-label={`${value} estrellas`}
                  >
                    <Star
                      className={`size-6 ${
                        value <= stars ? "fill-warning text-warning" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-1 text-sm font-semibold">{stars}/5</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reseña corta (opcional)</Label>
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Excelente ritmo, mezcla limpia y buen hook..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRatingTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Guardar valoración
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SkillValidationTab({
  myValidations,
}: {
  myValidations: SkillValidationBadge[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTrack, setActiveTrack] = useState<SkillTrack | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  function openAssessment(track: SkillTrack) {
    setActiveTrack(track);
    setAnswers(new Array(track.questions.length).fill(-1));
  }

  function submitAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTrack) return;
    if (answers.some((a) => a < 0)) {
      toast.error("Responde todas las preguntas antes de enviar.");
      return;
    }

    startTransition(async () => {
      const res = await submitSkillAssessmentAction({
        skillId: activeTrack.id,
        answers,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.passed) {
        toast.success(`¡Skill validado: ${res.skillLabel} (${res.scorePct}%)!`);
        setActiveTrack(null);
      } else {
        toast.warning(`Obtuviste ${res.scorePct}%. Necesitas ${activeTrack.passingScorePct}% para aprobar; ¡intenta de nuevo!`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-success" />
          <h2 className="text-base font-semibold">Tus insignias de Skills Validados</h2>
        </div>
        {myValidations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes skills validados. Presenta las evaluaciones abajo o recibe validación en una Interview en vivo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myValidations.map((b) => (
              <Badge key={b.id} variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                <CheckCircle2 className="size-3.5 text-success" />
                <span>{b.skillLabel}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {b.scorePct}% · {b.method === "entrevista" ? "Interview en vivo" : "Evaluación"}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SKILL_TRACKS.map((track) => {
          const earned = myValidations.find((v) => v.skillId === track.id);
          return (
            <div key={track.id} className="flex flex-col justify-between rounded-xl border bg-card p-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{track.tools}</Badge>
                  {earned && (
                    <Badge className="gap-1 bg-success/15 text-success">
                      <CheckCircle2 className="size-3" /> Validado ({earned.scorePct}%)
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{track.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{track.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>
                  {track.questions.length} preguntas · Apruebas con {track.passingScorePct}%
                </span>
                <Button size="sm" variant={earned ? "outline" : "default"} onClick={() => openAssessment(track)}>
                  {earned ? "Repetir evaluación" : "Validar skill"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(activeTrack)} onOpenChange={(o) => !o && setActiveTrack(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Validación técnica: {activeTrack?.label}</DialogTitle>
            <DialogDescription>
              Responde correctamente al menos {activeTrack?.passingScorePct}% para obtener tu insignia oficial.
            </DialogDescription>
          </DialogHeader>

          {activeTrack && (
            <form onSubmit={submitAssessment} className="space-y-5">
              {activeTrack.questions.map((q, qIdx) => (
                <div key={q.id} className="space-y-2 rounded-lg border p-3.5">
                  <p className="text-sm font-medium">
                    {qIdx + 1}. {q.prompt}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-xs hover:bg-muted/50"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[qIdx] === optIdx}
                          onChange={() =>
                            setAnswers((prev) => prev.map((v, i) => (i === qIdx ? optIdx : v)))
                          }
                          className="mt-0.5 accent-primary"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setActiveTrack(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Evaluando…" : "Enviar respuestas"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
