import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByToken, signOutAndReturnToInvite } from "@/lib/actions/invitations";
import { InviteAuthForm } from "@/components/auth/invite-auth-form";
import { AcceptInvitationButton } from "@/components/auth/accept-invitation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Invitación al equipo",
  robots: NOINDEX_ROBOTS,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega",
};

export default async function InvitacionPage({
  params,
}: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <div className="w-full max-w-sm text-center">
        {!invitation ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Invitación no encontrada</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              El enlace no es válido. Pídele a quien te invitó que te envíe uno nuevo.
            </p>
          </>
        ) : invitation.status === "revocada" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Invitación no disponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta invitación fue revocada. Pídele a quien te invitó que te envíe una nueva.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Te invitaron a {invitation.organizationName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Como <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invitation.fullName ? `${invitation.fullName} · ${invitation.email}` : invitation.email}
            </p>

            <div className="mt-8 text-left">
              {user ? (
                user.email?.toLowerCase() === invitation.email.toLowerCase() ? (
                  <AcceptInvitationButton token={token} />
                ) : (
                  <div className="space-y-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-center">
                    <p className="text-sm text-danger">
                      Esta invitación es para <strong>{invitation.email}</strong>, pero iniciaste sesión con{" "}
                      <strong>{user.email ?? "otra cuenta"}</strong>.
                    </p>
                    <form
                      action={async () => {
                        "use server";
                        await signOutAndReturnToInvite(token);
                      }}
                    >
                      <Button type="submit" variant="outline" className="w-full">
                        Cerrar sesión y continuar con {invitation.email}
                      </Button>
                    </form>
                  </div>
                )
              ) : (
                <InviteAuthForm
                  token={token}
                  email={invitation.email}
                  initialName={invitation.fullName ?? undefined}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
