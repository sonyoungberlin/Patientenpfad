import { NextRequest, NextResponse } from "next/server";
import { requirePracticeChainRunnerAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getApprovedPracticeChainContinuation } from "@/lib/practiceChains/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePracticeChainRunnerAccess(req);
  if (access.error) return access.error;
  const practiceId = getCatalogOwnershipFilter(access.account)?.practice_id;
  if (!practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id: sourceChainId } = await params;
  const body = await req.json() as { sourceStepId?: unknown; sourceExitId?: unknown; targetChainId?: unknown; targetStepId?: unknown };
  if (typeof body.sourceStepId !== "string" || typeof body.sourceExitId !== "string" || body.sourceExitId.trim().length === 0 || typeof body.targetChainId !== "string" || typeof body.targetStepId !== "string") {
    return NextResponse.json({ ok: false, error: "Ungültiger Anschluss." }, { status: 400 });
  }
  const runner = await getApprovedPracticeChainContinuation({
    practiceId,
    sourceChainId,
    sourceStepId: body.sourceStepId,
    sourceExitId: body.sourceExitId,
    targetChainId: body.targetChainId,
    targetStepId: body.targetStepId,
  });
  if (!runner) return NextResponse.json({ ok: false, error: "Der Anschluss ist nicht mehr freigegeben." }, { status: 404 });
  return NextResponse.json({ ok: true, runner });
}
