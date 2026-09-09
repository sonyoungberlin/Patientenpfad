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
import { validateAnswerLengths } from "@/lib/questionnaire/validateAnswerLengths";
import { normalizeVaccinationReviewAnswers } from "@/lib/questionnaire/vaccinationReview";
import {
  isDocumentedContentSnapshot,
  isNewBlockBasedInternalSession,
} from "@/lib/questionnaire/documentedContent";
import { validateFrozenAnswers } from "@/lib/questionnaire/validateFrozenAnswers";

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

function validateHealthCheckAnswers(answers: Record<string, string>) {
  const followUp = answers.HEALTH_CHECK_FOLLOW_UP_REQUIRED ?? "";

  if (followUp !== "nein" && followUp !== "ja") {
    throw new InternalDocumentationError(
      "Bitte „ja“ oder „nein“ für das weitere Vorgehen auswählen.",
      400,
    );
  }
}

export async function createInternalDocumentationSession(input: {
  workflowId?: unknown;
  selectedBlockIds?: unknown;
  patientReference: unknown;
  origin: string;
  context: InternalDocumentationContext;
}) {
  const workflow = input.workflowId === undefined
    ? null
    : getInternalWorkflow(input.workflowId);
  const selectedBlockIds = input.selectedBlockIds === undefined
    ? workflow?.blockIds
    : input.selectedBlockIds;
  const patientReference =
    typeof input.patientReference === "string"
      ? input.patientReference.trim()
      : "";
  if (
    !patientReference ||
    !Array.isArray(selectedBlockIds) ||
    !selectedBlockIds.every((blockId): blockId is string => typeof blockId === "string")
  ) {
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
    selectedBlockIds: [...selectedBlockIds],
    patientReference,
    patientLanguage: "de",
    sessionKind: "internal_documentation",
    internalWorkflowId: workflow?.id ?? null,
    origin: input.origin,
    ...creator,
  });

  return { sessionId: result.sessionId, workflowId: workflow?.id ?? null };
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

  const frozenBlocks = parseFrozenBlocks(session?.frozen_blocks);
  const isNewBlockBased = session
    ? isNewBlockBasedInternalSession({
        sessionKind: session.session_kind,
        internalWorkflowId: session.internal_workflow_id,
        frozenBlocks,
      })
    : false;

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
  if (session.internal_workflow_id === null && !isNewBlockBased) {
    throw new InternalDocumentationError("Ungültiger interner Snapshot.", 400);
  }

  const workflow = isNewBlockBased
    ? null
    : input.context.kind === "kiosk"
      ? resolveInternalWorkflow(session.internal_workflow_id)
      : getInternalWorkflow(session.internal_workflow_id);
  if (!isNewBlockBased && !workflow) {
    throw new InternalDocumentationError("Unbekannter interner Workflow.", 400);
  }
  if (!input.answers || typeof input.answers !== "object" || Array.isArray(input.answers)) {
    throw new InternalDocumentationError("answers muss ein Objekt sein.", 400);
  }

  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];
  const frozenQuestionMap = new Map(
    questions.map((question) => [question.id, question]),
  );
  const lengthCheck = validateAnswerLengths(input.answers, frozenQuestionMap);
  if (!lengthCheck.ok) {
    const error = new InternalDocumentationError(
      "Die maximale Zeichenanzahl wurde überschritten.",
      400,
    ) as InternalDocumentationError & { invalidQuestionIds?: string[] };
    error.invalidQuestionIds = lengthCheck.invalidQuestionIds;
    throw error;
  }
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
  if (isNewBlockBased || isDocumentedContentSnapshot(frozenBlocks)) {
    const validation = validateFrozenAnswers(answers, frozenBlocks ?? []);
    if (!validation.ok) {
      const error = new InternalDocumentationError(
        "Bitte prüfen Sie die Pflichtfelder und Auswahlwerte.",
        400,
      ) as InternalDocumentationError & { invalidQuestionIds?: string[] };
      error.invalidQuestionIds = validation.invalidQuestionIds;
      throw error;
    }
  }
  const vaccinationQuestion = questions.find(
    (question) =>
      question.type === "repeatable_group" &&
      question.presentation === "vaccination_matrix",
  );
  if (vaccinationQuestion) {
    const normalized = normalizeVaccinationReviewAnswers(
      answers,
      vaccinationQuestion,
    );
    if (!normalized.ok) {
      throw new InternalDocumentationError(normalized.error, 400);
    }
    answers = normalized.answers;
  }
  if (!isNewBlockBased && workflow?.id === "health_check_v1") {
    validateHealthCheckAnswers(answers);
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