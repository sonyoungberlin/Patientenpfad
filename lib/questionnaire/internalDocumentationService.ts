import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import {
  getInternalWorkflow,
  resolveInternalWorkflow,
} from "@/lib/questionnaire/internalWorkflowRegistry";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { validateAnswerCharacters } from "@/lib/questionnaire/validateAnswerCharacters";
import { normalizeVaccinationReviewAnswers } from "@/lib/questionnaire/vaccinationReview";

export class InternalDocumentationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "InternalDocumentationError";
  }
}

type KioskContext = {
  kind: "kiosk";
  practiceId: string;
  deviceId: string;
};

type PracticeContext = {
  kind: "practice";
  practiceId: string;
  accountId: string;
};

export type InternalDocumentationContext = KioskContext | PracticeContext;

export async function createInternalDocumentationSession(input: {
  workflowId: unknown;
  patientReference: unknown;
  origin: string;
  context: InternalDocumentationContext;
}) {
  const workflow = getInternalWorkflow(input.workflowId);
  const patientReference =
    typeof input.patientReference === "string"
      ? input.patientReference.trim()
      : "";
  if (!workflow || !patientReference) {
    throw new InternalDocumentationError(
      "Workflow und Patientenreferenz sind erforderlich.",
      400,
    );
  }

  const creator =
    input.context.kind === "kiosk"
      ? {
          ownerPracticeId: input.context.practiceId,
          createdByKioskDeviceId: input.context.deviceId,
          source: "kiosk_direct" as const,
        }
      : {
          ownerAccountId: input.context.accountId,
          ownerPracticeId: input.context.practiceId,
          source: "practice_direct" as const,
        };

  const result = await createQuestionnaireSession({
    selectedBlockIds: [...workflow.blockIds],
    patientReference,
    patientLanguage: "de",
    sessionKind: "internal_documentation",
    internalWorkflowId: workflow.id,
    origin: input.origin,
    ...creator,
  });

  return { sessionId: result.sessionId, workflowId: workflow.id };
}

export async function submitInternalDocumentationSession(input: {
  sessionId: string;
  answers: unknown;
  context: InternalDocumentationContext;
}): Promise<void> {
  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id: input.sessionId },
    select: {
      status: true,
      session_kind: true,
      source: true,
      internal_workflow_id: true,
      owner_practice_id: true,
      created_by_kiosk_device_id: true,
      deleted_at: true,
      frozen_blocks: true,
    },
  });

  const contextMatches = input.context.kind === "kiosk"
    ? session?.source === "kiosk_direct" &&
      session.owner_practice_id === input.context.practiceId &&
      session.created_by_kiosk_device_id === input.context.deviceId
    : session?.source === "practice_direct" &&
      session.owner_practice_id === input.context.practiceId &&
      session.created_by_kiosk_device_id === null;

  if (
    !session ||
    session.status !== "pending" ||
    session.session_kind !== "internal_documentation" ||
    session.deleted_at !== null ||
    !contextMatches
  ) {
    throw new InternalDocumentationError(
      "Interne Dokumentation nicht gefunden.",
      404,
    );
  }

  const workflow = input.context.kind === "kiosk"
    ? resolveInternalWorkflow(session.internal_workflow_id)
    : getInternalWorkflow(session.internal_workflow_id);
  if (!workflow) {
    throw new InternalDocumentationError("Unbekannter interner Workflow.", 400);
  }
  if (!input.answers || typeof input.answers !== "object" || Array.isArray(input.answers)) {
    throw new InternalDocumentationError("answers muss ein Objekt sein.", 400);
  }

  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];
  const frozenQuestionMap = new Map(
    questions.map((question) => [question.id, question]),
  );
  const characterCheck = validateAnswerCharacters(
    input.answers,
    questions,
    frozenQuestionMap,
  );
  if (!characterCheck.ok) {
    const error = new InternalDocumentationError(
      "Bitte verwenden Sie lateinische Buchstaben.",
      400,
    ) as InternalDocumentationError & { invalidQuestionIds?: string[] };
    error.invalidQuestionIds = characterCheck.invalidQuestionIds;
    throw error;
  }

  let answers = sanitizeAnswers(
    input.answers,
    questions,
    "de",
    frozenQuestionMap,
  );
  if (workflow.id === "vaccination_review_v1") {
    const vaccinationQuestion = questions.find(
      (question) => question.id === "VACCINATION_REVIEW_ITEMS",
    );
    if (!vaccinationQuestion) {
      throw new InternalDocumentationError("Impfworkflow ist unvollständig.", 400);
    }
    const normalized = normalizeVaccinationReviewAnswers(
      answers,
      vaccinationQuestion,
    );
    if (!normalized.ok) {
      throw new InternalDocumentationError(normalized.error, 400);
    }
    answers = normalized.answers;
  }

  const meaningful = Object.values(answers).some(
    (value) => value.trim() !== "" && value !== "[]",
  );
  if (!meaningful) {
    throw new InternalDocumentationError(
      "Ein vollständig leeres Dokument kann nicht abgesendet werden.",
      400,
    );
  }

  const deviceFilter = input.context.kind === "kiosk"
    ? input.context.deviceId
    : null;
  const result = await prisma.patientQuestionnaireSession.updateMany({
    where: {
      id: input.sessionId,
      status: "pending",
      deleted_at: null,
      session_kind: "internal_documentation",
      source: input.context.kind === "kiosk" ? "kiosk_direct" : "practice_direct",
      owner_practice_id: input.context.practiceId,
      created_by_kiosk_device_id: deviceFilter,
      internal_workflow_id: session.internal_workflow_id,
    },
    data: {
      answers: answers as unknown as Prisma.InputJsonValue,
      status: "completed",
      submitted_at: new Date(),
    },
  });
  if (result.count !== 1) {
    throw new InternalDocumentationError(
      "Interne Dokumentation wurde bereits abgeschlossen.",
      409,
    );
  }
}