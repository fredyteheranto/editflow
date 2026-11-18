"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import {
  sendMagicLink,
  signInWithPasswordAction,
  solicitarReset,
  type MagicLinkState,
  type PasswordLoginState,
} from "@/lib/actions/auth";

const INITIAL_ML: MagicLinkState = { status: "idle" };
const INITIAL_PW: PasswordLoginState = { status: "idle" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {children}
    </Button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />o con tu correo<div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function AccountForm({ next, modo }: { next: string; modo: "iniciar" | "acceso" }) {
  const [mlState, mlAction] = useActionState(sendMagicLink, INITIAL_ML);
  const [pwState, pwAction] = useActionState(signInWithPasswordAction, INITIAL_PW);
  const [email, setEmail] = useState("");

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Escribe tu correo arriba y vuelve a darle a Restablecer.");
      return;
    }
    await solicitarReset(email.trim());
    toast.success("Si tu correo está registrado, te enviamos un enlace para restablecer tu contraseña.");
  }

  // ----- Modo ACCESO (volver a entrar): correo + contraseña o Google. -----
  if (modo === "acceso") {
    return (
      <div className="space-y-4">
        <SocialAuthButtons next={next} />
        <Divider />
        <form action={pwAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" placeholder="••••" required />
          </div>
          {pwState.status === "error" && <p className="text-sm text-danger">{pwState.message}</p>}
          <SubmitButton>Entrar</SubmitButton>
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña? Restablecer
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Si fuiste invitado, entra con tu correo y tu contraseña (o con Google).
        </p>
      </div>
    );
  }

  // ----- Modo INICIAR (crear espacio): enlace mágico + Google. -----
  if (mlState.status === "sent") {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-center">
        <Mail className="mx-auto size-8 text-primary" />
        <p className="mt-3 font-medium">Revisa tu correo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviamos un enlace de acceso a <strong>{mlState.message}</strong>. Ábrelo desde este
          mismo dispositivo para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SocialAuthButtons next={next} />
      <Divider />
      <form action={mlAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" placeholder="Lean Productor" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" placeholder="lean@correo.com" required />
        </div>
        {mlState.status === "error" && <p className="text-sm text-danger">{mlState.message}</p>}
        <SubmitButton>
          <Mail className="size-4" />
          Enviar enlace de acceso
        </SubmitButton>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Al continuar creas tu cuenta sin necesidad de contraseña.
      </p>
    </div>
  );
}
