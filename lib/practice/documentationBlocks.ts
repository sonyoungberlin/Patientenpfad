import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  DocumentationSegment,
  QuestionDefinition,
  QuestionOption,
  QuestionnaireBlock,
} from "@/lib/questionnaire/blockCatalog";
import type { ConditionalRule } from "@/lib/questionnaire/conditionalLogic";
import { buildFrozenBlocks, type FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { getQuestionOptionValue } from "@/lib/questionnaire/questionOptions";

export const PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION = 1;
export const PRACTICE_DOCUMENTATION_BLOCK_TITLE_MAX_LENGTH = 120;
export const PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH = 1000;

export type PracticeDocumentationBlockType =
  | "text"
  | "selection"
  | "measurement"
  | "list"
  | "hint";

export type PracticeDocumentationBlockDefinition = {
  schemaVersion: typeof PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION;
  visibleType: PracticeDocumentationBlockType;
  block: QuestionnaireBlock;
  questions: QuestionDefinition[];
};

export type PracticeDocumentationBlockSummary = {
  id: string;
  title: string;
  blockType: PracticeDocumentationBlockType;
};

export function toPracticeDocumentationBlockSummary(block: {
  id: string;
  title: string;
  block_type: string;
}): PracticeDocumentationBlockSummary {
  if (!BLOCK_TYPES.includes(block.block_type as PracticeDocumentationBlockType)) {
    throw new Error("Ungültige gespeicherte Bausteinart.");
  }
  return { id: block.id, title: block.title, blockType: block.block_type as PracticeDocumentationBlockType };
}

export type PracticeDocumentationOptionInput = {
  value?: string;
  label: string;
  documentationText: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
};

export type PracticeDocumentationSegmentInput =
  | { kind: "text"; text: string }
  | { kind: "answerRef"; fieldId: string };

export type PracticeDocumentationAdditionalFieldInput = {
  id?: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required?: boolean;
  showForOptionValues: string[];
  maxLength?: number;
  unit?: string;
};

export type PracticeDocumentationBlockInput = {
  title: string;
  blockType: PracticeDocumentationBlockType;
  text?: string;
  unit?: string;
  required?: boolean;
  options?: PracticeDocumentationOptionInput[];
  additionalFields?: PracticeDocumentationAdditionalFieldInput[];
};

type ValidationResult =
  | { ok: true; value: PracticeDocumentationBlockInput }
  | { ok: false; error: string };

const BLOCK_TYPES: readonly PracticeDocumentationBlockType[] = [
  "text", "selection", "measurement", "list", "hint",
];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`${label} ist erforderlich.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} darf nicht leer sein.`);
  if (normalized.length > maxLength || /[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new Error(`${label} ist ungültig.`);
  }
  return normalized;
}

function normalizeOptions(raw: unknown): PracticeDocumentationOptionInput[] {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 50) {
    throw new Error("Auswahl und Aufzählung benötigen mindestens zwei Optionen.");
  }
  const values = new Set<string>();
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error("Ungültige Option.");
    const value = item.value === undefined || item.value === ""
      ? undefined
      : normalizeText(item.value, "Options-ID", 160);
    if (value && (!ID_PATTERN.test(value) || values.has(value))) {
      throw new Error("Options-ID ist ungültig oder doppelt vorhanden.");
    }
    if (value) values.add(value);
    const documentationSegments = normalizeSegments(item.documentationSegments);
    return {
      ...(value ? { value } : {}),
      label: normalizeText(item.label, "Optionsbezeichnung", 240),
      documentationText: normalizeText(
        item.documentationText,
        "Ausgabetext",
        PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH,
      ),
      ...(documentationSegments ? { documentationSegments } : {}),
    };
  });
}

function normalizeSegments(raw: unknown): PracticeDocumentationSegmentInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    throw new Error("Der Ausgabetext enthält ungültige Segmente.");
  }
  return raw.map((item) => {
    if (!isRecord(item) || (item.kind !== "text" && item.kind !== "answerRef")) {
      throw new Error("Der Ausgabetext enthält ein ungültiges Segment.");
    }
    if (item.kind === "text") {
      if (typeof item.text !== "string" || !item.text.trim() || item.text.length > PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH || /[\u0000-\u001F\u007F]/.test(item.text)) {
        throw new Error("Ausgabetext ist ungültig.");
      }
      return { kind: "text", text: item.text };
    }
    return { kind: "answerRef", fieldId: normalizeText(item.fieldId, "Zusatzfeld-Referenz", 160) };
  });
}

function normalizeAdditionalFields(raw: unknown): PracticeDocumentationAdditionalFieldInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("Zu viele Zusatzangaben.");
  const ids = new Set<string>();
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error("Ungültige Zusatzangabe.");
    const id = item.id === undefined ? undefined : normalizeText(item.id, "Zusatzfeld-ID", 160);
    if (id && (!ID_PATTERN.test(id) || ids.has(id))) throw new Error("Zusatzfeld-ID ist ungültig oder doppelt vorhanden.");
    if (id) ids.add(id);
    const type = item.type;
    if (type !== "text" && type !== "textarea" && type !== "date" && type !== "number") {
      throw new Error("Ungültiger Typ für Zusatzangabe.");
    }
    if (!Array.isArray(item.showForOptionValues) || item.showForOptionValues.length === 0) {
      throw new Error("Jede Zusatzangabe benötigt mindestens eine Auswahloption.");
    }
    const showForOptionValues = item.showForOptionValues.map((value) => normalizeText(value, "Auswahlzuordnung", 160));
    return {
      ...(id ? { id } : {}),
      label: normalizeText(item.label, "Feldbezeichnung", 240),
      type,
      required: item.required === true,
      showForOptionValues,
      ...(typeof item.maxLength === "number" ? { maxLength: Math.max(1, Math.min(2000, Math.floor(item.maxLength))) } : {}),
      ...(typeof item.unit === "string" && item.unit.trim() ? { unit: normalizeText(item.unit, "Einheit", 40) } : {}),
    };
  });
}

export function validatePracticeDocumentationBlock(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false, error: "Ungültiger Dokumentationsbaustein." };
  try {
    const blockType = input.blockType;
    if (typeof blockType !== "string" || !BLOCK_TYPES.includes(blockType as PracticeDocumentationBlockType)) {
      throw new Error("Bitte eine gültige Bausteinart auswählen.");
    }
    const normalizedType = blockType as PracticeDocumentationBlockType;
    const value: PracticeDocumentationBlockInput = {
      title: normalizeText(input.title, "Titel", PRACTICE_DOCUMENTATION_BLOCK_TITLE_MAX_LENGTH),
      blockType: normalizedType,
      required: input.required === true || normalizedType === "hint",
    };
    if (normalizedType === "text" || normalizedType === "hint") {
      value.text = normalizeText(
        input.text ?? input.title,
        normalizedType === "hint" ? "Hinweistext" : "Feldbezeichnung",
        PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH,
      );
    }
    if (normalizedType === "measurement" && input.unit !== undefined && input.unit !== "") {
      value.unit = normalizeText(input.unit, "Einheit", 40);
    }
    if (normalizedType === "selection" || normalizedType === "list") {
      value.options = normalizeOptions(input.options);
    }
    value.additionalFields = normalizeAdditionalFields(input.additionalFields);
    const optionValues = new Set((value.options ?? []).map((option) => option.value ?? option.label));
    const fieldIds = new Set(value.additionalFields.map((field) => field.id).filter((id): id is string => Boolean(id)));
    for (const field of value.additionalFields) {
      if (field.showForOptionValues.some((optionValue) => !optionValues.has(optionValue))) {
        throw new Error("Eine Zusatzangabe verweist auf eine unbekannte Auswahloption.");
      }
    }
    for (const option of value.options ?? []) {
      for (const segment of option.documentationSegments ?? []) {
        if (segment.kind === "answerRef" && !fieldIds.has(segment.fieldId)) {
          throw new Error("Der Ausgabetext verweist auf eine unbekannte Zusatzangabe.");
        }
      }
    }
    return { ok: true, value };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Ungültiger Dokumentationsbaustein." };
  }
}

function createId(prefix: "block" | "question" | "option" | "field") {
  return `practice_${prefix}_${crypto.randomUUID()}`;
}

function questionForInput(
  input: PracticeDocumentationBlockInput,
  existing?: QuestionDefinition,
): QuestionDefinition {
  const id = existing?.id ?? createId("question");
  const common = { id, text: input.text ?? input.title, required: input.required === true };
  if (input.blockType === "text") {
    return { ...common, type: "textarea", maxLength: 1000, documentationItemType: "freeText" };
  }
  if (input.blockType === "measurement") {
    return { ...common, text: input.title, type: "number", step: 0.1, ...(input.unit ? { unit: input.unit } : {}), documentationItemType: "measurement" };
  }
  if (input.blockType === "hint") {
    return { ...common, type: "confirmation", required: true, documentationItemType: "bodyText" };
  }
  const existingValues = new Set((existing?.options ?? []).flatMap((option) =>
    typeof option === "string" ? [] : [option.value]));
  const options: QuestionOption[] = (input.options ?? []).map((option) => ({
    value: option.value && existingValues.has(option.value) ? option.value : createId("option"),
    label: option.label,
    documentationText: option.documentationText,
  }));
  return {
    ...common,
    text: input.title,
    type: input.blockType === "selection" ? "select" : "multi_select",
    options,
    documentationItemType: input.blockType === "list" ? "listItem" : "bodyText",
  };
}

function questionTypeForField(type: PracticeDocumentationAdditionalFieldInput["type"]): QuestionDefinition["type"] {
  return type;
}

export function buildPracticeDocumentationBlockDefinition(
  input: PracticeDocumentationBlockInput,
  existing?: PracticeDocumentationBlockDefinition,
): PracticeDocumentationBlockDefinition {
  const blockId = existing?.block.id ?? createId("block");
  const primaryQuestion = questionForInput(input, existing?.questions[0]);
  const existingAdditional = new Map(
    (existing?.questions.slice(1) ?? []).map((question) => [question.id, question]),
  );
  const additionalQuestions = (input.additionalFields ?? []).map((field) => {
    const fieldId = field.id ?? createId("field");
    const existingQuestion = existingAdditional.get(fieldId);
    return {
      id: existingQuestion?.id ?? fieldId,
      text: field.label,
      type: questionTypeForField(field.type),
      required: field.required === true,
      ...(field.maxLength ? { maxLength: field.maxLength } : {}),
      ...(field.unit ? { unit: field.unit } : {}),
    } satisfies QuestionDefinition;
  });
  const allQuestions = [primaryQuestion, ...additionalQuestions];
  const fieldQuestionIds = new Map((input.additionalFields ?? []).map((field, index) => [field.id ?? `__new_${index}`, additionalQuestions[index].id]));
  const rules: ConditionalRule[] = (input.additionalFields ?? []).flatMap((field, index) => {
    const questionId = fieldQuestionIds.get(field.id ?? `__new_${index}`)!;
    return field.showForOptionValues.map((inputOptionValue) => {
      const inputOptionIndex = (input.options ?? []).findIndex((option) => (option.value ?? option.label) === inputOptionValue);
      const optionValue = getQuestionOptionValue(primaryQuestion.options?.[inputOptionIndex] ?? inputOptionValue);
      return {
      action: "showQuestion" as const,
      targetId: questionId,
      condition: {
        target: { kind: "question" as const, questionId: primaryQuestion.id },
        operator: "equals" as const,
        value: optionValue,
      },
      };
    });
  });
  const options = (primaryQuestion.options ?? []).map((option) => {
    if (typeof option === "string") return option;
    const inputOption = (input.options ?? []).find((candidate) => candidate.label === option.label || candidate.value === option.value);
    const segments: DocumentationSegment[] | undefined = inputOption?.documentationSegments?.map((segment) =>
      segment.kind === "text"
        ? segment
        : { kind: "answerRef", questionId: fieldQuestionIds.get(segment.fieldId) ?? "" },
    );
    return {
      ...option,
      ...(segments?.every((segment) => segment.kind === "text" || segment.questionId) ? { documentationSegments: segments } : {}),
    };
  });
  const block: QuestionnaireBlock = {
    id: blockId,
    label: input.title,
    displayOrder: 0,
    questionIds: allQuestions.map((question) => question.id),
    ...(rules.length > 0 ? { conditionalRules: rules } : {}),
  };
  return {
    schemaVersion: PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION,
    visibleType: input.blockType,
    block: {
      ...block,
      documentationItemType: input.blockType === "measurement" ? "measurement"
        : input.blockType === "list" ? "listItem" : "bodyText",
    },
    questions: allQuestions.map((question) => question.id === primaryQuestion.id
      ? { ...question, options }
      : question),
  };
}

export function parsePracticeDocumentationBlockDefinition(raw: unknown): PracticeDocumentationBlockDefinition {
  if (!isRecord(raw) || raw.schemaVersion !== PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION ||
    typeof raw.visibleType !== "string" || !BLOCK_TYPES.includes(raw.visibleType as PracticeDocumentationBlockType) ||
    !isRecord(raw.block) || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error("Ungültige gespeicherte Bausteindefinition.");
  }
  const definition = structuredClone(raw) as PracticeDocumentationBlockDefinition;
  if (!ID_PATTERN.test(definition.block.id) || !definition.block.label.trim() ||
    definition.block.questionIds.length === 0 ||
    definition.questions.some((question) => !ID_PATTERN.test(question.id)) ||
    definition.block.questionIds.some((id) => !definition.questions.some((question) => question.id === id))) {
    throw new Error("Ungültige gespeicherte Bausteindefinition.");
  }
  return definition;
}

export function resolvePracticeDocumentationBlocks(
  definitions: Array<{ definition: unknown }>,
  layout?: Array<{ blockId: string; section: 1 | 2 | 3; order: number }>,
): FrozenBlock[] {
  const parsed = definitions.map(({ definition }) => parsePracticeDocumentationBlockDefinition(definition));
  const blocks = Object.fromEntries(parsed.map((item) => [item.block.id, item.block]));
  const questions = Object.fromEntries(parsed.flatMap((item) => item.questions.map((question) => [question.id, question])));
  const order = layout?.map((item) => item.blockId) ?? parsed.map((item) => item.block.id);
  const placementById = new Map(layout?.map((item) => [item.blockId, item]) ?? []);
  return buildFrozenBlocks(order, blocks, questions, order).map((block, index) => {
    const placement = placementById.get(block.id);
    return {
      ...block,
      section: placement?.section ?? 1,
      order: placement?.order ?? index,
      outputSemantics: "documented-content-v1" as const,
    };
  });
}

export async function listPracticeDocumentationBlocks(practiceId: string, activeOnly = false) {
  return prisma.practiceDocumentationBlock.findMany({
    where: { practice_id: practiceId, ...(activeOnly ? { is_active: true } : {}) },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
}

export async function createPracticeDocumentationBlock(practiceId: string, input: PracticeDocumentationBlockInput) {
  const definition = buildPracticeDocumentationBlockDefinition(input);
  return prisma.practiceDocumentationBlock.create({
    data: {
      id: definition.block.id,
      practice_id: practiceId,
      title: input.title,
      block_type: input.blockType,
      definition: definition as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updatePracticeDocumentationBlock(
  practiceId: string,
  id: string,
  input: PracticeDocumentationBlockInput | { isActive: false },
): Promise<"updated" | "not_found" | "in_use"> {
  const existing = await prisma.practiceDocumentationBlock.findFirst({
    where: { id, practice_id: practiceId },
  });
  if (!existing) return "not_found";
  if ("isActive" in input) {
    const templates = await prisma.practiceDocumentationTemplate.findMany({
      where: { practice_id: practiceId, is_active: true },
      select: { block_layout: true },
    });
    if (templates.some((template) => Array.isArray(template.block_layout) &&
      template.block_layout.some((item) => isRecord(item) && item.blockId === id))) return "in_use";
    await prisma.practiceDocumentationBlock.updateMany({
      where: { id, practice_id: practiceId }, data: { is_active: false },
    });
    return "updated";
  }
  const definition = buildPracticeDocumentationBlockDefinition(
    input,
    parsePracticeDocumentationBlockDefinition(existing.definition),
  );
  await prisma.practiceDocumentationBlock.updateMany({
    where: { id, practice_id: practiceId },
    data: {
      title: input.title,
      block_type: input.blockType,
      definition: definition as unknown as Prisma.InputJsonValue,
    },
  });
  return "updated";
}