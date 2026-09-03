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