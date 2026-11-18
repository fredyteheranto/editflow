"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  // El enlace de recuperación llega con los tokens en el hash (#access_token…);
  // los tomamos para establecer la sesión y poder cambiar la contraseña.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    const p = new URLSearchParams(hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (access_token && refresh_token) {
      createClient()
        .auth.setSession({ access_token, refresh_token })
        .catch(() => {})
        .finally(() => window.history.replaceState(null, "", window.location.pathname));
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    startTransition(async () => {
      try {
        const { error } = await createClient().auth.updateUser({ password });
        if (error) {
          toast.error("No se pudo cambiar la contraseña", {
            description: error.message || "Puede que el enlace haya expirado. Solicita uno nuevo.",
          });
          return;
        }
        toast.success("Contraseña actualizada");
        router.push("/app/dashboard");
      } catch (err) {
        toast.error("Falta configurar Supabase en .env.local", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="nueva">Nueva contraseña (mínimo 6 caracteres)</Label>
        <Input
          id="nueva"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmar">Confirmar contraseña</Label>
        <Input
          id="confirmar"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
