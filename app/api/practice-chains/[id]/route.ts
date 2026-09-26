import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getPracticeChain, updatePracticeChain } from "@/lib/practiceChains/service";
import { parseChainDefinition } from "@/lib/practiceChains/validate";
import type { ChainStatus } from "@/lib/practiceChains/types";

type Params = { params: Promise<{ id: string }> };

async function getPracticeId(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return { error: access.error, practiceId: null };
  const filter = getCatalogOwnershipFilter(access.account);
  return { error: null, practiceId: filter?.practice_id ?? null };
}

export async function GET(req: NextRequest, { params }: Params) {
  const access = await getPracticeId(req);
  if (access.error) return access.error;
  if (!access.practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id } = await params;
  const chain = await getPracticeChain(id, access.practiceId);
  if (!chain) return NextResponse.json({ ok: false, error: "Kette nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true, chain });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const access = await getPracticeId(req);
  if (access.error) return access.error;
  if (!access.practiceId) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const { id } = await params;

  let body: { name?: unknown; status?: unknown; definition?: unknown } = {};
  try { body = (await req.json()) as typeof body; } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }
  const definition = parseChainDefinition(body.definition);
  if (!definition) return NextResponse.json({ ok: false, error: "Ungültige Kettendefinition." }, { status: 400 });
  if (typeof body.name !== "string" || (body.status !== "DRAFT" && body.status !== "READY")) {
    return NextResponse.json({ ok: false, error: "Name oder Kettenstatus fehlt." }, { status: 400 });
  }

  try {
    const chain = await updatePracticeChain({
      id,
      practiceId: access.practiceId,
      name: body.name,
      status: body.status as ChainStatus,
      definition,
    });
    return NextResponse.json({ ok: true, chain });
  } catch (error: unknown) {
    const typed = error as { statusCode?: number; issues?: unknown };
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kette konnte nicht gespeichert werden.", issues: typed.issues },
      { status: typed.statusCode ?? 500 },
    );
  }
}