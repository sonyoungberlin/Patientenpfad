import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import type { PrintPdfBlock } from "@/lib/pdf/printPdf";
import { INTERNAL_DOCUMENT_TITLE_OPTIONS } from "@/lib/questionnaire/internalDocumentTitle";

type PrintBlock = {
  id: string;
  title: string;
  isActive: boolean;
  definition: PracticeDocumentationBlockDefinition;
};

type PrintTemplate = {
  name: string;
  category: string | null;
  block_layout: unknown;
  outputFormat?: string | null;
  documentTitleOption?: string | null;
  patientSignatureRequired?: boolean;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getPlacements(value: unknown): Array<{ blockId: string; section: number; order: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.blockId !== "string" ||
      typeof item.section !== "number" || typeof item.order !== "number") return [];
    return [{ blockId: item.blockId, section: item.section, order: item.order }];
  }).sort((left, right) => left.section - right.section || left.order - right.order);
}

function renderSegments(value: unknown, fieldLabels: ReadonlyMap<string, string>): string {
  if (!Array.isArray(value)) return "";
  return value.map((raw) => {
    if (!isRecord(raw)) return "";
    if (raw.kind === "text") return textValue(raw.text) ?? "";
    if (raw.kind === "answerRef" || raw.kind === "fieldRef") {
      const id = typeof raw.fieldKey === "string" ? raw.fieldKey
        : typeof raw.questionId === "string" ? raw.questionId
          : "";
      return `[${fieldLabels.get(id) ?? "Eingabewert"}]`;
    }
    if (raw.kind === "conditional") {
      const id = typeof raw.fieldKey === "string" ? raw.fieldKey
        : typeof raw.questionId === "string" ? raw.questionId
          : "";
      const fieldLabel = fieldLabels.get(id) ?? "Eingabewert";
      const option = textValue(raw.optionValue) ?? "Auswahl";
      return `[Wenn ${fieldLabel} = ${option}: ${renderSegments(raw.segments, fieldLabels)}]`;
    }
    return "";
  }).join("");
}

function appendQuestion(blocks: PrintPdfBlock[], raw: unknown, fieldLabels: ReadonlyMap<string, string>) {
  if (!isRecord(raw)) return;
  const questionText = textValue(raw.text) ?? textValue(raw.label) ?? "Feld ohne Bezeichnung";
  const type = textValue(raw.type);
  blocks.push({ kind: "subheading", text: type ? `${questionText} (${type})` : questionText });
  if (typeof raw.required === "boolean") {
    blocks.push({ kind: "paragraph", text: `Eingabe erforderlich: ${raw.required ? "ja" : "nein"}` });
  }
  for (const [key, label] of [
    ["documentationText", "Ausgabetext"],
    ["sharedDocumentationText", "Gemeinsamer Ausgabetext"],
    ["hint", "Hinweis"],
    ["placeholder", "Platzhalter"],
    ["unit", "Einheit"],
    ["helperText", "Zusatzinformation"],
  ] as const) {
    const text = textValue(raw[key]);
    if (text) blocks.push({ kind: "paragraph", text: `${label}: ${text}` });
  }

  if (Array.isArray(raw.options) && raw.options.length > 0) {
    blocks.push({ kind: "paragraph", text: "Auswahlmöglichkeiten" });
    for (const option of raw.options) {
      if (typeof option === "string") {
        blocks.push({ kind: "paragraph", text: option });
      } else if (isRecord(option)) {
        const label = textValue(option.label) ?? textValue(option.value) ?? "Option";
        blocks.push({ kind: "paragraph", text: label });
        const output = textValue(option.documentationText);
        if (output) blocks.push({ kind: "paragraph", text: `Ausgabetext: ${output}` });
        const segments = renderSegments(option.documentationSegments, fieldLabels);
        if (segments) blocks.push({ kind: "paragraph", text: `Zusammengesetzter Text: ${segments}` });
      }
    }
  }

  const segments = renderSegments(raw.documentationSegments, fieldLabels);
  if (segments) blocks.push({ kind: "paragraph", text: `Zusammengesetzter Text: ${segments}` });

  if (Array.isArray(raw.groupSchema) && raw.groupSchema.length > 0) {
    blocks.push({ kind: "paragraph", text: "Wiederholbare Angaben" });
    for (const field of raw.groupSchema) appendQuestion(blocks, field, fieldLabels);
  }
}

function describeCondition(value: unknown, questionLabels: ReadonlyMap<string, string>): string {
  if (!isRecord(value)) return "Bedingung unbekannt";
  if ((value.mode === "AND" || value.mode === "OR") && Array.isArray(value.conditions)) {
    return value.conditions
      .map((condition) => describeCondition(condition, questionLabels))
      .join(value.mode === "AND" ? " und " : " oder ");
  }
  const target = isRecord(value.target) ? value.target : null;
  const questionId = target?.kind === "question" && typeof target.questionId === "string"
    ? target.questionId
    : null;
  const questionLabel = questionId ? questionLabels.get(questionId) ?? questionId : "Auswahl";
  const operator = value.operator === "contains" ? "enthält"
    : value.operator === "notEquals" ? "ist nicht"
      : "ist";
  return `${questionLabel} ${operator} ${String(value.value ?? "")}`;
}

function appendBlock(blocks: PrintPdfBlock[], block: PrintBlock) {
  const definition = block.definition;
  blocks.push({
    kind: "subheading",
    text: `${block.title} (${definition.visibleType}; ${block.isActive ? "aktiv" : "inaktiv"})`,
  });
  blocks.push({
    kind: "paragraph",
    text: `Verfügbar für: ${(definition.allowedTemplateCategories ?? ["documentation"]).map((category) => category === "profile" ? "Steckbriefe" : "Dokumentationen").join(", ")}`,
  });
  const fieldLabels = new Map<string, string>();
  for (const question of definition.questions) {
    fieldLabels.set(question.id, question.text);
    const questionRecord = question as unknown as RecordValue;
    for (const field of Array.isArray(questionRecord.groupSchema) ? questionRecord.groupSchema : []) {
      if (isRecord(field) && typeof field.key === "string" && typeof field.label === "string") {
        fieldLabels.set(field.key, field.label);
      }
    }
  }
  for (const question of definition.questions) appendQuestion(blocks, question, fieldLabels);

  const rules = definition.block.conditionalRules ?? [];
  if (rules.length > 0) {
    blocks.push({ kind: "paragraph", text: "Sichtbarkeitsregeln" });
    const questionLabels = new Map(definition.questions.map((question) => [question.id, question.text]));
    for (const rule of rules) {
      const target = definition.questions.find((question) => question.id === rule.targetId);
      const targetName = target?.text ?? rule.targetId;
      blocks.push({
        kind: "paragraph",
        text: `${targetName} wird angezeigt, wenn ${describeCondition(rule.condition, questionLabels)}.`,
      });
    }
  }
}

export function buildDocumentationLibraryPrintBlocks(
  blocks: readonly PrintBlock[],
  templates: readonly PrintTemplate[],
): PrintPdfBlock[] {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const includedBlockIds = new Set<string>();
  const output: PrintPdfBlock[] = [];

  output.push({ kind: "heading", text: "Dokumentationsbibliothek der Praxis" });
  for (const template of templates) {
    const placements = getPlacements(template.block_layout);
    output.push({
      kind: "heading",
      text: `Vorlage: ${template.name} (${template.category === "profile" ? "Steckbrief" : "Dokumentation"})`,
    });
    if (template.outputFormat) {
      output.push({ kind: "paragraph", text: `Ausgabeform: ${template.outputFormat}` });
    }
    if (template.documentTitleOption) {
      const titleOption = INTERNAL_DOCUMENT_TITLE_OPTIONS.find((option) => option.value === template.documentTitleOption);
      output.push({ kind: "paragraph", text: `Dokumenttitel: ${titleOption?.label ?? template.documentTitleOption}` });
    }
    if (template.patientSignatureRequired !== undefined) {
      output.push({ kind: "paragraph", text: `Patientenunterschrift erforderlich: ${template.patientSignatureRequired ? "ja" : "nein"}` });
    }
    if (placements.length === 0) {
      output.push({ kind: "paragraph", text: "Keine gültigen Bausteinplatzierungen gespeichert." });
      continue;
    }
    for (const placement of placements) {
      const block = blockById.get(placement.blockId);
      if (!block) {
        output.push({ kind: "paragraph", text: `Baustein nicht verfügbar: ${placement.blockId}` });
        continue;
      }
      includedBlockIds.add(block.id);
      output.push({ kind: "subheading", text: `Abschnitt ${placement.section}` });
      appendBlock(output, block);
    }
  }

  const unplacedBlocks = blocks.filter((block) => !includedBlockIds.has(block.id));
  if (unplacedBlocks.length > 0) {
    output.push({ kind: "heading", text: "Weitere Bibliotheksbausteine" });
    for (const block of unplacedBlocks) appendBlock(output, block);
  }

  return output;
}