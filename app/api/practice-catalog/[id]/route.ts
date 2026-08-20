import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCatalogEntry } from "@/lib/practiceCatalog/query";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

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

  const entry = await getCatalogEntry(id, filter.practice_id);
  if (!entry) {
    return NextResponse.json({ ok: false, error: "Katalogeintrag nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, entry });
}
