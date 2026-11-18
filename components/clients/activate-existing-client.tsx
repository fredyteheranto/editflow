"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { activateClientInPeriod } from "@/lib/actions/clients";
import type { ClientSummary } from "@/lib/actions/clients";
import { markLocalMutation } from "@/lib/realtime/local-mutation";

export function ActivateExistingClient({
  organizationId,
  periodId,
  candidates,
}: {
  organizationId: string;
  periodId: string;
  candidates: ClientSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState<Record<string, number>>(() =>
    Object.fromEntries(candidates.map((c) => [c.id, c.default_monthly_goal])),
  );
  const [isPending, startTransition] = useTransition();

  function handleActivate(clientId: string, goal: number) {
    startTransition(async () => {
      const result = await activateClientInPeriod(organizationId, periodId, clientId, goal, "Productora");
      if (result.ok) {
        markLocalMutation();
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="size-4" />
          Activar cliente existente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activar cliente de tu cartera</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todos tus clientes activos ya están sumados a este mes.
            </p>
          ) : (
            candidates.map((client) => (
              <div key={client.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex-1 text-sm">{client.name}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={goals[client.id] ?? 0}
                  onChange={(e) =>
                    setGoals((prev) => ({ ...prev, [client.id]: Number(e.target.value) }))
                  }
                />
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleActivate(client.id, goals[client.id] ?? 0)}
                >
                  Activar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
