"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CalendarCheck2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGoogleConnect } from "@/lib/google/start-connect";

/**
 * Paso opcional de onboarding para conectar Google Calendar + Gmail.
 * Ya no dispara la redirección automática al cargar la página para evitar
 * atrapar registros nuevos si el usuario cancela o si la verificación OAuth
 * en Google Cloud está pendiente.
 */
export default function ConectarGooglePage() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    const detail = params.get("google_error_detail");
    if (googleError) {
      setError(
        detail
          ? `Google no completó la conexión (${detail}). Puedes omitir este paso y entrar al Dashboard.`
          : "No se completó la conexión con Google. Puedes entrar al Dashboard y conectarlo después en Configuración.",
      );
    }
  }, []);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    const result = await startGoogleConnect("/app/dashboard");
    if (result.error) {
      setError(result.error);
      setConnecting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <div className="w-full max-w-md space-y-5 rounded-xl border border-border/70 bg-card/70 p-6 text-center shadow-sm">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarCheck2 className="size-5" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">
            Conecta Google Calendar y Meet (opcional)
          </h1>
          <p className="text-sm text-muted-foreground">
            Activa enlaces automáticos de Google Meet e invitaciones desde tu calendario cuando
            agendes reuniones en EditFlow. Puedes hacerlo ahora o después.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-left text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-1">
          <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2">
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck2 className="size-4" />}
            {connecting ? "Abriendo Google…" : "Conectar Google ahora"}
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/app/dashboard">Omitir por ahora e ir al Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
