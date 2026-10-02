import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { deactivatePracticeChain } from "@/lib/practiceChains/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const practiceId = getCatalogOwnershipFilter(access.account)?.practice_id;
  if (!practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });

  try {
    const { id } = await params;
    const chain = await deactivatePracticeChain(id, practiceId);
    return NextResponse.json({ ok: true, chain });
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kette konnte nicht deaktiviert werden." },
      { status: statusCode ?? 500 },
    );
  }
}