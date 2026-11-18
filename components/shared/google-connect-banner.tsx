"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGoogleConnect } from "@/lib/google/start-connect";
import type { MemberRole } from "@/types/database.types";

export function GoogleConnectBanner({
  accountEmail,
  role,
  reason = "not_connected",
  canOpenSettings = true,
}: {
  accountEmail?: string;
  role: MemberRole;
  reason?: "not_connected" | "expired";
  canOpenSettings?: boolean;
}) {
  const pathname = usePathname() || "/app/dashboard";
  const [dismissed, setDismissed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  if (dismissed || pathname === "/app/configuracion") return null;

  const isManager = role === "owner" || role === "admin";
  const headline =
    reason === "expired"
      ? "Tu conexión de Google Calendar expiró."
      : "Aún no has conectado Google Calendar.";

  const detail = isManager
    ? "Es importante conectarlo para generar enlaces automáticos de Google Meet y sincronizar tus reuniones en Google Calendar."
    : "Es importante conectarlo para sincronizar tus entregas y reuniones en tu Google Calendar automáticamente.";

  async function handleConnect() {
    setInlineError(null);
    setConnecting(true);
    const { error } = await startGoogleConnect(pathname, accountEmail);
    if (error) {
      setInlineError(error);
      toast.error("No se pudo iniciar la conexión con Google", { description: error });
      setConnecting(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning sm:mt-0" />
        <div className="min-w-0 text-xs sm:text-sm">
          <span className="font-semibold text-foreground">{headline} </span>
          <span className="text-muted-foreground">{detail}</span>
          {inlineError && (
            <p className="mt-1 font-medium text-danger">{inlineError}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-1.5">
          <CalendarCheck2 className="size-3.5" />
          {connecting ? "Conectando…" : "Conectar Google"}
        </Button>
        {canOpenSettings && (
          <Button asChild size="sm" variant="outline">
            <Link href="/app/configuracion">Configuración</Link>
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setDismissed(true)}
          aria-label="Ocultar aviso temporalmente"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
