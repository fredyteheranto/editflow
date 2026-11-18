"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Compass,
  Copy,
  ExternalLink,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getRouteGuide,
  type DittoAnswer,
  type DittoMeetingCard,
  type DittoPendingFollowUp,
} from "@/lib/ditto/guides";
import { markLocalMutation } from "@/lib/realtime/local-mutation";
import type { PlatformConfig } from "@/lib/platform/types";
import { useDittoRole } from "@/components/ditto/ditto-context";

interface ChatMessage {
  id: string;
  sender: "ditto" | "user";
  text: string;
  steps?: string[];
  cta?: { label: string; href: string };
  meetingCard?: DittoMeetingCard;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const emptySubscribe = () => () => {};
function getSpeechSupportSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function DittoAvatar({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dittoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        fill="url(#dittoGrad)"
        d="M32 7c9 0 13 5 18 9 5 4 9 9 8 16-1 6-3 10-1 15 1 4-2 9-9 9-6 0-9-2-16-2s-10 2-16 2c-7 0-10-5-9-9 2-5 0-9-1-15-1-7 3-12 8-16 5-4 9-9 18-9z"
      />
      <circle cx="24" cy="29" r="2.6" fill="#18122B" />
      <circle cx="40" cy="29" r="2.6" fill="#18122B" />
      <path
        d="M22 37c4 4 16 4 20 0"
        fill="none"
        stroke="#18122B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DittoAssistant({
  config,
}: {
  config: PlatformConfig;
}) {
  const role = useDittoRole();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isSuperAdmin = role === "super_admin";
  const isAppRoute = pathname.startsWith("/app") || pathname.startsWith("/super-admin");
  const isVisible =
    config.ditto.enabled &&
    (isSuperAdmin ||
      (config.ditto.publicEnabled && (isAppRoute || config.ditto.showOnPublicPages)));
  const voiceSupported = useSyncExternalStore(emptySubscribe, getSpeechSupportSnapshot, () => false);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState<DittoPendingFollowUp | undefined>();
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "ditto",
      text: config.ditto.welcomeMessage,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const routeGuide = useMemo(() => getRouteGuide(pathname, config), [pathname, config]);
  const visibleSuggestions = dynamicSuggestions ?? routeGuide.suggestions;

  if (!isVisible) return null;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }

  function showCurrentScreenGuide() {
    setMessages((prev) => [
      ...prev,
      {
        id: `guide-${Date.now()}`,
        sender: "ditto",
        text: `Guía rápida para «${routeGuide.title}»: ${routeGuide.summary}`,
        steps: routeGuide.steps,
        cta: routeGuide.cta,
      },
    ]);
    setDynamicSuggestions(routeGuide.suggestions);
    scrollToBottom();
  }

  async function askDitto(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/ditto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pathname,
          role,
          pendingFollowUp,
        }),
      });
      const data = (await res.json()) as DittoAnswer & { error?: string };

      setPendingFollowUp(data.pendingFollowUp);
      if (data.suggestions && data.suggestions.length > 0) {
        setDynamicSuggestions(data.suggestions);
      }

      if (data.mutated) {
        markLocalMutation();
        router.refresh();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `d-${Date.now()}`,
          sender: "ditto",
          text: data.reply || data.error || "No pude responder en este momento.",
          steps: data.steps,
          cta: data.cta,
          meetingCard: data.meetingCard,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `d-err-${Date.now()}`,
          sender: "ditto",
          text: `Aquí tienes la guía directa para «${routeGuide.title}»: ${routeGuide.summary}`,
          steps: routeGuide.steps,
          cta: routeGuide.cta,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function toggleVoice() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
      setListening(false);
      if (transcript) {
        void askDitto(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function copyMeetLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      {open && (
        <div className="flex max-h-[min(36rem,calc(100dvh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl sm:w-[25rem]">
          <div className="flex items-center justify-between gap-2 border-b bg-card/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <DittoAvatar className="size-7" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{config.ditto.assistantName}</span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    Copiloto
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{config.ditto.tagline}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente Ditto"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2 text-xs">
            <span className="truncate text-muted-foreground">
              Pantalla: <strong className="text-foreground">{routeGuide.title}</strong>
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={showCurrentScreenGuide}
              className="shrink-0 gap-1"
            >
              <Compass className="size-3" />
              Guíame aquí
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1.5 ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-card-foreground"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.meetingCard && (
                    <div className="mt-2.5 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Video className="size-3.5 shrink-0" />
                        <span className="truncate">{m.meetingCard.title}</span>
                      </div>
                      <p className="text-muted-foreground">{m.meetingCard.whenLabel}</p>
                      {m.meetingCard.emailedRecipients.length > 0 && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          Invitación enviada a: {m.meetingCard.emailedRecipients.join(", ")}
                        </p>
                      )}
                      {m.meetingCard.meetingUrl && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <a
                            href={m.meetingCard.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            <ExternalLink className="size-3" />
                            Unirse con Google Meet
                          </a>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => void copyMeetLink(m.meetingCard!.meetingUrl!)}
                            className="h-6 gap-1 px-2 text-[11px]"
                          >
                            <Copy className="size-3" />
                            Copiar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {m.steps && m.steps.length > 0 && (
                    <ol className="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      {m.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-1.5">
                          <span className="font-semibold text-primary">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {m.cta && (
                    <Button
                      asChild
                      size="xs"
                      variant="secondary"
                      className="mt-2.5 gap-1"
                      onClick={() => setOpen(false)}
                    >
                      <Link href={m.cta.href}>
                        {m.cta.label}
                        <ArrowRight className="size-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 animate-pulse text-primary" />
                Ditto está ejecutando…
              </div>
            )}
          </div>

          <div className="border-t bg-card/60 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {visibleSuggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void askDitto(q)}
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askDitto(input);
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ej: Agenda reunión con Saúl el viernes 4pm…`}
                className="h-9 text-xs"
              />
              {voiceSupported && (
                <Button
                  type="button"
                  size="icon"
                  variant={listening ? "destructive" : "outline"}
                  className="size-9 shrink-0"
                  onClick={toggleVoice}
                  title={listening ? "Detener dictado" : "Hablarle a Ditto"}
                  aria-label="Dictar por voz a Ditto"
                >
                  {listening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </Button>
              )}
              <Button type="submit" size="icon" className="size-9 shrink-0" disabled={loading || !input.trim()}>
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group h-11 gap-2 rounded-full border border-primary/40 bg-card/95 pr-4 pl-2.5 text-foreground shadow-lg shadow-primary/15 hover:border-primary hover:bg-card"
        aria-label={`Abrir asistente virtual ${config.ditto.assistantName}`}
      >
        <DittoAvatar className="size-7 transition-transform group-hover:scale-110" />
        <span className="text-xs font-semibold">{config.ditto.assistantName}</span>
      </Button>
    </div>
  );
}
