import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getOfficeCheckpointCatalog,
  getOfficeTopicVersion,
  isOfficeTopicId,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
} from "@/lib/office/checkpointCatalog";
import { ownsOfficeCase } from "@/lib/office/scope";
import {
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import { requireOfficeCasesManagementAccess } from "@/lib/authz";
import { containsSensitivePersonalIdentifier } from "@/lib/office/privacy";

type OfficeCaseSnapshotRecord = {
  topicId?: unknown;
  topicTitle?: unknown;
  templateVersion?: unknown;
  decisionRevision?: unknown;
  planned_start_date?: unknown;
  final_review?: unknown;
  checkpoints?: unknown;
};

type CheckpointUpdateBody = {
  checkpoint_id?: unknown;
  state?: unknown;
  known_note?: unknown;
  missing_note?: unknown;
  answer_source?: unknown;
  deadline?: unknown;
  responsible_role?: unknown;
  authority?: unknown;
  required_documents?: unknown;
  escalation_needed?: unknown;
  not_required_reason?: unknown;
  deadline_kind?: unknown;
  deadline_is_manual?: unknown;
  planned_start_date?: unknown;
};

function readSnapshot(value: unknown): OfficeCaseSnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as OfficeCaseSnapshotRecord;
}

function isCheckpointArray(value: unknown): value is OfficeCheckpointSnapshot[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return typeof (item as { id?: unknown }).id === "string";
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || isBoolean(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeCasesManagementAccess(req);
  if (error) return error;

  const { id } = await params;
  let body: CheckpointUpdateBody;

  try {
    body = (await req.json()) as CheckpointUpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!isString(body.checkpoint_id) || !isString(body.state)) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }

  if (
    !isOptionalString(body.known_note) ||
    !isOptionalString(body.missing_note) ||
    !isOptionalString(body.answer_source) ||
    !isOptionalString(body.deadline) ||
    !isOptionalString(body.responsible_role) ||
    !isOptionalString(body.authority) ||
    !isOptionalString(body.not_required_reason) ||
    !isOptionalString(body.deadline_kind) ||
    !isOptionalBoolean(body.deadline_is_manual) ||
    !isOptionalString(body.planned_start_date) ||
    !isOptionalStringArray(body.required_documents) ||
    !isOptionalBoolean(body.escalation_needed)
  ) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }

  const state = body.state;
  if (
    state !== OfficeCheckpointState.YES &&
    state !== OfficeCheckpointState.NO &&
    state !== OfficeCheckpointState.OPEN &&
    state !== OfficeCheckpointState.NOT_REQUIRED
  ) {
    return NextResponse.json({ ok: false, error: "Ungültiger Checkpoint-State." }, { status: 400 });
  }

  const officeCase = await prisma.officeCaseSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      checkpoint_snapshot: true,
      internal_saved_at: true,
    },
  });

  if (!officeCase || !ownsOfficeCase(account, officeCase)) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const snapshot = readSnapshot(officeCase.checkpoint_snapshot);
  const topicId = typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
    ? snapshot.topicId
    : null;
  if (!topicId || !isCheckpointArray(snapshot?.checkpoints)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 500 });
  }

  const targetIndex = snapshot.checkpoints.findIndex((checkpoint) => checkpoint.id === body.checkpoint_id);
  if (targetIndex === -1) {
    return NextResponse.json({ ok: false, error: "Checkpoint nicht gefunden." }, { status: 404 });
  }

  const target = snapshot.checkpoints[targetIndex];
  const templateVersion = getOfficeTopicVersion(topicId, snapshot.templateVersion);
  const template = getOfficeCheckpointCatalog(topicId, templateVersion).find(
    (checkpoint) => checkpoint.id === target.id,
  );
  if (
    state === OfficeCheckpointState.NOT_REQUIRED &&
    (!template?.notRequiredAllowed ||
      typeof body.not_required_reason !== "string" ||
      body.not_required_reason.trim().length === 0)
  ) {
    return NextResponse.json(
      { ok: false, error: "Dieser Prüfpunkt darf nicht ohne begründete Freigabe als nicht erforderlich markiert werden." },
      { status: 400 },
    );
  }
  if (typeof body.not_required_reason === "string" && body.not_required_reason.length > 500) {
    return NextResponse.json({ ok: false, error: "Die Begründung darf höchstens 500 Zeichen enthalten." }, { status: 400 });
  }
  if (
    body.deadline_kind !== undefined &&
    !["INTERNAL_CONTROL", "TASK", "AUTHORITY"].includes(body.deadline_kind)
  ) {
    return NextResponse.json({ ok: false, error: "Ungültige Fristenart." }, { status: 400 });
  }
  if (
    body.deadline !== undefined &&
    body.deadline !== "" &&
    (!isString(body.deadline) || !isValidDateOnly(body.deadline))
  ) {
    return NextResponse.json({ ok: false, error: "Ungültiges Fälligkeitsdatum." }, { status: 400 });
  }
  if (
    body.planned_start_date !== undefined &&
    (templateVersion !== 2 || topicId !== OFFICE_TOPIC_HIRING_REPLACEMENT)
  ) {
    return NextResponse.json({ ok: false, error: "Geplanter Arbeitsbeginn ist für dieses Thema nicht verfügbar." }, { status: 400 });
  }
  if (
    body.planned_start_date !== undefined &&
    body.planned_start_date !== "" &&
    (!isString(body.planned_start_date) || !isValidDateOnly(body.planned_start_date))
  ) {
    return NextResponse.json({ ok: false, error: "Ungültiger geplanter Arbeitsbeginn." }, { status: 400 });
  }
  if (body.responsible_role !== undefined && body.responsible_role.length > 120) {
    return NextResponse.json({ ok: false, error: "Die Zuständigkeit darf höchstens 120 Zeichen enthalten." }, { status: 400 });
  }
  if (body.authority !== undefined && body.authority.length > 300) {
    return NextResponse.json({ ok: false, error: "Die Fristquelle darf höchstens 300 Zeichen enthalten." }, { status: 400 });
  }
  const nextKnownNote = isString(body.known_note) ? body.known_note : target.known_note;
  const nextMissingNote = isString(body.missing_note) ? body.missing_note : target.missing_note;
  const nextAnswerSource = isString(body.answer_source) ? body.answer_source : target.answer_source;
  const nextDeadline = isString(body.deadline) ? body.deadline : target.deadline;
  const nextResponsibleRole = isString(body.responsible_role)
    ? body.responsible_role
    : target.responsible_role;
  const nextAuthority = isString(body.authority) ? body.authority : target.authority;
  if (
    templateVersion === 2 &&
    topicId === OFFICE_TOPIC_HIRING_REPLACEMENT &&
    [
      nextKnownNote,
      nextMissingNote,
      nextAnswerSource,
      nextAuthority,
      nextResponsibleRole,
      body.not_required_reason,
    ]
      .some((value) => isString(value) && containsSensitivePersonalIdentifier(value))
  ) {
    return NextResponse.json(
      { ok: false, error: "Bitte keine Steuer-ID, Sozialversicherungsnummer oder Bankverbindung im Office-Snapshot speichern." },
      { status: 400 },
    );
  }
  if (
    templateVersion === 2 &&
    target.id === "NC-PERSONALDATEN_LOHNABRECHNUNG" &&
    [nextKnownNote, nextMissingNote, nextAnswerSource].some((value) => Boolean(value?.trim()))
  ) {
    return NextResponse.json(
      { ok: false, error: "Zu Personal- und Abrechnungsdaten darf nur der Bearbeitungsstatus dokumentiert werden." },
      { status: 400 },
    );
  }
  if (
    (body.deadline_kind === "AUTHORITY" || (body.deadline_kind === undefined && target.deadline_kind === "AUTHORITY")) &&
    nextDeadline !== "" &&
    !nextAuthority?.trim()
  ) {
    return NextResponse.json({ ok: false, error: "Für eine KV-/Behördenfrist muss die konkrete Fristquelle dokumentiert werden." }, { status: 400 });
  }
  const nextRequiredDocuments = isStringArray(body.required_documents)
    ? body.required_documents
    : target.required_documents;
  const nextEscalationNeeded = isBoolean(body.escalation_needed)
    ? body.escalation_needed
    : target.escalation_needed;
  const nextNotRequiredReason = state === OfficeCheckpointState.NOT_REQUIRED
    ? (isString(body.not_required_reason) ? body.not_required_reason.trim() : target.not_required_reason)
    : "";
  const nextDeadlineKind = isString(body.deadline_kind)
    ? body.deadline_kind
    : target.deadline_kind;
  const nextDeadlineIsManual = isBoolean(body.deadline_is_manual)
    ? body.deadline_is_manual
    : target.deadline_is_manual;
  const nextPlannedStartDate = isString(body.planned_start_date)
    ? body.planned_start_date
    : snapshot.planned_start_date;

  const nextCheckpoints = snapshot.checkpoints.map((checkpoint, index) => {
    if (index !== targetIndex) return checkpoint;
    return {
      ...checkpoint,
      state: state as OfficeCheckpointState,
      not_required_reason: nextNotRequiredReason,
      known_note: nextKnownNote,
      missing_note: nextMissingNote,
      answer_source: nextAnswerSource,
      deadline: nextDeadline,
      ...(nextDeadlineKind ? { deadline_kind: nextDeadlineKind as OfficeCheckpointSnapshot["deadline_kind"] } : {}),
      ...(nextDeadlineIsManual !== undefined ? { deadline_is_manual: nextDeadlineIsManual } : {}),
      responsible_role: nextResponsibleRole,
      authority: nextAuthority,
      required_documents: nextRequiredDocuments,
      escalation_needed: nextEscalationNeeded,
    };
  });

  const decisionRelevant = templateVersion === 2 && template?.approvalRelevant === true;
  const decisionChanged = decisionRelevant && (
    target.state !== state ||
    target.known_note !== nextKnownNote ||
    target.missing_note !== nextMissingNote ||
    target.deadline_kind !== nextDeadlineKind ||
    target.deadline_is_manual !== nextDeadlineIsManual ||
    target.answer_source !== nextAnswerSource ||
    target.deadline !== nextDeadline ||
    target.responsible_role !== nextResponsibleRole ||
    target.authority !== nextAuthority ||
    target.not_required_reason !== nextNotRequiredReason ||
    JSON.stringify(target.required_documents ?? []) !== JSON.stringify(nextRequiredDocuments) ||
    target.escalation_needed !== nextEscalationNeeded
  ) || (
    templateVersion === 2 &&
    isString(body.planned_start_date) &&
    body.planned_start_date !== snapshot.planned_start_date
  );
  const updatedSnapshot = {
    ...snapshot,
    topicId,
    ...(snapshot.templateVersion !== undefined ? { templateVersion: snapshot.templateVersion } : {}),
    ...(templateVersion === 2
      ? { decisionRevision: (typeof snapshot.decisionRevision === "number" ? snapshot.decisionRevision : 0) + (decisionChanged ? 1 : 0) }
      : {}),
    ...(nextPlannedStartDate !== undefined ? { planned_start_date: nextPlannedStartDate } : {}),
    checkpoints: nextCheckpoints,
  } as Prisma.InputJsonValue;

  await prisma.officeCaseSession.update({
    where: { id },
    data: {
      checkpoint_snapshot: updatedSnapshot,
      internal_saved_at: officeCase.internal_saved_at ?? new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    office_case: {
      id,
      checkpoint_snapshot: updatedSnapshot,
    },
  });
}
