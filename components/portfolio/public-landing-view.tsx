"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PortfolioTheme, ResolvedPublicPortfolio } from "@/lib/portfolio/types";

const THEME_ACCENT: Record<
  PortfolioTheme,
  { glow: string; pill: string; ring: string }
> = {
  violet: {
    glow: "from-violet-600/20 via-primary/10 to-transparent",
    pill: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    ring: "ring-violet-500/30",
  },
  emerald: {
    glow: "from-emerald-500/20 via-teal-500/10 to-transparent",
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
  },
  amber: {
    glow: "from-amber-500/20 via-orange-500/10 to-transparent",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    ring: "ring-amber-500/30",
  },
  cyan: {
    glow: "from-cyan-500/20 via-sky-500/10 to-transparent",
    pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    ring: "ring-cyan-500/30",
  },
  rose: {
    glow: "from-rose-500/20 via-pink-500/10 to-transparent",
    pill: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    ring: "ring-rose-500/30",
  },
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "EF"
  );
}

function buildWhatsappUrl(rawNumber?: string, prefillText?: string): string | null {
  const digits = (rawNumber ?? "").replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  const text = prefillText ? `?text=${encodeURIComponent(prefillText)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function PublicLandingView({
  resolved,
}: {
  resolved: ResolvedPublicPortfolio;
}) {
  const { profile, projects, creatorRanking, badges, openJobs } = resolved;
  const theme = THEME_ACCENT[profile.theme] ?? THEME_ACCENT.violet;

  const waDirect = buildWhatsappUrl(
    profile.whatsappNumber,
    `Hola ${profile.displayName}, vi tu portafolio en EditFlow y me interesa trabajar contigo.`,
  );
  const primaryContactHref =
    profile.ctaUrl ||
    waDirect ||
    (profile.contactEmail ? `mailto:${profile.contactEmail}` : null);

  const socialItems = [
    { key: "instagram", label: "Instagram", href: profile.socialLinks.instagram },
    { key: "tiktok", label: "TikTok", href: profile.socialLinks.tiktok },
    { key: "youtube", label: "YouTube", href: profile.socialLinks.youtube },
    { key: "linkedin", label: "LinkedIn", href: profile.socialLinks.linkedin },
    { key: "x", label: "X / Twitter", href: profile.socialLinks.x },
    { key: "website", label: "Sitio Web", href: profile.socialLinks.website },
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item.href));

  const uniqueBadges = Array.from(
    new Map(badges.map((b) => [b.skillLabel, b])).values(),
  );

  async function handleShare() {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.displayName,
          text: profile.headline,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback a copiar al portapapeles.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace del portafolio copiado para compartir en redes");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`relative overflow-hidden border-b bg-gradient-to-b ${theme.glow}`}>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className={`size-20 shrink-0 rounded-2xl object-cover ring-2 sm:size-24 ${theme.ring}`}
                />
              ) : (
                <div
                  className={`flex size-20 shrink-0 items-center justify-center rounded-2xl bg-card text-2xl font-bold ring-2 sm:size-24 ${theme.ring}`}
                >
                  {initials(profile.displayName)}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`gap-1 ${theme.pill}`}>
                    {profile.kind === "agency" ? (
                      <>
                        <Building2 className="size-3.5" />
                        Agencia Audiovisual
                      </>
                    ) : (
                      <>
                        <User className="size-3.5" />
                        Creador & Editor
                      </>
                    )}
                  </Badge>
                  {profile.availabilityLabel && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="size-3 text-emerald-500" />
                      {profile.availabilityLabel}
                    </Badge>
                  )}
                  {creatorRanking && (
                    <Badge className="gap-1 bg-warning/15 text-warning hover:bg-warning/20">
                      <Trophy className="size-3.5" />
                      Top #{creatorRanking.rank} · {creatorRanking.ratingAvg} ★
                    </Badge>
                  )}
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {profile.displayName}
                  </h1>
                  <p className="mt-1 text-base font-medium text-muted-foreground sm:text-lg">
                    {profile.headline}
                  </p>
                </div>

                {profile.location && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {profile.location}
                  </p>
                )}

                <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>

                {socialItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {socialItems.map((s) => (
                      <Button key={s.key} asChild size="xs" variant="outline" className="gap-1">
                        <a href={s.href} target="_blank" rel="noopener noreferrer">
                          <Globe className="size-3" />
                          {s.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
              {primaryContactHref && (
                <Button asChild size="lg" className="gap-2">
                  <a href={primaryContactHref} target="_blank" rel="noopener noreferrer">
                    {waDirect && !profile.ctaUrl ? (
                      <MessageCircle className="size-4" />
                    ) : (
                      <ExternalLink className="size-4" />
                    )}
                    {profile.ctaLabel}
                  </a>
                </Button>
              )}
              {profile.contactEmail && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={`mailto:${profile.contactEmail}`}>
                    <Mail className="size-3.5" />
                    {profile.contactEmail}
                  </a>
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
                <Share2 className="size-3.5" />
                Compartir link
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
        {/* Skills verificados */}
        {uniqueBadges.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-emerald-500" />
              <h2 className="text-lg font-semibold">Skills Validados en EditFlow</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueBadges.map((b) => (
                <Badge key={b.id} variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  {b.skillLabel} ({b.scorePct}%)
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Portafolio de Proyectos / Reels */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Portafolio de Proyectos y Reels</h2>
              <p className="text-xs text-muted-foreground">
                Trabajos destacados y piezas evaluadas dentro de EditFlow.
              </p>
            </div>
            <Badge variant="outline">
              {projects.length + profile.customProjects.length} piezas
            </Badge>
          </div>

          {projects.length === 0 && profile.customProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              Este espacio todavía está preparando sus primeros reels públicos.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.customProjects.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5"
                >
                  <div className="space-y-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                    <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="size-3.5" />
                      Ver proyecto
                    </a>
                  </Button>
                </div>
              ))}

              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{p.category}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <Star className="size-3.5 fill-warning" />
                        {p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : "Nuevo"} ({p.ratingCount})
                      </span>
                    </div>
                    <h3 className="text-base font-semibold">{p.title}</h3>
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                    {p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.skills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                    <a href={p.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="size-3.5" />
                      Ver reel / video
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Servicios / Paquetes */}
        {profile.services.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Servicios y Paquetes</h2>
              <p className="text-xs text-muted-foreground">
                Elige el formato o servicio que necesita tu marca o canal.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.services.map((srv) => {
                const srvWa = buildWhatsappUrl(
                  profile.whatsappNumber,
                  `Hola ${profile.displayName}, me interesa cotizar tu servicio: ${srv.title}`,
                );
                const srvHref =
                  srvWa ||
                  profile.ctaUrl ||
                  (profile.contactEmail
                    ? `mailto:${profile.contactEmail}?subject=${encodeURIComponent(`Consulta: ${srv.title}`)}`
                    : null);
                return (
                  <div
                    key={srv.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5"
                  >
                    <div className="space-y-2">
                      {srv.priceLabel && (
                        <Badge variant="outline" className={theme.pill}>
                          {srv.priceLabel}
                        </Badge>
                      )}
                      <h3 className="text-base font-semibold">{srv.title}</h3>
                      {srv.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {srv.description}
                        </p>
                      )}
                    </div>
                    {srvHref && (
                      <Button asChild size="sm" className="w-full gap-1.5">
                        <a href={srvHref} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          Solicitar información
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Vacantes abiertas de la agencia */}
        {openJobs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Briefcase className="size-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Vacantes Abiertas en nuestro Equipo</h2>
                  <p className="text-xs text-muted-foreground">
                    Postúlate desde EditFlow y participa en interviews en vivo.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/bolsa">Ver en Bolsa de Empleo</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {openJobs.map((job) => (
                <div key={job.id} className="space-y-3 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{job.title}</h3>
                    <Badge variant="secondary">{job.budgetLabel}</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{job.description}</p>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link href="/app/bolsa">Postularme</Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t bg-card/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>
            Portafolio público alojado en <strong className="text-foreground">EditFlow</strong>
          </span>
          <Button asChild size="xs" variant="outline" className="gap-1.5">
            <Link href="/crear-espacio">
              <Zap className="size-3 text-primary" />
              Crea tu propio portafolio gratis
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
