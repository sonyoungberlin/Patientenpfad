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
  hasDocumentedAnswer,
  isDocumentedContentSnapshot,
  isNewBlockBasedInternalSession,
} from "@/lib/questionnaire/documentedContent";
import { validateFrozenAnswers } from "@/lib/questionnaire/validateFrozenAnswers";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";
import { normalizeInternalBlockPlacements } from "@/lib/questionnaire/internalBlockLayout";
import type { SemanticDocument } from "@/lib/questionnaire/appTextXml";
import {
  InternalDocumentTitleValidationError,
  resolveInternalDocumentTitle,
} from "@/lib/questionnaire/internalDocumentTitle";
import { normalizeXComfortPatientReference } from "@/lib/questionnaire/patientReference";
import { resolvePracticeDocumentationBlocks } from "@/lib/practice/documentationBlocks";

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
  selectedBlockIds: unknown;
  blockLayout?: unknown;
  patientReference: unknown;
  documentTitleOption: unknown;
  customDocumentTitle?: unknown;
  outputFormat: unknown;
  origin: string;
  context: InternalDocumentationContext;
}) {
  const requestedBlockIds = input.selectedBlockIds;
  const patientReference = normalizeXComfortPatientReference(input.patientReference);
  if (!patientReference) {
    throw new InternalDocumentationError(
      "Bitte Patientenreferenz angeben.",
      400,
    );
  }
  if (input.documentTitleOption === undefined || input.documentTitleOption === null || input.documentTitleOption === "") {
    throw new InternalDocumentationError("Bitte Dokumenttitel angeben.", 400);
  }
  if (input.outputFormat !== "informell" && input.outputFormat !== "formell") {
    throw new InternalDocumentationError("Bitte eine gültige Ausgabeform auswählen.", 400);
  }
  let internalDocumentTitle;
  try {
    internalDocumentTitle = resolveInternalDocumentTitle(
      input.documentTitleOption,
      input.customDocumentTitle,
    );
  } catch (cause) {
    if (cause instanceof InternalDocumentTitleValidationError) {
      throw new InternalDocumentationError(cause.message, 400);
    }
    throw cause;
  }
  if (
    !Array.isArray(requestedBlockIds) ||
    requestedBlockIds.length === 0 ||
    !requestedBlockIds.every((blockId): blockId is string => typeof blockId === "string")
  ) {
    throw new InternalDocumentationError(
      "Bitte mindestens einen Dokumentationsbaustein auswählen.",
      400,
    );
  }
  const selectedBlockIds = [...requestedBlockIds];
  const storedBlocks = await prisma.practiceDocumentationBlock.findMany({
    where: {
      id: { in: selectedBlockIds },
      practice_id: input.context.practiceId,
      is_active: true,
    },
    select: { id: true, definition: true },
  });
  if (storedBlocks.length !== selectedBlockIds.length) {
    throw new InternalDocumentationError(
      "Bitte mindestens einen gültigen Dokumentationsbaustein auswählen.",
      400,
    );
  }
  const storedById = new Map(storedBlocks.map((block) => [block.id, block]));
  let internalBlockLayout;
  try {
    internalBlockLayout = normalizeInternalBlockPlacements(
      selectedBlockIds,
      input.blockLayout,
    );
  } catch {
    throw new InternalDocumentationError(
      "Dokumentationsbausteine konnten nicht verarbeitet werden.",
      400,
    );
  }
  let internalFrozenBlocks;
  try {
    internalFrozenBlocks = resolvePracticeDocumentationBlocks(
      selectedBlockIds.map((id) => storedById.get(id)!),
      internalBlockLayout,
    );
  } catch (cause) {
    throw new InternalDocumentationError(
      cause instanceof Error ? cause.message : "Dokumentationsbausteine konnten nicht aufgelöst werden.",
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

  let result;
  try {
    result = await createQuestionnaireSession({
      selectedBlockIds: [...selectedBlockIds],
      patientReference,
      patientLanguage: "de",
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      internalBlockLayout,
      internalDocumentTitle,
      internalOutputFormat: input.outputFormat,
      internalFrozenBlocks,
      origin: input.origin,
      ...creator,
    });
  } catch (cause) {
    throw new InternalDocumentationError(
      cause instanceof Error ? cause.message : "Dokumentation konnte nicht gestartet werden.",
      400,
    );
  }

  return { sessionId: result.sessionId };
}

export async function submitInternalDocumentationSession(input: {
  sessionId: string;
  answers: unknown;
  context: InternalDocumentationContext;
}): Promise<{
  noteText: string;
  semanticDocument: SemanticDocument | null;
  xmlFilename: string | null;
} | null> {
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
      patient_reference: true,
      selected_block_ids: true,
      deduplicated_questions: true,
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

  const meaningful = questions.some((question) => hasDocumentedAnswer(question, answers));
  if (!meaningful) {
    throw new InternalDocumentationError(
      "Ein vollständig leeres Dokument kann nicht abgesendet werden.",
      400,
    );
  }

  const deviceFilter = input.context.kind === "kiosk"
    ? input.context.deviceId
    : null;
  const submittedAt = new Date();
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
      submitted_at: submittedAt,
    },
  });
  if (result.count !== 1) {
    throw new InternalDocumentationError(
      "Interne Dokumentation wurde bereits abgeschlossen.",
      409,
    );
  }

  if (input.context.kind !== "kiosk") return null;

  const detail = buildQuestionnaireInboxDetail({
    patient_reference: session.patient_reference,
    submitted_at: submittedAt,
    selected_block_ids: session.selected_block_ids,
    deduplicated_questions: session.deduplicated_questions,
    answers,
    frozen_blocks: session.frozen_blocks,
    source: session.source,
    session_kind: session.session_kind,
    internal_workflow_id: session.internal_workflow_id,
  });
  return {
    noteText: detail.noteText,
    semanticDocument: detail.semanticDocument,
    xmlFilename: detail.xmlFilename,
  };
}