"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import {
  iniciarSesionConInvitacion,
  registrarConInvitacion,
} from "@/lib/actions/invitations";
import { solicitarReset } from "@/lib/actions/auth";

export function InviteAuthForm({
  token,
  email,
  initialName,
}: {
  token: string;
  email: string;
  initialName?: string;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [fullName, setFullName] = useState(initialName ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Ingresa tu nombre completo.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const r = await registrarConInvitacion(token, password, fullName);
      if (!r.ok) {
        if (r.code === "already_registered") {
          setMode("login");
          setConfirm("");
          toast.info(r.error);
        } else {
          toast.error(r.error);
        }
      }
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 4) {
      toast.error("Ingresa tu contraseña.");
      return;
    }

    startTransition(async () => {
      const r = await iniciarSesionConInvitacion(token, password);
      if (!r.ok) toast.error(r.error);
    });
  }

  async function handleReset() {
    await solicitarReset(email);
    toast.success("Si tu correo está registrado, te enviamos un enlace para restablecer tu contraseña.");
  }

  return (
    <div className="space-y-4 text-left">
      <SocialAuthButtons next={`/invitacion/${token}`} loginHint={email} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />o con tu correo<div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "register"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "login"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ya tengo cuenta
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>Correo invitado</Label>
        <Input value={email} disabled />
      </div>

      {mode === "register" ? (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nombre completo</Label>
            <Input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-new-password">Contraseña (mínimo 6 caracteres)</Label>
            <Input
              id="invite-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-confirm-password">Confirmar contraseña</Label>
            <Input
              id="invite-confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta…" : "Registrarme y entrar al equipo"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-password">Contraseña</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Entrando…" : "Iniciar sesión y entrar"}
          </Button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña? Restablecer
          </button>
        </form>
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "register"
          ? "Si todavía no tienes cuenta en EditFlow, créala aquí y quedarás vinculado automáticamente al equipo."
          : "Ingresa con la contraseña que usas en EditFlow (o usa Google si te registraste con Google)."}
      </p>
    </div>
  );
}
