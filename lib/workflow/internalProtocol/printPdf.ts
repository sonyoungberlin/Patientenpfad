import type { PrintPdfBlock } from "@/lib/pdf/printPdf";
import type { InternalProtocolWorkflowSnapshot } from "./workflowAdapter";
import { resolveAnswerLabel } from "./answerLabel";
import { getPatientWithoutAppointmentSections } from "./patientWithoutAppointment";

export type InternalProtocolPrintEntry = {
  title: string | null;
  createdAt: Date;
  snapshot: InternalProtocolWorkflowSnapshot;
};

const JUDGEMENT_LABELS = {
  SUFFICIENTLY_CLARIFIED: "Ausreichend geklärt",
  OPEN: "Offen",
  NOT_RELEVANT: "Nicht relevant",
} as const;

const STATUS_LABELS = {
  OPEN: "Offen",
  CONFIRMED: "Bestätigt",
  NOT_APPLICABLE: "Nicht zutreffend",
} as const;

const MODE_LABELS = {
  CURRENT_STATE: "Bestandsaufnahme",
  TARGET_STATE: "Zielprozess",
} as const;

const BINDING_LABELS = {
  MANDATORY: "Verbindliche Vorgabe",
  RECOMMENDED: "Empfehlung",
  ORIENTATION: "Orientierung",
} as const;

function answerText(value: unknown): string {
  if (value === null || value === undefined) return "–";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

export function buildInternalProtocolPrintBlocks(
  entries: readonly InternalProtocolPrintEntry[],
): PrintPdfBlock[] {
  const sections = getPatientWithoutAppointmentSections();
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const blocks: PrintPdfBlock[] = [];

  for (const [entryIndex, entry] of entries.entries()) {
    if (blocks.length > 0) blocks.push({ kind: "separator" });
    const { snapshot } = entry;
    blocks.push(
      { kind: "heading", text: entry.title?.trim() || `Internes Protokoll ${entryIndex + 1}` },
      { kind: "paragraph", text: `Erstellt: ${entry.createdAt.toLocaleDateString("de-DE")}` },
      { kind: "paragraph", text: `Art: ${MODE_LABELS[snapshot.processMode ?? "CURRENT_STATE"]}` },
    );

    for (const checkpoint of snapshot.checkpoints) {
      const section = sectionById.get(checkpoint.id);
      blocks.push({
        kind: "subheading",
        text: `${checkpoint.title} | Status: ${STATUS_LABELS[checkpoint.status]} | Klärung: ${JUDGEMENT_LABELS[checkpoint.clarificationJudgement ?? "OPEN"]}`,
      });

      if (section?.officialRules.length) {
        blocks.push({ kind: "paragraph", text: "Fachliche Leitplanken" });
        for (const rule of section.officialRules) {
          blocks.push({
            kind: "paragraph",
            text: `${rule.title ? `${rule.title}: ` : ""}${rule.text}`,
          });
          blocks.push({ kind: "paragraph", text: BINDING_LABELS[rule.bindingLevel] });
          if (rule.note) blocks.push({ kind: "paragraph", text: `Hinweis: ${rule.note}` });
          const source = rule.source;
          blocks.push({ kind: "paragraph", text: `Quelle: ${source.author} – ${source.title}` });
          if (source.reference) blocks.push({ kind: "paragraph", text: `Fundstelle: ${source.reference}` });
          if (source.publicationDate) blocks.push({ kind: "paragraph", text: `Veröffentlicht: ${source.publicationDate}` });
          blocks.push({ kind: "paragraph", text: `Inhaltlich geprüft: ${source.reviewedAt}` });
          if (source.url) blocks.push({ kind: "paragraph", text: source.url });
        }
      }

      const knownQuestionIds = new Set(section?.questions.map((question) => question.id) ?? []);
      for (const question of section?.questions ?? []) {
        blocks.push({ kind: "paragraph", text: question.text });
        if (question.required !== undefined) {
          blocks.push({ kind: "paragraph", text: `Erforderliche Angabe: ${question.required ? "ja" : "nein"}` });
        }
        if (question.hint) blocks.push({ kind: "paragraph", text: `Hinweis: ${question.hint}` });
        if (question.kind === "FREE_TEXT" && question.placeholder) {
          blocks.push({ kind: "paragraph", text: `Platzhalter: ${question.placeholder}` });
        }
        if (question.kind === "SINGLE_SELECT" || question.kind === "MULTI_SELECT") {
          blocks.push({ kind: "paragraph", text: "Auswahlmöglichkeiten" });
          for (const option of question.options) {
            blocks.push({ kind: "paragraph", text: `${option.label}: ${option.outputText}` });
          }
        }
        blocks.push({ kind: "paragraph", text: `Antwort: ${resolveAnswerLabel(question, checkpoint.answers[question.id] ?? null)}` });
      }

      const extraAnswers = Object.entries(checkpoint.answers).filter(([questionId]) => !knownQuestionIds.has(questionId));
      for (const [questionId, answer] of extraAnswers) {
        blocks.push({ kind: "paragraph", text: `Weitere gespeicherte Antwort (${questionId}): ${answerText(answer)}` });
      }
    }

    const templateAnswers = Object.entries(snapshot.templateAnswers ?? {}).filter(([, value]) => value !== null);
    if (templateAnswers.length > 0) {
      blocks.push({ kind: "subheading", text: "Gespeicherte Ausgangsvorschläge" });
      const questionById = new Map(sections.flatMap((section) => section.questions.map((question) => [question.id, question] as const)));
      for (const [questionId, value] of templateAnswers) {
        const question = questionById.get(questionId);
        blocks.push({ kind: "paragraph", text: question?.text ?? questionId });
        blocks.push({ kind: "paragraph", text: `Vorschlag: ${question ? resolveAnswerLabel(question, value) : answerText(value)}` });
      }
    }
  }

  return blocks;
}