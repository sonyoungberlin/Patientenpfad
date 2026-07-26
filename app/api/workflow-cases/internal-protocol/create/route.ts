import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowCreateOwnershipData } from "@/lib/workflow/scope";
import { buildInitialInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

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

  let body: { title?: unknown };
  try {
    body = (await req.json()) as { title?: unknown };
  } catch {
    body = {};
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : null;

  const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
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
