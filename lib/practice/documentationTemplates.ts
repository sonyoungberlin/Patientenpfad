import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeInternalBlockPlacements,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";
import { INTERNAL_DOCUMENT_TITLE_OPTIONS } from "@/lib/questionnaire/internalDocumentTitle";

export const PRACTICE_DOCUMENTATION_TEMPLATE_NAME_MAX_LENGTH = 120;
export type PracticeDocumentationOutputFormat = "informell" | "formell";

export type PracticeDocumentationTemplateInput = {
  name: string;
  outputFormat: PracticeDocumentationOutputFormat;
  documentTitleOption: string;
  blockLayout: InternalBlockPlacement[];
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
        outputFormat: value.outputFormat,
        documentTitleOption: value.documentTitleOption,
        blockLayout: normalizeInternalBlockPlacements(blockIds, value.blockLayout),
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
    if (!template.document_title_option || !Array.isArray(template.block_layout)) return [];
    const blockIds = template.block_layout.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) &&
      typeof (item as Record<string, unknown>).blockId === "string"
      ? [(item as { blockId: string }).blockId] : []);
    try {
      return [{
        id: template.id,
        name: template.name,
        outputFormat: template.output_format,
        documentTitleOption: template.document_title_option,
        blockLayout: normalizeInternalBlockPlacements(blockIds, template.block_layout),
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
      output_format: input.outputFormat,
      document_title_option: input.documentTitleOption,
      block_layout: input.blockLayout as unknown as Prisma.InputJsonValue,
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
      output_format: input.outputFormat,
      document_title_option: input.documentTitleOption,
      block_layout: input.blockLayout as unknown as Prisma.InputJsonValue,
    },
  });
  return result.count === 1;
}
