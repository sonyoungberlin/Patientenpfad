import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import {
  resolveQuestionDocumentation,
  resolveStructuredQuestionDocumentation,
} from "@/lib/questionnaire/formatAnswer";
import { parseRepeatableGroupEntries } from "@/lib/questionnaire/formatAnswer";
import { buildInternalDocumentationFrozenBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { buildStructuredAppXml } from "@/lib/questionnaire/appTextXml";
import { buildSemanticMedicalRecordDocument } from "@/lib/questionnaire/buildMedicalRecordNote";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  await PDFDocument.load(bytes);
  const raw = Buffer.from(bytes).toString("latin1");
  return [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => {
    try {
      return inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1");
    } catch {
      return match[1]!;
    }
  }).join(" ").replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
    Buffer.from(hex, "hex").toString("latin1"),
  );
}

function frozenBlock(question: QuestionDefinition): FrozenBlock {
  return {
    id: "TEST_BLOCK",
    label: "Testblock",
    displayOrder: 1,
    questions: [question],
    conditionalRules: [],
    initiallyVisible: true,
  };
}

describe("documentationText für Antwortoptionen", () => {
  it("gibt einen festen mehrzeiligen Absatz ohne Antwortwert vollständig aus", async () => {
    const content = "Einleitung erster Absatz.\n\nEinleitung zweiter Absatz mit mehr als 500 Zeichen: " + "x".repeat(520);
    const question: QuestionDefinition = {
      id: "CONSENT_INTRO",
      text: "Einwilligung Befundanforderung – Einleitung",
      type: "textarea",
      required: false,
      documentationText: content,
      documentationItemType: "bodyText",
    };
    const answers = { CONSENT_INTRO: "" };
    const frozen = [frozenBlock(question)];
    const note = buildMedicalRecordNote({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: frozen });
    expect(note).toContain(content);
    const semantic = buildSemanticMedicalRecordDocument({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: frozen });
    expect(semantic.sections.flatMap((section) => section.items).map((item) => item.text).join("\n")).toContain(content);
    const xml = buildStructuredAppXml(semantic);
    expect(xml).toContain("Einleitung zweiter Absatz");
    const pdf = await buildQuestionnairePdfBytes({ patient_reference: null, submitted_at: null, submitted_by: "patient", selected_block_ids: ["TEST_BLOCK"], deduplicated_questions: [question], answers, source: "test", practice_form: null, frozen_blocks: frozen }, { title: "Test", referenceLabel: "Referenz", blockCatalog: { TEST_BLOCK: { id: "TEST_BLOCK", label: "Testblock", displayOrder: 1, questionIds: [question.id] } } });
    expect(await extractPdfText(pdf.bytes)).toContain("Einleitung erster Absatz.");
  });

  it("gibt geordnete Repeatable-Instanzen mit instanzlokaler Dokumentation aus", async () => {
    const question: QuestionDefinition = {
      id: "CONTACTS",
      text: "Kontakte",
      type: "repeatable_group",
      required: false,
      groupSchema: [
        { key: "time", label: "Zeit", type: "time", required: true },
        { key: "note", label: "Notiz", type: "textarea", required: false, documentationText: "Kontakt dokumentiert." },
      ],
    };
    const answers = { CONTACTS: JSON.stringify([{ time: "09:15", note: "Rückruf" }, { time: "14:00", note: "Nachricht" }]) };
    const entries = parseRepeatableGroupEntries(answers.CONTACTS, question.id, question);
    expect(entries.map((entry) => entry.index)).toEqual([1, 2]);
    expect(entries[0]?.fields[0]).toEqual(expect.objectContaining({ value: "09:15" }));
    expect(entries[0]?.fields[1]).toEqual(expect.objectContaining({ documentationText: "Kontakt dokumentiert." }));
    const note = buildMedicalRecordNote({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: [frozenBlock(question)] });
    expect(note.indexOf("09:15")).toBeLessThan(note.indexOf("14:00"));
    expect(note).toContain("Kontakt dokumentiert.");
    const semantic = buildSemanticMedicalRecordDocument({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: [frozenBlock(question)] });
    expect(semantic.sections.flatMap((section) => section.items).map((item) => item.text).join(" ")).toContain("Kontakt dokumentiert.");
    const xml = buildStructuredAppXml(semantic);
    expect(xml).toContain("Kontakt dokumentiert.");
    const pdf = await buildQuestionnairePdfBytes({ patient_reference: null, submitted_at: null, submitted_by: "patient", selected_block_ids: ["TEST_BLOCK"], deduplicated_questions: [question], answers, source: "test", practice_form: null, frozen_blocks: [frozenBlock(question)] }, { title: "Test", referenceLabel: "Referenz", blockCatalog: { TEST_BLOCK: { id: "TEST_BLOCK", label: "Testblock", displayOrder: 1, questionIds: [question.id] } } });
    expect(await extractPdfText(pdf.bytes)).toContain("Kontakt dokumentiert.");
  });
  it("setzt referenzierte Zusatzantworten strukturiert zusammen und gibt sie nicht doppelt aus", () => {
    const selection: QuestionDefinition = {
      id: "LIMITATION_STATUS",
      text: "Leistungseinschränkung",
      type: "select",
      required: true,
      options: [{
        value: "travel_unfit",
        label: "Reiseunfähig",
        documentationText: "Reiseunfähig",
        documentationSegments: [
          { kind: "text", text: "Die Person ist vom " },
          { kind: "answerRef", questionId: "LIMITATION_FROM" },
          { kind: "text", text: " bis zum " },
          { kind: "answerRef", questionId: "LIMITATION_TO" },
          { kind: "text", text: " reiseunfähig." },
        ],
      }],
    };
    const from: QuestionDefinition = {
      id: "LIMITATION_FROM",
      text: "Von",
      type: "date",
      required: true,
    };
    const to: QuestionDefinition = {
      id: "LIMITATION_TO",
      text: "Bis",
      type: "date",
      required: true,
    };
    const answers = {
      LIMITATION_STATUS: "travel_unfit",
      LIMITATION_FROM: "2026-09-21",
      LIMITATION_TO: "2026-09-28",
    };
    const questions = new Map([selection, from, to].map((question) => [question.id, question]));

    expect(resolveStructuredQuestionDocumentation(selection, answers.LIMITATION_STATUS, answers, questions))
      .toBe("Die Person ist vom 21.09.2026 bis zum 28.09.2026 reiseunfähig.");
    expect(buildMedicalRecordNote({
      answers,
      selected_block_ids: ["TEST_BLOCK"],
      frozenBlocks: [{
        ...frozenBlock(selection),
        questions: [selection, from, to],
      }],
    })).toContain("Die Person ist vom 21.09.2026 bis zum 28.09.2026 reiseunfähig.");
    expect(buildMedicalRecordNote({
      answers,
      selected_block_ids: ["TEST_BLOCK"],
      frozenBlocks: [{
        ...frozenBlock(selection),
        questions: [selection, from, to],
      }],
    })).not.toContain("Von:");
  });

  it("löst bedingte Segmentzweige für konkretes Datum und offenes Ende auf", () => {
    const selection: QuestionDefinition = {
      id: "LIMITATION_STATUS",
      text: "Leistungseinschränkung",
      type: "select",
      required: true,
      options: [{
        value: "travel_unfit",
        label: "Reiseunfähig",
        documentationSegments: [
          { kind: "text", text: "Vom " },
          { kind: "answerRef", questionId: "LIMITATION_FROM" },
          { kind: "conditional", questionId: "LIMITATION_END", optionValue: "date", segments: [
            { kind: "text", text: " bis " },
            { kind: "answerRef", questionId: "LIMITATION_TO" },
          ] },
          { kind: "conditional", questionId: "LIMITATION_END", optionValue: "open", segments: [
            { kind: "text", text: " bis auf Weiteres" },
          ] },
          { kind: "text", text: " reiseunfähig." },
        ],
      }],
    };
    const from: QuestionDefinition = { id: "LIMITATION_FROM", text: "Von", type: "date", required: true };
    const end: QuestionDefinition = { id: "LIMITATION_END", text: "Ende", type: "select", required: true, options: [{ value: "date", label: "Bis Datum" }, { value: "open", label: "Bis auf Weiteres" }] };
    const to: QuestionDefinition = { id: "LIMITATION_TO", text: "Bis", type: "date", required: true };
    const questions = new Map([selection, from, end, to].map((question) => [question.id, question]));

    expect(resolveStructuredQuestionDocumentation(selection, "travel_unfit", {
      LIMITATION_STATUS: "travel_unfit", LIMITATION_FROM: "2026-09-21", LIMITATION_END: "date", LIMITATION_TO: "2026-09-28",
    }, questions)).toBe("Vom 21.09.2026 bis 28.09.2026 reiseunfähig.");
    expect(resolveStructuredQuestionDocumentation(selection, "travel_unfit", {
      LIMITATION_STATUS: "travel_unfit", LIMITATION_FROM: "2026-09-21", LIMITATION_END: "open", LIMITATION_TO: "",
    }, questions)).toBe("Vom 21.09.2026 bis auf Weiteres reiseunfähig.");
    const note = buildMedicalRecordNote({
      answers: { LIMITATION_STATUS: "travel_unfit", LIMITATION_FROM: "2026-09-21", LIMITATION_END: "open", LIMITATION_TO: "" },
      selected_block_ids: ["TEST_BLOCK"],
      frozenBlocks: [{ ...frozenBlock(selection), questions: [selection, from, end, to] }],
    });
    expect(note).toContain("Vom 21.09.2026 bis auf Weiteres reiseunfähig.");
    expect(note).not.toContain("Ende:");
    expect(note).not.toContain("Bis:");
  });

  it("gibt mehrere Multi-Choice-Optionen mit statischer und strukturierter Dokumentation aus", async () => {
    const detail: QuestionDefinition = { id: "DETAIL", text: "Detail", type: "text", required: false };
    const multi: QuestionDefinition = {
      id: "SUPPLIES",
      text: "Mitgegeben",
      type: "multi_select",
      required: true,
      options: [
        { value: "plan", label: "Medikamentenplan", documentationText: "Der Medikamentenplan wurde mitgegeben." },
        { value: "referral", label: "Überweisung", documentationSegments: [
          { kind: "text", text: "Die Überweisung wurde mitgegeben (" },
          { kind: "answerRef", questionId: "DETAIL" },
          { kind: "text", text: ")." },
        ] },
        { value: "copy", label: "Befundkopie", documentationText: "Die Befundkopie wurde mitgegeben." },
      ],
    };
    const answers = { SUPPLIES: "plan, referral", DETAIL: "Facharzt" };
    const frozen = [{ ...frozenBlock(multi), questions: [multi, detail] }];
    expect(resolveQuestionDocumentation(multi, "plan").documentationTexts)
      .toEqual(["Der Medikamentenplan wurde mitgegeben."]);
    const note = buildMedicalRecordNote({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: frozen });
    const semantic = buildSemanticMedicalRecordDocument({ answers, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: frozen });
    const xml = buildStructuredAppXml(semantic);
    const pdf = await buildQuestionnairePdfBytes({
      patient_reference: null,
      submitted_at: null,
      submitted_by: "patient",
      selected_block_ids: ["TEST_BLOCK"],
      deduplicated_questions: [multi, detail],
      answers,
      source: "test",
      practice_form: null,
      frozen_blocks: frozen,
    }, {
      title: "Test",
      referenceLabel: "Referenz",
      blockCatalog: {
        TEST_BLOCK: { id: "TEST_BLOCK", label: "Testblock", displayOrder: 1, questionIds: ["SUPPLIES", "DETAIL"] },
      },
    });
    const pdfText = await extractPdfText(pdf.bytes);

    expect(note).toContain("Der Medikamentenplan wurde mitgegeben.");
    expect(note).toContain("Die Überweisung wurde mitgegeben (Facharzt).");
    expect(note).not.toContain("Detail:");
    expect(semantic.sections.flatMap((section) => section.items).map((item) => item.text)).toEqual(expect.arrayContaining([
      "Der Medikamentenplan wurde mitgegeben. Die Überweisung wurde mitgegeben (Facharzt).",
    ]));
    expect(xml).toContain("Die Überweisung wurde mitgegeben (Facharzt).");
    expect(pdfText).toContain("Der Medikamentenplan wurde mitgegeben.");
    expect(pdfText).toContain("Die Überweisung wurde mitgegeben (Facharzt).");
  });

  it("gibt gemeinsamen Multi-Select-Text bei einer oder mehreren Auswahlen genau einmal aus", () => {
    const question: QuestionDefinition = {
      id: "SPECIALIST_REQUEST",
      text: "Anforderung Facharzt",
      type: "multi_select",
      required: false,
      sharedDocumentationText: "Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:",
      options: [
        { value: "befund", label: "Befund / Epikrise", documentationText: "Befund / Epikrise" },
        { value: "medikation", label: "Medikationsplan", documentationText: "Medikationsplan" },
        { value: "therapie", label: "Therapieempfehlung", documentationText: "Therapieempfehlung" },
      ],
    };
    expect(resolveQuestionDocumentation(question, "befund, medikation, therapie").documentationTexts)
      .toEqual(["Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:", "Befund / Epikrise", "Medikationsplan", "Therapieempfehlung"]);
    expect(resolveQuestionDocumentation(question, "befund").documentationTexts)
      .toEqual(["Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:", "Befund / Epikrise"]);
    expect(resolveQuestionDocumentation(question, "").documentationTexts).toEqual([]);
    const note = buildMedicalRecordNote({ answers: { SPECIALIST_REQUEST: "befund, medikation, therapie" }, selected_block_ids: ["TEST_BLOCK"], frozenBlocks: [frozenBlock(question)] });
    expect(note.match(/Wir bitten um Übermittlung/g)).toHaveLength(1);
    expect(note).toContain("Befund / Epikrise");
    expect(note).toContain("Medikationsplan");
    expect(note).toContain("Therapieempfehlung");
  });

  it("löst select-Dokumentation zentral auf und behält den Fallback bei", () => {
    const documented: QuestionDefinition = {
      id: "SELECT_DOCUMENTED",
      text: "Auswahl",
      type: "select",
      required: false,
      options: [{ value: "short", label: "Kurzes Label", documentationText: "Vollständiger Dokumentationssatz." }],
    };
    const legacy: QuestionDefinition = {
      id: "SELECT_LEGACY",
      text: "Legacy-Auswahl",
      type: "select",
      required: false,
      options: ["Bisheriger Wert"],
    };

    expect(resolveQuestionDocumentation(documented, "short")).toEqual({
      documentationTexts: ["Vollständiger Dokumentationssatz."],
    });
    expect(resolveQuestionDocumentation(legacy, "Bisheriger Wert")).toEqual({
      documentationTexts: [],
      fallbackValue: "Bisheriger Wert",
    });
    expect(buildMedicalRecordNote({
      answers: { SELECT_DOCUMENTED: "short" },
      selected_block_ids: ["TEST_BLOCK"],
      frozenBlocks: [frozenBlock(documented)],
    })).toContain("\nVollständiger Dokumentationssatz.");
    expect(buildMedicalRecordNote({
      answers: { SELECT_DOCUMENTED: "short" },
      selected_block_ids: ["TEST_BLOCK"],
      frozenBlocks: [frozenBlock(documented)],
    })).not.toContain("Auswahl: Vollständiger");
  });

  it("unterstützt custom yes_no und multi_select ohne Sonderfälle", () => {
    const yesNo: QuestionDefinition = {
      id: "YES_NO_DOCUMENTED",
      text: "Status",
      type: "yes_no",
      required: false,
      options: [
        { value: "positiv", label: "Positiv", documentationText: "Der Status ist positiv." },
        { value: "negativ", label: "Negativ", documentationText: "Der Status ist negativ." },
      ],
    };
    const multi: QuestionDefinition = {
      id: "MULTI_DOCUMENTED",
      text: "Maßnahmen",
      type: "multi_select",
      required: false,
      options: [
        { value: "a", label: "Kurz A", documentationText: "Maßnahme A wurde vereinbart." },
        { value: "b", label: "Kurz B", documentationText: "Maßnahme B wurde vereinbart." },
      ],
    };

    expect(resolveQuestionDocumentation(yesNo, "positiv").documentationTexts)
      .toEqual(["Der Status ist positiv."]);
    expect(resolveQuestionDocumentation(multi, "a, b").documentationTexts)
      .toEqual(["Maßnahme A wurde vereinbart.", "Maßnahme B wurde vereinbart."]);
  });

  it("friert documentationText ein und liest Legacy-Snapshots ohne Feld", () => {
    const blocks = buildInternalDocumentationFrozenBlocks(["CARE_PLAN_SUPPLY_BLOCK"]);
    const option = blocks[0].questions[0].options?.[0];
    expect(option).toMatchObject({
      value: "Patientin / Patient",
      label: "Patientin / Patient",
      documentationText: expect.any(String),
    });

    const legacy = [{
      ...blocks[0],
      questions: [{
        id: "LEGACY_SELECT",
        text: "Legacy",
        type: "select" as const,
        required: false,
        options: ["Alt"],
      }],
    }];
    expect(parseFrozenBlocks(legacy)?.[0].questions[0].options).toEqual(["Alt"]);
  });

  it("erzeugt für Versorgung und Organisation vollständige Sätze", () => {
    const blocks = buildInternalDocumentationFrozenBlocks(["CARE_PLAN_SUPPLY_BLOCK"]);
    const note = buildMedicalRecordNote({
      answers: {
        CARE_PLAN_SPECIALIST_REPORTS: "Patientin / Patient",
        CARE_PLAN_PRESCRIPTION_RENEWAL: "Ohne vorherige ärztliche Rücksprache",
        CARE_PLAN_REFERRAL: "Nach vorheriger ärztlicher Rücksprache",
      },
      selected_block_ids: ["CARE_PLAN_SUPPLY_BLOCK"],
      frozenBlocks: blocks,
    });

    expect(note).toContain("Die erforderlichen Facharztberichte werden durch die Patientin bzw. den Patienten angefordert.");
    expect(note).toContain("Rezepte für Dauermedikation werden ohne vorherige ärztliche Rücksprache ausgestellt.");
    expect(note).toContain("Überweisungen werden nach vorheriger ärztlicher Rücksprache ausgestellt.");
  });

  it("erzeugt für mehrere Dokumentaktionen je einen Satz und bleibt unbenutzt leer", () => {
    const blocks = buildInternalDocumentationFrozenBlocks(["DOCUMENT_HANDLING"]);
    const selected = buildMedicalRecordNote({
      answers: { DOCUMENT_HANDLING_ACTIONS: "attached, requested" },
      selected_block_ids: ["DOCUMENT_HANDLING"],
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });
    const empty = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["DOCUMENT_HANDLING"],
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });

    expect(selected).toContain("Dokumente / Befunde sind beigefügt.");
    expect(selected).toContain("Dokumente / Befunde wurden angefordert.");
    expect(selected).not.toContain("sind beigefügt, wurden angefordert");
    expect(empty).not.toContain("Dokumente / Befunde");
  });
});