"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { CalendarRange, ChevronDown, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { setActivePeriod } from "@/lib/actions/periods";
import type { ActivePeriod } from "@/lib/period/resolve";
import { markLocalMutation } from "@/lib/realtime/local-mutation";

export function PeriodSwitcher({
  periods,
  activePeriodId,
  canManage,
}: {
  periods: ActivePeriod[];
  activePeriodId: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const active = periods.find((p) => p.id === activePeriodId);

  function selectPeriod(periodId: string) {
    startTransition(async () => {
      markLocalMutation();
      await setActivePeriod(periodId);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isPending}>
          <CalendarRange className="size-4" />
          {active ? active.label : "Selecciona un mes"}
          {active?.status === "cerrado" && <Lock className="size-3.5 text-muted-foreground" />}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Periodos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {periods.map((period) => (
          <DropdownMenuItem
            key={period.id}
            onSelect={() => selectPeriod(period.id)}
            className="flex items-center justify-between"
          >
            <span>{period.label}</span>
            <Badge
              variant={period.status === "abierto" ? "default" : "outline"}
              className="text-[10px]"
            >
              {period.status === "abierto" ? "Abierto" : "Cerrado"}
            </Badge>
          </DropdownMenuItem>
        ))}
        {canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/periodos/nuevo" className="gap-2">
                <Plus className="size-4" />
                Abrir nuevo mes
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
