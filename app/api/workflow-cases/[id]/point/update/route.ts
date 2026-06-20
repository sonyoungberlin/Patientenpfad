import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isProcessPointStatus, isValidProcessSnapshot } from "@/lib/workflow/types";

type UpdateBody = {
  pointId?: unknown;
  status?: unknown;
  note?: unknown;
  sessionNote?: unknown;
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

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const snapshot = { ...session.process_snapshot };

  // Prozesspunkt-Status aktualisieren
  if (body.pointId !== undefined) {
    if (typeof body.pointId !== "string") {
      return NextResponse.json({ ok: false, error: "Ungültige pointId." }, { status: 400 });
    }
    if (!isProcessPointStatus(body.status)) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Status. Erwartet: ERKENNBAR, NICHT_ERFASST oder UNKLAR." },
        { status: 400 },
      );
    }

    const pointIndex = snapshot.processPoints.findIndex((p) => p.id === body.pointId);
    if (pointIndex === -1) {
      return NextResponse.json({ ok: false, error: "Prozesspunkt nicht gefunden." }, { status: 404 });
    }

    const updatedPoints = snapshot.processPoints.map((p) =>
      p.id === body.pointId
        ? {
            ...p,
            status: body.status as import("@/lib/workflow/types").ProcessPointStatus,
            note: typeof body.note === "string" ? body.note.trim() || undefined : p.note,
          }
        : p,
    );
    snapshot.processPoints = updatedPoints;
  }

  // Sitzungsnotiz aktualisieren
  if (body.sessionNote !== undefined) {
    snapshot.sessionNote =
      typeof body.sessionNote === "string" ? body.sessionNote.trim() || undefined : undefined;
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
