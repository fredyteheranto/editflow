import { NextResponse } from "next/server";
import { getPlatformConfig } from "@/lib/platform/config";
import { isCurrentUserSuperAdmin } from "@/lib/platform/auth";
import { answerWithDitto } from "@/lib/ditto/engine";
import type { DittoPendingFollowUp } from "@/lib/ditto/guides";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      pathname?: string;
      role?: string;
      pendingFollowUp?: DittoPendingFollowUp;
    };

    const message = body.message?.trim() ?? "";
    const pathname = body.pathname?.trim() || "/";
    if (!message) {
      return NextResponse.json({ error: "Escribe tu pregunta para Ditto." }, { status: 400 });
    }

    const [config, isSuperAdmin] = await Promise.all([
      getPlatformConfig(),
      isCurrentUserSuperAdmin(),
    ]);
    if (!config.ditto.enabled || (!config.ditto.publicEnabled && !isSuperAdmin)) {
      return NextResponse.json(
        { error: "El asistente está desactivado temporalmente." },
        { status: 403 },
      );
    }

    const result = await answerWithDitto({
      message,
      pathname,
      role: body.role,
      config,
      pendingFollowUp: body.pendingFollowUp,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo consultar a Ditto." },
      { status: 500 },
    );
  }
}
