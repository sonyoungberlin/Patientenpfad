import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listPracticeCheckpointDefinitions } from "@/lib/practiceProcesses";

export async function GET(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const scope = getCatalogOwnershipFilter(access.account);
  if (!scope) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });
  const definitions = await listPracticeCheckpointDefinitions(scope.practice_id);
  return NextResponse.json({ ok: true, definitions });
}