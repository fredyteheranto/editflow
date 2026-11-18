"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaSnapshot {
  hydrated: boolean;
  canPrompt: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
}

const SERVER_SNAPSHOT: PwaSnapshot = {
  hydrated: false,
  canPrompt: false,
  isStandalone: false,
  isIosSafari: false,
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let clientSnapshot: PwaSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function computeSnapshot(): PwaSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return {
    hydrated: true,
    canPrompt: Boolean(deferredPrompt),
    isStandalone,
    isIosSafari: isIos && isSafari,
  };
}

function initPwaStore() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  clientSnapshot = computeSnapshot();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    clientSnapshot = computeSnapshot();
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    clientSnapshot = computeSnapshot();
    notify();
  });
}

function subscribe(listener: () => void) {
  initPwaStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PwaSnapshot {
  initPwaStore();
  return clientSnapshot;
}

function getServerSnapshot(): PwaSnapshot {
  return SERVER_SNAPSHOT;
}

/**
 * Registra el Service Worker de EditFlow una sola vez en el navegador y
 * captura el evento `beforeinstallprompt` para habilitar la instalación como app.
 */
export function PwaRegistrar() {
  useEffect(() => {
    initPwaStore();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si el navegador bloquea SW (p. ej. modo privado estricto), la web sigue igual.
      });
    }
  }, []);

  return null;
}

export function InstallAppButton({ variant = "header" }: { variant?: "header" | "sidebar" }) {
  const { hydrated, canPrompt, isStandalone, isIosSafari } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  if (!hydrated || isStandalone) return null;
  if (!canPrompt && !isIosSafari) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        clientSnapshot = computeSnapshot();
        notify();
      }
      return;
    }

    if (isIosSafari) {
      setIosHelpOpen(true);
    }
  }

  return (
    <>
      {variant === "sidebar" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="mb-1 w-full justify-start gap-2 px-2 text-xs text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          title="Instalar EditFlow como aplicación"
        >
          <Download className="size-4 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">Instalar app</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="gap-1.5 rounded-full"
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Instalar app</span>
          <span className="sm:hidden">Instalar</span>
        </Button>
      )}

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-4 text-primary" />
              Instalar EditFlow en iPhone / iPad
            </DialogTitle>
            <DialogDescription>
              Para usarla como aplicación en pantalla completa desde Safari:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-foreground">1.</span>
              <span>
                Toca el botón <strong className="text-foreground">Compartir</strong>{" "}
                <Share className="inline size-3.5 align-text-bottom text-foreground" /> en la barra de
                Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-foreground">2.</span>
              <span>
                Desliza y selecciona <strong className="text-foreground">Agregar a pantalla de inicio</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-foreground">3.</span>
              <span>
                Confirma con <strong className="text-foreground">Agregar</strong> y ábrela desde tu pantalla
                principal.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
