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
    identity_gate_completed_at: new Date("2026-05-12T10:00:00.000Z"),
    identity_gate_method: "dob",
    deleted_at: null,
    pdf_downloaded_at: null,
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