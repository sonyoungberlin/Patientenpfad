import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { startRevision } from "@/lib/practiceCatalog/startRevision";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: entryId } = await params;

  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!account.is_approved) {
    return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
  }
  if (!canAccessWorkflowCases(account)) {
    return NextResponse.json({ ok: false, error: "Arbeitsprozesse nicht freigeschaltet." }, { status: 403 });
  }

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
