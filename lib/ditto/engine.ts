import type { PlatformConfig } from "@/lib/platform/types";
import { tryExecuteDittoCommand } from "@/lib/ditto/actions";
import {
  getRouteGuide,
  normalizeDittoText,
  type DittoActionLink,
  type DittoAnswer,
  type DittoPendingFollowUp,
} from "@/lib/ditto/guides";

export type {
  DittoActionLink,
  DittoAnswer,
  DittoMeetingCard,
  DittoPendingFollowUp,
  RouteGuide,
} from "@/lib/ditto/guides";
export { buildDittoGuideCard, getRouteGuide } from "@/lib/ditto/guides";

interface KnowledgeEntry {
  keywords: string[];
  reply: string;
  steps?: string[];
  cta?: DittoActionLink;
}

const BUILTIN_KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ["landing", "portafolio", "redes", "espacio publico", "instagram", "tiktok", "link", "biografia"],
    reply:
      "Cada agencia y creador en EditFlow tiene su propio espacio público (/p/tu-enlace) para poner en la biografía de Instagram, TikTok, YouTube o WhatsApp con portafolio de reels, estrellas de ranking, servicios y contacto directo.",
    steps: [
      "Entra a Configuración -> Espacio Público y Portafolio para Redes.",
      "Personaliza tu enlace (/p/mi-agencia), titular, servicios, WhatsApp y redes sociales.",
      "Copia el link generado y compártelo; además, los proyectos de Bolsa de Empleo se muestran allí automáticamente.",
    ],
    cta: { label: "Editar mi Landing", href: "/app/configuracion#landing-publica" },
  },
  {
    keywords: ["que puedes hacer", "comandos", "ayuda", "como funcionas", "programar cosas"],
    reply:
      "Además de guiarte en cada pantalla, ahora puedes pedirme directamente que programe cosas en tu espacio sin abrir formularios.",
    steps: [
      "«Ey Ditto, agenda una reunión con Saúl el viernes a las 4pm» (crea el evento, enlace de sala y envía invitación si hay correo).",
      "«Programa una grabación mañana 10am con maria@correo.com».",
      "«Registra un video llamado Reel Navidad para Nike entrega el viernes».",
      "«¿Qué reuniones tengo esta semana?» para consultar tu agenda al instante.",
    ],
    cta: { label: "Abrir Calendario", href: "/app/calendario" },
  },
  {
    keywords: [
      "bolsa",
      "empleo",
      "vacante",
      "trabajo",
      "postular",
      "entrevista",
      "interview",
      "top",
      "ranking",
      "estrella",
      "estrellas",
      "skill",
      "certificacion",
      "portafolio",
    ],
    reply:
      "En Bolsa de Empleo puedes publicar tus proyectos/reels para recibir valoraciones de 1 a 5 estrellas, escalar en el Top Ranking, validar tus skills técnicos con evaluaciones prácticas y postularte a vacantes con sala de Interview en vivo.",
    steps: [
      "Publica tus proyectos y presenta las evaluaciones en «Validación de Skills» para sumar estrellas y certificaciones.",
      "En «Vacantes», las empresas publican ofertas y pueden agendar una Interview en vivo (con sala integrada y enlace Google Meet si está conectado).",
      "Durante la entrevista en vivo también se pueden validar skills prácticos directamente.",
    ],
    cta: { label: "Abrir Bolsa de Empleo", href: "/app/bolsa" },
  },
  {
    keywords: ["spam", "no llega", "correo", "invitacion", "invitar", "equipo", "reenviar", "enlace"],
    reply:
      "Cuando invitas a alguien desde Equipo -> Invitar, EditFlow envía el enlace automáticamente por correo. Si no aparece en Recibidos, dile a tu invitado que revise su carpeta de spam o correo no deseado, o usa el botón Reenviar / Copiar link en Invitaciones pendientes.",
    steps: [
      "Abre Equipo -> Invitaciones pendientes.",
      "Haz clic en el botón de enviar (avión de papel) para reenviar el correo o en Copiar para pasarle el link por WhatsApp.",
      "Al abrir el enlace, la persona podrá crear su cuenta nueva o iniciar sesión con su cuenta actual.",
    ],
    cta: { label: "Ir a Equipo", href: "/app/equipo" },
  },
  {
    keywords: ["rol", "roles", "permiso", "permisos", "editor", "estratega", "administrador", "admin", "viewer"],
    reply:
      "EditFlow maneja 4 niveles dentro de cada espacio: Propietario/Administrador (control total), Editor (trabaja sus videos, actualiza estado, avance y link final) y Estratega (gestiona clientes y briefs, lectura en el resto). El Super Admin puede personalizar qué módulos ve cada rol.",
    cta: { label: "Ver Equipo", href: "/app/equipo" },
  },
  {
    keywords: ["avance", "porcentaje", "slider", "progreso", "cronometro", "reloj", "no puedo mover"],
    reply:
      "El control de % de avance y el cronómetro en vivo solo se activan cuando el video está en estado «Edición». Cámbiale el estado a «Edición» y ya podrás mover el porcentaje del 10% al 100%.",
    cta: { label: "Ir a Monitoreo", href: "/app/monitoreo" },
  },
  {
    keywords: ["excel", "sheet", "importar", "csv", "subir", "archivo"],
    reply:
      "Puedes importar tu Excel (.xlsx / .xls) o CSV de Google Sheets directamente desde el Dashboard pulsando «Importar desde Sheet/Excel». EditFlow crea los clientes nuevos y registra sus videos en el mes activo de una sola vez.",
    cta: { label: "Ir al Dashboard", href: "/app/dashboard" },
  },
  {
    keywords: ["instalar", "app", "pwa", "celular", "telefono", "computador", "escritorio", "safari", "iphone"],
    reply:
      "Puedes instalar EditFlow como aplicación independiente sin barras del navegador. En Chrome o Edge (PC/Android) pulsa «Instalar app» en el menú lateral o inicio; en iPhone/iPad Safari toca Compartir -> «Agregar a pantalla de inicio».",
  },
  {
    keywords: ["google", "calendar", "calendario", "meet", "gmail", "email mismatch", "correo distinto"],
    reply:
      "Para conectar Google Calendar y Meet sin error de correo distinto, inicia sesión en la ventana de Google con exactamente el mismo correo que usas en EditFlow.",
    steps: [
      "Entra a Configuración -> Integración de Google.",
      "Conecta el mismo correo con el que ingresaste a EditFlow.",
      "Acepta los permisos de Calendar y envío para activar Google Meet y notificaciones.",
    ],
    cta: { label: "Ir a Configuración", href: "/app/configuracion" },
  },
  {
    keywords: ["mes", "cerrar", "nuevo mes", "periodo", "pendiente", "pendientes", "historico", "aprobado"],
    reply:
      "Al abrir un mes nuevo desde el selector de periodo arriba a la izquierda, los contadores arrancan en cero y el mes anterior queda guardado en Métricas. Todo video que no quedó en «Aprobado» o «Entregado» se arrastra automáticamente al mes nuevo.",
    cta: { label: "Abrir nuevo mes", href: "/app/periodos/nuevo" },
  },
  {
    keywords: ["super admin", "superadmin", "cms", "contenido", "mantenimiento", "banner"],
    reply:
      "La consola de Super Admin permite editar textos/SEO del sitio, configurar permisos por rol, gestionar cualquier organización, usuario o invitación y personalizar las guías de Ditto.",
    cta: { label: "Abrir Super Admin", href: "/super-admin" },
  },
  {
    keywords: ["contrasena", "clave", "olvide", "olvidaste", "pin", "restablecer", "acceso"],
    reply:
      "Si olvidaste tu contraseña, usa la opción «¿Olvidaste tu contraseña?» en la pantalla de acceso o invitación. Recibirás un enlace por correo para definir una nueva contraseña de al menos 6 caracteres (revisa también Spam).",
  },
];

function scoreTokens(queryNorm: string, candidates: string[]): number {
  const words = queryNorm.split(" ").filter((w) => w.length >= 2);
  if (words.length === 0) return 0;

  let score = 0;
  for (const kw of candidates) {
    const k = normalizeDittoText(kw);
    if (!k) continue;
    if (queryNorm.includes(k)) score += 3;
    else {
      for (const w of words) {
        if (k.includes(w) || w.includes(k)) score += 1;
      }
    }
  }
  return score;
}

async function tryGeminiAnswer(params: {
  message: string;
  pathname: string;
  role?: string;
  config: PlatformConfig;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const guidesText = params.config.ditto.customGuides
    .map((g) => `- ${g.title} (${g.routePattern}): ${g.summary} Pasos: ${g.steps.join(" | ")}`)
    .join("\n");
  const faqsText = params.config.home.faqs
    .map((f) => `P: ${f.pregunta}\nR: ${f.respuesta}`)
    .join("\n");

  const systemPrompt = [
    `Eres ${params.config.ditto.assistantName}, el asistente virtual amigable y claro de EditFlow (plataforma para productoras y equipos de edición de video).`,
    `Responde siempre en español neutro/colombiano, conciso, práctico y en máximo 4-6 líneas.`,
    `Ruta actual del usuario: ${params.pathname}. Rol actual: ${params.role ?? "visitante"}.`,
    `Guías activas:\n${guidesText}`,
    `Preguntas frecuentes:\n${faqsText}`,
    `Si el usuario pregunta por invitaciones que no llegan o caen en spam, recuérdale revisar spam y usar Reenviar / Copiar link en Equipo.`,
  ].join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: params.message }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 350 },
        }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function answerWithDitto(params: {
  message: string;
  pathname: string;
  role?: string;
  config: PlatformConfig;
  pendingFollowUp?: DittoPendingFollowUp;
}): Promise<DittoAnswer> {
  const { message, pathname, role, config, pendingFollowUp } = params;
  const routeGuide = getRouteGuide(pathname, config);

  const commandResult = await tryExecuteDittoCommand({ message, pendingFollowUp });
  if (commandResult?.handled) {
    return {
      reply: commandResult.reply,
      steps: commandResult.steps,
      cta: commandResult.cta,
      suggestions: commandResult.suggestions ?? routeGuide.suggestions,
      mutated: commandResult.mutated,
      meetingCard: commandResult.meetingCard,
      pendingFollowUp: commandResult.pendingFollowUp,
    };
  }

  const queryNorm = normalizeDittoText(message);

  // 1. Buscar mejor coincidencia local en guías personalizadas + FAQs + base EditFlow
  type Candidate = { score: number; answer: Omit<DittoAnswer, "suggestions"> };
  const candidates: Candidate[] = [];

  for (const g of config.ditto.customGuides) {
    const s = scoreTokens(queryNorm, [...g.keywords, g.title, g.summary]);
    if (s > 0) {
      candidates.push({
        score: s + (pathname.startsWith(g.routePattern) ? 1 : 0),
        answer: {
          reply: `${g.title}: ${g.summary}`,
          steps: g.steps,
          cta: g.ctaLabel && g.ctaHref ? { label: g.ctaLabel, href: g.ctaHref } : undefined,
        },
      });
    }
  }

  for (const faq of config.home.faqs) {
    const s = scoreTokens(queryNorm, [faq.pregunta, faq.respuesta]);
    if (s > 0) {
      candidates.push({
        score: s,
        answer: { reply: faq.respuesta },
      });
    }
  }

  for (const item of BUILTIN_KNOWLEDGE) {
    const s = scoreTokens(queryNorm, item.keywords);
    if (s > 0) {
      candidates.push({
        score: s,
        answer: { reply: item.reply, steps: item.steps, cta: item.cta },
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestLocal = candidates[0]?.score >= 2 ? candidates[0].answer : null;

  // 2. Si hay GEMINI_API_KEY configurada, enriquecer la respuesta conversacional
  const geminiText = await tryGeminiAnswer({ message, pathname, role, config });
  if (geminiText) {
    return {
      reply: geminiText,
      cta: bestLocal?.cta ?? routeGuide.cta,
      suggestions: routeGuide.suggestions,
    };
  }

  if (bestLocal) {
    return {
      ...bestLocal,
      suggestions: routeGuide.suggestions,
    };
  }

  // 3. Respaldo contextual amigable según la página actual
  return {
    reply: `Estás en «${routeGuide.title}». ${routeGuide.summary} Aquí tienes los pasos principales para avanzar:`,
    steps: routeGuide.steps,
    cta: routeGuide.cta,
    suggestions: routeGuide.suggestions,
  };
}
