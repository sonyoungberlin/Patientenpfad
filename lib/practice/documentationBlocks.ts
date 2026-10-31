import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  DocumentationSegment,
  QuestionDefinition,
  QuestionOption,
  RepeatableDocumentationSegment,
  RepeatableGroupFieldDef,
  QuestionnaireBlock,
} from "@/lib/questionnaire/blockCatalog";
import type { ConditionalRule, ConditionOperator } from "@/lib/questionnaire/conditionalLogic";
import { buildFrozenBlocks, type FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { getQuestionOptionValue } from "@/lib/questionnaire/questionOptions";
import { getInternalTemplatePlacements } from "@/lib/questionnaire/internalBlockLayout";
import {
  configurationDeleteConflict,
  type ConfigurationDeleteResult,
} from "@/lib/configurationDeletion";

export const PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION = 1;
export const PRACTICE_DOCUMENTATION_BLOCK_TITLE_MAX_LENGTH = 120;
export const PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH = 1000;

export type PracticeDocumentationBlockType =
  | "text"
  | "paragraph"
  | "selection"
  | "measurement"
  | "month"
  | "list"
  | "hint"
  | "repeatable";

export type PracticeDocumentationTemplateCategory = "documentation" | "profile";
export const PRACTICE_DOCUMENTATION_OUTPUT_VARIANTS = [
  { id: "facharztbrief", label: "Facharztbrief" },
  { id: "patientenbrief", label: "Patientenbrief" },
  { id: "krankenblatt", label: "Krankenblatt" },
] as const;

export type PracticeDocumentationVariantOutputTextInput = {
  documentationText?: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
};

export type PracticeDocumentationOutputVariantInput = {
  documentationText?: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
  sharedDocumentationText?: string;
  fieldTexts?: Record<string, PracticeDocumentationVariantOutputTextInput>;
  optionTexts?: Record<string, Record<string, PracticeDocumentationVariantOutputTextInput>>;
};

export type PracticeDocumentationBlockDefinition = {
  schemaVersion: typeof PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION;
  visibleType: PracticeDocumentationBlockType;
  allowedTemplateCategories?: PracticeDocumentationTemplateCategory[];
  outputVariants?: Record<string, PracticeDocumentationOutputVariantInput>;
  block: QuestionnaireBlock;
  questions: QuestionDefinition[];
};

export type PracticeDocumentationBlockSummary = {
  id: string;
  title: string;
  blockType: PracticeDocumentationBlockType;
  allowedTemplateCategories?: PracticeDocumentationTemplateCategory[];
};

function hasOutputVariantSegments(raw: unknown): boolean {
  return Array.isArray(raw) && raw.some((segment) => isRecord(segment) && (
    (segment.kind === "text" && typeof segment.text === "string" && Boolean(segment.text.trim())) ||
    segment.kind === "answerRef" ||
    (segment.kind === "conditional" && hasOutputVariantSegments(segment.segments))
  ));
}

function hasOutputVariantText(raw: PracticeDocumentationVariantOutputTextInput): boolean {
  return Boolean(raw.documentationText?.trim()) || hasOutputVariantSegments(raw.documentationSegments);
}

export function getPracticeDocumentationConfiguredOutputVariantIds(
  definition: PracticeDocumentationBlockDefinition,
): string[] {
  return Object.entries(definition.outputVariants ?? {}).flatMap(([variantId, variant]) => {
    const hasOutput = Boolean(variant.documentationText?.trim()) ||
      Boolean(variant.sharedDocumentationText?.trim()) ||
      Boolean(variant.documentationSegments && hasOutputVariantSegments(variant.documentationSegments)) ||
      Object.values(variant.fieldTexts ?? {}).some(hasOutputVariantText) ||
      Object.values(variant.optionTexts ?? {}).some((options) => Object.values(options).some(hasOutputVariantText));
    return hasOutput ? [variantId] : [];
  });
}

export function toPracticeDocumentationBlockSummary(block: {
  id: string;
  title: string;
  block_type: string;
  definition?: unknown;
}): PracticeDocumentationBlockSummary {
  if (!BLOCK_TYPES.includes(block.block_type as PracticeDocumentationBlockType)) {
    throw new Error("Ungültige gespeicherte Bausteinart.");
  }
  const definition = block.definition === undefined
    ? { allowedTemplateCategories: ["documentation"] as PracticeDocumentationTemplateCategory[] }
    : parsePracticeDocumentationBlockDefinition(block.definition);
  return {
    id: block.id,
    title: block.title,
    blockType: block.block_type as PracticeDocumentationBlockType,
    allowedTemplateCategories: definition.allowedTemplateCategories,
  };
}

export type PracticeDocumentationOptionInput = {
  value?: string;
  label: string;
  documentationText: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
};

export type PracticeDocumentationSegmentInput =
  | { kind: "text"; text: string }
  | { kind: "answerRef"; fieldId: string }
  | { kind: "conditional"; fieldId: string; optionValue: string; segments: PracticeDocumentationSegmentInput[] };

export type PracticeDocumentationFieldOptionInput = {
  value: string;
  label: string;
};

export type PracticeDocumentationAdditionalFieldInput = {
  id?: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "month" | "number" | "select" | "multi_select" | "yes_no" | "checkbox";
  options?: PracticeDocumentationFieldOptionInput[];
  required?: boolean;
  showForOptionValues?: string[];
  showForFieldId?: string;
  maxLength?: number;
  unit?: string;
  documentationText?: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
};

export type PracticeDocumentationBlockInput = {
  title: string;
  blockType: PracticeDocumentationBlockType;
  text?: string;
  unit?: string;
  required?: boolean;
  options?: PracticeDocumentationOptionInput[];
  sharedDocumentationText?: string;
  documentationSegments?: PracticeDocumentationSegmentInput[];
  additionalFields?: PracticeDocumentationAdditionalFieldInput[];
  allowedTemplateCategories?: PracticeDocumentationTemplateCategory[];
  outputVariants?: Record<string, PracticeDocumentationOutputVariantInput>;
};

export type PracticeDocumentationOptionEditorState = Pick<
  PracticeDocumentationBlockInput,
  "options" | "additionalFields" | "documentationSegments"
>;

function segmentReferencesOption(
  segments: PracticeDocumentationSegmentInput[] | undefined,
  fieldId: string,
  optionValue: string,
): boolean {
  return segments?.some((segment) => segment.kind === "conditional" && (
    (segment.fieldId === fieldId && segment.optionValue === optionValue) ||
    segmentReferencesOption(segment.segments, fieldId, optionValue)
  )) ?? false;
}

export function removePracticeDocumentationOption(
  state: PracticeDocumentationOptionEditorState,
  sourceFieldId: string,
  optionValue: string,
): { ok: true; value: PracticeDocumentationOptionEditorState } | { ok: false; error: string } {
  const sourceField = sourceFieldId === "__primary"
    ? undefined
    : state.additionalFields?.find((field) => field.id === sourceFieldId);
  const sourceOptions = sourceFieldId === "__primary"
    ? state.options ?? []
    : sourceField?.options ?? [];
  const optionIndex = sourceOptions.findIndex((option) => (option.value ?? option.label) === optionValue);
  if (optionIndex < 0) return { ok: false, error: "Die Auswahloption konnte nicht gefunden werden." };
  if (sourceOptions.length <= 1) return { ok: false, error: "Eine Auswahl benötigt mindestens eine Option." };

  const dependentField = state.additionalFields?.find((field) => (
    (field.showForFieldId ?? "__primary") === sourceFieldId &&
    (field.showForOptionValues ?? []).includes(optionValue)
  ));
  const survivingOptionSegments = sourceFieldId === "__primary"
    ? (state.options ?? []).filter((_, index) => index !== optionIndex).some((option) => segmentReferencesOption(option.documentationSegments, sourceFieldId, optionValue))
    : false;
  const dependentSegment = survivingOptionSegments ||
    segmentReferencesOption(state.documentationSegments, sourceFieldId, optionValue) ||
    (state.additionalFields ?? []).some((field) => segmentReferencesOption(field.documentationSegments, sourceFieldId, optionValue));
  if (dependentField || dependentSegment) {
    const dependency = dependentField
      ? `Zusatzangabe „${dependentField.label}“`
      : "eine bedingte Ausgaberegel";
    return { ok: false, error: `Die Option „${optionValue}“ kann nicht entfernt werden, weil ${dependency} davon abhängt.` };
  }

  if (sourceFieldId === "__primary") {
    return { ok: true, value: { ...state, options: (state.options ?? []).filter((_, index) => index !== optionIndex) } };
  }
  return {
    ok: true,
    value: {
      ...state,
      additionalFields: (state.additionalFields ?? []).map((field) => field.id === sourceFieldId
        ? { ...field, options: (field.options ?? []).filter((_, index) => index !== optionIndex) }
        : field),
    },
  };
}

type ValidationResult =
  | { ok: true; value: PracticeDocumentationBlockInput }
  | { ok: false; error: string };

const BLOCK_TYPES: readonly PracticeDocumentationBlockType[] = [
  "text", "paragraph", "selection", "measurement", "list", "hint",
  "repeatable", "month",
];
const DIRECT_SEGMENT_BLOCK_TYPES: readonly PracticeDocumentationBlockType[] = [
  "text", "measurement", "month",
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

function normalizeDocumentContent(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} ist erforderlich.`);
  const normalized = value.trim();
  if (!normalized || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    throw new Error(`${label} ist ungültig.`);
  }
  return normalized;
}

function normalizeVariantOutputText(raw: unknown): PracticeDocumentationVariantOutputTextInput {
  if (!isRecord(raw)) throw new Error("Ungültiger variantenbezogener Ausgabetext.");
  const documentationText = raw.documentationText === undefined
    ? undefined
    : typeof raw.documentationText === "string" && raw.documentationText.trim() === ""
      ? ""
      : normalizeDocumentContent(raw.documentationText, "Varianten-Ausgabetext");
  if (documentationText && documentationText.length > PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH) {
    throw new Error("Varianten-Ausgabetext ist ungültig.");
  }
  const documentationSegments = normalizeSegments(raw.documentationSegments);
  return {
    ...(documentationText !== undefined ? { documentationText } : {}),
    ...(documentationSegments ? { documentationSegments } : {}),
  };
}

function normalizeOutputVariants(raw: unknown): Record<string, PracticeDocumentationOutputVariantInput> | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || Object.keys(raw).length > 20) {
    throw new Error("Ungültige Dokumentausgabevarianten.");
  }
  const variants: Record<string, PracticeDocumentationOutputVariantInput> = {};
  for (const [variantId, rawVariant] of Object.entries(raw)) {
    if (!ID_PATTERN.test(variantId) || !isRecord(rawVariant)) {
      throw new Error("Ungültige Dokumentausgabevariante.");
    }
    const rootOutput = normalizeVariantOutputText(rawVariant);
    const sharedDocumentationText = rawVariant.sharedDocumentationText === undefined
      ? undefined
      : typeof rawVariant.sharedDocumentationText === "string" && rawVariant.sharedDocumentationText.trim() === ""
        ? ""
        : normalizeDocumentContent(rawVariant.sharedDocumentationText, "Gemeinsamer Varianten-Ausgabetext");
    if (sharedDocumentationText && sharedDocumentationText.length > PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH) {
      throw new Error("Gemeinsamer Varianten-Ausgabetext ist ungültig.");
    }

    let fieldTexts: PracticeDocumentationOutputVariantInput["fieldTexts"];
    if (rawVariant.fieldTexts !== undefined) {
      if (!isRecord(rawVariant.fieldTexts)) throw new Error("Ungültige Feld-Ausgabevariante.");
      fieldTexts = Object.fromEntries(Object.entries(rawVariant.fieldTexts).map(([fieldId, output]) => {
        if (fieldId !== "__primary" && !ID_PATTERN.test(fieldId)) throw new Error("Ungültige Feldreferenz in Ausgabevariante.");
        return [fieldId, normalizeVariantOutputText(output)];
      }));
    }

    let optionTexts: PracticeDocumentationOutputVariantInput["optionTexts"];
    if (rawVariant.optionTexts !== undefined) {
      if (!isRecord(rawVariant.optionTexts)) throw new Error("Ungültige Options-Ausgabevariante.");
      optionTexts = Object.fromEntries(Object.entries(rawVariant.optionTexts).map(([fieldId, rawOptions]) => {
        if ((fieldId !== "__primary" && !ID_PATTERN.test(fieldId)) || !isRecord(rawOptions)) {
          throw new Error("Ungültige Optionsreferenz in Ausgabevariante.");
        }
        return [fieldId, Object.fromEntries(Object.entries(rawOptions).map(([optionValue, output]) => {
          if (!optionValue || optionValue.length > 160) throw new Error("Ungültiger Optionswert in Ausgabevariante.");
          return [optionValue, normalizeVariantOutputText(output)];
        }))];
      }));
    }

    variants[variantId] = {
      ...rootOutput,
      ...(sharedDocumentationText !== undefined ? { sharedDocumentationText } : {}),
      ...(fieldTexts ? { fieldTexts } : {}),
      ...(optionTexts ? { optionTexts } : {}),
    };
  }
  return variants;
}

function normalizeOptions(raw: unknown): PracticeDocumentationOptionInput[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) {
    throw new Error("Auswahl und Aufzählung benötigen mindestens eine Option.");
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
    const documentationText = typeof item.documentationText === "string" && item.documentationText.trim()
      ? normalizeText(item.documentationText, "Ausgabetext", PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH)
      : undefined;
    if (!documentationText && !documentationSegments) {
      throw new Error("Ausgabetext oder eine strukturierte Ausgabekomposition ist erforderlich.");
    }
    return {
      ...(value ? { value } : {}),
      label: normalizeText(item.label, "Optionsbezeichnung", 240),
      documentationText: documentationText ?? "",
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
    if (!isRecord(item) || (item.kind !== "text" && item.kind !== "answerRef" && item.kind !== "conditional")) {
      throw new Error("Der Ausgabetext enthält ein ungültiges Segment.");
    }
    if (item.kind === "text") {
      if (typeof item.text !== "string" || !item.text.trim() || item.text.length > PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH || /[\u0000-\u001F\u007F]/.test(item.text)) {
        throw new Error("Ausgabetext ist ungültig.");
      }
      return { kind: "text", text: item.text };
    }
    if (item.kind === "conditional") {
      return {
        kind: "conditional",
        fieldId: normalizeText(item.fieldId, "Bedingungsfrage", 160),
        optionValue: normalizeText(item.optionValue, "Bedingungswert", 240),
        segments: normalizeSegments(item.segments) ?? [],
      };
    }
    return { kind: "answerRef", fieldId: normalizeText(item.fieldId, "Zusatzfeld-Referenz", 160) };
  });
}

function normalizeAdditionalFields(raw: unknown, requireCondition = true): PracticeDocumentationAdditionalFieldInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("Zu viele Zusatzangaben.");
  const ids = new Set<string>();
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error("Ungültige Zusatzangabe.");
    const id = item.id === undefined ? undefined : normalizeText(item.id, "Zusatzfeld-ID", 160);
    if (id && (!ID_PATTERN.test(id) || ids.has(id))) throw new Error("Zusatzfeld-ID ist ungültig oder doppelt vorhanden.");
    if (id) ids.add(id);
    const type = item.type;
    if (type !== "text" && type !== "textarea" && type !== "date" && type !== "time" && type !== "month" && type !== "number" && type !== "select" && type !== "multi_select" && type !== "yes_no" && type !== "checkbox") {
      throw new Error("Ungültiger Typ für Zusatzangabe.");
    }
    const options = type === "select" || type === "multi_select" ? normalizeFieldOptions(item.options) : undefined;
    if (requireCondition && (!Array.isArray(item.showForOptionValues) || item.showForOptionValues.length === 0)) {
      throw new Error("Jede Zusatzangabe benötigt mindestens eine Auswahloption.");
    }
    const showForOptionValues = Array.isArray(item.showForOptionValues)
      ? item.showForOptionValues.map((value) => normalizeText(value, "Auswahlzuordnung", 160))
      : [];
    return {
      ...(id ? { id } : {}),
      label: normalizeText(item.label, "Feldbezeichnung", 240),
      type,
      ...(options ? { options } : {}),
      required: item.required === true,
      showForOptionValues,
      ...(item.showForFieldId !== undefined ? { showForFieldId: normalizeText(item.showForFieldId, "Bedingungsfrage", 160) } : {}),
      ...(typeof item.maxLength === "number" ? { maxLength: Math.max(1, Math.min(2000, Math.floor(item.maxLength))) } : {}),
      ...(typeof item.unit === "string" && item.unit.trim() ? { unit: normalizeText(item.unit, "Einheit", 40) } : {}),
      ...(typeof item.documentationText === "string" && item.documentationText.trim() ? { documentationText: normalizeText(item.documentationText, "Ausgabetext", PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH) } : {}),
      ...(item.documentationSegments ? { documentationSegments: normalizeSegments(item.documentationSegments) } : {}),
    };
  });
}

function normalizeFieldOptions(raw: unknown): PracticeDocumentationFieldOptionInput[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) {
    throw new Error("Eine Auswahl-Zusatzangabe benötigt mindestens eine Option.");
  }
  const values = new Set<string>();
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error("Ungültige Auswahloption.");
    const value = normalizeText(item.value, "Auswahlwert", 160);
    if (values.has(value)) throw new Error("Auswahlwert ist doppelt vorhanden.");
    values.add(value);
    return { value, label: normalizeText(item.label, "Auswahllabel", 240) };
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
      required: input.required === true,
      allowedTemplateCategories: normalizeAllowedTemplateCategories(input.allowedTemplateCategories),
    };
    if (normalizedType === "paragraph") {
      value.text = normalizeDocumentContent(input.text, "Inhalt");
    } else if (normalizedType === "text" || normalizedType === "hint") {
      value.text = normalizeText(
        input.text ?? input.title,
        "Eingabeaufforderung",
        PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH,
      );
    }
    if (normalizedType === "measurement" && input.unit !== undefined && input.unit !== "") {
      value.unit = normalizeText(input.unit, "Einheit", 40);
    }
    if (DIRECT_SEGMENT_BLOCK_TYPES.includes(normalizedType) && input.documentationSegments !== undefined) {
      value.documentationSegments = normalizeSegments(input.documentationSegments);
    }
    if (normalizedType === "selection" || normalizedType === "list") {
      value.options = normalizeOptions(input.options);
      if (typeof input.sharedDocumentationText === "string" && input.sharedDocumentationText.trim()) {
        value.sharedDocumentationText = normalizeText(input.sharedDocumentationText, "Gemeinsamer Ausgabetext", PRACTICE_DOCUMENTATION_BLOCK_TEXT_MAX_LENGTH);
      }
    }
    value.additionalFields = normalizeAdditionalFields(
      input.additionalFields,
      normalizedType !== "repeatable" && !DIRECT_SEGMENT_BLOCK_TYPES.includes(normalizedType),
    );
    value.outputVariants = normalizeOutputVariants(input.outputVariants);
    const additionalFields = value.additionalFields;
    const optionValues = new Set((value.options ?? []).map((option) => option.value ?? option.label));
    const fieldIds = new Set(additionalFields.map((field) => field.id).filter((id): id is string => Boolean(id)));
    const questionIds = new Set(["__primary", ...fieldIds]);
    const fieldIndex = new Map(additionalFields.flatMap((field, index) => field.id ? [[field.id, index] as const] : []));
    const optionValuesFor = (questionId: string) => {
      if (questionId === "__primary") return optionValues;
      const field = additionalFields.find((candidate) => candidate.id === questionId);
      return new Set(field?.options?.map((option) => option.value) ?? []);
    };
    const assertPreviousQuestion = (questionId: string, currentIndex: number) => {
      if (!questionIds.has(questionId)) throw new Error("Eine Zusatzangabe verweist auf eine unbekannte Bedingungsfrage.");
      if (questionId !== "__primary" && (fieldIndex.get(questionId) ?? Number.MAX_SAFE_INTEGER) >= currentIndex) {
        throw new Error("Eine Zusatzangabe darf nur von einer vorherigen Frage abhängen.");
      }
    };
    for (const [index, field] of additionalFields.entries()) {
      if (normalizedType === "repeatable") continue;
      const sourceId = field.showForFieldId ?? "__primary";
      assertPreviousQuestion(sourceId, index);
      const sourceValues = optionValuesFor(sourceId);
      if ((field.showForOptionValues ?? []).some((optionValue) => !sourceValues.has(optionValue))) {
        throw new Error("Eine Zusatzangabe verweist auf einen unbekannten Auswahlwert.");
      }
    }
    if (normalizedType === "repeatable") {
      const repeatableFieldIds = new Set(additionalFields.map((field) => field.id).filter((id): id is string => Boolean(id)));
      const repeatableOptions = new Map(additionalFields.map((field) => [field.id, new Set((field.options ?? []).map((option) => option.value))]));
      const validateRepeatableSegments = (segments: PracticeDocumentationSegmentInput[]): void => {
        for (const segment of segments) {
          if (segment.kind === "answerRef" && !repeatableFieldIds.has(segment.fieldId)) {
            throw new Error("Der Ausgabetext verweist auf ein unbekanntes Wiederholungsfeld.");
          }
          if (segment.kind === "conditional") {
            if (!repeatableFieldIds.has(segment.fieldId) || !(repeatableOptions.get(segment.fieldId)?.has(segment.optionValue) ?? false)) {
              throw new Error("Die bedingte Ausgabe verweist auf ein unbekanntes Wiederholungsfeld oder Auswahlwert.");
            }
            validateRepeatableSegments(segment.segments);
          }
        }
      };
      for (const field of additionalFields) validateRepeatableSegments(field.documentationSegments ?? []);
    }
    const validateSegments = (segments: PracticeDocumentationSegmentInput[], currentIndex: number): void => {
      for (const segment of segments) {
        if (segment.kind === "answerRef") {
          if (segment.fieldId !== "__primary" && !fieldIds.has(segment.fieldId)) throw new Error("Der Ausgabetext verweist auf eine unbekannte Zusatzangabe.");
          continue;
        }
        if (segment.kind === "conditional") {
          assertPreviousQuestion(segment.fieldId, currentIndex + 1);
          if (!optionValuesFor(segment.fieldId).has(segment.optionValue)) {
            throw new Error("Die bedingte Ausgabe verweist auf einen unbekannten Auswahlwert.");
          }
          validateSegments(segment.segments, currentIndex + 1);
        }
      }
    };
    for (const option of value.options ?? []) validateSegments(option.documentationSegments ?? [], additionalFields.length);
    if (value.documentationSegments) validateSegments(value.documentationSegments, additionalFields.length);
    const validFieldIds = new Set(["__primary", ...fieldIds]);
    for (const variant of Object.values(value.outputVariants ?? {})) {
      if (variant.documentationSegments) validateSegments(variant.documentationSegments, additionalFields.length);
      for (const [fieldId, output] of Object.entries(variant.fieldTexts ?? {})) {
        if (!validFieldIds.has(fieldId)) throw new Error("Eine Ausgabevariante verweist auf ein unbekanntes Feld.");
        if (output.documentationSegments) validateSegments(output.documentationSegments, additionalFields.length);
      }
      for (const [fieldId, optionOutputs] of Object.entries(variant.optionTexts ?? {})) {
        if (!validFieldIds.has(fieldId)) throw new Error("Eine Ausgabevariante verweist auf unbekannte Auswahlfelder.");
        const sourceField = additionalFields.find((field) => field.id === fieldId);
        const sourceOptions = fieldId === "__primary" ? value.options ?? [] : sourceField?.options ?? [];
        const sourceValues = new Set(sourceOptions.map((option) => option.value ?? option.label));
        if (Object.keys(optionOutputs).some((optionValue) => !sourceValues.has(optionValue))) {
          throw new Error("Eine Ausgabevariante verweist auf eine unbekannte Auswahloption.");
        }
        for (const output of Object.values(optionOutputs)) {
          if (output.documentationSegments) validateSegments(output.documentationSegments, additionalFields.length);
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
  if (input.blockType === "repeatable") {
    return {
      ...common,
      text: input.title,
      type: "repeatable_group",
      groupSchema: [],
      maxEntries: undefined,
      unlimitedEntries: true,
      addEntryLabel: "+ Weiteren Eintrag hinzufügen",
      documentationItemType: "listItem",
    };
  }
  if (input.blockType === "text") {
    return {
      ...common,
      type: "textarea",
      maxLength: 1000,
      documentationItemType: "bodyText",
      omitDocumentationLabel: true,
      documentationSegments: [{ kind: "answerRef", questionId: id }],
    };
  }
  if (input.blockType === "paragraph") {
    return {
      ...common,
      text: input.title,
      type: "textarea",
      required: false,
      documentationText: input.text,
      documentationItemType: "bodyText",
      omitDocumentationLabel: true,
    };
  }
  if (input.blockType === "measurement") {
    return { ...common, text: input.title, type: "number", step: 0.1, ...(input.unit ? { unit: input.unit } : {}), documentationItemType: "measurement" };
  }
  if (input.blockType === "month") {
    return { ...common, text: input.title, type: "month" };
  }
  if (input.blockType === "hint") {
    return {
      ...common,
      type: "textarea",
      maxLength: 1000,
      documentationItemType: "freeText",
      omitDocumentationLabel: true,
      documentationSegments: [{ kind: "answerRef", questionId: id }],
    };
  }
  const options: QuestionOption[] = (input.options ?? []).map((option) => ({
    value: option.value || createId("option"),
    label: option.label,
    documentationText: option.documentationText,
  }));
  return {
    ...common,
    text: input.title,
    type: input.blockType === "selection" ? "select" : "multi_select",
    options,
    ...(input.sharedDocumentationText ? { sharedDocumentationText: input.sharedDocumentationText } : {}),
    documentationItemType: input.blockType === "list" ? "listItem" : "bodyText",
  };
}

function questionTypeForField(type: PracticeDocumentationAdditionalFieldInput["type"]): QuestionDefinition["type"] {
  return type === "checkbox" ? "confirmation" : type;
}

function isLabelOnlyRepeatableDocumentationText(field: {
  label: string;
  documentationText?: string;
}): boolean {
  const label = field.label.trim();
  const documentationText = field.documentationText?.trim();
  return Boolean(
    documentationText &&
    (documentationText === label || documentationText === `${label}:`),
  );
}

function normalizeRepeatableFieldDocumentation(
  field: RepeatableGroupFieldDef,
): RepeatableGroupFieldDef {
  if (field.documentationSegments || !isLabelOnlyRepeatableDocumentationText(field)) {
    return field;
  }
  return {
    ...field,
    documentationText: undefined,
    documentationSegments: [
      { kind: "text", text: `${field.label.trim()}: ` },
      { kind: "fieldRef", fieldKey: field.key },
    ],
  };
}

function normalizeRepeatableFieldCondition(
  field: RepeatableGroupFieldDef,
  sourceFields: Map<string, { type: string }>,
): RepeatableGroupFieldDef {
  if (!field.conditionalOn || field.conditionalValue !== undefined || field.conditionalValues !== undefined) {
    return field;
  }
  if (sourceFields.get(field.conditionalOn)?.type !== "yes_no") return field;
  return { ...field, conditionalValue: "ja" };
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
      ...(field.type === "select" ? { options: field.options } : {}),
      ...(field.type === "multi_select" ? { options: field.options } : {}),
      ...(field.maxLength ? { maxLength: field.maxLength } : {}),
      ...(field.unit ? { unit: field.unit } : {}),
    } satisfies QuestionDefinition;
  });
  const allQuestions = [primaryQuestion, ...additionalQuestions];
  if (input.blockType === "repeatable") {
    const sourceFields = new Map((input.additionalFields ?? []).flatMap((field) => field.id ? [[field.id, field] as const] : []));
    const groupSchema: RepeatableGroupFieldDef[] = (input.additionalFields ?? []).map((field, index) => {
      const fieldId = field.id ?? `field_${index}`;
      const mapSegment = (segment: PracticeDocumentationSegmentInput): RepeatableDocumentationSegment => {
        if (segment.kind === "text") return segment;
        if (segment.kind === "answerRef") return { kind: "fieldRef", fieldKey: segment.fieldId };
        return {
          kind: "conditional",
          fieldKey: segment.fieldId,
          optionValue: segment.optionValue,
          segments: segment.segments.map(mapSegment),
        };
      };
      return normalizeRepeatableFieldCondition(normalizeRepeatableFieldDocumentation({
        key: fieldId,
        label: field.label,
        type: field.type,
        required: field.required === true,
        ...(field.maxLength ? { maxLength: field.maxLength } : {}),
        ...(field.options ? { options: field.options } : {}),
        ...(field.unit ? { helperText: field.unit } : {}),
        ...(field.documentationText ? { documentationText: field.documentationText } : {}),
        ...(field.documentationSegments ? { documentationSegments: field.documentationSegments.map(mapSegment) } : {}),
        ...(field.showForFieldId ? { conditionalOn: field.showForFieldId } : {}),
        ...(field.showForOptionValues?.length === 1 ? { conditionalValue: field.showForOptionValues[0] } : {}),
        ...(field.showForOptionValues && field.showForOptionValues.length > 1 ? { conditionalValues: field.showForOptionValues } : {}),
      }), sourceFields);
    });
    const repeatableQuestion: QuestionDefinition = {
      ...primaryQuestion,
      type: "repeatable_group",
      groupSchema,
      maxEntries: undefined,
      unlimitedEntries: true,
      addEntryLabel: "+ Weiteren Eintrag hinzufügen",
    };
    return {
      schemaVersion: PRACTICE_DOCUMENTATION_BLOCK_SCHEMA_VERSION,
      visibleType: input.blockType,
      allowedTemplateCategories: normalizeAllowedTemplateCategories(input.allowedTemplateCategories),
      ...(input.outputVariants ? { outputVariants: structuredClone(input.outputVariants) } : {}),
      block: { id: blockId, label: input.title, displayOrder: 0, questionIds: [repeatableQuestion.id], documentationItemType: "bodyText" },
      questions: [repeatableQuestion],
    };
  }
  const fieldQuestionIds = new Map((input.additionalFields ?? []).map((field, index) => [field.id ?? `__new_${index}`, additionalQuestions[index].id]));
  const sourceQuestionId = (field: PracticeDocumentationAdditionalFieldInput) => field.showForFieldId
    ? fieldQuestionIds.get(field.showForFieldId) ?? primaryQuestion.id
    : primaryQuestion.id;
  const rules: ConditionalRule[] = (input.additionalFields ?? []).flatMap((field, index) => {
    const questionId = fieldQuestionIds.get(field.id ?? `__new_${index}`)!;
    return (field.showForOptionValues ?? []).map((inputOptionValue) => {
      const sourceField = field.showForFieldId ? input.additionalFields?.find((candidate) => candidate.id === field.showForFieldId) : undefined;
      const sourceOptions = sourceField?.options ?? input.options;
      const sourceOptionIndex = sourceOptions?.findIndex((option) => (option.value ?? option.label) === inputOptionValue) ?? -1;
      const optionValue = sourceField?.options?.[sourceOptionIndex]?.value ?? getQuestionOptionValue(primaryQuestion.options?.[sourceOptionIndex] ?? inputOptionValue);
      const operator: ConditionOperator = sourceField?.type === "select"
        ? "equals"
        : primaryQuestion.type === "multi_select"
          ? "contains"
          : "equals";
      return {
      action: "showQuestion" as const,
      targetId: questionId,
      condition: {
        target: { kind: "question" as const, questionId: sourceQuestionId(field) },
          operator,
        value: optionValue,
      },
      };
    });
  });
  const options = (primaryQuestion.options ?? []).map((option) => {
    if (typeof option === "string") return option;
    const inputOption = (input.options ?? []).find((candidate) => candidate.label === option.label || candidate.value === option.value);
    const mapSegment = (segment: PracticeDocumentationSegmentInput): DocumentationSegment => {
      if (segment.kind === "text") return segment;
      if (segment.kind === "answerRef") return { kind: "answerRef", questionId: fieldQuestionIds.get(segment.fieldId) ?? "" };
      const sourceField = segment.fieldId === "__primary"
        ? undefined
        : input.additionalFields?.find((field) => field.id === segment.fieldId);
      const sourceOptions = sourceField?.options ?? input.options ?? [];
      const sourceIndex = sourceOptions.findIndex((option) => (option.value ?? option.label) === segment.optionValue);
      const optionValue = sourceField?.options?.[sourceIndex]?.value
        ?? getQuestionOptionValue(primaryQuestion.options?.[sourceIndex] ?? segment.optionValue);
      return {
        kind: "conditional",
        questionId: segment.fieldId === "__primary" ? primaryQuestion.id : fieldQuestionIds.get(segment.fieldId) ?? "",
        optionValue,
        segments: segment.segments.map(mapSegment),
      };
    };
    const segments: DocumentationSegment[] | undefined = inputOption?.documentationSegments?.map(mapSegment);
    return {
      ...option,
      ...(segments?.every((segment) => segment.kind === "text" || segment.questionId) ? { documentationSegments: segments } : {}),
    };
  });
  const mapPrimarySegment = (segment: PracticeDocumentationSegmentInput): DocumentationSegment => {
    if (segment.kind === "text") return segment;
    if (segment.kind === "answerRef") {
      return { kind: "answerRef", questionId: segment.fieldId === "__primary" ? primaryQuestion.id : fieldQuestionIds.get(segment.fieldId) ?? "" };
    }
    const sourceField = segment.fieldId === "__primary"
      ? undefined
      : input.additionalFields?.find((field) => field.id === segment.fieldId);
    const sourceOptions = sourceField?.options ?? input.options ?? [];
    const sourceIndex = sourceOptions.findIndex((option) => (option.value ?? option.label) === segment.optionValue);
    const optionValue = sourceField?.options?.[sourceIndex]?.value
      ?? getQuestionOptionValue(primaryQuestion.options?.[sourceIndex] ?? segment.optionValue);
    return {
      kind: "conditional",
      questionId: segment.fieldId === "__primary" ? primaryQuestion.id : fieldQuestionIds.get(segment.fieldId) ?? "",
      optionValue,
      segments: segment.segments.map(mapPrimarySegment),
    };
  };
  const primaryDocumentationSegments = input.documentationSegments?.map(mapPrimarySegment);
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
    allowedTemplateCategories: normalizeAllowedTemplateCategories(input.allowedTemplateCategories),
    ...(input.outputVariants ? { outputVariants: structuredClone(input.outputVariants) } : {}),
    block: {
      ...block,
      documentationItemType: input.blockType === "measurement" ? "measurement"
        : input.blockType === "list" ? "listItem" : "bodyText",
    },
    questions: allQuestions.map((question) => question.id === primaryQuestion.id
      ? { ...question, options, ...(primaryDocumentationSegments ? { documentationSegments: primaryDocumentationSegments } : {}) }
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
  const outputVariants = normalizeOutputVariants(definition.outputVariants);
  if (outputVariants) definition.outputVariants = outputVariants;
  else delete definition.outputVariants;
  if (!ID_PATTERN.test(definition.block.id) || !definition.block.label.trim() ||
    definition.block.questionIds.length === 0 ||
    definition.questions.some((question) => !ID_PATTERN.test(question.id)) ||
    definition.block.questionIds.some((id) => !definition.questions.some((question) => question.id === id))) {
    throw new Error("Ungültige gespeicherte Bausteindefinition.");
  }
  definition.allowedTemplateCategories = normalizeAllowedTemplateCategories(definition.allowedTemplateCategories);
  return definition;
}

function freezeDocumentationOutputVariants(
  definition: PracticeDocumentationBlockDefinition,
): FrozenBlock["documentationOutputVariants"] {
  if (!definition.outputVariants) return undefined;
  const primaryQuestionId = definition.block.questionIds[0];
  const questionIdForField = (fieldId: string) => fieldId === "__primary" ? primaryQuestionId : fieldId;
  const mapSegments = (segments: PracticeDocumentationSegmentInput[]): DocumentationSegment[] =>
    segments.map((segment) => {
      if (segment.kind === "text") return segment;
      if (segment.kind === "answerRef") {
        return { kind: "answerRef", questionId: questionIdForField(segment.fieldId) };
      }
      return {
        kind: "conditional",
        questionId: questionIdForField(segment.fieldId),
        optionValue: segment.optionValue,
        segments: mapSegments(segment.segments),
      };
    });
  const mapOutputText = (output: PracticeDocumentationVariantOutputTextInput) => ({
    ...(output.documentationText !== undefined ? { documentationText: output.documentationText } : {}),
    ...(output.documentationSegments
      ? { documentationSegments: mapSegments(output.documentationSegments) }
      : {}),
  });

  return Object.fromEntries(Object.entries(definition.outputVariants).map(([variantId, variant]) => [
    variantId,
    {
      ...mapOutputText(variant),
      ...(variant.sharedDocumentationText !== undefined
        ? { sharedDocumentationText: variant.sharedDocumentationText }
        : {}),
      ...(variant.fieldTexts ? {
        fieldTexts: Object.fromEntries(Object.entries(variant.fieldTexts).map(([fieldId, output]) => [
          questionIdForField(fieldId), mapOutputText(output),
        ])),
      } : {}),
      ...(variant.optionTexts ? {
        optionTexts: Object.fromEntries(Object.entries(variant.optionTexts).map(([fieldId, options]) => [
          questionIdForField(fieldId), Object.fromEntries(Object.entries(options).map(([optionValue, output]) => [
            optionValue, mapOutputText(output),
          ])),
        ])),
      } : {}),
    },
  ]));
}

function normalizeAllowedTemplateCategories(raw: unknown): PracticeDocumentationTemplateCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["documentation"];
  const categories = raw.filter((category): category is PracticeDocumentationTemplateCategory =>
    category === "documentation" || category === "profile",
  );
  return categories.length > 0 ? [...new Set(categories)] : ["documentation"];
}
export function resolvePracticeDocumentationBlocks(
  definitions: Array<{ definition: unknown }>,
  layout?: Array<{ blockId: string; section: 1 | 2 | 3; order: number }>,
): FrozenBlock[] {
  const parsed = definitions.map(({ definition }) => {
    const parsedDefinition = parsePracticeDocumentationBlockDefinition(definition);
    if (parsedDefinition.visibleType !== "repeatable") return parsedDefinition;
    return {
      ...parsedDefinition,
      questions: parsedDefinition.questions.map((question) => question.type !== "repeatable_group"
        ? question
        : (() => {
            const sourceFields = new Map((question.groupSchema ?? []).map((field) => [field.key, field] as const));
            return {
              ...question,
              groupSchema: question.groupSchema?.map((field) => normalizeRepeatableFieldCondition(
                normalizeRepeatableFieldDocumentation(field),
                sourceFields,
              )),
            };
          })()),
    };
  });
  const blocks = Object.fromEntries(parsed.map((item) => [item.block.id, item.block]));
  const questions = Object.fromEntries(parsed.flatMap((item) => item.questions.map((question) => [question.id, question])));
  const order = layout?.map((item) => item.blockId) ?? parsed.map((item) => item.block.id);
  const placementById = new Map(layout?.map((item) => [item.blockId, item]) ?? []);
  return buildFrozenBlocks(order, blocks, questions, order).map((block, index) => {
    const placement = placementById.get(block.id);
    const outputVariants = parsed.find((definition) => definition.block.id === block.id)?.outputVariants;
    return {
      ...block,
      structuredHeadingVisibility: block.structuredHeadingVisibility ?? "spacingOnly",
      section: placement?.section ?? 1,
      order: placement?.order ?? index,
      outputSemantics: "documented-content-v1" as const,
      ...(outputVariants
        ? { documentationOutputVariants: freezeDocumentationOutputVariants(
            parsed.find((definition) => definition.block.id === block.id)!,
          ) }
        : {}),
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
    if (templates.some((template) =>
      getInternalTemplatePlacements(template.block_layout).some((item) => isRecord(item) && item.blockId === id),
    )) return "in_use";
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

export async function deletePracticeDocumentationBlock(
  practiceId: string,
  id: string,
): Promise<ConfigurationDeleteResult> {
  const existing = await prisma.practiceDocumentationBlock.findFirst({
    where: { id, practice_id: practiceId },
    select: { id: true },
  });
  if (!existing) return { status: "not_found" };

  const templates = await prisma.practiceDocumentationTemplate.findMany({
    where: { practice_id: practiceId },
    select: { id: true, name: true, block_layout: true },
  });
  const dependencies = templates
    .filter((template) => getInternalTemplatePlacements(template.block_layout).some(
      (placement) => isRecord(placement) && placement.blockId === id,
    ))
    .map((template) => ({ id: template.id, name: template.name }));
  if (dependencies.length > 0) {
    return configurationDeleteConflict("Der Baustein", "Vorlagen", dependencies);
  }

  const deleted = await prisma.practiceDocumentationBlock.deleteMany({
    where: { id, practice_id: practiceId },
  });
  return deleted.count === 1 ? { status: "deleted" } : { status: "not_found" };
}