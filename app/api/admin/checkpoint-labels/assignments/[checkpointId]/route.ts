import { NextRequest, NextResponse } from "next/server";
import { requireApprovedAdmin } from "@/lib/adminCheckpointLabelsAuth";
import { CheckpointLabelError, getCheckpointLabelIds, setCheckpointLabels } from "@/lib/checkpointLabels";

export async function GET(req: NextRequest, { params }: { params: Promise<{ checkpointId: string }> }) {
  const { error } = await requireApprovedAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, labelIds: await getCheckpointLabelIds((await params).checkpointId) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ checkpointId: string }> }) {
  const { error } = await requireApprovedAdmin(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }
  const labelIds = body && typeof body === "object" ? (body as Record<string, unknown>).labelIds : undefined;
  if (!Array.isArray(labelIds) || !labelIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ ok: false, error: "labelIds muss ein Array aus Label-IDs sein." }, { status: 422 });
  }

  try {
    const savedLabelIds = await setCheckpointLabels((await params).checkpointId, labelIds);
    return NextResponse.json({ ok: true, labelIds: savedLabelIds });
  } catch (cause) {
    if (cause instanceof CheckpointLabelError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: cause.statusCode });
    }
    return NextResponse.json({ ok: false, error: "Labelzuordnung konnte nicht gespeichert werden." }, { status: 500 });
  }
}