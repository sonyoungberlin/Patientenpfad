import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeInternalBlockPlacements,
  parseInternalTemplateLayout,
  serializeInternalTemplateLayout,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";
import { INTERNAL_DOCUMENT_TITLE_OPTIONS } from "@/lib/questionnaire/internalDocumentTitle";
import type { ConfigurationDeleteResult } from "@/lib/configurationDeletion";
import { PRACTICE_DOCUMENTATION_OUTPUT_VARIANTS } from "@/lib/practice/documentationBlocks";

export const PRACTICE_DOCUMENTATION_TEMPLATE_NAME_MAX_LENGTH = 120;
export type PracticeDocumentationOutputFormat = "informell" | "formell";
export type PracticeDocumentationTemplateCategory = "documentation" | "profile";
export type PracticeDocumentationOutputVariantId = typeof PRACTICE_DOCUMENTATION_OUTPUT_VARIANTS[number]["id"];

export type PracticeDocumentationTemplateInput = {
  name: string;
  category: PracticeDocumentationTemplateCategory;
  outputFormat: PracticeDocumentationOutputFormat;
  documentTitleOption: string;
  blockLayout: InternalBlockPlacement[];
  outputVariantIds: PracticeDocumentationOutputVariantId[];
  patientSignatureRequired?: boolean;
};

export type PracticeDocumentationTemplate = PracticeDocumentationTemplateInput & {
  id: string;
};

type ValidationResult =
  | { ok: true; value: PracticeDocumentationTemplateInput }
  | { ok: false; error: string };

export class PracticeDocumentationTemplateBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeDocumentationTemplateBlockError";
  }
}

export function validatePracticeDocumentationTemplate(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Ungültige Dokumentationsvorlage." };
  }
  const value = input as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return { ok: false, error: "Name darf nicht leer sein." };
  if (name.length > PRACTICE_DOCUMENTATION_TEMPLATE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name darf maximal ${PRACTICE_DOCUMENTATION_TEMPLATE_NAME_MAX_LENGTH} Zeichen enthalten.` };
  }
  const category = value.category ?? "documentation";
  if (category !== "documentation" && category !== "profile") {
    return { ok: false, error: "Bitte eine gültige Vorlagenkategorie auswählen." };
  }
  if (value.outputFormat !== "informell" && value.outputFormat !== "formell") {
    return { ok: false, error: "Bitte eine gültige Ausgabeform auswählen." };
  }
  if (typeof value.documentTitleOption !== "string" || value.documentTitleOption === "andere" ||
    !INTERNAL_DOCUMENT_TITLE_OPTIONS.some((option) => option.value === value.documentTitleOption)) {
    return { ok: false, error: "Bitte einen gültigen Dokumenttitel auswählen." };
  }
  if (!Array.isArray(value.blockLayout) || value.blockLayout.length === 0) {
    return { ok: false, error: "Mindestens ein Dokumentationsbaustein ist erforderlich." };
  }
  if (value.patientSignatureRequired !== undefined && typeof value.patientSignatureRequired !== "boolean") {
    return { ok: false, error: "Ungültige Einstellung für die Patientenunterschrift." };
  }
  const validOutputVariantIds = new Set(PRACTICE_DOCUMENTATION_OUTPUT_VARIANTS.map(({ id }) => id));
  const outputVariantIds = value.outputVariantIds === undefined ? [] : value.outputVariantIds;
  if (!Array.isArray(outputVariantIds) || outputVariantIds.some((id) =>
    typeof id !== "string" || !validOutputVariantIds.has(id as PracticeDocumentationOutputVariantId),
  ) || new Set(outputVariantIds).size !== outputVariantIds.length) {
    return { ok: false, error: "Bitte gültige, eindeutige Ausgabearten auswählen." };
  }
  const blockIds = value.blockLayout.map((item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>).blockId : undefined);
  if (!blockIds.every((id): id is string => typeof id === "string" && id.length > 0)) {
    return { ok: false, error: "Ungültige Bausteinauswahl." };
  }
  try {
    return {
      ok: true,
      value: {
        name,
        category,
        outputFormat: value.outputFormat,
        documentTitleOption: value.documentTitleOption,
        blockLayout: normalizeInternalBlockPlacements(blockIds, value.blockLayout),
        outputVariantIds: outputVariantIds as PracticeDocumentationOutputVariantId[],
        patientSignatureRequired: category === "documentation" && value.patientSignatureRequired === true,
      },
    };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Ungültige Bausteinanordnung." };
  }
}

async function validateTemplateBlocks(practiceId: string, blockLayout: readonly InternalBlockPlacement[]) {
  const ids = blockLayout.map(({ blockId }) => blockId);
  const blocks = await prisma.practiceDocumentationBlock.findMany({
    where: { id: { in: ids }, practice_id: practiceId, is_active: true },
    select: { id: true },
  });
  if (blocks.length !== ids.length) {
    throw new PracticeDocumentationTemplateBlockError(
      "Mindestens ein ausgewählter Baustein ist nicht mehr verfügbar.",
    );
  }
}

export async function listPracticeDocumentationTemplates(practiceId: string) {
  return prisma.practiceDocumentationTemplate.findMany({
    where: { practice_id: practiceId },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
}

export async function resolveActivePracticeDocumentationTemplates(
  practiceId: string,
): Promise<PracticeDocumentationTemplate[]> {
  const templates = await prisma.practiceDocumentationTemplate.findMany({
    where: { practice_id: practiceId, is_active: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  return templates.flatMap((template) => {
    if (template.output_format !== "informell" && template.output_format !== "formell") return [];
    if (!template.document_title_option) return [];
    try {
      const config = parsePracticeDocumentationTemplateConfiguration(template.block_layout);
      return [{
        id: template.id,
        name: template.name,
        category: template.category === "profile" ? "profile" : "documentation",
        outputFormat: template.output_format,
        documentTitleOption: template.document_title_option,
        ...config,
        patientSignatureRequired: template.patient_signature_required === true,
      }];
    } catch {
      return [];
    }
  });
}

export async function createPracticeDocumentationTemplate(
  practiceId: string,
  input: PracticeDocumentationTemplateInput,
) {
  await validateTemplateBlocks(practiceId, input.blockLayout);
  return prisma.practiceDocumentationTemplate.create({
    data: {
      practice_id: practiceId,
      name: input.name,
      category: input.category,
      output_format: input.outputFormat,
      document_title_option: input.documentTitleOption,
      block_layout: serializeInternalTemplateLayout(input.blockLayout, input.outputVariantIds) as Prisma.InputJsonValue,
      patient_signature_required: input.patientSignatureRequired === true,
    },
  });
}

function duplicateTemplateName(name: string, existingNames: ReadonlySet<string>): string {
  const base = `Kopie von ${name}`;
  if (!existingNames.has(base)) return base;
  let suffix = 2;
  while (existingNames.has(`${base} (${suffix})`)) suffix += 1;
  return `${base} (${suffix})`;
}

function normalizeOutputVariantIds(raw: unknown): PracticeDocumentationOutputVariantId[] {
  const validIds = new Set(PRACTICE_DOCUMENTATION_OUTPUT_VARIANTS.map(({ id }) => id));
  if (!Array.isArray(raw) || raw.some((id) =>
    typeof id !== "string" || !validIds.has(id as PracticeDocumentationOutputVariantId),
  ) || new Set(raw).size !== raw.length) {
    throw new Error("Ungültige Ausgabearten in der Vorlagenkonfiguration.");
  }
  return raw as PracticeDocumentationOutputVariantId[];
}

export function parsePracticeDocumentationTemplateConfiguration(raw: unknown): Pick<
  PracticeDocumentationTemplateInput,
  "blockLayout" | "outputVariantIds"
> {
  const config = parseInternalTemplateLayout(raw);
  const blockIds = config.placements.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) &&
    typeof (item as Record<string, unknown>).blockId === "string"
    ? [(item as { blockId: string }).blockId] : []);
  return {
    blockLayout: normalizeInternalBlockPlacements(blockIds, config.placements),
    outputVariantIds: normalizeOutputVariantIds(config.outputVariantIds),
  };
}

export async function duplicatePracticeDocumentationTemplate(
  practiceId: string,
  id: string,
) {
  const source = await prisma.practiceDocumentationTemplate.findFirst({
    where: { id, practice_id: practiceId },
  });
  if (!source) return null;

  const existingTemplates = await prisma.practiceDocumentationTemplate.findMany({
    where: { practice_id: practiceId },
    select: { name: true },
  });
  const name = duplicateTemplateName(
    source.name,
    new Set(existingTemplates.map((template) => template.name)),
  );
  const config = parsePracticeDocumentationTemplateConfiguration(source.block_layout);
  const input = validatePracticeDocumentationTemplate({
    name,
    category: source.category,
    outputFormat: source.output_format,
    documentTitleOption: source.document_title_option,
    ...config,
    patientSignatureRequired: source.patient_signature_required === true,
  });
  if (!input.ok) throw new Error(input.error);
  await validateTemplateBlocks(practiceId, input.value.blockLayout);

  return prisma.practiceDocumentationTemplate.create({
    data: {
      practice_id: practiceId,
      name: input.value.name,
      category: input.value.category,
      output_format: input.value.outputFormat,
      document_title_option: input.value.documentTitleOption,
      block_layout: serializeInternalTemplateLayout(input.value.blockLayout, input.value.outputVariantIds) as Prisma.InputJsonValue,
      patient_signature_required: input.value.patientSignatureRequired === true,
    },
  });
}

export async function updatePracticeDocumentationTemplate(
  practiceId: string,
  id: string,
  input: PracticeDocumentationTemplateInput | { isActive: false },
): Promise<boolean> {
  if (!("isActive" in input)) await validateTemplateBlocks(practiceId, input.blockLayout);
  const result = await prisma.practiceDocumentationTemplate.updateMany({
    where: { id, practice_id: practiceId },
    data: "isActive" in input ? { is_active: false } : {
      name: input.name,
      category: input.category,
      output_format: input.outputFormat,
      document_title_option: input.documentTitleOption,
      block_layout: serializeInternalTemplateLayout(input.blockLayout, input.outputVariantIds) as Prisma.InputJsonValue,
      patient_signature_required: input.patientSignatureRequired === true,
    },
  });
  return result.count === 1;
}

export async function deletePracticeDocumentationTemplate(
  practiceId: string,
  id: string,
): Promise<ConfigurationDeleteResult> {
  const template = await prisma.practiceDocumentationTemplate.findFirst({
    where: { id, practice_id: practiceId },
    select: { id: true, name: true, is_active: true },
  });
  if (!template) return { status: "not_found" };
  if (template.is_active) {
    return {
      status: "conflict",
      error: "Aktive Vorlagen können nicht gelöscht werden. Bitte deaktivieren Sie die Vorlage zuerst.",
      dependencies: [],
    };
  }
  const deleted = await prisma.practiceDocumentationTemplate.deleteMany({
    where: { id, practice_id: practiceId, is_active: false },
  });
  return deleted.count === 1 ? { status: "deleted" } : { status: "not_found" };
}
