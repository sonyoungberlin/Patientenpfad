import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listActiveCatalogEntries } from "@/lib/practiceCatalog/query";

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ ok: true, entries: [] });
  }

  const entries = await listActiveCatalogEntries(filter.practice_id);
  return NextResponse.json({ ok: true, entries });
}
