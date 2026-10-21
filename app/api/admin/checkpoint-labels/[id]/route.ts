import { NextRequest, NextResponse } from "next/server";
import { requireApprovedAdmin } from "@/lib/adminCheckpointLabelsAuth";
import { CheckpointLabelError, deleteCheckpointLabel, renameCheckpointLabel } from "@/lib/checkpointLabels";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApprovedAdmin(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }
  const name = body && typeof body === "object" ? (body as Record<string, unknown>).name : undefined;
  if (typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "Labelname ist erforderlich." }, { status: 422 });
  }

  try {
    const label = await renameCheckpointLabel((await params).id, name);
    return NextResponse.json({ ok: true, label });
  } catch (cause) {
    if (cause instanceof CheckpointLabelError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: cause.statusCode });
    }
    if ((cause as { code?: string })?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Ein Label mit diesem Namen existiert bereits." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Label konnte nicht umbenannt werden." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApprovedAdmin(req);
  if (error) return error;
  try {
    await deleteCheckpointLabel((await params).id);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof CheckpointLabelError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: cause.statusCode });
    }
    return NextResponse.json({ ok: false, error: "Label konnte nicht gelöscht werden." }, { status: 500 });
  }
}