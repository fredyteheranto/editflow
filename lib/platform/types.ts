import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";

export type AppModuleKey =
  | "dashboard"
  | "clientes"
  | "monitoreo"
  | "calendario"
  | "metricas"
  | "bolsa"
  | "equipo"
  | "configuracion";

export const BASIC_APP_MODULES: AppModuleKey[] = [
  "dashboard",
  "clientes",
  "calendario",
  "metricas",
  "equipo",
];

export type ExtraAppModuleKey = "monitoreo" | "bolsa" | "configuracion";

export const EXTRA_APP_MODULES: ExtraAppModuleKey[] = [
  "monitoreo",
  "bolsa",
  "configuracion",
];

export type ConfigurableRole = "admin" | "editor" | "viewer";

export interface RolePermissionRule {
  modules: AppModuleKey[];
  canCreateClients: boolean;
  canCreateVideos: boolean;
  canDeleteOwnVideos: boolean;
  canInviteMembers: boolean;
}

export interface HomeFaqItem {
  pregunta: string;
  respuesta: string;
}

export interface HomeModuleCopy {
  key: "clientes" | "monitoreo" | "calendario" | "metricas";
  titulo: string;
  descripcion: string;
}

export interface DittoGuideItem {
  id: string;
  title: string;
  routePattern: string;
  summary: string;
  steps: string[];
  keywords: string[];
  ctaLabel?: string;
  ctaHref?: string;
}

export interface PlatformConfig {
  site: {
    brandName: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    announcementBanner: {
      enabled: boolean;
      text: string;
      linkLabel: string;
      linkHref: string;
      tone: "info" | "warning" | "success";
    };
    seoTitle: string;
    seoDescription: string;
  };
  home: {
    heroBadge: string;
    heroTitlePrefix: string;
    heroTitleHighlight: string;
    heroTitleSuffix: string;
    heroSubtitle: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    modulesIntroTitle: string;
    modules: HomeModuleCopy[];
    faqs: HomeFaqItem[];
    footerText: string;
  };
  permissions: {
    allowSelfSignup: boolean;
    /** Módulos avanzados visibles para usuarios normales y organizaciones. */
    publicModules: Record<ExtraAppModuleKey, boolean>;
    /** Espacios públicos y landing/portafolios (/p/[slug]). */
    publicPortfolios: boolean;
    roles: Record<ConfigurableRole, RolePermissionRule>;
  };
  ditto: {
    enabled: boolean;
    /** Si es false, solo el Super Admin puede usar Ditto. */
    publicEnabled: boolean;
    assistantName: string;
    tagline: string;
    welcomeMessage: string;
    showOnPublicPages: boolean;
    customGuides: DittoGuideItem[];
  };
  superAdminEmails: string[];
}

export const ALL_APP_MODULES: AppModuleKey[] = [
  "dashboard",
  "clientes",
  "monitoreo",
  "calendario",
  "metricas",
  "bolsa",
  "equipo",
  "configuracion",
];

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  site: {
    brandName: "EditFlow",
    maintenanceMode: false,
    maintenanceMessage:
      "Estamos realizando mejoras programadas en EditFlow. Volveremos en unos minutos.",
    announcementBanner: {
      enabled: false,
      text: "",
      linkLabel: "",
      linkHref: "",
      tone: "info",
    },
    seoTitle: SITE_TITLE,
    seoDescription: SITE_DESCRIPTION,
  },
  home: {
    heroBadge: "Hecho para productoras y agencias de contenido",
    heroTitlePrefix: "Una sola plataforma para ",
    heroTitleHighlight: "todo",
    heroTitleSuffix: " tu equipo de edición",
    heroSubtitle:
      "Reemplaza el Google Sheet manual: controla qué video edita cada editor, en qué estado va, cuándo se entrega y cuánto contenido le diste a cada cliente.",
    heroPrimaryCta: "Iniciar",
    heroSecondaryCta: "Ya tengo cuenta",
    modulesIntroTitle: "¿Qué hace EditFlow?",
    modules: [
      {
        key: "clientes",
        titulo: "Clientes",
        descripcion: "El brief completo de cada cliente y su meta de videos del mes, siempre a mano.",
      },
      {
        key: "monitoreo",
        titulo: "Monitoreo",
        descripcion: "Registra cada video, su editor y su estado. Todo se calcula solo, en vivo.",
      },
      {
        key: "calendario",
        titulo: "Calendario",
        descripcion: "Reuniones, grabaciones y entregas en un solo calendario con recordatorios por correo.",
      },
      {
        key: "metricas",
        titulo: "Métricas",
        descripcion: "Compara meses, mide a cada editor y exporta el informe de cada cliente.",
      },
    ],
    faqs: [
      {
        pregunta: "¿Reemplaza por completo nuestro Google Sheet?",
        respuesta:
          "Sí. Cliente, editor, estado y % de avance de cada video quedan en una sola tabla que se actualiza sola — nadie tiene que abrir un Sheet aparte para saber qué falta.",
      },
      {
        pregunta: "¿Cómo funciona la integración con Google Calendar y Meet?",
        respuesta:
          "Conectas exactamente el correo con el que te registraste. Desde ahí, cada reunión que agendas en EditFlow se crea en tu Google Calendar con enlace automático de Google Meet e invitaciones a los asistentes.",
      },
      {
        pregunta: "¿Qué pasa con los videos que no llegan a \"Aprobado\" cuando cierra el mes?",
        respuesta:
          "Nunca se pierden. Pendiente, en edición o en revisión pasan solos al día 1 del mes siguiente. Solo lo que quedó \"Aprobado\" se congela en el histórico.",
      },
      {
        pregunta: "¿Necesito tarjeta para crear mi espacio?",
        respuesta:
          "No. Creas tu espacio con tu nombre y tu correo en menos de un minuto, sin tarjeta y sin contraseña que memorizar.",
      },
      {
        pregunta: "¿Puedo invitar a mi equipo de editores y estrategas?",
        respuesta:
          "Sí. Cada miembro entra con su propio rol: el editor actualiza el % de avance de sus videos, el estratega gestiona clientes, y tú ves todo desde el dashboard.",
      },
    ],
    footerText: "Hecho para productoras y creadores de contenido",
  },
  permissions: {
    allowSelfSignup: true,
    publicModules: {
      monitoreo: false,
      bolsa: false,
      configuracion: false,
    },
    publicPortfolios: false,
    roles: {
      admin: {
        modules: [...ALL_APP_MODULES],
        canCreateClients: true,
        canCreateVideos: true,
        canDeleteOwnVideos: true,
        canInviteMembers: true,
      },
      editor: {
        modules: [...ALL_APP_MODULES],
        canCreateClients: true,
        canCreateVideos: true,
        canDeleteOwnVideos: true,
        canInviteMembers: false,
      },
      viewer: {
        modules: [...ALL_APP_MODULES],
        canCreateClients: true,
        canCreateVideos: false,
        canDeleteOwnVideos: false,
        canInviteMembers: false,
      },
    },
  },
  ditto: {
    enabled: true,
    publicEnabled: false,
    assistantName: "Ditto",
    tagline: "Tu guía en EditFlow",
    welcomeMessage:
      "¡Hola! Soy Ditto, tu asistente en EditFlow. Pregúntame cómo usar cualquier módulo o pídeme una guía paso a paso según tu pantalla.",
    showOnPublicPages: true,
    customGuides: [
      {
        id: "guide-invitar",
        title: "Invitar personas al equipo",
        routePattern: "/app/equipo",
        summary: "Envía invitaciones por correo con rol de Administrador, Editor o Estratega.",
        steps: [
          "Entra a Equipo en el menú lateral y haz clic en Invitar.",
          "Ingresa el nombre visible, correo electrónico y el rol de la persona.",
          "Al hacer clic en Crear se envía el correo con el enlace de acceso (dile al invitado que revise también su carpeta de spam si no lo ve en Recibidos).",
          "Si no le llega, puedes reenviar el correo o copiar el link directo desde Invitaciones pendientes.",
        ],
        keywords: ["invitar", "equipo", "correo", "spam", "rol", "administrador", "editor", "estratega", "reenviar"],
        ctaLabel: "Ir a Equipo",
        ctaHref: "/app/equipo",
      },
      {
        id: "guide-monitoreo",
        title: "Trabajar videos en Monitoreo",
        routePattern: "/app/monitoreo",
        summary: "Actualiza estados, % de avance y links de entrega en tiempo real.",
        steps: [
          "Si eres administrador, crea un video con Nuevo video o importa tu Excel desde Dashboard.",
          "Cambia el estado de Pendiente a Edición cuando el editor empiece; allí se habilita el cronómetro y el slider de avance (10% a 100%).",
          "Cuando termine, el editor pega el enlace del video procesado en la columna Link y cambia el estado a En revisión.",
        ],
        keywords: ["video", "monitoreo", "avance", "porcentaje", "link", "estado", "edicion", "revision", "aprobado"],
        ctaLabel: "Abrir Monitoreo",
        ctaHref: "/app/monitoreo",
      },
      {
        id: "guide-clientes",
        title: "Gestionar briefs y metas de clientes",
        routePattern: "/app/clientes",
        summary: "Crea clientes, define metas mensuales y edita su brief creativo.",
        steps: [
          "Haz clic en Registrar cliente o Activar cliente existente para sumarlo al mes actual.",
          "Haz clic sobre cualquier tarjeta para abrir su brief completo (marcas, público, qué no hacer, Drive de recursos).",
          "La barra de progreso muestra los videos aprobados/entregados respecto a su meta del mes.",
        ],
        keywords: ["cliente", "brief", "meta", "drive", "tarjeta", "activar"],
        ctaLabel: "Ver Clientes",
        ctaHref: "/app/clientes",
      },
      {
        id: "guide-calendario",
        title: "Agendar eventos, Meet y entregas",
        routePattern: "/app/calendario",
        summary: "Programa reuniones con Google Meet y sincronízalas con Google Calendar.",
        steps: [
          "Haz clic en cualquier día vacío o en Nuevo evento.",
          "Asigna un responsable, agrega correos invitados si aplica y activa Google Meet si quieres enlace de videollamada automático.",
          "Las fechas de entrega de Monitoreo aparecen automáticamente como entregas en el calendario.",
        ],
        keywords: ["calendario", "evento", "meet", "reunion", "grabacion", "google calendar", "recordatorio"],
        ctaLabel: "Ir a Calendario",
        ctaHref: "/app/calendario",
      },
      {
        id: "guide-bolsa",
        title: "Bolsa de Empleo, Ranking y Skills",
        routePattern: "/app/bolsa",
        summary: "Publica proyectos, gana estrellas para subir al Top Ranking, valida skills y participa en interviews en vivo.",
        steps: [
          "Publica tus mejores reels o videos en «Ranking y Proyectos» para recibir valoraciones de 1 a 5 estrellas.",
          "Completa evaluaciones en «Validación de Skills» para sumar insignias verificadas y escalar posiciones en el Top.",
          "Postúlate a vacantes adjuntando tu portafolio o agenda una Interview en vivo con evaluación técnica.",
        ],
        keywords: ["bolsa", "empleo", "vacante", "ranking", "estrellas", "top", "interview", "entrevista", "skill", "portafolio"],
        ctaLabel: "Ir a Bolsa de Empleo",
        ctaHref: "/app/bolsa",
      },
      {
        id: "guide-google-pwa",
        title: "Conectar Google e instalar como app",
        routePattern: "/app/configuracion",
        summary: "Vincula tu Google Calendar y Meet e instala EditFlow como aplicación.",
        steps: [
          "En Configuración -> Integración de Google, conecta exactamente el mismo correo con el que ingresas a EditFlow.",
          "Para instalar EditFlow en tu computador o celular, pulsa el botón Instalar app en el menú lateral o desde la página inicial.",
        ],
        keywords: ["google", "gmail", "configuracion", "instalar", "app", "pwa", "celular", "perfil", "foto"],
        ctaLabel: "Ir a Configuración",
        ctaHref: "/app/configuracion",
      },
    ],
  },
  superAdminEmails: [],
};
