import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { createPracticeChain, listPracticeChains } from "@/lib/practiceChains/service";

export async function GET(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const filter = getCatalogOwnershipFilter(access.account);
  if (!filter) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  return NextResponse.json({ ok: true, chains: await listPracticeChains(filter.practice_id) });
}

export async function POST(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const filter = getCatalogOwnershipFilter(access.account);
  if (!filter) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });

  let body: { name?: unknown } = {};
  try { body = (await req.json()) as typeof body; } catch { /* leerer Body */ }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "Name der Kette fehlt." }, { status: 400 });
  }
  const chain = await createPracticeChain({ practiceId: filter.practice_id, name: body.name });
  return NextResponse.json({ ok: true, chain }, { status: 201 });
}