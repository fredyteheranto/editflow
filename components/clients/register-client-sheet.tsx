"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { registerClient, type ActionResult } from "@/lib/actions/clients";
import { ClientBriefFields } from "@/components/clients/client-brief-fields";
import { markLocalMutation } from "@/lib/realtime/local-mutation";

const INITIAL_STATE: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Registrar cliente"}
    </Button>
  );
}

export function RegisterClientSheet({
  organizationId,
  periodId,
}: {
  organizationId: string;
  periodId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (_prev: ActionResult, fd: FormData) => {
    const result = await registerClient(organizationId, periodId, fd);
    if (result.ok) {
      markLocalMutation();
      setOpen(false);
    }
    return result;
  }, INITIAL_STATE);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Registrar cliente
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Registrar cliente</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          <ClientBriefFields />

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
      </SheetContent>
    </Sheet>
  );
}
