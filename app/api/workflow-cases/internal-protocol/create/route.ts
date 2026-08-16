import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowCreateOwnershipData } from "@/lib/workflow/scope";
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

export async function POST(req: NextRequest) {
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

  let body: { title?: unknown; snapshot?: unknown };
  try {
    body = (await req.json()) as { title?: unknown; snapshot?: unknown };
  } catch {
    body = {};
  }

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Titel fehlt." }, { status: 400 });
  }

  if (!isPracticeWorkflowSnapshot(body.snapshot)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 400 });
  }

  const title = body.title.trim();
  const snapshot = body.snapshot;
  const ownership = getWorkflowCreateOwnershipData(account);

  const session = await prisma.workflowSession.create({
    data: {
      title,
      process_snapshot: snapshot as unknown as Prisma.InputJsonValue,
      internal_saved_at: new Date(),
      ...ownership,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: session.id });
}
