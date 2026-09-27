import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { approvePracticeChainConnection, approvePracticeChainEntry } from "@/lib/practiceChains/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const practiceId = getCatalogOwnershipFilter(access.account)?.practice_id;
  if (!practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 }); }
  const expectedSelectionVersion = typeof body.expectedSelectionVersion === "number"
    ? body.expectedSelectionVersion
    : typeof body.expectedSelectionVersion === "string" && /^\d+$/.test(body.expectedSelectionVersion)
      ? Number(body.expectedSelectionVersion)
      : undefined;
  try {
    const approval = body.kind === "ENTRY"
      ? await approvePracticeChainEntry({ practiceId, chainId: id, stepId: typeof body.stepId === "string" ? body.stepId : "", actorAccountId: access.account.id })
      : body.kind === "CONNECTION"
        ? body.sourceChainId !== id
          ? null
          : await approvePracticeChainConnection({
            practiceId,
            sourceChainId: typeof body.sourceChainId === "string" ? body.sourceChainId : "",
            sourceStepId: typeof body.sourceStepId === "string" ? body.sourceStepId : "",
            sourceExitId: typeof body.sourceExitId === "string" ? body.sourceExitId : "",
            targetChainId: typeof body.targetChainId === "string" ? body.targetChainId : "",
            targetStepId: typeof body.targetStepId === "string" ? body.targetStepId : "",
            expectedSelectionVersion,
            actorAccountId: access.account.id,
          })
        : null;
    if (!approval) return NextResponse.json({ ok: false, error: "Unbekannte Freigabeart." }, { status: 400 });
    return NextResponse.json({ ok: true, approval }, { status: 201 });
  } catch (error: unknown) {
    const typed = error as { statusCode?: number };
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Freigabe konnte nicht gespeichert werden." }, { status: typed.statusCode ?? 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const practiceId = getCatalogOwnershipFilter(access.account)?.practice_id;
  if (!practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 }); }
  const expectedVersion = typeof body.expectedSelectionVersion === "number" ? body.expectedSelectionVersion : Number(body.expectedSelectionVersion);
  if (body.kind === "CONNECTION" && typeof body.sourceStepId === "string" && typeof body.sourceExitId === "string" && Number.isInteger(expectedVersion)) {
    try {
      const { revokePracticeChainConnection } = await import("@/lib/practiceChains/service");
      await revokePracticeChainConnection({ practiceId, sourceChainId: id, sourceStepId: body.sourceStepId, sourceExitId: body.sourceExitId, expectedSelectionVersion: expectedVersion, actorAccountId: access.account.id });
      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const typed = error as { statusCode?: number };
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Freigabe konnte nicht zurückgenommen werden." }, { status: typed.statusCode ?? 500 });
    }
  }
  const expectedApprovalVersion = typeof body.expectedApprovalVersion === "number" ? body.expectedApprovalVersion : Number(body.expectedApprovalVersion);
  if (body.kind === "ENTRY" && typeof body.stepId === "string" && Number.isInteger(expectedApprovalVersion)) {
    try {
      const { revokePracticeChainEntry } = await import("@/lib/practiceChains/service");
      await revokePracticeChainEntry({ practiceId, chainId: id, stepId: body.stepId, expectedApprovalVersion, actorAccountId: access.account.id });
      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      const typed = error as { statusCode?: number };
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Freigabe konnte nicht zurückgenommen werden." }, { status: typed.statusCode ?? 500 });
    }
  }
  return NextResponse.json({ ok: false, error: "Ungültige Freigabe." }, { status: 400 });
}
