import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import {
  buildMedicalRecordNote,
  buildSemanticMedicalRecordDocument,
} from "@/lib/questionnaire/buildMedicalRecordNote";
import { buildStructuredAppXml } from "@/lib/questionnaire/appTextXml";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { buildInternalDocumentationFrozenBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import { INTERNAL_BLOCK_CATALOG } from "@/lib/questionnaire/internalWorkflowRegistry";
import { isNewBlockBasedInternalSession } from "@/lib/questionnaire/documentedContent";
import { submitInternalDocumentationSession } from "@/lib/questionnaire/internalDocumentationService";
import { GET as PdfRoute } from "@/app/api/questionnaire/[id]/pdf/route";
import { INTERNAL_CONSENT_DOCUMENTATION_TEXT } from "@/lib/questionnaire/internalDocumentationCatalog";
import { joinMedicalStatementSentences } from "@/lib/questionnaire/formatAnswer";

const sessionDb = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;

const selectedBlockIds = [
  "CARE_PLAN_HA",
  "VACCINATION_REVIEW",
  "HEALTH_CHECK_NEXT_STEPS",
];
const frozenBlocks = buildInternalDocumentationFrozenBlocks(selectedBlockIds);
const questions = frozenBlocks.flatMap((block) => block.questions);
const answers = {
  CARE_PLAN_HA_REASON: "Versorgung abstimmen",
  VACCINATION_REVIEW_ITEMS: JSON.stringify([{
    vaccination_id: "influenza",
    documented_status: "Vollständig vorhanden",
  }]),
  HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
};

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  await PDFDocument.load(bytes);
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1"));
    } catch {
      streams.push(match[1]!);
    }
  }
  return streams
    .join(" ")
    .replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
      Buffer.from(hex, "hex").toString("latin1"),
    );
}

function extractPdfTextRuns(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1"));
    } catch {
      streams.push(match[1]!);
    }
  }
  return [...streams.join(" ").matchAll(/<([0-9A-F]+)>\s+Tj/g)]
    .map((match) => Buffer.from(match[1]!, "hex").toString("latin1"))
    .join(" ");
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "phase-2b-session",
    status: "completed",
    session_kind: "internal_documentation",
    internal_workflow_id: null,
    source: "practice_direct",
    owner_practice_id: "practice-1",
    created_by_kiosk_device_id: null,
    deleted_at: null,
    patient_reference: "PAT-2B",
    submitted_at: new Date("2026-09-09T10:00:00.000Z"),
    submitted_by: "practice",
    selected_block_ids: selectedBlockIds,
    deduplicated_questions: questions,
    frozen_blocks: frozenBlocks,
    answers,
    practice_form: null,
    context: "patient",
    pdf_downloaded_at: null,
    ...overrides,
  };
}

describe("Phase 2B blockbasierte interne Dokumentation", () => {
  beforeEach(() => {
    sessionDb.findUnique.mockReset();
    sessionDb.update.mockReset().mockResolvedValue({});
    sessionDb.updateMany.mockReset().mockResolvedValue({ count: 1 });
    accessMock.mockReset().mockResolvedValue({
      account: { id: "account-1", current_practice: { id: "practice-1" } },
    });
  });

  it("verbindet Stellungnahme-Bausteine, ohne bewusste Absatzumbrüche zu entfernen", () => {
    expect(joinMedicalStatementSentences([
      "Erster Satz.\n\nBewusster Absatz.",
      "Zweiter Satz.",
    ])).toBe("Erster Satz.\n\nBewusster Absatz. Zweiter Satz.");
  });

  it("erzeugt strukturiertes XML v2 in gespeicherter Section- und Blockreihenfolge", () => {
    const blocks = buildInternalDocumentationFrozenBlocks(
      ["HEALTH_CHECK_LAB", "HEALTH_CHECK_PREVENTION", "MEDICAL_STATEMENT", "DOCUMENT_HANDLING"],
      [
        { blockId: "DOCUMENT_HANDLING", section: 1, order: 0 },
        { blockId: "HEALTH_CHECK_LAB", section: 1, order: 1 },
        { blockId: "HEALTH_CHECK_PREVENTION", section: 2, order: 0 },
        { blockId: "MEDICAL_STATEMENT", section: 3, order: 0 },
      ],
    );
    const input = {
      answers: {
        DOCUMENT_HANDLING_ACTIONS: "attached",
        HEALTH_CHECK_LIPID_PROFILE_STATUS: "unauffällig",
        HEALTH_CHECK_FASTING_GLUCOSE_STATUS: "ausstehend",
        HEALTH_CHECK_LAB_NOTE: "Kontrolle A & B <zeitnah>",
        HEALTH_CHECK_PREVENTION_TOPICS: "Herz-Kreislauf, Sonstiges",
        HEALTH_CHECK_OTHER_NOTE: "Individuelle Empfehlung",
        MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "combined",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    };

    const document = buildSemanticMedicalRecordDocument(input);
    expect(document.sections.map((section) => section.slot)).toEqual([1, 2, 3]);
    expect(document.sections[0].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "status", text: "Dokumente / Befunde sind beigefügt." }),
      expect.objectContaining({ type: "heading", text: "Labor", headingLevel: 2 }),
      expect.objectContaining({ type: "measurement", text: "Lipidprofil: unauffällig" }),
      expect.objectContaining({ type: "measurement", text: "Nüchternplasmaglukose: ausstehend" }),
      expect.objectContaining({ type: "freeText", text: "Kontrolle A & B <zeitnah>" }),
    ]));
    expect(document.sections[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "heading",
        text: "Prävention / Empfehlungen",
        headingLevel: 1,
      }),
      expect.objectContaining({ type: "listItem", text: "Besprochene Themen: Herz-Kreislauf, Sonstiges" }),
      expect.objectContaining({ type: "freeText", text: "Individuelle Empfehlung" }),
    ]));
    expect(document.sections[2].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "heading", text: "Stellungnahme", headingLevel: 1 }),
      expect.objectContaining({
        type: "bodyText",
        text: expect.stringContaining("sowohl körperliche als auch psychische"),
      }),
    ]));

    const xml = buildStructuredAppXml(document);
    expect(xml.match(/<section slot="[123]">/g)).toHaveLength(3);
    expect(xml).toContain('<item type="freeText">Kontrolle A &amp; B &lt;zeitnah&gt;</item>');
    expect(xml).not.toContain("Kurzer Hinweis:");
    expect(xml).not.toContain('<item type="heading">Dokumente / Befunde</item>');
    expect(xml.indexOf("Dokumente / Befunde sind beigefügt."))
      .toBeLessThan(xml.indexOf('<item type="heading" level="2">Labor</item>'));
  });

  it("typisiert alte Frozen Snapshots ohne Semantikmetadaten per Fallback", () => {
    const legacyBlocks = buildInternalDocumentationFrozenBlocks(
      ["HEALTH_CHECK_LAB", "MEDICAL_STATEMENT"],
      [
        { blockId: "HEALTH_CHECK_LAB", section: 1, order: 0 },
        { blockId: "MEDICAL_STATEMENT", section: 3, order: 0 },
      ],
    ).map((block) => ({
      ...block,
      documentationItemType: undefined,
      structuredHeadingLevel: undefined,
      structuredHeadingVisibility: undefined,
      questions: block.questions.map((question) => ({
        ...question,
        documentationItemType: undefined,
        omitDocumentationLabel: undefined,
      })),
    }));

    const document = buildSemanticMedicalRecordDocument({
      answers: {
        HEALTH_CHECK_LIPID_PROFILE_STATUS: "auffällig",
        HEALTH_CHECK_LAB_NOTE: "Historischer Freitext",
        MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "physical",
      },
      selected_block_ids: legacyBlocks.map((block) => block.id),
      frozenBlocks: legacyBlocks,
      internalWorkflowId: null,
    });

    expect(document.sections[0].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "heading", text: "Labor", headingLevel: 2 }),
      expect.objectContaining({ type: "measurement", text: "Lipidprofil: auffällig" }),
      expect.objectContaining({ type: "freeText", text: "Historischer Freitext" }),
    ]));
    expect(document.sections[2].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "heading", text: "Stellungnahme", headingLevel: 1 }),
      expect.objectContaining({ type: "bodyText", text: expect.stringContaining("körperliche Beschwerden") }),
    ]));
  });

  it("entfernt nur das technische Notizen-Label aus XML v2", () => {
    const blocks = buildInternalDocumentationFrozenBlocks([
      "CARE_PLAN_SUPPORT_BLOCK",
      "HEALTH_CHECK_NEXT_STEPS",
    ]).map((block) => ({
      ...block,
      questions: block.questions.map((question) => ({
        ...question,
        omitDocumentationLabel: undefined,
      })),
    }));
    const input = {
      answers: {
        CARE_PLAN_SUPPORT_NOTES: "Flyer wurde mitgegeben.",
        HEALTH_CHECK_NEXT_STEPS: "Verlaufskontrolle in unserer Praxis",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    };

    const note = buildMedicalRecordNote(input);
    const xml = buildStructuredAppXml(buildSemanticMedicalRecordDocument(input));

    expect(note).toContain("Notizen: Flyer wurde mitgegeben.");
    expect(note).toContain("Maßnahmen: Verlaufskontrolle in unserer Praxis");
    expect(xml).toContain('<item type="freeText">Flyer wurde mitgegeben.</item>');
    expect(xml).not.toContain("Notizen: Flyer wurde mitgegeben.");
    expect(xml).toContain(
      '<item type="listItem">Maßnahmen: Verlaufskontrolle in unserer Praxis</item>',
    );
    expect(xml).toContain(
      '<item type="heading" level="1" visibility="spacingOnly">Weiteres Vorgehen</item>',
    );
  });

  it("ordnet große und kompakte Dokumentationsblöcke den Heading-Leveln zu", () => {
    const blocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_CLINICAL_STATUS",
      "HEALTH_CHECK_MEASUREMENTS",
      "HEALTH_CHECK_URINE",
      "HEALTH_CHECK_NEXT_STEPS",
      "EKG",
    ]);
    const document = buildSemanticMedicalRecordDocument({
      answers: {
        HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
        HEALTH_CHECK_BP_SYSTOLIC: "120",
        HEALTH_CHECK_BP_DIASTOLIC: "80",
        HEALTH_CHECK_URINE_STATUS: "unauffällig",
        HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
        EKG_RHYTHM: "Sinusrhythmus",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });

    const headings = document.sections.flatMap((section) => section.items)
      .filter((item) => item.type === "heading");
    expect(headings).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Klinischer Status", headingLevel: 1 }),
      expect.objectContaining({ text: "Messwerte", headingLevel: 2 }),
      expect.objectContaining({ text: "Urinstatus", headingLevel: 2 }),
      expect.objectContaining({ text: "EKG", headingLevel: 2 }),
      expect.objectContaining({
        text: "Weiteres Vorgehen",
        headingLevel: 1,
        headingVisibility: "spacingOnly",
      }),
    ]));
  });

  it("verdichtet klinische Statuswerte und erhält individuelle Zusatztexte", () => {
    const blocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_CLINICAL_STATUS",
    ]);
    const input = {
      answers: {
        HEALTH_CHECK_GENERAL_STATUS: "auffällig",
        HEALTH_CHECK_HEART_STATUS: "unauffällig",
        HEALTH_CHECK_LUNG_STATUS: "unauffällig",
        HEALTH_CHECK_ABDOMEN_STATUS: "unauffällig",
        HEALTH_CHECK_SKIN_STATUS: "auffällig",
        HEALTH_CHECK_CLINICAL_NOTE: "Belastungsabhängige Beschwerden seit drei Tagen.",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    };

    const note = buildMedicalRecordNote(input);
    expect(note).toContain("Unauffällig: Herz, Lunge, Abdomen.");
    expect(note).toContain("Auffällig: Allgemeinzustand, Haut.");
    expect(note).toContain("Kurzer Hinweis: Belastungsabhängige Beschwerden seit drei Tagen.");
    expect(note).not.toContain("Herz klinisch unauffällig.");

    const document = buildSemanticMedicalRecordDocument(input);
    expect(document.sections[0].items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "status",
        text: "Unauffällig: Herz, Lunge, Abdomen. Auffällig: Allgemeinzustand, Haut.",
      }),
      expect.objectContaining({
        type: "freeText",
        text: "Belastungsabhängige Beschwerden seit drei Tagen.",
      }),
    ]));
  });

  it("markiert nur geeignete Versorgungsplan-Grenzen als spacingOnly", () => {
    const blocks = buildInternalDocumentationFrozenBlocks([
      "CARE_PLAN_HA",
      "CARE_PLAN_AGREEMENT_BLOCK",
      "HEALTH_CHECK_NEXT_STEPS",
      "HEALTH_CHECK_CLINICAL_STATUS",
      "HEALTH_CHECK_PREVENTION",
      "MEDICAL_STATEMENT",
    ]);
    const document = buildSemanticMedicalRecordDocument({
      answers: {
        CARE_PLAN_HA_REASON: "Versorgung abstimmen",
        CARE_PLAN_AGREEMENT: "Warnsymptome erklärt",
        HEALTH_CHECK_HEART_STATUS: "unauffällig",
        HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
        HEALTH_CHECK_PREVENTION_TOPICS: "Bewegung",
        MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "physical",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });

    const headings = document.sections.flatMap((section) => section.items)
      .filter((item) => item.type === "heading");
    expect(headings).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Gemeinsame Vereinbarung", headingVisibility: "spacingOnly" }),
      expect.objectContaining({ text: "Weiteres Vorgehen", headingVisibility: "spacingOnly" }),
      expect.objectContaining({ text: "Klinischer Status", headingVisibility: "visible" }),
      expect.objectContaining({ text: "Prävention / Empfehlungen", headingVisibility: "visible" }),
      expect.objectContaining({ text: "Stellungnahme", headingVisibility: "visible" }),
    ]));
  });

  it("erkennt nur vollständige null-Workflow-Snapshots als neuen Pfad", () => {
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      frozenBlocks,
    })).toBe(true);
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: "care_plan_v1",
      frozenBlocks,
    })).toBe(false);
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      frozenBlocks: [frozenBlocks[0], { ...frozenBlocks[1], outputSemantics: undefined }],
    })).toBe(false);
  });

  it("verwendet dieselbe Layoutreihenfolge für noteText, Inbox und PDF", async () => {
    const layoutBlocks = buildInternalDocumentationFrozenBlocks(
      ["CARE_PLAN_HA", "VACCINATION_REVIEW"],
      [
        { blockId: "VACCINATION_REVIEW", section: 1, order: 0 },
        { blockId: "CARE_PLAN_HA", section: 2, order: 0 },
      ],
    );
    const layoutAnswers = {
      CARE_PLAN_HA_REASON: "Versorgung abstimmen",
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "influenza",
        documented_status: "Vollständig vorhanden",
      }]),
    };
    const layoutSession = session({
      selected_block_ids: ["VACCINATION_REVIEW", "CARE_PLAN_HA"],
      deduplicated_questions: layoutBlocks.flatMap((block) => block.questions),
      frozen_blocks: layoutBlocks,
      answers: layoutAnswers,
    });

    const note = buildMedicalRecordNote({
      answers: layoutAnswers,
      selected_block_ids: ["VACCINATION_REVIEW", "CARE_PLAN_HA"],
      frozenBlocks: layoutBlocks,
      internalWorkflowId: null,
    });
    const inbox = buildQuestionnaireInboxDetail(layoutSession);
    const pdf = await buildQuestionnairePdfBytes(layoutSession, {
      title: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: INTERNAL_BLOCK_CATALOG,
    });
    const pdfText = await extractPdfText(pdf.bytes);
    const firstLabel = layoutBlocks[0]!.label;
    const secondLabel = layoutBlocks[1]!.label;

    expect(note.indexOf(firstLabel)).toBeLessThan(note.indexOf(secondLabel));
    expect(inbox.noteText).toBe(note);
    expect(pdfText.indexOf(firstLabel)).toBeLessThan(pdfText.indexOf(secondLabel));
  });

  it("submitten, Inbox-Detail und Copytext ohne Workflowauflösung", async () => {
    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "phase-2b-session",
        internal_workflow_id: null,
      }),
      data: expect.objectContaining({ status: "completed", answers }),
    }));

    const detail = buildQuestionnaireInboxDetail({
      patient_reference: "PAT-2B",
      submitted_at: new Date("2026-09-09T10:00:00.000Z"),
      selected_block_ids: selectedBlockIds,
      deduplicated_questions: questions,
      answers,
      frozen_blocks: frozenBlocks,
      source: "practice_direct",
      session_kind: "internal_documentation",
      internal_workflow_id: null,
    });
    expect(detail.noteText).not.toContain("Interne Dokumentation");
    expect(detail.noteText).toContain("Versorgung abstimmen");
    expect(detail.noteText).toContain("Impfungen");
    expect(detail.noteText).toContain("Keine weitere Abklärung oder Kontrolle erforderlich.");
    expect(detail.semanticDocument?.sections).toHaveLength(3);
    expect(detail.xmlFilename).toBe("20260909_PAT2B_Interne_Dokumentation.xml");
  });

  it("rendert Cross-Module-PDF neutral und Frozen-basiert", async () => {
    const result = await buildQuestionnairePdfBytes(session(), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });

    expect(result.filename).toBe("20260909_PAT2B_Interne_Dokumentation.pdf");
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("bereinigt Titel und BMI und ergänzt Frozen-Einheiten in Copytext und PDF", async () => {
    const measurementBlocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_CLINICAL_STATUS",
      "HEALTH_CHECK_MEASUREMENTS",
    ]);
    const measurementAnswers = {
      HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
      HEALTH_CHECK_BP_SYSTOLIC: "120",
      HEALTH_CHECK_BP_DIASTOLIC: "80",
      HEALTH_CHECK_HEART_RATE: "83",
      HEALTH_CHECK_BLOOD_GLUCOSE: "102",
      HEALTH_CHECK_HEIGHT_CM: "175",
      HEALTH_CHECK_WEIGHT_KG: "80",
    };
    const note = buildMedicalRecordNote({
      answers: measurementAnswers,
      selected_block_ids: measurementBlocks.map((block) => block.id),
      frozenBlocks: measurementBlocks,
      internalWorkflowId: null,
    });

    expect(note).not.toContain("Interne Dokumentation");
    expect(note).not.toContain("Berechnete Werte");
    expect(note).not.toContain("BMI:");
    expect(note).toContain("Klinischer Status");
    expect(note).toContain("Messwerte");
    expect(note).toContain("RR 120/80 mmHg - HF 83/min - BZ 102 mg/dl - Größe 175 cm - Gewicht 80 kg");
    const partialNote = buildMedicalRecordNote({
      answers: {
        HEALTH_CHECK_BP_SYSTOLIC: "128",
        HEALTH_CHECK_BP_DIASTOLIC: "86",
        HEALTH_CHECK_HEART_RATE: "83",
        HEALTH_CHECK_WEIGHT_KG: "80",
      },
      selected_block_ids: measurementBlocks.map((block) => block.id),
      frozenBlocks: measurementBlocks,
      internalWorkflowId: null,
    });
    expect(partialNote).toContain("RR 128/86 mmHg - HF 83/min - Gewicht 80 kg");
    expect(partialNote).not.toContain("BZ ");
    expect(partialNote).not.toContain("Größe ");
    expect(measurementAnswers.HEALTH_CHECK_HEIGHT_CM).toBe("175");
    expect(measurementAnswers.HEALTH_CHECK_WEIGHT_KG).toBe("80");

    const result = await buildQuestionnairePdfBytes(session({
      selected_block_ids: measurementBlocks.map((block) => block.id),
      deduplicated_questions: measurementBlocks.flatMap((block) => block.questions),
      frozen_blocks: measurementBlocks,
      answers: measurementAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const text = await extractPdfText(result.bytes);

    expect(text).not.toContain("Interne Dokumentation");
    expect(text).not.toContain("Berechnete Werte");
    expect(text).not.toContain("BMI:");
    expect(text).toContain("Klinischer Status");
    expect(text).toContain("Messwerte");
    expect(text).toContain("RR 120/80 mmHg - HF 83/min - BZ 102 mg/dl - Größe 175 cm - Gewicht 80 kg");
  });

  it("speichert Messwerte weiterhin ohne Einheiten", async () => {
    const measurementBlocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_MEASUREMENTS",
    ]);
    const measurementAnswers = {
      HEALTH_CHECK_HEIGHT_CM: "175",
      HEALTH_CHECK_WEIGHT_KG: "80",
      HEALTH_CHECK_HEART_RATE: "83",
      HEALTH_CHECK_BLOOD_GLUCOSE: "102",
    };
    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: measurementBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: measurementAnswers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ answers: measurementAnswers }),
    }));
  });

  it("gibt EKG kompakt aus und speichert numerische Rohwerte", async () => {
    const ekgBlocks = buildInternalDocumentationFrozenBlocks(["EKG"]);
    const ekgAnswers = {
      EKG_RHYTHM: "Sinusrhythmus",
      EKG_HEART_RATE: "83",
      EKG_QTC: "410",
    };
    const note = buildMedicalRecordNote({
      answers: ekgAnswers,
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });

    expect(note).toContain("EKG\nRhythmus: Sinusrhythmus - HF: 83/min - QTc: 410 ms");
    expect(note).not.toContain("Lagetyp:");
    expect(note).not.toContain("Blockbilder:");
    expect(ekgAnswers.EKG_HEART_RATE).toBe("83");
    expect(ekgAnswers.EKG_QTC).toBe("410");
    const completeNote = buildMedicalRecordNote({
      answers: {
        ...ekgAnswers,
        EKG_AXIS: "Indifferenztyp",
        EKG_BLOCK_PATTERNS: "keine",
        EKG_ERBS: "keine",
      },
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });
    expect(completeNote).toContain(
      "Rhythmus: Sinusrhythmus - HF: 83/min - Lagetyp: Indifferenztyp - QTc: 410 ms - Blockbilder: keine - ERBS: keine",
    );

    const result = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["EKG"],
      deduplicated_questions: ekgBlocks.flatMap((block) => block.questions),
      frozen_blocks: ekgBlocks,
      answers: ekgAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    expect(await extractPdfText(result.bytes)).toContain(
      "Rhythmus: Sinusrhythmus - HF: 83/min - QTc: 410 ms",
    );

    const emptyPdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["EKG"],
      deduplicated_questions: ekgBlocks.flatMap((block) => block.questions),
      frozen_blocks: ekgBlocks,
      answers: {},
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    expect(await extractPdfText(emptyPdf.bytes)).not.toContain("EKG");

    const emptyNote = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });
    expect(emptyNote).not.toContain("EKG");

    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: ekgBlocks,
    });
    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: ekgAnswers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });
    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ answers: ekgAnswers }),
    }));
  });

  it("rendert mehrere Dokumentaktionen im PDF und unterdrückt den unbenutzten Block", async () => {
    const documentBlocks = buildInternalDocumentationFrozenBlocks(["DOCUMENT_HANDLING"]);
    const selectedResult = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["DOCUMENT_HANDLING"],
      deduplicated_questions: documentBlocks.flatMap((block) => block.questions),
      frozen_blocks: documentBlocks,
      answers: { DOCUMENT_HANDLING_ACTIONS: "handed_out, pending_submission" },
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const emptyResult = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["DOCUMENT_HANDLING"],
      deduplicated_questions: documentBlocks.flatMap((block) => block.questions),
      frozen_blocks: documentBlocks,
      answers: {},
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });

    const selectedText = await extractPdfText(selectedResult.bytes);
    expect(selectedText).toContain("Dokumente / Befunde wurden mitgegeben.");
    expect(selectedText).toContain("Dokumente / Befunde werden nachgereicht.");
    expect(await extractPdfText(emptyResult.bytes)).not.toContain("Dokumente / Befunde");
  });

  it("rendert Stellungnahme in Fragen- und gespeicherter C-Reihenfolge", async () => {
    const statementBlocks = buildInternalDocumentationFrozenBlocks(["MEDICAL_STATEMENT"]);
    const statementAnswers = {
      MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "physical",
      MEDICAL_STATEMENT_TIME_ASSESSMENT: "uncertain_course",
      MEDICAL_STATEMENT_RECOMMENDATIONS: "alternative_measures, medical_reassessment",
    };
    const expectedSentences = [
      "Es liegen körperliche Beschwerden vor, die die berufliche Belastbarkeit derzeit einschränken.",
      "Die weitere gesundheitliche Entwicklung bleibt abzuwarten; eine erneute ärztliche Beurteilung ist erforderlich.",
      "Aus hausärztlicher Sicht wird empfohlen, alternative Maßnahmen (z. B. berufliche Neuorientierung, Rehabilitationsmaßnahmen oder sozialmedizinische Abklärung) zu prüfen.",
      "Eine erneute ärztliche Beurteilung im weiteren Verlauf wird empfohlen.",
    ];
    const note = buildMedicalRecordNote({
      answers: statementAnswers,
      selected_block_ids: ["MEDICAL_STATEMENT"],
      frozenBlocks: statementBlocks,
      internalWorkflowId: null,
    });

    expect(note).toContain("Stellungnahme");
    expectedSentences.forEach((sentence) => expect(note).toContain(sentence));
    expect(note).toContain(`Stellungnahme\n${expectedSentences.join(" ")}`);
    expect(note).not.toContain(`${expectedSentences[0]}\n${expectedSentences[1]}`);
    expect(expectedSentences.map((sentence) => note.indexOf(sentence)))
      .toEqual([...expectedSentences].map((_, index) => note.indexOf(expectedSentences[index]))
        .sort((left, right) => left - right));
    expect(note.match(/Die weitere gesundheitliche Entwicklung bleibt abzuwarten/g)).toHaveLength(1);

    const result = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["MEDICAL_STATEMENT"],
      deduplicated_questions: statementBlocks.flatMap((block) => block.questions),
      frozen_blocks: statementBlocks,
      answers: statementAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const pdfText = extractPdfTextRuns(result.bytes);
    expect(pdfText).toContain("Stellungnahme");
    expect(pdfText).toContain("Es liegen körperliche Beschwerden vor");
    expect(pdfText).toContain("Die weitere gesundheitliche Entwicklung bleibt abzuwarten");
    expect(pdfText).toContain("Aus hausärztlicher Sicht wird empfohlen, alternative Maßnahmen");
    expect(pdfText).toContain("Eine erneute ärztliche Beurteilung im weiteren Verlauf wird empfohlen.");

    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: statementBlocks,
    });
    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: statementAnswers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });
    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ answers: statementAnswers }),
    }));
  });

  it("lässt leere Stellungnahme aus und kombiniert sie kanonisch mit EKG", async () => {
    const combinedBlocks = buildInternalDocumentationFrozenBlocks(["MEDICAL_STATEMENT", "EKG"]);
    expect(combinedBlocks.map((block) => block.id)).toEqual(["EKG", "MEDICAL_STATEMENT"]);

    const combinedNote = buildMedicalRecordNote({
      answers: {
        EKG_RHYTHM: "Sinusrhythmus",
        MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "combined",
      },
      selected_block_ids: ["MEDICAL_STATEMENT", "EKG"],
      frozenBlocks: combinedBlocks,
      internalWorkflowId: null,
    });
    expect(combinedNote.indexOf("EKG\n")).toBeLessThan(combinedNote.indexOf("Stellungnahme\n"));
    expect(combinedNote).toContain("Rhythmus: Sinusrhythmus");
    expect(combinedNote).toContain("Es bestehen sowohl körperliche als auch psychische gesundheitliche Einschränkungen");

    const statementBlocks = buildInternalDocumentationFrozenBlocks(["MEDICAL_STATEMENT"]);
    const emptyNote = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["MEDICAL_STATEMENT"],
      frozenBlocks: statementBlocks,
      internalWorkflowId: null,
    });
    expect(emptyNote).not.toContain("Stellungnahme");

    const emptyPdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["MEDICAL_STATEMENT"],
      deduplicated_questions: statementBlocks.flatMap((block) => block.questions),
      frozen_blocks: statementBlocks,
      answers: {},
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    expect(await extractPdfText(emptyPdf.bytes)).not.toContain("Stellungnahme");
  });

  it("verwendet FACHAERZTE intern mit bestehender Struktur in Copy, PDF und Submit", async () => {
    const specialistBlocks = buildInternalDocumentationFrozenBlocks(["SPECIALISTS"]);
    const rawSpecialists = JSON.stringify([
      { erkrankung: "Hypertonie", bereich: "Kardiologie", name: "Dr. Herz", adresse: "Herzweg 1" },
      { erkrankung: "Rückenschmerzen", bereich: "Orthopädie", name: "Praxis Orthomed", adresse: "" },
    ]);
    const specialistAnswers = { FACHAERZTE: rawSpecialists };
    const note = buildMedicalRecordNote({
      answers: specialistAnswers,
      selected_block_ids: ["SPECIALISTS"],
      frozenBlocks: specialistBlocks,
      internalWorkflowId: null,
    });

    expect(note).toContain("Fachärzte");
    expect(note).toContain("1. Eintrag");
    expect(note).toContain("2. Eintrag");
    expect(note).toContain("Kardiologie");
    expect(note).toContain("Praxis Orthomed");

    const pdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["SPECIALISTS"],
      deduplicated_questions: specialistBlocks.flatMap((block) => block.questions),
      frozen_blocks: specialistBlocks,
      answers: specialistAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const pdfText = await extractPdfText(pdf.bytes);
    expect(pdfText).toContain("Fachärzte");
    expect(pdfText).toContain("Dr. Herz");
    expect(pdfText).toContain("Praxis Orthomed");

    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: specialistBlocks,
    });
    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: { FACHAERZTE: JSON.stringify([
        { erkrankung: " Hypertonie ", bereich: "Kardiologie", name: " Dr. Herz ", adresse: "", ignored: "x" },
      ]) },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });
    const stored = JSON.parse(sessionDb.updateMany.mock.calls[0][0].data.answers.FACHAERZTE);
    expect(stored).toEqual([{ erkrankung: "Hypertonie", bereich: "Kardiologie", name: "Dr. Herz", adresse: "" }]);
  });

  it("lässt leere Fachärzte und nicht ausgewählte Einwilligung vollständig aus", async () => {
    const blocks = buildInternalDocumentationFrozenBlocks(["SPECIALISTS", "INTERNAL_CONSENT"]);
    const note = buildMedicalRecordNote({
      answers: { FACHAERZTE: "[]" },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });
    expect(note).not.toContain("Fachärzte");
    expect(note).not.toContain("Einwilligungserklärung");
    expect(note).not.toContain(INTERNAL_CONSENT_DOCUMENTATION_TEXT);

    const pdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: blocks.map((block) => block.id),
      deduplicated_questions: blocks.flatMap((block) => block.questions),
      frozen_blocks: blocks,
      answers: { FACHAERZTE: "[]" },
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const pdfText = await extractPdfText(pdf.bytes);
    expect(pdfText).not.toContain("Fachärzte");
    expect(pdfText).not.toContain("Einwilligungserklärung");
    expect(pdfText).not.toContain("Datum / Unterschrift Patient/in");
  });

  it("gibt die ausgewählte Einwilligung ohne Bestätigungsbehauptung mit Papierzeile aus", async () => {
    const blocks = buildInternalDocumentationFrozenBlocks(["INTERNAL_CONSENT"]);
    const consentAnswers = { INTERNAL_CONSENT_INCLUDE: "include_in_print" };
    const note = buildMedicalRecordNote({
      answers: consentAnswers,
      selected_block_ids: ["INTERNAL_CONSENT"],
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });
    expect(note).toContain("Einwilligungserklärung");
    expect(note).toContain(INTERNAL_CONSENT_DOCUMENTATION_TEXT);
    expect(note).not.toContain("Bestätigt");
    expect(note).not.toContain("Unterschrift erfolgt");

    const pdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["INTERNAL_CONSENT"],
      deduplicated_questions: blocks.flatMap((block) => block.questions),
      frozen_blocks: blocks,
      answers: consentAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const pdfText = await extractPdfText(pdf.bytes);
    expect(extractPdfTextRuns(pdf.bytes).replace(/\s+/g, " "))
      .toContain(INTERNAL_CONSENT_DOCUMENTATION_TEXT);
    expect(pdfText).toContain("____________________________");
    expect(pdfText).toContain("Datum / Unterschrift Patient/in");
    expect(pdfText).not.toContain("Bestätigt");
    expect(pdfText).not.toContain("Bitte senden Sie das unterschriebene Dokument an");
  });

  it("kombiniert Gesundheitsuntersuchung, Fachärzte und Einwilligung unabhängig", () => {
    const blocks = buildInternalDocumentationFrozenBlocks([
      "INTERNAL_CONSENT",
      "HEALTH_CHECK_CLINICAL_STATUS",
      "SPECIALISTS",
    ]);
    expect(blocks.map((block) => block.id)).toEqual([
      "SPECIALISTS",
      "INTERNAL_CONSENT",
      "HEALTH_CHECK_CLINICAL_STATUS",
    ]);
    const note = buildMedicalRecordNote({
      answers: {
        HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
        FACHAERZTE: JSON.stringify([{ erkrankung: "Kontrolle", bereich: "Kardiologie", name: "Dr. Herz", adresse: "" }]),
        INTERNAL_CONSENT_INCLUDE: "include_in_print",
      },
      selected_block_ids: blocks.map((block) => block.id),
      frozenBlocks: blocks,
      internalWorkflowId: null,
    });
    expect(note).toContain("Klinischer Status");
    expect(note).toContain("Dr. Herz");
    expect(note).toContain(INTERNAL_CONSENT_DOCUMENTATION_TEXT);
  });

  it("liefert die neue Session über die normale PDF-Route ohne Workflow", async () => {
    sessionDb.findUnique.mockResolvedValue(session());
    const response = await PdfRoute(
      new NextRequest("http://localhost/api/questionnaire/phase-2b-session/pdf"),
      { params: Promise.resolve({ id: "phase-2b-session" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "20260909_PAT2B_Interne_Dokumentation.pdf",
    );
  });
});
