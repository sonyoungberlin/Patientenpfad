import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import type { PrintPdfBlock } from "@/lib/pdf/printPdf";
import { INTERNAL_DOCUMENT_TITLE_OPTIONS } from "@/lib/questionnaire/internalDocumentTitle";
import { getInternalTemplatePlacements } from "@/lib/questionnaire/internalBlockLayout";

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
type PrintLabelContext = {
  fieldLabels: ReadonlyMap<string, string>;
  optionLabels: ReadonlyMap<string, ReadonlyMap<string, string>>;
  fieldsWithOptions: ReadonlySet<string>;
};

const BLOCK_TYPE_LABELS: Record<PracticeDocumentationBlockDefinition["visibleType"], string> = {
  text: "Freitext",
  paragraph: "Festtext",
  selection: "Einzelauswahl",
  measurement: "Messwert",
  month: "Monat und Jahr",
  list: "Mehrfachauswahl",
  hint: "Hinweisfeld",
  repeatable: "Wiederholbare Angaben",
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Kurzer Freitext",
  textarea: "Mehrzeiliger Freitext",
  date: "Datum",
  yes_no: "Ja/Nein-Auswahl",
  confirmation: "Bestätigung",
  select: "Einfachauswahl",
  multi_select: "Mehrfachauswahl",
  repeatable_group: "Wiederholbare Angaben",
  number: "Zahlenwert",
  time: "Uhrzeit",
  month: "Monat und Jahr",
};

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isInternalIdentifier(value: string): boolean {
  return /^(?:practice_)?(?:option|field|question|block)_/i.test(value);
}

function addOptionLabels(
  target: Map<string, Map<string, string>>,
  fieldsWithOptions: Set<string>,
  fieldId: string,
  rawOptions: unknown,
) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) return;
  fieldsWithOptions.add(fieldId);
  const labels = target.get(fieldId) ?? new Map<string, string>();
  for (const option of rawOptions) {
    if (typeof option === "string") {
      labels.set(option, isInternalIdentifier(option) ? "Nicht näher bezeichnete Option" : option);
      continue;
    }
    if (!isRecord(option)) continue;
    const value = textValue(option.value);
    if (!value) continue;
    const label = textValue(option.label);
    labels.set(value, label && !isInternalIdentifier(label) ? label : "Nicht näher bezeichnete Option");
  }
  target.set(fieldId, labels);
}

function buildPrintLabelContext(definition: PracticeDocumentationBlockDefinition): PrintLabelContext {
  const fieldLabels = new Map<string, string>();
  const optionLabels = new Map<string, Map<string, string>>();
  const fieldsWithOptions = new Set<string>();

  for (const question of definition.questions) {
    fieldLabels.set(question.id, question.text);
    addOptionLabels(optionLabels, fieldsWithOptions, question.id, question.options);
    for (const field of question.groupSchema ?? []) {
      fieldLabels.set(field.key, field.label);
      addOptionLabels(optionLabels, fieldsWithOptions, field.key, field.options);
    }
  }

  return { fieldLabels, optionLabels, fieldsWithOptions };
}

function resolveFieldLabel(fieldId: string, context: PrintLabelContext): string {
  return context.fieldLabels.get(fieldId) ?? "nicht zugeordnetes Feld";
}

function resolveOptionLabel(fieldId: string, value: unknown, context: PrintLabelContext): string {
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string" || !value.trim()) return "nicht zugeordneter Auswahlwert";

  const label = context.optionLabels.get(fieldId)?.get(value);
  if (label) return label;
  if (context.fieldsWithOptions.has(fieldId) || isInternalIdentifier(value)) {
    return "nicht zugeordneter Auswahlwert";
  }
  if (value === "YES" || value.toLowerCase() === "ja" || value === "true") return "Ja";
  if (value === "NO" || value.toLowerCase() === "nein" || value === "false") return "Nein";
  if (value === "UNCLEAR") return "Unklar";
  return value;
}

function getPlacements(value: unknown): Array<{ blockId: string; section: number; order: number }> {
  return getInternalTemplatePlacements(value).flatMap((item) => {
    if (!isRecord(item) || typeof item.blockId !== "string" ||
      typeof item.section !== "number" || typeof item.order !== "number") return [];
    return [{ blockId: item.blockId, section: item.section, order: item.order }];
  }).sort((left, right) => left.section - right.section || left.order - right.order);
}

function renderSegments(value: unknown, context: PrintLabelContext): string {
  if (!Array.isArray(value)) return "";
  return value.map((raw) => {
    if (!isRecord(raw)) return "";
    if (raw.kind === "text") return textValue(raw.text) ?? "";
    if (raw.kind === "answerRef" || raw.kind === "fieldRef") {
      const id = typeof raw.fieldKey === "string" ? raw.fieldKey
        : typeof raw.questionId === "string" ? raw.questionId
          : "";
      return `[${resolveFieldLabel(id, context)}]`;
    }
    if (raw.kind === "conditional") {
      const id = typeof raw.fieldKey === "string" ? raw.fieldKey
        : typeof raw.questionId === "string" ? raw.questionId
          : "";
      const fieldLabel = resolveFieldLabel(id, context);
      const optionLabel = resolveOptionLabel(id, raw.optionValue, context);
      return `[Wenn bei ${fieldLabel} „${optionLabel}“ ausgewählt ist: ${renderSegments(raw.segments, context)}]`;
    }
    return "";
  }).join("");
}

function appendQuestion(blocks: PrintPdfBlock[], raw: unknown, context: PrintLabelContext) {
  if (!isRecord(raw)) return;
  const questionText = textValue(raw.text) ?? textValue(raw.label) ?? "Feld ohne Bezeichnung";
  const rawType = textValue(raw.type);
  const type = rawType ? QUESTION_TYPE_LABELS[rawType] ?? "Weitere Angabe" : null;
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
        blocks.push({
          kind: "paragraph",
          text: isInternalIdentifier(option) ? "Nicht näher bezeichnete Option" : option,
        });
      } else if (isRecord(option)) {
        const rawLabel = textValue(option.label);
        const label = rawLabel && !isInternalIdentifier(rawLabel)
          ? rawLabel
          : "Nicht näher bezeichnete Option";
        blocks.push({ kind: "paragraph", text: label });
        const output = textValue(option.documentationText);
        if (output) blocks.push({ kind: "paragraph", text: `Ausgabetext: ${output}` });
        const segments = renderSegments(option.documentationSegments, context);
        if (segments) blocks.push({ kind: "paragraph", text: `Zusammengesetzter Text: ${segments}` });
      }
    }
  }

  const segments = renderSegments(raw.documentationSegments, context);
  if (segments) blocks.push({ kind: "paragraph", text: `Zusammengesetzter Text: ${segments}` });

  if (Array.isArray(raw.groupSchema) && raw.groupSchema.length > 0) {
    blocks.push({ kind: "paragraph", text: "Wiederholbare Angaben" });
    for (const field of raw.groupSchema) appendQuestion(blocks, field, context);
  }

  if (typeof raw.conditionalOn === "string") {
    const values = [raw.conditionalValue, ...(Array.isArray(raw.conditionalValues) ? raw.conditionalValues : [])]
      .filter((value): value is string => typeof value === "string");
    if (values.length > 0) {
      const sourceLabel = resolveFieldLabel(raw.conditionalOn, context);
      const choices = values.map((value) => `„${resolveOptionLabel(raw.conditionalOn as string, value, context)}“`);
      const condition = values.length === 1
        ? `die Auswahl ${choices[0]} getroffen ist`
        : `eine der Auswahlen ${choices.join(" oder ")} getroffen ist`;
      blocks.push({ kind: "paragraph", text: `Sichtbar, wenn bei ${sourceLabel} ${condition}.` });
    }
  }
}

function describeCondition(value: unknown, context: PrintLabelContext): string {
  if (!isRecord(value)) return "Bedingung unbekannt";
  if ((value.mode === "AND" || value.mode === "OR") && Array.isArray(value.conditions)) {
    const conditions = value.conditions.map((condition) => describeCondition(condition, context));
    return conditions.length > 1
      ? `(${conditions.join(value.mode === "AND" ? " und " : " oder ")})`
      : conditions[0] ?? "Bedingung unbekannt";
  }
  const target = isRecord(value.target) ? value.target : null;
  const questionId = target?.kind === "question" && typeof target.questionId === "string"
    ? target.questionId
    : null;
  const targetLabel = questionId
    ? resolveFieldLabel(questionId, context)
    : target?.kind === "derived" ? "ein berechneter Wert" : "nicht zugeordnetes Feld";
  switch (value.operator) {
    case "equals":
      return `${targetLabel} ist „${resolveOptionLabel(questionId ?? "", value.value, context)}“`;
    case "notEquals":
      return `${targetLabel} ist nicht „${resolveOptionLabel(questionId ?? "", value.value, context)}“`;
    case "contains":
      return `${targetLabel} enthält „${resolveOptionLabel(questionId ?? "", value.value, context)}“`;
    case "greaterThan":
      return `${targetLabel} ist größer als ${formatConditionValue(value.value)}`;
    case "greaterThanOrEqual":
      return `${targetLabel} ist mindestens ${formatConditionValue(value.value)}`;
    case "lessThan":
      return `${targetLabel} ist kleiner als ${formatConditionValue(value.value)}`;
    case "lessThanOrEqual":
      return `${targetLabel} ist höchstens ${formatConditionValue(value.value)}`;
    case "isAnswered":
      return `${targetLabel} wurde ausgefüllt`;
    case "isEmpty":
      return `${targetLabel} ist leer`;
    default:
      return `${targetLabel}: Bedingung konnte nicht näher aufgelöst werden`;
  }
}

function formatConditionValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && !isInternalIdentifier(value)) return value;
  return "nicht zugeordneter Wert";
}

function appendBlock(blocks: PrintPdfBlock[], block: PrintBlock) {
  const definition = block.definition;
  blocks.push({
    kind: "subheading",
    text: `${block.title} (${BLOCK_TYPE_LABELS[definition.visibleType]}; ${block.isActive ? "aktiv" : "inaktiv"})`,
  });
  blocks.push({
    kind: "paragraph",
    text: `Verfügbar für: ${(definition.allowedTemplateCategories ?? ["documentation"]).map((category) => category === "profile" ? "Steckbriefe" : "Dokumentationen").join(", ")}`,
  });
  const context = buildPrintLabelContext(definition);
  for (const question of definition.questions) appendQuestion(blocks, question, context);

  const rules = definition.block.conditionalRules ?? [];
  if (rules.length > 0) {
    blocks.push({ kind: "paragraph", text: "Sichtbarkeitsregeln" });
    for (const rule of rules) {
      const target = definition.questions.find((question) => question.id === rule.targetId);
      const targetName = target?.text ?? "nicht zugeordnetes Feld";
      blocks.push({
        kind: "paragraph",
        text: `${targetName} wird angezeigt, wenn ${describeCondition(rule.condition, context)}.`,
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
      output.push({ kind: "paragraph", text: `Dokumenttitel: ${titleOption?.label ?? "nicht zugeordnet"}` });
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
        output.push({ kind: "paragraph", text: "Ein zugeordneter Baustein ist nicht verfügbar." });
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