"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { updateClient, deleteClient, type ActionResult } from "@/lib/actions/clients";
import { ClientBriefFields } from "@/components/clients/client-brief-fields";
import { markLocalMutation } from "@/lib/realtime/local-mutation";

const INITIAL_STATE: ActionResult = { ok: true };

export interface ClientFull {
  id: string;
  name: string;
  brand_name: string | null;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_links: { instagram?: string; tiktok?: string; youtube?: string } | null;
  brand_description: string | null;
  target_audience: string | null;
  do_not_do: string | null;
  delivery_formats: string[] | null;
  default_monthly_goal: number;
  default_strategist: string | null;
  assets_drive_url: string | null;
  notes: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  );
}

// Se abre directo al hacer clic en la tarjeta del cliente (sin paso
// intermedio) — controlado desde afuera para que un solo Sheet sirva para
// cualquiera de las tarjetas de la grilla. El padre debe montarlo con
// key={client?.id ?? "closed"} para que el estado del form (y cualquier
// error previo) arranque limpio cada vez que se abre para un cliente
// distinto, en vez de arrastrar el estado del anterior.
export function EditClientSheet({
  client,
  open,
  onOpenChange,
  canDelete,
}: {
  client: ClientFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
}) {
  const [state, formAction] = useActionState(async (_prev: ActionResult, fd: FormData) => {
    if (!client) return INITIAL_STATE;
    const result = await updateClient(client.id, fd);
    if (result.ok) {
      markLocalMutation();
      onOpenChange(false);
    }
    return result;
  }, INITIAL_STATE);

  const [isDeleting, startDelete] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDelete() {
    if (!client) return;
    startDelete(async () => {
      const result = await deleteClient(client.id);
      if (result.ok) {
        markLocalMutation();
        toast.success("Cliente eliminado");
        setConfirmingDelete(false);
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="flex-row items-center justify-between gap-2 pr-10">
          <SheetTitle>Editar brief — {client?.name}</SheetTitle>
          {client && canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Eliminar cliente"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </SheetHeader>

        {client && (
          <form action={formAction} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
            <ClientBriefFields
              defaults={{
                name: client.name,
                brandName: client.brand_name ?? undefined,
                industry: client.industry ?? undefined,
                instagram: client.social_links?.instagram,
                tiktok: client.social_links?.tiktok,
                youtube: client.social_links?.youtube,
                contactName: client.contact_name ?? undefined,
                contactPhone: client.contact_phone ?? undefined,
                contactEmail: client.contact_email ?? undefined,
                brandDescription: client.brand_description ?? undefined,
                targetAudience: client.target_audience ?? undefined,
                doNotDo: client.do_not_do ?? undefined,
                deliveryFormats: client.delivery_formats ?? undefined,
                monthlyGoal: client.default_monthly_goal,
                strategist: client.default_strategist ?? undefined,
                assetsUrl: client.assets_drive_url ?? undefined,
                notes: client.notes ?? undefined,
              }}
            />

            {!state.ok && <p className="text-sm text-danger">{state.error}</p>}

            <SheetFooter className="mt-auto flex-row justify-end gap-2 px-0">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </SheetClose>
              <SubmitButton />
            </SheetFooter>
          </form>
        )}
      </SheetContent>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {client?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borra la ficha del cliente y TODOS sus videos de TODOS los meses,
              incluidos los ya cerrados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
