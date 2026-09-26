import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { createPracticeChainRevision } from "@/lib/practiceChains/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const filter = getCatalogOwnershipFilter(access.account);
  if (!filter) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });

  try {
    const { id } = await params;
    const chain = await createPracticeChainRevision(id, filter.practice_id);
    return NextResponse.json({ ok: true, chain }, { status: 201 });
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Revision konnte nicht angelegt werden." },
      { status: statusCode ?? 500 },
    );
  }
}