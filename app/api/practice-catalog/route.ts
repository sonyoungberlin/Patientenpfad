import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listActiveCatalogEntries } from "@/lib/practiceCatalog/query";

export async function GET(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const account = access.account;

  const filter = getCatalogOwnershipFilter(account);
  if (!filter) {
    return NextResponse.json({ ok: true, entries: [] });
  }

  const entries = await listActiveCatalogEntries(filter.practice_id);
  return NextResponse.json({ ok: true, entries });
}
