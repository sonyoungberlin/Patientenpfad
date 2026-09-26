import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { startRevision } from "@/lib/practiceCatalog/startRevision";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: entryId } = await params;

  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const account = access.account;

  const filter = getCatalogOwnershipFilter(account);
  if (!filter) {
    return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  }

  try {
    const result = await startRevision({
      entryId,
      practiceId: filter.practice_id,
      accountId: account.id,
    });

    if (result.alreadyStarted) {
      return NextResponse.json({ ok: true, sessionId: result.sessionId, alreadyStarted: true });
    }
    return NextResponse.json({ ok: true, sessionId: result.sessionId }, { status: 201 });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const message = err instanceof Error ? err.message : "Interner Fehler.";
    return NextResponse.json({ ok: false, error: message }, { status: statusCode ?? 500 });
  }
}
