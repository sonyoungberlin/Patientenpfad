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
  async function render(questions: QuestionDefinition[], answers: Record<string, string>) {
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
});