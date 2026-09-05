import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { computeQuestionnaireAttentionHints } from "@/lib/questionnaire/attentionHints";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";
import QuestionnaireCard from "@/components/questionnaire/QuestionnaireCard";
import { renderToStaticMarkup } from "react-dom/server";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/questionnaires",
}));

const TODAY = new Date("2026-09-05T12:00:00.000Z");

function visibleIds(answers: Record<string, string>): Set<string> {
  const blocks = buildFrozenBlocks(["IMPFBERATUNG"]);
  const blockIds = computeVisibleBlockIds(
    blocks.flatMap((block) => block.conditionalRules),
    blocks,
    answers,
    computeAllDerivedValues(answers),
  );
  const ids = new Set<string>();
  for (const block of blocks) {
    if (!blockIds.has(block.id)) continue;
    computeVisibleQuestionIds(
      blocks.flatMap((entry) => entry.conditionalRules),
      block.questions.map((question) => question.id),
      answers,
      computeAllDerivedValues(answers),
      buildOptionsByQuestionId(block.questions),
    ).forEach((id) => ids.add(id));
  }
  return ids;
}

function hints(answers: Record<string, string>) {
  return computeQuestionnaireAttentionHints(answers, visibleIds(answers), { today: TODAY });
}

function labels(answers: Record<string, string>) {
  return hints(answers).map((hint) => hint.label);
}

describe("QuestionnaireAttentionHints", () => {
  it("erzeugt Reise- und Risikohinweise nur für sichtbare beantwortete Fragen", () => {
    expect(labels({
      IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt, Vorsorge / Impfschutz überprüfen",
      IMPFBERATUNG_REISELAND: "Japan",
      IMPFBERATUNG_RISIKOGRUPPEN: "Chronische Atemwegserkrankung",
    })).toEqual([
      "Reise: länderspezifische Prüfung erforderlich",
      "Risikokonstellation angegeben",
    ]);
    expect(labels({
      IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt",
    })).toEqual([]);
    expect(labels({
      IMPFBERATUNG_ANLASS: "Vorsorge / Impfschutz überprüfen",
      IMPFBERATUNG_REISELAND: "Japan",
    })).toEqual([]);
  });

  it("erzeugt keinen Risikohinweis durch Alter allein", () => {
    expect(labels({
      IDENTITY_BIRTHDATE: "1940-01-01",
      IMPFBERATUNG_ANLASS: "Vorsorge / Impfschutz überprüfen",
    })).not.toContain("Risikokonstellation angegeben");
  });

  it("erzeugt Nachweishinweise nur bei Ja und ergänzt einen sichtbaren Zweck", () => {
    expect(labels({
      IMPFBERATUNG_NACHWEIS_BEDARF: "Ja",
      IMPFBERATUNG_NACHWEIS_ZWECK: "Einreisebestimmung",
    })).toContain("Nachweis erforderlich – Einreisebestimmung");
    expect(labels({ IMPFBERATUNG_NACHWEIS_BEDARF: "Nein" })).toEqual([]);
    expect(labels({
      IMPFBERATUNG_NACHWEIS_BEDARF: "Ja",
      IMPFBERATUNG_NACHWEIS_ZWECK: "Einreisebestimmung",
    })).toContain("Nachweis erforderlich – Einreisebestimmung");
  });

  it.each([
    [27, true],
    [28, false],
    [35, false],
    [-1, false],
  ])("wertet Abreise in %i Tagen korrekt aus", (days, expected) => {
    const date = new Date(TODAY.getTime() + days * 24 * 60 * 60 * 1000);
    const result = labels({
      IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt",
      IMPFBERATUNG_REISELAND: "Japan",
      IMPFBERATUNG_REISE_ABREISE: date.toISOString().slice(0, 10),
    });
    expect(result.some((label) => label === `Kurzer Vorlauf: Abreise in ${days} Tagen`)).toBe(expected);
  });

  it("nimmt bei zwei Fristen nur den frühesten sichtbaren Termin", () => {
    expect(labels({
      IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt",
      IMPFBERATUNG_REISELAND: "Japan",
      IMPFBERATUNG_REISE_ABREISE: "2026-09-25",
      IMPFBERATUNG_NACHWEIS_BEDARF: "Ja",
      IMPFBERATUNG_NACHWEIS_ZWECK: "Einreisebestimmung",
      IMPFBERATUNG_NACHWEIS_FRIST: "2026-09-12",
    })).toContain("Kurzer Vorlauf: Nachweisfrist in 7 Tagen");
  });

  it("erzeugt einen Akuthinweis, aber keinen Vorlauf aus dem Akutdatum", () => {
    expect(labels({
      IMPFBERATUNG_ANLASS: "Akute Situation",
      IMPFBERATUNG_AKUT_ART: "Verletzung / Wunde",
      IMPFBERATUNG_AKUT_DATUM: "2026-09-10",
    })).toEqual(["Akute Situation: zeitnah prüfen"]);
  });
});

describe("QuestionnaireAttentionHints output", () => {
  const answers = {
    IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt",
    IMPFBERATUNG_REISELAND: "Japan",
  };

  it("erscheint im Krankenblatt und in der Praxis-Karte unter Berechnete Werte", () => {
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["IMPFBERATUNG"],
      frozenBlocks: buildFrozenBlocks(["IMPFBERATUNG"]),
    });
    expect(note).toContain("Berechnete Werte");
    expect(note).toContain("Reise: länderspezifische Prüfung erforderlich");

    const markup = renderToStaticMarkup(QuestionnaireCard({
      id: "session-1",
      displayedAt: TODAY,
      patientReference: null,
      blockLabels: "Impfberatung",
      displayStatus: "completed",
      statusLabel: "Abgeschlossen",
      submittedBy: "patient",
      questions: [],
      answers,
      noteText: note,
      derivedValues: {},
      attentionHints: hints(answers),
    }));
    expect(markup).toContain("Berechnete Werte");
    expect(markup).toContain("Reise: länderspezifische Prüfung erforderlich");
  });

  it("enthält den Hinweis im PDF", async () => {
    const questions: QuestionDefinition[] = [
      { id: "IMPFBERATUNG_REISELAND", text: "Wohin reisen Sie?", type: "text", required: true },
    ];
    const result = await buildQuestionnairePdfBytes(
      {
        patient_reference: null,
        submitted_at: TODAY,
        submitted_by: "patient",
        selected_block_ids: ["IMPFBERATUNG"],
        deduplicated_questions: questions,
        answers,
        source: "internal_link",
        practice_form: null,
      },
      {
        title: "Fragebogen",
        referenceLabel: "Referenz",
        blockCatalog: {
          IMPFBERATUNG: {
            id: "IMPFBERATUNG",
            label: "Impfberatung",
            displayOrder: 1,
            questionIds: questions.map((question) => question.id),
          },
        },
      },
    );
    await PDFDocument.load(result.bytes);
    const raw = Buffer.from(result.bytes).toString("latin1");
    const text = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map((match) => {
        try {
          return inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1");
        } catch {
          return match[1]!;
        }
      })
      .join(" ")
      .replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
        Buffer.from(hex, "hex").toString("latin1"),
      );
    expect(text).toContain("Reise: länderspezifische Prüfung erforderlich");
  });
});
