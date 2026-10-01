import { NextRequest, NextResponse } from "next/server";
import { requirePracticeCatalogAccess } from "@/lib/authz";
import type { Prisma } from "@prisma/client";
import { isPracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { requirePracticeId } from "@/lib/practiceCatalog/scope";
import { ensurePracticeWorkingSession } from "@/lib/practiceCatalog/workingState";

export async function POST(req: NextRequest) {
  const access = await requirePracticeCatalogAccess(req);
  if (access.error) return access.error;
  const account = access.account;

  let body: { title?: unknown; snapshot?: unknown };
  try {
    body = (await req.json()) as { title?: unknown; snapshot?: unknown };
  } catch {
    body = {};
  }

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Titel fehlt." }, { status: 400 });
  }

  if (!isPracticeWorkflowDraftSnapshot(body.snapshot)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 400 });
  }

  const title = body.title.trim();
  const snapshot = body.snapshot;
  let practiceId: string;
  try {
    practiceId = requirePracticeId(account);
  } catch {
    return NextResponse.json({ ok: false, error: "Kein Praxiskontext vorhanden." }, { status: 403 });
  }

  const session = await ensurePracticeWorkingSession({
    accountId: account.id,
    practiceId,
    caseProfileId: snapshot.caseProfileId,
    title,
    snapshot: snapshot as unknown as Prisma.InputJsonValue,
  });

  return NextResponse.json({ ok: true, id: session.id, alreadyExists: session.alreadyExists });
}
