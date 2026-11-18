import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HeroSpotlight } from "@/components/marketing/hero-spotlight";
import { Reveal } from "@/components/marketing/reveal";
import { TiltCard } from "@/components/marketing/tilt-card";
import { AnimatedStat } from "@/components/marketing/animated-stat";
import { MonitoreoHeroPreview } from "@/components/marketing/monitoreo-hero-preview";
import { HeroLiveShowcase, CalendarioShowcase, ClientesShowcase } from "@/components/marketing/module-showcases";
import { ScrollZoom } from "@/components/marketing/scroll-zoom";
import { ScrollProgress } from "@/components/marketing/scroll-progress";
import { Parallax } from "@/components/marketing/parallax";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { MiniClientes, MiniMonitoreo, MiniCalendario, MiniMetricas } from "@/components/marketing/mini-module-previews";
import { LegalLinks } from "@/components/shared/legal-links";
import { InstallAppButton } from "@/components/pwa/pwa-install";
import { getPlatformConfig } from "@/lib/platform/config";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfig();
  return {
    title: { absolute: config.site.seoTitle },
    description: config.site.seoDescription,
    alternates: { canonical: "/" },
  };
}

const MODULE_VISUALS = {
  clientes: { icon: Users, Preview: MiniClientes },
  monitoreo: { icon: ClipboardList, Preview: MiniMonitoreo },
  calendario: { icon: CalendarDays, Preview: MiniCalendario },
  metricas: { icon: LineChart, Preview: MiniMetricas },
} as const;

const PASOS = [
  { numero: "01", titulo: "Crea tu espacio", descripcion: "Con tu nombre y tu correo, en menos de un minuto." },
  { numero: "02", titulo: "Abre el mes y registra tus clientes", descripcion: "Cada mes es un ciclo nuevo con sus propias metas." },
  { numero: "03", titulo: "Registra cada video y su editor", descripcion: "La misma tabla que ya conoces, ahora conectada a todo lo demás." },
  { numero: "04", titulo: "Todo se calcula solo", descripcion: "Resumen, productividad y métricas se actualizan sin que muevas un dedo." },
];

interface Vitrina {
  eyebrow: string;
  titulo: string;
  destacado: string;
  descripcion: string;
  Screenshot: React.ComponentType;
  // La tabla de Monitoreo es naturalmente más ancha que alta — le damos más
  // columna a la imagen (y menos al texto) para que se lea horizontal en
  // vez de comprimida a la mitad del contenedor.
  wide?: boolean;
}

const VITRINAS: Vitrina[] = [
  {
    eyebrow: "Monitoreo",
    titulo: "Cada video, ",
    destacado: "bajo control",
    descripcion:
      "Cliente, editor, estado y % de avance en una sola tabla — o en Kanban, arrastrando tarjetas entre columnas. Se actualiza sola, sin que nadie mueva un Sheet.",
    Screenshot: MonitoreoHeroPreview,
    wide: true,
  },
  {
    eyebrow: "Calendario",
    titulo: "Reuniones, grabaciones y entregas, ",
    destacado: "en un solo lugar",
    descripcion:
      "Cada evento se agenda en Google Calendar y avisa por correo a quien le toca — sin duplicar nada a mano, sin hojas de cálculo aparte.",
    Screenshot: CalendarioShowcase,
  },
  {
    eyebrow: "Clientes",
    titulo: "El brief completo, ",
    destacado: "siempre a mano",
    descripcion:
      "Meta del mes, estratega asignado y avance de cada cliente en una tarjeta — clic y entras directo a editar su ficha completa.",
    Screenshot: ClientesShowcase,
  },
];

export default async function HomePage() {
  const siteUrl = getSiteUrl();
  const config = await getPlatformConfig();
  const { home, site } = config;
  const modulos = home.modules.map((m) => ({
    ...m,
    ...MODULE_VISUALS[m.key],
  }));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.brandName || SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es",
      url: siteUrl,
      description: site.seoDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: {
        "@type": "Organization",
        name: "Lian Films Studio",
        url: siteUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: home.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.pregunta,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.respuesta,
        },
      })),
    },
  ];

  return (
    // "dark" forzado: el Home siempre se ve oscuro sin importar el tema
    // elegido en el resto de la app (esa preferencia solo aplica dentro de
    // /app y /preview).
    <div className="dark flex flex-1 flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ScrollProgress />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image src="/logo-editflow.png" alt="EditFlow" width={376} height={116} priority className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-3">
            <InstallAppButton variant="header" />
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/crear-espacio?modo=acceso">{home.heroSecondaryCta}</Link>
            </Button>
            <Button asChild className="glow-primary rounded-full bg-white px-5 text-violet-900 hover:bg-white/90 active:scale-95 active:bg-primary active:text-primary-foreground">
              <Link href="/crear-espacio">{home.heroPrimaryCta}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-mesh pointer-events-none absolute inset-0 opacity-70" />
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)]" />
          <Parallax speed={0.12} className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2">
            <div className="size-72 animate-float rounded-full bg-primary/30 blur-[100px]" />
          </Parallax>
          <Parallax speed={-0.18} className="pointer-events-none absolute right-10 top-56">
            <div className="size-56 animate-float rounded-full bg-cyan/25 blur-[90px] [animation-delay:1.5s]" />
          </Parallax>
          <HeroSpotlight />

          {/* Texto al lado de la imagen, usando los laterales de la
              pantalla (contenedor más ancho que el resto del Home) — como
              el home de frame.io: título compacto a la izquierda, vitrina
              grande y horizontal ocupando el resto del ancho. */}
          <div className="relative mx-auto grid max-w-[90rem] items-center gap-10 px-6 py-28 sm:py-36 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-14 lg:px-12 xl:grid-cols-[minmax(0,30rem)_1fr] xl:px-16">
            <Reveal>
              <Badge className="mb-6 gap-1.5 border border-primary/30 bg-primary/10 text-primary backdrop-blur">
                <Sparkles className="size-3.5" />
                {home.heroBadge}
              </Badge>
              <h1 className="text-balance font-heading text-5xl font-bold tracking-tight sm:text-6xl">
                {home.heroTitlePrefix}
                <span className="text-gradient glow-text italic">{home.heroTitleHighlight}</span>
                {home.heroTitleSuffix}
              </h1>
              <p className="mt-6 text-balance text-lg text-muted-foreground">
                {home.heroSubtitle}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  asChild
                  className="glow-primary group relative h-auto overflow-hidden rounded-full bg-white px-8 py-4 text-base text-violet-900 hover:bg-white/90 active:scale-95 active:bg-primary active:text-primary-foreground"
                >
                  <Link href="/crear-espacio">
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-[20deg] bg-violet-900/10 opacity-0 group-hover:opacity-100 group-hover:[animation:btn-shine_0.9s_ease-out]" />
                    {home.heroPrimaryCta}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto rounded-full border-border/80 px-8 py-4 text-base backdrop-blur transition-shadow hover:border-primary/50 hover:shadow-[0_0_24px_-6px_var(--primary)]"
                  asChild
                >
                  <Link href="/crear-espacio?modo=acceso">{home.heroSecondaryCta}</Link>
                </Button>
              </div>
            </Reveal>

            {/* La app tal cual se ve, al lado del título — no un fondo
                abstracto, para que quien llega al Home sepa exactamente qué
                va a usar. Con vida propia: entra un cliente nuevo y a los 5s
                "navega" a Monitoreo — un recorrido de ~10s en loop. */}
            <Reveal delay={200} className="relative">
              <ScrollZoom>
                <HeroLiveShowcase />
              </ScrollZoom>
            </Reveal>
          </div>
        </section>

        {/* Qué hace EditFlow */}
        <section className="relative border-t border-border/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Módulos
              </span>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                {home.modulesIntroTitle}
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {modulos.map(({ icon: Icon, titulo, descripcion, Preview }, i) => (
                <ScrollReveal key={titulo} delay={i * 110}>
                  <TiltCard className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur transition-colors hover:border-primary/50">
                    <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/0 blur-2xl transition-all group-hover:bg-primary/25" />
                    {/* Mini vista real del módulo, no solo un ícono — todas a
                        la misma altura, para que el ícono/título/texto de
                        las 4 tarjetas queden alineados en la misma línea. */}
                    <div className="relative flex h-28 flex-col justify-center rounded-xl border border-border/50 bg-background/40 p-3">
                      <Preview />
                    </div>
                    <div className="relative mt-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 text-primary ring-1 ring-primary/30">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="relative mt-4 font-heading font-semibold">{titulo}</h3>
                    <p className="relative mt-1 flex-1 text-sm text-muted-foreground">{descripcion}</p>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Vitrinas — una captura grande por módulo, como un recorrido guiado */}
        {VITRINAS.map(({ eyebrow, titulo, destacado, descripcion, Screenshot, wide }, i) => {
          const invertido = i % 2 === 1;
          return (
            <section key={eyebrow} className={`border-t border-border/60 py-24 ${invertido ? "bg-card/20" : ""}`}>
              <div className={`mx-auto px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
                <div
                  className={`grid items-center gap-12 lg:gap-16 ${
                    wide ? "lg:grid-cols-[minmax(0,20rem)_1fr]" : "lg:grid-cols-2"
                  }`}
                >
                  <Reveal className={invertido ? "lg:order-2" : undefined}>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
                    <h2 className="mt-2 text-balance font-heading text-3xl font-semibold tracking-tight">
                      {titulo}
                      <span className="text-gradient">{destacado}</span>
                    </h2>
                    <p className="mt-3 max-w-md text-muted-foreground">{descripcion}</p>
                  </Reveal>
                  <Reveal delay={150} className={invertido ? "lg:order-1" : undefined}>
                    <ScrollZoom>
                      <Screenshot />
                    </ScrollZoom>
                  </Reveal>
                </div>
              </div>
            </section>
          );
        })}

        {/* Cómo funciona */}
        <section className="relative border-t border-border/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Proceso
              </span>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                Cómo funciona
              </h2>
            </Reveal>
            <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="absolute top-6 left-0 right-0 hidden h-px overflow-visible bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block">
                <span className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_var(--primary)] [animation:line-travel_3.5s_ease-in-out_infinite]" />
              </div>
              {PASOS.map(({ numero, titulo, descripcion }, i) => (
                <Reveal key={numero} delay={i * 100} className="relative">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-sm font-semibold text-primary glow-primary">
                    {numero}
                  </span>
                  <h3 className="mt-4 font-heading font-semibold">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Ciclo mensual */}
        <section className="relative border-t border-border/60 py-24">
          <div className="bg-mesh pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                El ciclo mensual
              </span>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                Cada mes empieza en cero. El histórico nunca se pierde.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Al abrir un mes nuevo, todos los contadores arrancan en cero: videos, entregas,
                productividad. Tú decides qué clientes continúan, y ningún video pendiente se
                pierde — lo que no llegó a &quot;aprobado&quot; pasa solo al día 1 del mes nuevo. Los
                meses anteriores quedan congelados y siempre puedes volver a consultarlos desde
                Métricas.
              </p>
            </Reveal>
            <Reveal
              delay={150}
              className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-2xl shadow-primary/10 backdrop-blur"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono font-medium text-muted-foreground">OCTUBRE 2025</span>
                <Badge variant="outline" className="gap-1 border-success/40 text-success">
                  <CheckCircle2 className="size-3.5" /> Cerrado
                </Badge>
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                <AnimatedStat target={18} /> / 24 videos entregados
              </p>
              <div className="my-4 border-t border-border/60" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono font-medium">NOVIEMBRE 2025</span>
                <Badge className="gap-1 bg-info/15 text-info ring-1 ring-info/40">
                  <Zap className="size-3" /> Abierto
                </Badge>
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-muted-foreground">
                <AnimatedStat target={0} /> / 20 videos entregados
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Mes nuevo, contadores en cero.</p>
            </Reveal>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section className="relative border-t border-border/60 py-24">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal className="text-center">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">FAQ</span>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                Preguntas frecuentes
              </h2>
            </Reveal>
            <Reveal delay={100} className="mt-10">
              <Accordion type="single" collapsible className="rounded-2xl border border-border/70 bg-card/50 px-6 backdrop-blur">
                {home.faqs.map((faq) => (
                  <AccordionItem key={faq.pregunta} value={faq.pregunta} className="border-border/60 py-1.5">
                    <AccordionTrigger className="py-4 text-base font-heading font-semibold hover:no-underline">
                      {faq.pregunta}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-muted-foreground">{faq.respuesta}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-border/60 py-24">
          <div className="bg-mesh pointer-events-none absolute inset-0 opacity-50" />
          <Reveal className="relative mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Tu equipo de edición, bajo control desde hoy
            </h2>
            <p className="mt-3 text-muted-foreground">
              Crea tu espacio en menos de un minuto. Sin tarjeta, sin contraseña.
            </p>
            <Button
              size="lg"
              className="mt-8 glow-primary group relative h-auto overflow-hidden rounded-full bg-white px-8 py-3.5 text-base text-violet-900 hover:bg-white/90 active:scale-95 active:bg-primary active:text-primary-foreground"
              asChild
            >
              <Link href="/crear-espacio">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-[20deg] bg-violet-900/10 opacity-0 group-hover:opacity-100 group-hover:[animation:btn-shine_0.9s_ease-out]" />
                Iniciar ahora
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </Reveal>
        </section>

        {/* Transparencia e integración con Google (requisito de verificación OAuth) */}
        <section className="border-t border-border/60 bg-card/20 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur sm:p-8">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                <ShieldCheck className="size-4" />
                <span>Seguridad, privacidad e integración con Google</span>
              </div>
              <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight">
                Cómo utiliza EditFlow tus datos de Google
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                EditFlow es una plataforma operada por <strong className="text-foreground">Lian Films Studio</strong>{" "}
                para que agencias y productoras organicen clientes, flujos de edición de video, calendario y
                productividad mensual de su equipo. La conexión con Google es opcional y solo solicita permisos
                para funciones autorizadas directamente por ti:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Inicio de sesión con Google:</strong> usamos tu nombre y
                  correo para crear o acceder a tu cuenta sin contraseñas.
                </li>
                <li>
                  <strong className="text-foreground">Google Calendar y Google Meet:</strong> creamos reuniones
                  con enlace de Meet cuando agendas desde EditFlow e importamos únicamente eventos marcados con
                  la palabra clave <code className="text-xs text-foreground">Flow</code>. No leemos ni modificamos
                  otros eventos de tu calendario.
                </li>
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                El uso y la transferencia de información recibida de las APIs de Google cumple con la{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Google API Services User Data Policy
                </a>
                , incluidos los requisitos de Uso Limitado. Consulta todos los detalles en nuestra{" "}
                <Link href="/privacidad" className="text-primary underline underline-offset-2">
                  Política de Privacidad
                </Link>{" "}
                y{" "}
                <Link href="/terminos" className="text-primary underline underline-offset-2">
                  Condiciones del Servicio
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} {site.brandName || SITE_NAME} · {home.footerText}</span>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
