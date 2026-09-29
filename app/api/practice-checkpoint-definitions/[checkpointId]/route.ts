import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import {
  parsePracticeDefinitionContent,
  getPracticeDefinitionVersions,
  releasePracticeDefinition,
  savePracticeDefinitionDraft,
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
    const versions = await getPracticeDefinitionVersions(scope.practice_id, (await params).checkpointId);
    return NextResponse.json({ ok: true, versions });
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
  const content = parsePracticeDefinitionContent(
    body && typeof body === "object" ? (body as Record<string, unknown>).content : null,
  );
  if (!content) return NextResponse.json({ ok: false, error: "Ungültiger Definitionsentwurf." }, { status: 400 });
  try {
    await savePracticeDefinitionDraft({
      practiceId: scope.practice_id,
      checkpointId: (await params).checkpointId,
      content,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ checkpointId: string }> },
) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const scope = getCatalogOwnershipFilter(access.account);
  if (!scope) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  try {
    const version = await releasePracticeDefinition({
      practiceId: scope.practice_id,
      checkpointId: (await params).checkpointId,
      actorAccountId: access.account.id,
    });
    return NextResponse.json({ ok: true, version }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}