import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
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

  const existing = await prisma.practiceCatalogEntry.findFirst({
    where: { id, practice_id: filter.practice_id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Katalogeintrag nicht gefunden." }, { status: 404 });
  }

  await prisma.practiceCatalogEntry.update({
    where: { id },
    data: { is_catalog_active: false },
  });

  return NextResponse.json({ ok: true });
}
