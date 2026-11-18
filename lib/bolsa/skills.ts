export interface SkillQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface SkillTrack {
  id: string;
  label: string;
  tools: string;
  description: string;
  passingScorePct: number;
  questions: SkillQuestion[];
}

export const SKILL_CATALOG = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "CapCut Pro",
  "Reels / TikTok",
  "YouTube Long-form",
  "Motion Graphics",
  "Color Grading",
  "Sound Design",
  "Guion & Retención",
] as const;

export const PROJECT_CATEGORIES = [
  "Reels / Shorts",
  "YouTube Long-form",
  "Comercial / Ads",
  "Documental / Podcast",
  "Motion Graphics",
] as const;

export const SKILL_TRACKS: SkillTrack[] = [
  {
    id: "edicion-narrativa",
    label: "Edición Narrativa & Ritmo",
    tools: "Premiere Pro · DaVinci Resolve",
    description: "Evalúa dominio de cortes en movimiento, J-cuts/L-cuts, narrativa y flujo proxy.",
    passingScorePct: 80,
    questions: [
      {
        id: "en-1",
        prompt: "¿Para qué se utiliza principalmente un L-cut en una entrevista o video de YouTube?",
        options: [
          "Para acelerar la exportación en H.264",
          "Para mantener el audio de la toma anterior entrando sobre el B-roll siguiente y suavizar la transición",
          "Para bloquear capas de texto en la secuencia",
          "Para convertir audio mono en estéreo automático",
        ],
        correctIndex: 1,
      },
      {
        id: "en-2",
        prompt: "Si editas material 4K 10-bit 4:2:2 en un equipo portátil con tirones al reproducir, ¿qué práctica es la correcta?",
        options: [
          "Bajar la resolución del monitor del sistema operativo",
          "Generar Proxies (ProRes Proxy / DNxHR LB) y activar el conmutador de proxies sin alterar la exportación final",
          "Reemplazar los clips por capturas JPEG",
          "Exportar antes a 720p y volver a reimportar para editar",
        ],
        correctIndex: 1,
      },
      {
        id: "en-3",
        prompt: "¿Qué hace efectivo un 'cut on action' (corte en acción)?",
        options: [
          "Cortar justo en medio de un movimiento físico para aprovechar la continuidad visual y hacer el corte invisible",
          "Agregar siempre un cross dissolve de 24 cuadros entre escenas",
          "Silenciar la pista de diálogo durante 1 segundo",
          "Aplicar un flash blanco en cada corte",
        ],
        correctIndex: 0,
      },
      {
        id: "en-4",
        prompt: "En una secuencia multi-cámara a 23.976 fps con audio externo grabado aparte, ¿cuál es el flujo recomendado?",
        options: [
          "Sincronizar por onda de audio o timecode en secuencia multicam y monitorear la mezcla limpia",
          "Alinear cada corte a ojo al finalizar toda la edición",
          "Cambiar la secuencia a 60 fps para duplicar frames",
          "Eliminar el audio de referencia antes de sincronizar",
        ],
        correctIndex: 0,
      },
      {
        id: "en-5",
        prompt: "¿Cuál es la finalidad de limpiar silencios muertos y respiración excesiva en videos hablados?",
        options: [
          "Subir el tamaño del archivo exportado",
          "Sostener el ritmo y evitar caídas de retención sin sacrificar naturalidad",
          "Evitar usar subtítulos dinámicos",
          "Desactivar la corrección de color",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "retencion-shorts",
    label: "Retención & Edición Vertical",
    tools: "Reels · TikTok · Shorts",
    description: "Hooks de 3 segundos, pacing dinámico, zonas seguras y legibilidad móvil.",
    passingScorePct: 80,
    questions: [
      {
        id: "rs-1",
        prompt: "¿Por qué son críticos los primeros 2 a 3 segundos de un Reel o TikTok?",
        options: [
          "Porque las plataformas solo muestran los créditos iniciales allí",
          "Porque definen si el espectador hace scroll o se queda, impactando directamente la retención inicial",
          "Porque después de 3 segundos no se puede usar música",
          "Porque el algoritmo desactiva los subtítulos",
        ],
        correctIndex: 1,
      },
      {
        id: "rs-2",
        prompt: "¿Por qué se deben respetar las 'safe zones' (zonas seguras) en formato 9:16?",
        options: [
          "Para evitar que los subtítulos o llamados a la acción queden tapados por botones, descripción e íconos de TikTok/IG",
          "Para reducir la duración del video",
          "Para exportar en 4:3",
          "Para mejorar la compresión MP3",
        ],
        correctIndex: 0,
      },
      {
        id: "rs-3",
        prompt: "¿Qué combinación mejora la retención sin saturar visualmente al espectador?",
        options: [
          "Cambios visuales intencionales (reencuadres, B-roll o gráficos cada pocos segundos) alineados con lo que se dice",
          "Un plano fijo de 60 segundos sin subtítulos",
          "Cinco transiciones 3D distintas por segundo en todo el video",
          "Poner los subtítulos fuera del cuadro superior",
        ],
        correctIndex: 0,
      },
      {
        id: "rs-4",
        prompt: "¿Cuál es la relación de aspecto y resolución estándar nítida para Reels/TikTok?",
        options: ["16:9 a 1280×720", "9:16 a 1080×1920", "1:1 a 800×800", "21:9 a 1920×800"],
        correctIndex: 1,
      },
      {
        id: "rs-5",
        prompt: "Al entregar variantes de un video vertical para cliente (Ads + Orgánico), ¿qué conviene revisar?",
        options: [
          "Legibilidad de subtítulos en fondo claro/oscuro, niveles LUFS consistentes y hook limpio",
          "Cambiar la fecha del reloj de la computadora",
          "Subir la saturación al 200%",
          "Eliminar las pistas musicales de respaldo",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "motion-after",
    label: "Motion Graphics & Keyframes",
    tools: "After Effects · Animación UI",
    description: "Curvas de velocidad, motion blur, precomposiciones y jerarquía tipográfica.",
    passingScorePct: 80,
    questions: [
      {
        id: "ma-1",
        prompt: "¿Qué logra ajustar las curvas en el Speed Graph (Easy Ease + manejo de bezier) frente a keyframes lineales?",
        options: [
          "Movimientos robóticos constantes",
          "Aceleraciones y desaceleraciones orgánicas con peso y fluidez profesional",
          "Duplica automáticamente el frame rate de la composición",
          "Convierte texto editable en video plano",
        ],
        correctIndex: 1,
      },
      {
        id: "ma-2",
        prompt: "¿Para qué sirve usar un Null Object emparentando múltiples capas?",
        options: [
          "Para borrar capas vacías",
          "Para transformar (mover, escalar o rotar) un grupo completo con un solo controlador sin destruir animaciones individuales",
          "Para exportar en formato GIF",
          "Para reducir la profundidad de bits a 8-bit",
        ],
        correctIndex: 1,
      },
      {
        id: "ma-3",
        prompt: "¿Cuándo es recomendable precomponer (Pre-compose) un conjunto de elementos?",
        options: [
          "Para encapsular animaciones reutilizables, aplicar efectos globales a un bloque o mantener limpio el timeline",
          "Solo al final cuando el proyecto tiene 1 sola capa",
          "Para desactivar el canal alfa",
          "Para eliminar los keyframes",
        ],
        correctIndex: 0,
      },
      {
        id: "ma-4",
        prompt: "¿Qué formato permite entregar un lower-third o overlay gráfico con transparencia real sobre otro video?",
        options: [
          "H.264 MP4 estándar sin alfa",
          "Apple ProRes 4444 (RGB + Alpha) o QuickTime Animation con canal Alpha",
          "MP3 estéreo",
          "JPEG secuencial",
        ],
        correctIndex: 1,
      },
      {
        id: "ma-5",
        prompt: "¿Para qué se usa Track Matte (Alpha Matte / Luma Matte) en After Effects?",
        options: [
          "Para estabilizar audio con ruido",
          "Para recortar o revelar una capa usando la silueta o luminancia de otra capa animada",
          "Para cambiar el idioma de la interfaz",
          "Para sincronizar subtítulos SRT",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "audio-color",
    label: "Color Grading & Mezcla de Audio",
    tools: "DaVinci Resolve · Lumetri · Audition",
    description: "Control de loudness, ducking de voz, piel natural y gestión básica de espacio de color.",
    passingScorePct: 80,
    questions: [
      {
        id: "ac-1",
        prompt: "¿Para qué sirven los Scopes (Waveform / Vectorscope / Parade) al corregir color?",
        options: [
          "Para medir exposición, balance de blancos y tonos de piel objetivamente sin depender solo del brillo del monitor",
          "Para acelerar los cortes automáticos",
          "Para generar subtítulos por voz",
          "Para convertir archivos RAW en PNG",
        ],
        correctIndex: 0,
      },
      {
        id: "ac-2",
        prompt: "Si la música de fondo compite con la voz del presentador, ¿qué ajuste técnico resuelve el problema mejor?",
        options: [
          "Subir la ganancia master a +12 dB",
          "Limpiar frecuencias que chocan con la voz, aplicar compresión/ducking suave (-18 a -24 dB relativos en música) y mantener diálogos entre -12 y -6 dBFS",
          "Mutear la voz y subir la música",
          "Aplicar reverberación extrema a ambos canales",
        ],
        correctIndex: 1,
      },
      {
        id: "ac-3",
        prompt: "¿Qué indica la 'Skin Tone Line' en el Vectorscope al hacer color grading?",
        options: [
          "La velocidad máxima de bitrate",
          "La línea de referencia natural de los tonos de piel humana independientemente de la etnia para evitar piel verde o magenta artificial",
          "El nivel de pico de audio",
          "El espacio libre en disco",
        ],
        correctIndex: 1,
      },
      {
        id: "ac-4",
        prompt: "¿Cuál es el orden lógico dentro de una cadena de color (Color Management / Nodos)?",
        options: [
          "Primero looks creativos pesados y luego exposición",
          "Primero corrección primaria / transformación de espacio Log -> Rec.709 (balance y exposición), luego ajustes secundarios/piel y look creativo al final",
          "Aplicar LUT creativo antes de balancear exposición sin ajustar intensidad",
          "Exportar primero y corregir después en otro proyecto con baja compresión",
        ],
        correctIndex: 1,
      },
      {
        id: "ac-5",
        prompt: "¿Por qué se aplica un High-Pass Filter (~80–100 Hz) en pistas de diálogo grabado?",
        options: [
          "Para agregar subgraves cinematográficos a la voz",
          "Para limpiar retumbos graves, viento o vibraciones del micrófono sin afectar la claridad de la voz",
          "Para aumentar el volumen de la música",
          "Para exportar a 48 fps",
        ],
        correctIndex: 1,
      },
    ],
  },
];

export function getSkillTrackById(skillId: string): SkillTrack | undefined {
  return SKILL_TRACKS.find((t) => t.id === skillId);
}
