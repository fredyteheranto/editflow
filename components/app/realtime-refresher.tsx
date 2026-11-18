"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isRecentLocalMutation } from "@/lib/realtime/local-mutation";

// Tablas de la organización cuyos cambios deben reflejarse en vivo para todo
// el equipo. Todas tienen organization_id, así que la suscripción se filtra a
// la organización actual (cada quien solo recibe lo de su equipo, y RLS
// limita además a lo que ese rol puede ver).
const TABLAS = [
  "videos",
  "calendar_events",
  "clients",
  "client_periods",
  "memberships",
  "invitations",
  "periods",
] as const;

/**
 * Cuando cualquier miembro agrega o modifica datos de la organización,
 * Supabase Realtime avisa a los demás que tengan la app abierta y se dispara
 * router.refresh() (con un pequeño debounce) para traer el estado nuevo sin
 * tener que recargar a mano.
 */
export function RealtimeRefresher({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendienteAlVolver = false;
    // Nunca dejar que un problema de Realtime (WebSocket, publicación no
    // habilitada, etc.) tumbe la app: si falla, simplemente no hay refresco
    // en vivo, pero la página carga igual.
    let cleanup = () => {};
    let cancelado = false;

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && pendienteAlVolver) {
        pendienteAlVolver = false;
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    (async () => {
      try {
        const supabase = createClient();

        // Autenticar Realtime con el token del usuario: las tablas tienen RLS,
        // así que sin esto el servidor no entrega los cambios (la conexión
        // sería anónima y RLS la filtraría por completo).
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
        if (cancelado) return;

        const refrescar = () => {
          // Si el cambio vino de esta misma pestaña hace <2s, revalidatePath()
          // de la Server Action ya actualizó el árbol RSC sin recargar de nuevo.
          if (isRecentLocalMutation()) return;
          if (document.visibilityState === "hidden") {
            pendienteAlVolver = true;
            return;
          }
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 500);
        };

        const channel = supabase.channel(`org-${organizationId}`);
        for (const table of TABLAS) {
          channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
            refrescar,
          );
        }
        channel.subscribe();

        cleanup = () => {
          try {
            supabase.removeChannel(channel);
          } catch {
            // sin importancia al desmontar
          }
        };
      } catch (err) {
        console.error("Realtime no disponible:", err);
      }
    })();

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [organizationId, router]);

  return null;
}
