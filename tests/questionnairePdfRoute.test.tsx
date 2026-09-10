import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { GET as PdfRoute } from "@/app/api/questionnaire/[id]/pdf/route";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { normalizeVaccinationReviewAnswers } from "@/lib/questionnaire/vaccinationReview";
import { VACCINATION_REVIEW_BLOCK_CATALOG, VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";
import { buildInternalWorkflowBlocks, getInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";

type PrismaMock = {
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;
const requireAccess = requireQuestionnaireInboxAccess as jest.Mock;

function pdfRequest(id = "sess-1") {
  return new NextRequest(`http://localhost/api/questionnaire/${id}/pdf`, {
    method: "GET",
  });
}

function baseSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sess-1",
    owner_account_id: "acc-1",
    owner_practice_id: "p-1",
    status: "completed",
    patient_reference: null,
    submitted_at: new Date("2026-05-12T10:00:00.000Z"),
    submitted_by: "patient",
    selected_block_ids: ["VERSICHERUNG"],
    deduplicated_questions: [],
    answers: {},
    source: "internal_link",
    practice_form: null,
    deleted_at: null,
    pdf_downloaded_at: null,
    context: "patient",
    ...overrides,
  };
}

beforeEach(() => {
  requireAccess.mockResolvedValue({ account: { id: "acc-1" } });
  pm.patientQuestionnaireSession.findUnique.mockReset();
  pm.patientQuestionnaireSession.update.mockReset();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-05-12T10:00:00.000Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

async function getFilename() {
  const res = await PdfRoute(pdfRequest(), { params: Promise.resolve({ id: "sess-1" }) });
  return res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? null;
}

describe("questionnaire pdf filename", () => {
  it("uses patient_reference when available", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "4711",
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_4711_Versicherungsdaten.pdf");
  });

  it("falls back to last and first name from answers", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        answers: {
          IDENTITY_FIRST_NAME: "Max",
          IDENTITY_LAST_NAME: "Müller",
        },
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_Mueller_Max_Versicherungsdaten.pdf");
  });

  it("falls back to generic Fragebogen when no patient_reference or names exist", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(baseSession());

    await expect(getFilename()).resolves.toBe("20260512_Fragebogen_Versicherungsdaten.pdf");
  });

  it("sanitizes umlauts and special characters in patient_reference and block name", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "Ä 42 / B-1",
        selected_block_ids: ["IDENTITAET"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_Ae_42_B1_Identitaet.pdf");
  });

  it("uses the first selected block only", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "4711",
        selected_block_ids: ["VERSICHERUNG", "IDENTITAET"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_4711_Versicherungsdaten.pdf");
  });

  it("puts contact details first regardless of selected block order", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "4711",
        selected_block_ids: ["VERSICHERUNG", "KONTAKT", "IDENTITAET"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_4711_Kontaktdaten_Versicherungsdaten.pdf");
  });

  it("does not duplicate contact details when they are the first block", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "4711",
        selected_block_ids: ["KONTAKT", "VERSICHERUNG"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_4711_Kontaktdaten.pdf");
  });

  it("uses public practice form title for website sessions", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "Test",
        source: "website",
        practice_form: { title: "Neupatient" },
        selected_block_ids: ["VERSICHERUNG"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_Test_Neupatient.pdf");
  });

  it("uses the internal care plan filename while keeping the existing date format", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "123545",
        session_kind: "internal_documentation",
        selected_block_ids: ["CARE_PLAN_HA"],
        frozen_blocks: [],
      }),
    );

    await expect(getFilename()).resolves.toBe(
      "20260512_123545_Persoenlicher_Versorgungsplan.pdf",
    );
  });

  it("uses the vaccination review workflow title and filename", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "123545",
        session_kind: "internal_documentation",
        internal_workflow_id: "vaccination_review_v1",
        selected_block_ids: ["VACCINATION_REVIEW"],
        deduplicated_questions: [VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS],
        frozen_blocks: [],
      }),
    );

    const response = await PdfRoute(pdfRequest(), { params: Promise.resolve({ id: "sess-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "20260512_123545_DOKU_Impfberatung.pdf",
    );
  });

  it("puts contact details first for public practice forms", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "Test",
        source: "website",
        practice_form: { title: "Neupatient" },
        selected_block_ids: ["VERSICHERUNG", "KONTAKT"],
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_Test_Kontaktdaten_Neupatient.pdf");
  });

  it("sanitizes special characters in public practice form title", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({
        patient_reference: "Test",
        source: "website",
        practice_form: { title: "Neu/patient ÄÖÜ!?" },
      }),
    );

    await expect(getFilename()).resolves.toBe("20260512_Test_Neupatient_AeOeUe.pdf");
  });
});

describe("questionnaire PDF patient reference", () => {
  it("uses the assigned patient reference in the existing PDF renderer", async () => {
    const result = await buildQuestionnairePdfBytes(
      baseSession({ patient_reference: "004711" }),
      {
        title: "Fragebogen",
        referenceLabel: "Patientenreferenz",
        blockCatalog: {
          VERSICHERUNG: {
            id: "VERSICHERUNG",
            label: "Versicherungsdaten",
            displayOrder: 1,
            questionIds: [],
          },
        },
      },
    );

    expect(await extractPdfText(result.bytes)).toContain("Patientenreferenz: 004711");
    expect(result.filename).toBe("20260512_004711_Versicherungsdaten.pdf");
  });

  it("behält die yes_no-Normalisierung bei expliziten String-Optionen bei", async () => {
    const question: QuestionDefinition = {
      id: "YES_NO_WITH_OPTIONS",
      text: "Antwort",
      type: "yes_no",
      required: false,
      options: ["ja", "nein"],
    };
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        selected_block_ids: ["TEST"],
        deduplicated_questions: [question],
        frozen_blocks: [{
          id: "TEST",
          label: "Test",
          displayOrder: 1,
          questions: [question],
          conditionalRules: [],
          initiallyVisible: true,
        }],
        answers: { YES_NO_WITH_OPTIONS: "ja" },
      }),
      {
        title: "Fragebogen",
        referenceLabel: "Patientenreferenz",
        blockCatalog: {},
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Antwort:");
    expect(text).toContain("Ja");
  });

  it("rendert den Care Plan ohne doppelte Labels und lässt leere Blocks aus", async () => {
    const workflow = getInternalWorkflow("care_plan_v1")!;
    const frozenBlocks = buildInternalWorkflowBlocks("care_plan_v1");
    const questions = frozenBlocks.flatMap((block) => block.questions);
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "care_plan_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: questions,
        frozen_blocks: frozenBlocks,
        answers: {
          CARE_PLAN_HA_REASON: "test",
          CARE_PLAN_SPECIALISTS: JSON.stringify([{
            specialty: "Diabetologie",
            practice: "Dr. Zucker",
            interval: "jährlich",
            note: "Befund bitte an Hausarzt senden",
          }]),
          CARE_PLAN_SPECIALIST_REPORTS: "Patientin / Patient und Praxis",
          CARE_PLAN_PRESCRIPTION_RENEWAL: "Nach vorheriger ärztlicher Rücksprache",
          CARE_PLAN_REFERRAL: "Ohne vorherige ärztliche Rücksprache",
          CARE_PLAN_SUPPLY_NOTES: "Weitere Versorgung abstimmen",
          CARE_PLAN_AGREEMENT_TEXT: "Facharzttermine einhalten",
        },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    for (const heading of [
      "Hausärztliche Betreuung",
      "Fachärztliche Betreuung",
      "Versorgung und Organisation",
      "Gemeinsame Vereinbarung",
    ]) {
      expect(text.match(new RegExp(heading, "g"))).toHaveLength(1);
    }
    expect(text).not.toContain("Unterstützende Personen");
    expect(text).toContain("1. Eintrag");
    expect(text).toContain("Fachrichtung:");
    expect(text).toContain("Diabetologie");
    expect(text).toContain("Hinweis:");
    expect(text).toContain("Befund bitte an Hausarzt senden");
    expect(text).toContain("Die erforderlichen Facharztberichte werden durch die Patientin bzw. den Patienten und die Praxis angefordert.");
    expect(text).toContain("Rezepte für Dauermedikation werden nach vorheriger ärztlicher Rücksprache ausgestellt.");
    expect(text).toContain("Überweisungen werden ohne vorherige ärztliche Rücksprache ausgestellt.");
    expect(text).toContain("Notizen / Offene Punkte:");
    expect(text).toContain("Facharzttermine einhalten");
    expect(text).not.toContain("Fachärztliche Betreuung:");
    expect(text).not.toContain("Facharztberichte - Anforderung:");
    expect(text).not.toContain("Unterstützende Personen:");
    expect(text).not.toContain("CARE_PLAN_");
    expect(text).not.toContain("?");
  });

  it("rendert Health-Check-Negation und lässt leere optionale Blocks aus", async () => {
    const workflow = getInternalWorkflow("health_check_v1")!;
    const frozenBlocks = buildInternalWorkflowBlocks("health_check_v1");
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "health_check_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
        frozen_blocks: frozenBlocks,
        answers: {
          HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
          HEALTH_CHECK_HEIGHT_CM: "175",
          HEALTH_CHECK_WEIGHT_KG: "80",
          HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
          HEALTH_CHECK_NEXT_STEPS_NOTE: "Keine Kontrolle aktuell erforderlich",
        },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
        omitEmptyBlocksInPdf: workflow.legacyOutputPolicy.omitEmptyBlocksInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Gesundheitsuntersuchung");
    expect(text).toContain("Berechnete Werte");
    expect(text).toContain("BMI: 26,1 kg/m²");
    expect(text).toContain("Allgemeinzustand unauffällig.");
    expect(text).not.toContain("Allgemeinzustand:");
    expect(text).toContain("Keine weitere Abklärung oder Kontrolle erforderlich.");
    expect(text).toContain("Keine Kontrolle aktuell erforderlich");
    expect(text).not.toContain("Labor");
    expect(text).not.toContain("Urinstatus");
  });

  it("verwendet im PDF alle eingefrorenen klinischen Dokumentationstexte", async () => {
    const workflow = getInternalWorkflow("health_check_v1")!;
    const frozenBlocks = buildInternalWorkflowBlocks("health_check_v1");
    const clinicalQuestions = frozenBlocks[0].questions.slice(0, 9);

    for (const status of ["unauffällig", "auffällig"]) {
      const answers = Object.fromEntries(
        clinicalQuestions.map((question) => [question.id, status]),
      );
      const result = await buildQuestionnairePdfBytes(
        baseSession({
          session_kind: "internal_documentation",
          internal_workflow_id: "health_check_v1",
          selected_block_ids: frozenBlocks.map((block) => block.id),
          deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
          frozen_blocks: frozenBlocks,
          answers,
        }),
        {
          title: workflow.title,
          referenceLabel: "Patientenreferenz",
          blockCatalog: workflow.blockCatalog,
          omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
          omitEmptyBlocksInPdf: workflow.legacyOutputPolicy.omitEmptyBlocksInPdf,
        },
      );

      const text = await extractPdfText(result.bytes);
      for (const question of clinicalQuestions) {
        const option = question.options?.find((candidate) =>
          typeof candidate !== "string" && candidate.value === status,
        );
        expect(option).toEqual(expect.objectContaining({ documentationText: expect.any(String) }));
        if (typeof option !== "string") expect(text).toContain(option?.documentationText);
      }
    }
  });

  it("rendert ein ausgefülltes Health-Check-Labor mit beantworteten Werten", async () => {
    const workflow = getInternalWorkflow("health_check_v1")!;
    const frozenBlocks = buildInternalWorkflowBlocks("health_check_v1");
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "health_check_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
        frozen_blocks: frozenBlocks,
        answers: {
          HEALTH_CHECK_LIPID_PROFILE_STATUS: "unauffällig",
          HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
        },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
        omitEmptyBlocksInPdf: workflow.legacyOutputPolicy.omitEmptyBlocksInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Labor");
    expect(text).toContain("Lipidprofil");
    expect(text).toContain("unauffällig");
  });

  it("behält die Follow-up-Negation in historischen markerlosen Health-Check Blocks", async () => {
    const workflow = getInternalWorkflow("health_check_v1")!;
    const currentBlocks = buildInternalWorkflowBlocks("health_check_v1");
    const frozenBlocks = currentBlocks.map(({ outputSemantics: _outputSemantics, ...block }) => ({
      ...block,
      questions: block.questions.map(({ presentation: _presentation, ...question }) => question),
    }));
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "health_check_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
        frozen_blocks: frozenBlocks,
        answers: { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein" },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Keine weitere Abklärung oder Kontrolle erforderlich.");
  });

  it("behält für historische klinische String-Optionen die alte PDF-Ausgabe", async () => {
    const workflow = getInternalWorkflow("health_check_v1")!;
    const currentBlocks = buildInternalWorkflowBlocks("health_check_v1");
    const frozenBlocks = currentBlocks.map(({ outputSemantics: _outputSemantics, ...block }) => ({
      ...block,
      questions: block.questions.map((question) => ({
        ...question,
        ...(question.id === "HEALTH_CHECK_GENERAL_STATUS"
          ? { options: ["unauffällig", "auffällig"] }
          : {}),
      })),
    }));
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "health_check_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
        frozen_blocks: frozenBlocks,
        answers: { HEALTH_CHECK_GENERAL_STATUS: "unauffällig" },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Allgemeinzustand:");
    expect(text).toContain("unauffällig");
    expect(text).not.toContain("Allgemeinzustand unauffällig.");
  });

  it("behält leere Blocküberschriften im historischen Care Plan", async () => {
    const workflow = getInternalWorkflow("care_plan_v1")!;
    const currentBlocks = buildInternalWorkflowBlocks("care_plan_v1");
    const frozenBlocks = currentBlocks.map(({ outputSemantics: _outputSemantics, ...block }) => block);
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        session_kind: "internal_documentation",
        internal_workflow_id: "care_plan_v1",
        selected_block_ids: frozenBlocks.map((block) => block.id),
        deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
        frozen_blocks: frozenBlocks,
        answers: { CARE_PLAN_HA_REASON: "test" },
      }),
      {
        title: workflow.title,
        referenceLabel: "Patientenreferenz",
        blockCatalog: workflow.blockCatalog,
        omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Unterstützende Personen");
    expect(text).toContain("Gemeinsame Vereinbarung");
  });

  it("renders a normalized v2 vaccination answer without technical, untouched, or stale values", async () => {
    const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
    const normalized = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "tdap_ipv_group",
        documented_status: "Teilweise vorhanden",
        tetanus_doses: "Grunddosis 1",
        pertussis_doses: "Impfung dokumentiert",
        documented_subtypes: "stale-subtype",
        further_action: "Impfung ärztlich empfohlen",
        note: "Impfpass erneut prüfen",
      }]),
    }, question);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    const frozenBlock = {
      ...VACCINATION_REVIEW_BLOCK_CATALOG.VACCINATION_REVIEW,
      questions: [question],
      conditionalRules: [],
      initiallyVisible: true,
    };
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        patient_reference: "123545",
        selected_block_ids: ["VACCINATION_REVIEW"],
        deduplicated_questions: [question],
        frozen_blocks: [frozenBlock],
        answers: normalized.answers,
      }),
      {
        title: "Impfpassprüfung und Beratung",
        referenceLabel: "Patientenreferenz",
        blockCatalog: VACCINATION_REVIEW_BLOCK_CATALOG,
        omitUnanswered: true,
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).toContain("Tetanus / Diphtherie / Pertussis / Poliomyelitis");
    expect(text).toContain("Dokumentierter Impfstatus:");
    expect(text).toContain("Teilweise vorhanden");
    expect(text).toContain("Tetanus:");
    expect(text).toContain("Grunddosis 1");
    expect(text).toContain("Pertussis:");
    expect(text).toContain("Impfung dokumentiert");
    expect(text).toContain("Bemerkung:");
    expect(text).toContain("Impfpass erneut prüfen");
    expect(text).not.toContain("tdap_ipv_group");
    expect(text).not.toContain("vaccination_id");
    expect(text).not.toContain("COVID-19");
    expect(text).not.toContain("stale-subtype");
  });

  it("normalisiert Titel, Fragen, Antworten und Repeatable Groups für X-Komfort", async () => {
    const questions: QuestionDefinition[] = [
      {
        id: "TEXT",
        text: "Ärztliche Frage? – “Zitat”",
        type: "text",
        required: false,
      },
      {
        id: "GROUP",
        text: "Weitere Angaben?",
        type: "repeatable_group",
        required: false,
        groupSchema: [
          { key: "details", label: "Beschreibung?", type: "textarea", required: false },
        ],
      },
    ];
    const frozenBlock = {
      id: "TEST",
      label: "Übersicht? — „Block“",
      displayOrder: 1,
      questions,
      conditionalRules: [],
      initiallyVisible: true,
    };
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        patient_reference: "ÄÖÜ-ß",
        selected_block_ids: ["TEST"],
        deduplicated_questions: questions,
        frozen_blocks: [frozenBlock],
        answers: {
          TEXT: "Antwort? – ‘Ja’ …\u00a0• Straße",
          GROUP: JSON.stringify([{ details: "Gruppe? — “Wert”" }]),
        },
      }),
      {
        title: "Titel? — „Dokument“",
        referenceLabel: "Patientenreferenz?",
        blockCatalog: {},
      },
    );

    const text = await extractPdfText(result.bytes);
    expect(text).not.toContain("?");
    expect(text).toContain('Titel - "Dokument"');
    expect(text).toContain('Übersicht - "Block"');
    expect(text).toContain('Ärztliche Frage - "Zitat":');
    expect(text).toContain("Antwort - 'Ja' ... - Straße");
    expect(text).toContain("Weitere Angaben:");
    expect(text).toContain("Beschreibung:");
    expect(text).toContain('Gruppe - "Wert"');
    expect(text).toContain("Patientenreferenz: ÄÖÜ-ß");
  });
});

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

function confirmationQuestion(id: string, text: string): QuestionDefinition {
  return { id, text, type: "confirmation", required: true };
}

describe("questionnaire PDF confirmations", () => {
  async function render(
    questions: QuestionDefinition[],
    answers: Record<string, string>,
    patientCopy?: { returnEmail: string },
  ) {
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        selected_block_ids: ["PRACTICE_CONFIRMATIONS"],
        deduplicated_questions: questions,
        answers,
      }),
      {
        title: "Fragebogen",
        referenceLabel: "Referenz",
        blockCatalog: {
          PRACTICE_CONFIRMATIONS: {
            id: "PRACTICE_CONFIRMATIONS",
            label: "Bestätigungen",
            displayOrder: 1,
            questionIds: questions.map((question) => question.id),
          },
        },
        ...(patientCopy ? { patientCopy } : {}),
      },
    );
    return extractPdfText(result.bytes);
  }

  it("rendert eine bestätigte Confirmation vollständig und verständlich", async () => {
    const text = await render(
      [confirmationQuestion("PRACTICE_CONFIRMATION_1", "Ich bestätige den vollständigen eingefrorenen Praxistext.")],
      { PRACTICE_CONFIRMATION_1: "true" },
    );
    expect(text).toContain("Bestätigt");
    expect(text).toContain("Ich bestätige den vollständigen eingefrorenen Praxistext.");
    expect(text).not.toContain("Nicht abgefragt");
    expect(text).not.toContain("true");
    expect(text).not.toContain("PRACTICE_CONFIRMATION_1");
  });

  it("verwendet den langen eingefrorenen Text als einen PDF-Eintrag", async () => {
    const frozenText = "Dies ist ein langer eingefrorener Praxistext, der vollständig erhalten bleiben muss und sauber umbrechen darf.";
    const text = await render(
      [confirmationQuestion("PRACTICE_CONFIRMATION_1", frozenText)],
      { PRACTICE_CONFIRMATION_1: "true" },
    );
    expect(text).toContain(frozenText);
    expect(text.match(/Bestätigt/g)).toHaveLength(1);
  });

  it("rendert mehrere bestätigte Confirmations jeweils genau einmal", async () => {
    const text = await render(
      [
        confirmationQuestion("PRACTICE_CONFIRMATION_1", "Erklärung A aus dem eingefrorenen Snapshot."),
        confirmationQuestion("PRACTICE_CONFIRMATION_2", "Erklärung B aus dem eingefrorenen Snapshot."),
      ],
      { PRACTICE_CONFIRMATION_1: "true", PRACTICE_CONFIRMATION_2: "true" },
    );
    expect(text.match(/Bestätigt/g)).toHaveLength(2);
    expect(text).toContain("Erklärung A aus dem eingefrorenen Snapshot.");
    expect(text).toContain("Erklärung B aus dem eingefrorenen Snapshot.");
  });

  it("erzeugt für eine nicht bestätigte Confirmation keinen positiven Status", async () => {
    const text = await render(
      [confirmationQuestion("PRACTICE_CONFIRMATION_1", "Noch nicht bestätigt.")],
      { PRACTICE_CONFIRMATION_1: "" },
    );
    expect(text).not.toContain("Bestätigt");
    expect(text).toContain("Noch nicht bestätigt.:");
    expect(text).not.toContain("true");
  });

  it("lässt normale und Repeatable-Group-Fragen im bestehenden PDF-Pfad", async () => {
    const text = await render(
      [
        { id: "NORMAL_TEXT", text: "Normale Frage", type: "text", required: false },
        {
          id: "GROUP",
          text: "Fachärzte",
          type: "repeatable_group",
          required: false,
          groupSchema: [
            { key: "name", label: "Name", type: "text", required: false },
          ],
        },
      ],
      { NORMAL_TEXT: "Antwort", GROUP: '[{"name":"Dr. Beispiel"}]' },
    );
    expect(text).toContain("Normale Frage:");
    expect(text).toContain("Antwort");
    expect(text).toContain("Fachärzte:");
    expect(text).toContain("Dr. Beispiel");
  });

  it("entfernt PATIENT_COPY_EMAIL vollständig aus der PDF-Ausgabe", async () => {
    const text = await render(
      [
        { id: "NORMAL_TEXT", text: "Normale Frage", type: "text", required: false },
        { id: "PATIENT_COPY_EMAIL", text: "E-Mail-Adresse für Ihre Kopie", type: "text", required: true },
      ],
      {
        NORMAL_TEXT: "Antwort",
        PATIENT_COPY_EMAIL: "patient@example.com",
      },
    );
    expect(text).toContain("Normale Frage:");
    expect(text).toContain("Antwort");
    expect(text).not.toContain("patient@example.com");
    expect(text).not.toContain("E-Mail-Adresse für Ihre Kopie");
    expect(text).not.toContain("Nicht abgefragt");
  });

  it("blendet PATIENT_COPY_EMAIL auch ohne Wert vollständig aus", async () => {
    const text = await render(
      [{ id: "PATIENT_COPY_EMAIL", text: "E-Mail-Adresse für Ihre Kopie", type: "text", required: true }],
      {},
    );
    expect(text).not.toContain("PATIENT_COPY_EMAIL");
    expect(text).not.toContain("E-Mail-Adresse für Ihre Kopie");
    expect(text).not.toContain("Nicht abgefragt");
  });

  it("behält den Patientenkopie-Rückgabeabschnitt bei", async () => {
    const text = await render(
      [{ id: "PATIENT_COPY_EMAIL", text: "E-Mail-Adresse für Ihre Kopie", type: "text", required: true }],
      { PATIENT_COPY_EMAIL: "patient@example.com" },
      { returnEmail: "praxis@example.com" },
    );
    expect(text).toContain("Unterschrift Patient/in");
    expect(text).toContain("Datum");
    expect(text).toContain("praxis@example.com");
    expect(text).toContain("Bitte senden Sie das unterschriebene Dokument an");
    expect(text).not.toContain("patient@example.com");
  });

  it("rendert lange Inhalte mehrseitig ohne Abschneiden oder Überlappen", async () => {
    const longQuestion =
      "Bitte beschreiben Sie möglichst genau, welche Beschwerden aktuell bestehen, seit wann sie bestehen und welche Veränderungen Sie im Alltag beobachten";
    const longAnswer = Array.from(
      { length: 90 },
      (_, index) => `Zeile ${index + 1}: Ausführliche Angaben mit Umlauten Ä ö ü und Sonderzeichen §`,
    ).join("\n");
    const longMultiSelect = [
      "Gehen nur wenige Schritte möglich",
      "Medizinische Betreuung während der Fahrt erforderlich",
      "Starkes Übergewicht / besondere Transportanforderung",
      "Andere Einschränkung mit zusätzlicher ausführlicher Beschreibung",
    ].join(", ");
    const questions: QuestionDefinition[] = [
      { id: "LONG_TEXT", text: longQuestion, type: "textarea", required: false },
      { id: "LONG_MULTI", text: "Welche Einschränkungen liegen vor?", type: "multi_select", required: false },
      {
        id: "LONG_GROUP",
        text: "Weitere Angaben",
        type: "repeatable_group",
        required: false,
        groupSchema: [
          { key: "name", label: "Name und ausführliche Bezeichnung", type: "text", required: false },
          { key: "details", label: "Zusätzliche ausführliche Beschreibung", type: "textarea", required: false },
        ],
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `FOLLOWUP_${index}`,
        text: `Direkt folgende Frage ${index + 1}`,
        type: "text" as const,
        required: false,
      })),
      { id: "AFTER_SECTION", text: "Frage im anschließenden Abschnitt", type: "text", required: false },
    ];
    const result = await buildQuestionnairePdfBytes(
      baseSession({
        selected_block_ids: ["STRESS_FIRST", "STRESS_SECOND"],
        deduplicated_questions: questions,
        answers: {
          LONG_TEXT: longAnswer,
          LONG_MULTI: longMultiSelect,
          LONG_GROUP: JSON.stringify([
            {
              name: "Sehr langer Name mit Umlauten ÄÖÜ",
              details: "Langer Feldwert mit mehreren Angaben und einem expliziten\nZeilenumbruch, der vollständig erhalten bleiben muss.",
            },
          ]),
          ...Object.fromEntries(
            Array.from({ length: 8 }, (_, index) => [`FOLLOWUP_${index}`, `Antwort ${index + 1}`]),
          ),
          AFTER_SECTION: "Antwort nach dem Seitenumbruch",
        },
      }),
      {
        title: "Fragebogen",
        referenceLabel: "Referenz",
        blockCatalog: {
          STRESS_FIRST: {
            id: "STRESS_FIRST",
            label: "Erster Abschnitt",
            displayOrder: 1,
            questionIds: questions.slice(0, -1).map((question) => question.id),
          },
          STRESS_SECOND: {
            id: "STRESS_SECOND",
            label: "Anschließender Abschnitt",
            displayOrder: 2,
            questionIds: ["AFTER_SECTION"],
          },
        },
      },
    );

    const pdf = await PDFDocument.load(result.bytes);
    const text = await extractPdfText(result.bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(text).toContain("Bitte beschreiben Sie möglichst genau");
    expect(text).toContain("welche");
    expect(text).toContain("Alltag");
    expect(text).toContain("beobachten");
    for (const line of longAnswer.split("\n")) expect(text).toContain(line);
    for (const option of ["Gehen", "Medizinische", "Starkes", "Andere"]) {
      expect(text).toContain(option);
    }
    expect(text).toContain("Sehr langer Name mit Umlauten ÄÖÜ");
    expect(text).toContain("Zeilenumbruch, der vollständig erhalten bleiben muss.");
    expect(text).toContain("Antwort nach dem Seitenumbruch");
  });
});