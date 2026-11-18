"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveOrganization, getEffectiveRolePermissions } from "@/lib/period/resolve";
import type { Database, VideoPriority, VideoStatus } from "@/types/database.types";

type VideoUpdate = Database["public"]["Tables"]["videos"]["Update"];

export type VideoActionResult = { ok: true } | { ok: false; error: string };

export interface CreateVideoInput {
  periodId: string;
  clientId: string;
  title: string;
  editorId?: string | null;
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null;
  priority?: VideoPriority;
}

async function getNextVideoSeq(
  organizationId: string,
  periodId: string,
  clientId: string,
): Promise<{ seq: number; error: string | null }> {
  // Se consulta con service role porque las políticas RLS (videos_select_own)
  // ocultan al rol 'editor' los videos de otros miembros. Si no se pasa un seq
  // explícito, el trigger set_video_seq() calcula max(seq)+1 bajo RLS y
  // colisiona con el índice único (period_id, client_id, seq).
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("videos")
    .select("seq")
    .eq("organization_id", organizationId)
    .eq("period_id", periodId)
    .eq("client_id", clientId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { seq: 0, error: error.message };
  }

  return { seq: (data?.seq ?? 0) + 1, error: null };
}

export async function createVideo(input: CreateVideoInput): Promise<VideoActionResult> {
  const [org, perms] = await Promise.all([requireActiveOrganization(), getEffectiveRolePermissions()]);
  if (org.role === "viewer" || !perms.canCreateVideos) {
    return { ok: false, error: "No tienes permiso para registrar videos." };
  }
  if (!input.title.trim()) {
    return { ok: false, error: "El título es obligatorio." };
  }

  // Un editor solo ve los videos donde es el encargado (RLS videos_select_own),
  // así que si crea uno sin asignar encargado, se lo asignamos a sí mismo para
  // que lo pueda ver y trabajar.
  let editorId = input.editorId || null;
  if (!editorId && org.role === "editor") editorId = org.membershipId;

  const supabase = await createClient();
  const MAX_SEQ_ATTEMPTS = 4;

  for (let attempt = 0; attempt < MAX_SEQ_ATTEMPTS; attempt += 1) {
    const seqResult = await getNextVideoSeq(org.id, input.periodId, input.clientId);
    if (seqResult.error || seqResult.seq < 1) {
      return {
        ok: false,
        error: seqResult.error ?? "No se pudo calcular el consecutivo del video.",
      };
    }

    const { error } = await supabase.from("videos").insert({
      organization_id: org.id,
      period_id: input.periodId,
      client_id: input.clientId,
      seq: seqResult.seq,
      title: input.title.trim(),
      editor_id: editorId,
      start_date: input.startDate || null,
      due_date: input.dueDate || null,
      priority: input.priority ?? "media",
    });

    if (!error) {
      revalidatePath("/app/monitoreo");
      revalidatePath("/app/dashboard");
      revalidatePath("/app/calendario");
      return { ok: true };
    }

    const isSeqConflict =
      error.code === "23505" ||
      error.message.includes("videos_period_id_client_id_seq_key");
    if (!isSeqConflict || attempt === MAX_SEQ_ATTEMPTS - 1) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: "No se pudo asignar un consecutivo único para el video." };
}

export interface UpdateVideoInput {
  id: string;
  clientId?: string;
  title?: string;
  editorId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: VideoPriority;
  status?: VideoStatus;
  progreso?: number;
  observations?: string | null;
  processedLink?: string | null;
}

// La restricción de qué columnas puede tocar un editor (solo estado,
// observaciones y link procesado) la aplica el trigger
// enforce_editor_video_columns en Postgres — este action solo arma el patch
// y deja que la base rechace con su propio mensaje si no corresponde.
export async function updateVideo(input: UpdateVideoInput): Promise<VideoActionResult> {
  await requireActiveOrganization();
  const supabase = await createClient();

  const patch: VideoUpdate = {};
  if (input.clientId !== undefined) patch.client_id = input.clientId;
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.editorId !== undefined) patch.editor_id = input.editorId || null;
  if (input.startDate !== undefined) patch.start_date = input.startDate || null;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate || null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.progreso !== undefined) patch.progreso = input.progreso;
  if (input.observations !== undefined) patch.observations = input.observations || null;
  if (input.processedLink !== undefined) patch.processed_link = input.processedLink || null;

  const { error } = await supabase.from("videos").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/monitoreo");
  revalidatePath("/app/calendario"); // due_date mueve el evento virtual de entrega
  return { ok: true };
}

export type AlertaVideoTipo = "video_estancado" | "video_completado";

/**
 * Crea una notificación en la campanita para una alerta de monitoreo (un video
 * que lleva más de 1 hora sin avanzar, o uno que llegó al 100%). La detección
 * pasa en el cliente (monitoreo-client), pero el registro en la tabla
 * `notifications` tiene que ir con service role porque esa tabla no tiene
 * policy de INSERT para usuarios. La reciben el owner/admin (que monitorean) y
 * el editor encargado del video. Se evita duplicar: si ya hay una alerta igual
 * (mismo video, mismo tipo) en la última hora, no se inserta otra — así da lo
 * mismo que haya varias personas con el monitoreo abierto disparándola.
 */
export async function registrarAlertaVideo(
  videoId: string,
  tipo: AlertaVideoTipo,
): Promise<VideoActionResult> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("videos")
    .select("id, title, progreso, editor_id, organization_id, clients(name)")
    .eq("id", videoId)
    .maybeSingle();

  if (!video || video.organization_id !== org.id) {
    return { ok: false, error: "Video no encontrado." };
  }

  const clientName =
    (video.clients as unknown as { name: string } | null)?.name ?? "—";
  const title =
    tipo === "video_completado"
      ? `✅ "${video.title}" llegó al 100%`
      : `⚠️ "${video.title}" lleva más de 1 hora sin avanzar`;
  const body =
    tipo === "video_completado"
      ? `${clientName} · listo para revisión`
      : `${clientName} · avance ${video.progreso}%`;

  const admin = createServiceRoleClient();

  // Dedupe + destinatarios en paralelo para reducir latencia.
  const haceUnaHora = new Date(Date.now() - 55 * 60_000).toISOString();
  const [{ data: reciente }, { data: gestores }, { data: editor }] = await Promise.all([
    admin
      .from("notifications")
      .select("id")
      .eq("organization_id", org.id)
      .eq("type", tipo)
      .eq("title", title)
      .gte("created_at", haceUnaHora)
      .limit(1)
      .maybeSingle(),
    admin
      .from("memberships")
      .select("id, email")
      .eq("organization_id", org.id)
      .eq("active", true)
      .in("role", ["owner", "admin"]),
    video.editor_id
      ? admin.from("memberships").select("id, email, active").eq("id", video.editor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (reciente) return { ok: true };

  // Destinatarios: owner/admin (monitorean) + el editor encargado, sin repetir.
  const destinatarios = new Map<string, string>();
  for (const g of gestores ?? []) destinatarios.set(g.id, g.email);
  if (editor?.active) destinatarios.set(editor.id, editor.email);

  if (destinatarios.size === 0) return { ok: true };

  const { error } = await admin.from("notifications").insert(
    [...destinatarios.entries()].map(([membership_id, email]) => ({
      organization_id: org.id,
      recipient_email: email,
      membership_id,
      type: tipo,
      title,
      body,
      link: "/app/monitoreo",
    })),
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteVideo(videoId: string): Promise<VideoActionResult> {
  const [org, perms] = await Promise.all([requireActiveOrganization(), getEffectiveRolePermissions()]);
  // owner/admin eliminan cualquier video; el editor solo los suyos si la
  // configuración de permisos se lo permite. El viewer no puede eliminar.
  if (org.role === "viewer" || (org.role === "editor" && !perms.canDeleteOwnVideos)) {
    return { ok: false, error: "No tienes permiso para eliminar videos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/monitoreo");
  revalidatePath("/app/calendario");
  return { ok: true };
}
