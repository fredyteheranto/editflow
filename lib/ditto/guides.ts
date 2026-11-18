import type { DittoGuideItem, PlatformConfig } from "@/lib/platform/types";

export interface DittoActionLink {
  label: string;
  href: string;
}

export interface DittoPendingFollowUp {
  type: "attach_guest_email" | "clarify_video_client";
  eventId?: string;
  eventTitle?: string;
  videoTitle?: string;
  dueDate?: string | null;
}

export interface DittoMeetingCard {
  title: string;
  whenLabel: string;
  meetingUrl?: string | null;
  emailedRecipients: string[];
}

export interface DittoAnswer {
  reply: string;
  steps?: string[];
  cta?: DittoActionLink;
  suggestions: string[];
  mutated?: boolean;
  meetingCard?: DittoMeetingCard;
  pendingFollowUp?: DittoPendingFollowUp;
}

export interface RouteGuide {
  pattern: string;
  title: string;
  summary: string;
  steps: string[];
  suggestions: string[];
  cta?: DittoActionLink;
}

const ROUTE_GUIDES: RouteGuide[] = [
  {
    pattern: "/app/dashboard",
    title: "Panel principal (Dashboard)",
    summary: "Aquí ves el resumen del mes abierto: KPIs, entregas próximas y videos atrasados.",
    steps: [
      "Usa el selector de mes arriba a la izquierda para cambiar entre periodos abiertos o cerrados.",
      "Si tienes un Excel o Google Sheet, usa «Importar desde Sheet/Excel» para crear clientes y videos de golpe.",
      "También puedes pedirme aquí: «Agenda una reunión el viernes a las 4pm» o «Registra un video».",
    ],
    suggestions: [
      "Agenda una reunión mañana a las 4pm",
      "¿Qué reuniones tengo esta semana?",
      "¿Cómo importo mi Excel o Sheet?",
    ],
    cta: { label: "Ir a Monitoreo", href: "/app/monitoreo" },
  },
  {
    pattern: "/app/clientes",
    title: "Gestión de Clientes y Briefs",
    summary: "Registra marcas nuevas, activa clientes históricos en el mes y edita su brief creativo.",
    steps: [
      "Pulsa «Registrar cliente» para crear uno nuevo, o «Activar cliente existente» si ya trabajó meses anteriores.",
      "Haz clic en cualquier tarjeta para abrir su ficha completa (brief, formatos, Google Drive, meta mensual).",
      "La barra de progreso compara los videos finalizados contra la meta mensual asignada.",
    ],
    suggestions: [
      "¿Quién puede crear o borrar clientes?",
      "¿Cómo edito el brief de un cliente?",
      "¿Cómo se calcula el % de la meta?",
    ],
    cta: { label: "Ver Monitoreo", href: "/app/monitoreo" },
  },
  {
    pattern: "/app/monitoreo",
    title: "Monitoreo de Videos",
    summary: "Control en tiempo real del flujo de edición: quién edita cada video, estado, avance y entrega.",
    steps: [
      "Asigna un responsable en «Encargado» y define fechas de inicio y entrega.",
      "Cuando el editor empiece a trabajar, pasa el estado a «Edición» para activar el cronómetro y el slider de % avance.",
      "Al terminar, guarda el enlace final en «Link» y cambia a «En revisión» para aprobación.",
    ],
    suggestions: [
      "¿Por qué no puedo mover el % de avance?",
      "¿Qué pasa con los videos no aprobados al cerrar mes?",
      "¿Qué permisos tiene el rol Editor?",
    ],
    cta: { label: "Ir a Calendario", href: "/app/calendario" },
  },
  {
    pattern: "/app/calendario",
    title: "Calendario y Google Meet",
    summary: "Agenda grabaciones y reuniones con Google Meet automático e invitaciones por correo, o pídeselo directo a Ditto.",
    steps: [
      "Conecta tu Google Calendar en Configuración para crear enlaces de Google Meet automáticamente.",
      "Haz clic en cualquier fecha del calendario o escribe aquí: «Agenda una reunión con Saúl el viernes a las 4pm».",
      "Cada invitado recibe la notificación en su correo y al abrir el evento verás «Unirse con Google Meet».",
    ],
    suggestions: [
      "Agenda una reunión el viernes a las 4pm",
      "¿Qué reuniones tengo esta semana?",
      "¿Cómo conecto Google Calendar?",
    ],
    cta: { label: "Ir a Configuración", href: "/app/configuracion" },
  },
  {
    pattern: "/app/metricas",
    title: "Métricas y Productividad",
    summary: "Cronómetro en vivo de ediciones activas, comparativas mensuales y descarga en CSV.",
    steps: [
      "En «En vivo» ves cuánto tiempo lleva editándose cada video actualmente.",
      "Filtra por cliente o editor para revisar cumplimiento histórico mes a mes.",
      "Usa los botones de descarga para exportar informes en CSV.",
    ],
    suggestions: [
      "¿Cómo exporto los reportes?",
      "¿Cómo se mide el tiempo de edición?",
      "¿Qué pasa al cerrar un mes?",
    ],
  },
  {
    pattern: "/app/bolsa",
    title: "Bolsa de Empleo, Ranking y Skills",
    summary: "Publica tus proyectos para recibir estrellas, escala al Top Ranking, valida tus skills y conecta a entrevistas en vivo.",
    steps: [
      "En «Ranking y Proyectos», publica tu reel/video para que la comunidad lo califique con estrellas y entres al Top.",
      "En «Validación de Skills», presenta las pruebas técnicas para obtener insignias oficiales de Skill Validado.",
      "En «Vacantes», postúlate adjuntando tu portafolio o agenda e inicia una Interview en vivo con los candidatos.",
    ],
    suggestions: [
      "¿Cómo llego al Top Ranking?",
      "¿Cómo funciona la validación de skills?",
      "¿Cómo agendo una interview en vivo?",
    ],
    cta: { label: "Explorar Vacantes", href: "/app/bolsa" },
  },
  {
    pattern: "/app/equipo",
    title: "Equipo e Invitaciones",
    summary: "Invita administradores, editores y estrategas y gestiona accesos activos.",
    steps: [
      "Haz clic en «Invitar», escribe el nombre visible, el correo y elige el rol.",
      "Al crear la invitación se envía un correo con el link de acceso. Dile al invitado que revise también su carpeta de spam.",
      "En «Invitaciones pendientes» puedes reenviar el correo, copiar el enlace directo o revocarlo.",
    ],
    suggestions: [
      "No le llegó el correo de invitación, ¿qué hago?",
      "¿Qué hace cada rol (Admin, Editor, Estratega)?",
      "¿Cómo reenvío una invitación?",
    ],
  },
  {
    pattern: "/app/configuracion",
    title: "Perfil y Conexión de Google",
    summary: "Personaliza tu perfil y conecta Google Calendar y Meet con el mismo correo de EditFlow.",
    steps: [
      "Actualiza tu foto, biografía y teléfono en «Mi perfil».",
      "Conecta Google usando exactamente el mismo correo con el que entraste a EditFlow.",
      "Desde el pie del menú lateral puedes pulsar «Instalar app» para usar EditFlow como aplicación.",
    ],
    suggestions: [
      "Me sale error de correo distinto en Google",
      "¿Es obligatorio conectar Google?",
      "¿Cómo instalo la aplicación?",
    ],
  },
  {
    pattern: "/app/periodos/nuevo",
    title: "Abrir un nuevo mes",
    summary: "Inicia el siguiente ciclo mensual arrastrando clientes y videos pendientes automáticamente.",
    steps: [
      "Confirma el mes y año que quieres abrir.",
      "Selecciona los clientes que continúan y ajusta sus metas mensuales.",
      "Todos los videos que no quedaron «Aprobado» o «Entregado» pasan al nuevo mes sin perderse.",
    ],
    suggestions: [
      "¿Se borra el mes anterior al abrir uno nuevo?",
      "¿Qué pasa con los videos pendientes?",
    ],
  },
  {
    pattern: "/super-admin",
    title: "Consola Super Admin",
    summary: "Administra toda la plataforma: mantenimiento, contenido del inicio, permisos, organizaciones, usuarios y guías de Ditto.",
    steps: [
      "En «Plataforma» puedes activar el modo mantenimiento, el banner global de anuncios o agregar más Super Admins.",
      "En «Contenidos CMS» editas textos, SEO y preguntas frecuentes del Home en vivo.",
      "En «Permisos», «Organizaciones» y «Usuarios» controlas qué módulos ve cada rol y gestionas cualquier cuenta o espacio.",
    ],
    suggestions: [
      "¿Cómo edito las preguntas frecuentes?",
      "¿Cómo oculto un módulo a un rol?",
      "¿Cómo agrego otra guía a Ditto?",
    ],
  },
  {
    pattern: "/invitacion",
    title: "Aceptar invitación al equipo",
    summary: "Crea tu cuenta o inicia sesión con el correo invitado para entrar al espacio.",
    steps: [
      "Si todavía no tienes cuenta en EditFlow, usa la pestaña «Crear cuenta» con tu nombre y una contraseña de al menos 6 caracteres.",
      "Si ya tenías cuenta, elige «Ya tengo cuenta» o entra con «Continuar con Google» usando el mismo correo invitado.",
      "Al confirmar entrarás directamente al Dashboard con tu rol asignado.",
    ],
    suggestions: [
      "Ya tenía una cuenta, ¿cómo entro?",
      "Inicié sesión con otro correo por error",
      "Olvidé mi contraseña",
    ],
  },
  {
    pattern: "/",
    title: "Bienvenido a EditFlow",
    summary: "La plataforma todo-en-uno para equipos de edición de video y agencias.",
    steps: [
      "Pulsa «Iniciar» si quieres crear un espacio nuevo para tu equipo o productora.",
      "Pulsa «Ya tengo cuenta» si ya perteneces a una organización.",
      "También puedes pulsar «Instalar app» arriba para agregar EditFlow a tu escritorio o celular.",
    ],
    suggestions: [
      "¿Necesito tarjeta para empezar?",
      "¿Cómo funciona el ciclo mensual?",
      "¿Cómo invito a mis editores?",
    ],
    cta: { label: "Crear mi espacio", href: "/crear-espacio" },
  },
];

export function normalizeDittoText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRouteGuide(pathname: string, config: PlatformConfig): RouteGuide {
  const customMatch = config.ditto.customGuides.find(
    (g) => g.routePattern && pathname.startsWith(g.routePattern),
  );
  const builtin =
    ROUTE_GUIDES.find((g) => g.pattern !== "/" && pathname.startsWith(g.pattern)) ??
    ROUTE_GUIDES[ROUTE_GUIDES.length - 1];

  if (customMatch && pathname !== "/") {
    return {
      pattern: customMatch.routePattern,
      title: customMatch.title,
      summary: customMatch.summary,
      steps: customMatch.steps,
      suggestions: builtin.suggestions,
      cta:
        customMatch.ctaLabel && customMatch.ctaHref
          ? { label: customMatch.ctaLabel, href: customMatch.ctaHref }
          : builtin.cta,
    };
  }

  return builtin;
}

export function buildDittoGuideCard(guide: DittoGuideItem): DittoAnswer {
  return {
    reply: guide.summary,
    steps: guide.steps,
    cta: guide.ctaLabel && guide.ctaHref ? { label: guide.ctaLabel, href: guide.ctaHref } : undefined,
    suggestions: [],
  };
}
