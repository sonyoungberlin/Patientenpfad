import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import {
  getPracticeCheckpointDefinition,
  upsertPracticeCheckpointDefinition,
} from "@/lib/practiceProcesses";

function errorResponse(error: unknown) {
  const value = error as { message?: unknown; statusCode?: unknown; issues?: unknown };
  const status = typeof value.statusCode === "number" ? value.statusCode : 500;
  return NextResponse.json({
    ok: false,
    error: typeof value.message === "string" ? value.message : "Speichern fehlgeschlagen.",
    ...(Array.isArray(value.issues) ? { issues: value.issues } : {}),
  }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ checkpointId: string }> },
) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const scope = getCatalogOwnershipFilter(access.account);
  if (!scope) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  try {
    const definition = await getPracticeCheckpointDefinition(scope.practice_id, (await params).checkpointId);
    return NextResponse.json({ ok: true, definition });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ checkpointId: string }> },
) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const scope = getCatalogOwnershipFilter(access.account);
  if (!scope) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  try {
    const definition = await upsertPracticeCheckpointDefinition({
      practiceId: scope.practice_id,
      checkpointId: (await params).checkpointId,
      selectedAnchorIds: payload.selectedAnchorIds,
      implementation: payload.implementation,
    });
    return NextResponse.json({ ok: true, definition });
  } catch (error) {
    return errorResponse(error);
  }
}