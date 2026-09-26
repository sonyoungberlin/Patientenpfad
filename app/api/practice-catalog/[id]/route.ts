import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCatalogEntry } from "@/lib/practiceCatalog/query";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const account = access.account;

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
