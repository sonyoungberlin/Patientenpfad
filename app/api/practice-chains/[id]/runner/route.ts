import { NextRequest, NextResponse } from "next/server";
import { requirePracticeChainRunnerAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getReadyPracticeChainRunner } from "@/lib/practiceChains/service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePracticeChainRunnerAccess(req);
  if (access.error) return access.error;
  const practiceId = getCatalogOwnershipFilter(access.account)?.practice_id;
  if (!practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id } = await params;
  const runner = await getReadyPracticeChainRunner(id, practiceId);
  if (!runner) return NextResponse.json({ ok: false, error: "Einsatzbereite Kette nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true, runner });
}