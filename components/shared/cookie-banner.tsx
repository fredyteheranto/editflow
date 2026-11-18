"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "editflow_cookie_consent_v1";
export const OPEN_COOKIE_BANNER_EVENT = "editflow:open-cookie-banner";

interface ConsentRecord {
  essential: true;
  preferences: boolean;
  dataProcessingAccepted: true;
  updatedAt: string;
}

export function openCookieBanner() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_COOKIE_BANNER_EVENT));
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }

    const handleOpen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_BANNER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_COOKIE_BANNER_EVENT, handleOpen);
  }, []);

  function saveConsent(preferences: boolean) {
    const record: ConsentRecord = {
      essential: true,
      preferences,
      dataProcessingAccepted: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignorar si el almacenamiento local está bloqueado; oculta el banner en esta vista.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Aviso de cookies y tratamiento de datos personales"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Cookie className="size-4" />
          </div>
          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Cookies y Tratamiento de Datos Personales
            </p>
            <p>
              Usamos cookies esenciales para tu sesión segura (Google o correo) y cookies
              de preferencias (tema y periodo activo). Al continuar, aceptas nuestra{" "}
              <Link href="/privacidad" className="text-primary underline underline-offset-2">
                Política de Privacidad
              </Link>
              , el{" "}
              <Link
                href="/privacidad#tratamiento-datos"
                className="text-primary underline underline-offset-2"
              >
                Tratamiento de Datos Personales
              </Link>{" "}
              y las{" "}
              <Link href="/terminos" className="text-primary underline underline-offset-2">
                Condiciones del Servicio
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => saveConsent(false)}
          >
            Solo esenciales
          </Button>
          <Button type="button" size="sm" onClick={() => saveConsent(true)}>
            Aceptar todas
          </Button>
        </div>
      </div>
    </aside>
  );
}
