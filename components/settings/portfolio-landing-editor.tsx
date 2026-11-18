"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  ExternalLink,
  Globe,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { savePublicPortfolioAction } from "@/lib/actions/portfolio";
import type {
  PortfolioServiceItem,
  PortfolioShowcaseItem,
  PortfolioTheme,
  PublicPortfolioProfile,
} from "@/lib/portfolio/types";

const THEME_LABELS: { value: PortfolioTheme; label: string }[] = [
  { value: "violet", label: "Violeta EditFlow" },
  { value: "cyan", label: "Cian Estudio" },
  { value: "emerald", label: "Esmeralda Pro" },
  { value: "amber", label: "Ámbar Dorado" },
  { value: "rose", label: "Rosa Creativo" },
];

function SinglePortfolioForm({
  initial,
  baseUrl,
}: {
  initial: PublicPortfolioProfile;
  baseUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial.slug);
  const [published, setPublished] = useState(initial.published);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [location, setLocation] = useState(initial.location ?? "");
  const [availabilityLabel, setAvailabilityLabel] = useState(initial.availabilityLabel ?? "");
  const [theme, setTheme] = useState<PortfolioTheme>(initial.theme);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(initial.ctaUrl ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [socialLinks, setSocialLinks] = useState(initial.socialLinks);
  const [services, setServices] = useState<PortfolioServiceItem[]>(initial.services);
  const [customProjects, setCustomProjects] = useState<PortfolioShowcaseItem[]>(
    initial.customProjects,
  );

  const normalizedPreviewSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const publicPath = `/p/${normalizedPreviewSlug || initial.slug}`;
  const fullPublicUrl = `${baseUrl.replace(/\/$/, "")}${publicPath}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullPublicUrl);
      toast.success("Enlace público copiado para tus redes sociales");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePublicPortfolioAction({
        kind: initial.kind,
        slug,
        published,
        displayName,
        headline,
        bio,
        location,
        availabilityLabel,
        theme,
        ctaLabel,
        ctaUrl,
        whatsappNumber,
        contactEmail,
        socialLinks,
        services,
        customProjects,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      setSlug(res.slug);
      toast.success("Landing pública guardada y lista para compartir en redes");
      router.refresh();
    });
  }

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Mira nuestro portafolio en EditFlow: ${fullPublicUrl}`,
  )}`;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Barra de publicación y link rápido para redes */}
      <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={published ? "default" : "secondary"}>
              {published ? "Pública activa" : "Oculta (borrador)"}
            </Badge>
            <span className="truncate font-mono text-xs text-primary">{fullPublicUrl}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Pega este enlace en tu biografía de Instagram, TikTok, YouTube o LinkedIn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={copyLink} className="gap-1.5">
            <Copy className="size-3.5" />
            Copiar link
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={whatsappShare} target="_blank" rel="noopener noreferrer">
              <Share2 className="size-3.5" />
              Compartir
            </a>
          </Button>
          {published && (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={publicPath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Ver landing
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Visibilidad, slug y tema */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5">
          <div>
            <Label className="text-xs">Visible públicamente</Label>
            <p className="text-[11px] text-muted-foreground">Cualquiera con el link la ve</p>
          </div>
          <Switch checked={published} onCheckedChange={setPublished} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`slug-${initial.kind}`}>Enlace personalizado (/p/...)</Label>
          <Input
            id={`slug-${initial.kind}`}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="mi-estudio"
            className="font-mono text-xs"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Color del tema</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as PortfolioTheme)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_LABELS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Identidad principal */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nombre visible / Estudio *</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Titular corto</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Agencia de contenido vertical & YouTube"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Etiqueta de disponibilidad</Label>
          <Input
            value={availabilityLabel}
            onChange={(e) => setAvailabilityLabel(e.target.value)}
            placeholder="Disponible para proyectos"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ubicación / Zona</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Colombia · Remoto global"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Presentación / Propuesta de valor</Label>
          <Textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuéntale a clientes y marcas qué haces mejor, tus resultados o tu estilo de edición..."
          />
        </div>
      </div>

      {/* Contacto y CTA */}
      <div className="space-y-3 rounded-xl border bg-background/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Botón principal de contacto y WhatsApp
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Texto del botón</Label>
            <Input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Solicitar cotización"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">WhatsApp (con código país)</Label>
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+573001234567"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Correo de contacto</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hola@agencia.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Enlace CTA personalizado (opcional)</Label>
            <Input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://cal.com/tu-agencia"
            />
          </div>
        </div>
      </div>

      {/* Redes sociales */}
      <div className="space-y-3 rounded-xl border bg-background/60 p-4">
        <div className="flex items-center gap-1.5">
          <Globe className="size-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Redes sociales mostradas en tu landing
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["instagram", "Instagram", "https://instagram.com/tuusuario"],
              ["tiktok", "TikTok", "https://tiktok.com/@tuusuario"],
              ["youtube", "YouTube", "https://youtube.com/@tucanal"],
              ["linkedin", "LinkedIn", "https://linkedin.com/in/tuperfil"],
              ["x", "X / Twitter", "https://x.com/tuusuario"],
              ["website", "Sitio Web", "https://tusitio.com"],
            ] as const
          ).map(([key, label, ph]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={socialLinks[key] ?? ""}
                onChange={(e) =>
                  setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={ph}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Servicios */}
      <div className="space-y-3 rounded-xl border bg-background/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Servicios o Paquetes ({services.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Se muestran como tarjetas cotizables directo hacia tu WhatsApp o correo.
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              setServices((prev) => [
                ...prev,
                { id: crypto.randomUUID(), title: "", description: "", priceLabel: "" },
              ])
            }
            className="gap-1"
          >
            <Plus className="size-3" />
            Agregar servicio
          </Button>
        </div>

        <div className="space-y-2.5">
          {services.map((srv, idx) => (
            <div key={srv.id} className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-12">
              <Input
                className="sm:col-span-4"
                value={srv.title}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)),
                  )
                }
                placeholder="Ej. Plan 15 Reels Mensuales"
              />
              <Input
                className="sm:col-span-3"
                value={srv.priceLabel ?? ""}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, priceLabel: e.target.value } : s)),
                  )
                }
                placeholder="Desde $250 USD"
              />
              <Input
                className="sm:col-span-4"
                value={srv.description}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, description: e.target.value } : s)),
                  )
                }
                placeholder="Breve descripción del entregable"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-danger sm:col-span-1"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Proyectos destacados adicionales */}
      <div className="space-y-3 rounded-xl border bg-background/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reels / Proyectos Extra ({customProjects.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Los proyectos que publiques en Bolsa de Empleo ya aparecen aquí automáticamente.
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              setCustomProjects((prev) => [
                ...prev,
                { id: crypto.randomUUID(), title: "", category: "Reels / Shorts", videoUrl: "" },
              ])
            }
            className="gap-1"
          >
            <Plus className="size-3" />
            Agregar reel
          </Button>
        </div>

        <div className="space-y-2.5">
          {customProjects.map((proj, idx) => (
            <div key={proj.id} className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-12">
              <Input
                className="sm:col-span-4"
                value={proj.title}
                onChange={(e) =>
                  setCustomProjects((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)),
                  )
                }
                placeholder="Título del proyecto"
              />
              <Input
                className="sm:col-span-3"
                value={proj.category}
                onChange={(e) =>
                  setCustomProjects((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, category: e.target.value } : p)),
                  )
                }
                placeholder="Reels / Comercial"
              />
              <Input
                className="sm:col-span-4"
                value={proj.videoUrl}
                onChange={(e) =>
                  setCustomProjects((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, videoUrl: e.target.value } : p)),
                  )
                }
                placeholder="https://drive.google.com/... o YouTube/Vimeo"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setCustomProjects((prev) => prev.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-danger sm:col-span-1"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        <Save className="size-4" />
        {isPending ? "Guardando landing pública…" : "Guardar y actualizar landing pública"}
      </Button>
    </form>
  );
}

export function PortfolioLandingEditor({
  agencyPortfolio,
  creatorPortfolio,
  appBaseUrl,
}: {
  agencyPortfolio: PublicPortfolioProfile | null;
  creatorPortfolio: PublicPortfolioProfile;
  appBaseUrl: string;
}) {
  return (
    <div id="landing-publica" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-semibold">
              Espacio Público, Landing y Portafolio para Redes
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cada agencia y creador tiene su propia página pública (/p/tu-enlace) lista para poner en
            Instagram, TikTok, YouTube o WhatsApp con portafolio, servicios y contacto directo.
          </p>
        </div>
      </div>

      {agencyPortfolio ? (
        <Tabs defaultValue="agency" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agency" className="gap-1.5">
              <Building2 className="size-4" />
              Landing de la Agencia
            </TabsTrigger>
            <TabsTrigger value="creator" className="gap-1.5">
              <User className="size-4" />
              Mi Landing Personal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agency">
            <SinglePortfolioForm initial={agencyPortfolio} baseUrl={appBaseUrl} />
          </TabsContent>

          <TabsContent value="creator">
            <SinglePortfolioForm initial={creatorPortfolio} baseUrl={appBaseUrl} />
          </TabsContent>
        </Tabs>
      ) : (
        <SinglePortfolioForm initial={creatorPortfolio} baseUrl={appBaseUrl} />
      )}
    </div>
  );
}
