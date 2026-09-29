import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import { getPracticeCheckpointDefinition, upsertPracticeCheckpointDefinition } from "@/lib/practiceProcesses";

type Params = { params: Promise<{ checkpointId: string }> };
const READ_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER, PracticeRole.INBOX_ONLY];
const WRITE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requirePracticeRole(req, READ_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  const definition = await getPracticeCheckpointDefinition(practice.id, (await params).checkpointId);
  return definition
    ? NextResponse.json({ ok: true, definition })
    : NextResponse.json({ ok: false, error: "Definition nicht gefunden." }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  try {
    const body = await req.json() as { selectedAnchorIds?: unknown; implementation?: unknown };
    const checkpointId = (await params).checkpointId;
    if (!Array.isArray(body.selectedAnchorIds) || !body.selectedAnchorIds.every((id) => typeof id === "string")) {
      return NextResponse.json({ ok: false, error: "selectedAnchorIds muss ein String-Array sein." }, { status: 422 });
    }
    const definition = await upsertPracticeCheckpointDefinition(practice.id, checkpointId, {
      selectedAnchorIds: body.selectedAnchorIds,
      ...(typeof body.implementation === "string" ? { implementation: body.implementation } : {}),
    });
    return NextResponse.json({ ok: true, definition });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Ungültige Definition." }, { status });
  }
}