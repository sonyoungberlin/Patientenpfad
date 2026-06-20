import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { isWorkflowTopicId, buildInitialSnapshot } from "@/lib/workflow/processCatalog";
import { isWorkflowRole, type WorkflowM3CheckpointSnapshot } from "@/lib/workflow/types";
import { buildInitialM3Checkpoints } from "@/lib/workflow/m3Checkpoints";
import { getWorkflowCreateOwnershipData } from "@/lib/workflow/scope";

const VALID_STATUSES = new Set(["ERKENNBAR", "NICHT_ERFASST", "UNKLAR"]);
const VALID_ANSWER_VALUES = new Set(["YES", "NO", "UNCLEAR"]);

function isM3CheckpointsArray(value: unknown): value is WorkflowM3CheckpointSnapshot[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const obj = item as Record<string, unknown>;
    if (typeof obj.id !== "string" || typeof obj.title !== "string") return false;
    if (!VALID_STATUSES.has(obj.status as string)) return false;
    if (obj.m2_answers !== undefined) {
      if (!obj.m2_answers || typeof obj.m2_answers !== "object" || Array.isArray(obj.m2_answers)) {
        return false;
      }
      for (const val of Object.values(obj.m2_answers as Record<string, unknown>)) {
        if (!VALID_ANSWER_VALUES.has(val as string)) return false;
      }
    }
    return true;
  });
}

type CreateBody = {
  topicId?: unknown;
  role?: unknown;
  title?: unknown;
  m3Checkpoints?: unknown;
};

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

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!isWorkflowTopicId(body.topicId)) {
    return NextResponse.json({ ok: false, error: "Ungültige topicId." }, { status: 400 });
  }

  if (!isWorkflowRole(body.role)) {
    return NextResponse.json({ ok: false, error: "Ungültige Rolle. Erwartet: MFA oder ARZT." }, { status: 400 });
  }

  if (body.title !== undefined && typeof body.title !== "string") {
    return NextResponse.json({ ok: false, error: "Ungültiger Titel." }, { status: 400 });
  }

  // Optionale m3Checkpoints (aus Draft-Speichern)
  let m3Checkpoints: WorkflowM3CheckpointSnapshot[];
  let isFinalSave = false;
  if (body.m3Checkpoints !== undefined) {
    if (!isM3CheckpointsArray(body.m3Checkpoints)) {
      return NextResponse.json({ ok: false, error: "Ungültige m3Checkpoints." }, { status: 400 });
    }
    m3Checkpoints = body.m3Checkpoints;
    isFinalSave = true;
  } else {
    m3Checkpoints = buildInitialM3Checkpoints(body.topicId);
  }

  const processPoints = buildInitialSnapshot(body.topicId, body.role);
  const ownership = getWorkflowCreateOwnershipData(account);

  const role: string = body.role;
  const session = await prisma.workflowSession.create({
    data: {
      title: typeof body.title === "string" ? body.title.trim() || null : null,
      process_snapshot: {
        topicId: body.topicId,
        role,
        processPoints,
        m3Checkpoints,
      },
      // Nur beim finalen Draft-Speichern sichtbar in der Übersicht
      ...(isFinalSave ? { internal_saved_at: new Date() } : {}),
      ...ownership,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: session.id }, { status: 201 });
}

