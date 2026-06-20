import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isValidProcessSnapshot } from "@/lib/workflow/types";
import type { WorkflowM2AnswerValue } from "@/lib/workflow/types";

const M2_ANSWER_VALUES = new Set<string>(["YES", "NO", "UNCLEAR"]);

function isM2Answers(value: unknown): value is Record<string, WorkflowM2AnswerValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === "string" && M2_ANSWER_VALUES.has(v),
  );
}

type PointPrefillUpdate = {
  id?: unknown;
  m2_answers?: unknown;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  const session = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, process_snapshot: true, internal_saved_at: true },
  });

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sitzung nicht gefunden." }, { status: 404 });
  }

  if (!isValidProcessSnapshot(session.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 500 });
  }

  let body: { m3Checkpoints?: unknown };
  try {
    body = (await req.json()) as { m3Checkpoints?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!Array.isArray(body.m3Checkpoints)) {
    return NextResponse.json({ ok: false, error: "m3Checkpoints fehlt oder ist kein Array." }, { status: 400 });
  }

  const snapshot = { ...session.process_snapshot };
  const currentM3 = snapshot.m3Checkpoints ?? [];

  for (const item of body.m3Checkpoints as PointPrefillUpdate[]) {
    if (typeof item.id !== "string") continue;
    if (!isM2Answers(item.m2_answers)) continue;

    const existing = currentM3.find((c) => c.id === item.id);
    if (!existing) continue;

    snapshot.m3Checkpoints = (snapshot.m3Checkpoints ?? []).map((c) =>
      c.id === item.id
        ? { ...c, m2_answers: item.m2_answers as Record<string, WorkflowM2AnswerValue> }
        : c,
    );
  }

  await prisma.workflowSession.update({
    where: { id },
    data: {
      process_snapshot: snapshot,
      internal_saved_at: session.internal_saved_at ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
