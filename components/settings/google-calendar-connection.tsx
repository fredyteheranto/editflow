"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarCheck2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { disconnectGoogleCalendar } from "@/lib/actions/google-calendar";
import { startGoogleConnect } from "@/lib/google/start-connect";

export function GoogleCalendarConnection({
  connected,
  googleEmail,
  accountEmail,
}: {
  connected: boolean;
  googleEmail?: string;
  /** El correo con el que el usuario ingresa a EditFlow — Google debe
   *  conectarse con esta MISMA cuenta (la propia), nunca con otra. */
  accountEmail: string;
}) {
  const [connecting, setConnecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleConectar() {
    setConnecting(true);
    const { error } = await startGoogleConnect("/app/configuracion", accountEmail);
    if (error) {
      toast.error("No se pudo iniciar la conexión con Google", { description: error });
      setConnecting(false);
    }
    // Si no hay error, el navegador redirige a Google — no hace falta más.
  }

  function handleDesconectar() {
    startTransition(async () => {
      try {
        await disconnectGoogleCalendar();
        toast.success("Google Calendar desconectado");
      } catch (err) {
        toast.error("No se pudo desconectar", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarCheck2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Google Calendar y Meet</p>
            {connected ? (
              <p className="text-xs text-muted-foreground">
                Conectado como <span className="font-medium text-foreground">{googleEmail}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Se conecta con <span className="font-medium text-foreground">{accountEmail}</span> — tu
                propio correo, el mismo con el que ingresas a EditFlow.
              </p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-success/40 text-success">
              Conectado
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleDesconectar} disabled={isPending}>
              <Unlink className="size-3.5" />
              Desconectar
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleConectar} disabled={connecting}>
            {connecting ? "Redirigiendo…" : "Conectar Google"}
          </Button>
        )}
      </div>
      {!connected && (
        <p className="text-xs text-muted-foreground">
          En la pantalla de Google, elige exactamente{" "}
          <span className="font-medium text-foreground">{accountEmail}</span> — tu propia cuenta. Con
          otra la conexión se rechaza automáticamente.
        </p>
      )}
    </div>
  );
}
