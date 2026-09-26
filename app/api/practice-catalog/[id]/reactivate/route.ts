import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const account = access.account;

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
    data: { is_catalog_active: true },
  });

  return NextResponse.json({ ok: true });
}
