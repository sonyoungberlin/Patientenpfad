import { NextRequest } from "next/server";
import { inflateSync } from "node:zlib";

jest.mock("@/lib/authz", () => ({
  requireOfficeQuestionnaireAccess: jest.fn(),
}));

jest.mock("@/lib/office/scope", () => ({
  getOfficeOwnershipFilter: jest.fn(() => ({ owner_practice_id: "practice-1" })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/office-cases/questionnaire/[id]/pdf/route";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
} from "@/lib/questionnaire/officeBlockCatalog";

const requireAccess = requireOfficeQuestionnaireAccess as jest.Mock;
const findUnique = prisma.patientQuestionnaireSession.findUnique as jest.Mock;
const update = prisma.patientQuestionnaireSession.update as jest.Mock;

function extractPdfText(bytes: Uint8Array): string {
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

describe("office questionnaire PDF", () => {
  beforeEach(() => {
    requireAccess.mockReset().mockResolvedValue({
      account: { id: "account-1", current_practice: { id: "practice-1" } },
      error: null,
    });
    update.mockReset().mockResolvedValue({});
    findUnique.mockReset().mockResolvedValue({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      context: "office",
      status: "completed",
      patient_reference: "123545",
      submitted_at: new Date("2026-09-08T10:00:00.000Z"),
      submitted_by: "patient",
      selected_block_ids: ["BEWERBER_KONTAKT"],
      deduplicated_questions: [OFFICE_QUESTION_CATALOG.OFF_VORNAME],
      answers: { OFF_VORNAME: "Max" },
      frozen_blocks: [{
        ...OFFICE_BLOCK_CATALOG.BEWERBER_KONTAKT,
        questions: [OFFICE_QUESTION_CATALOG.OFF_VORNAME],
        conditionalRules: [],
        initiallyVisible: true,
      }],
      deleted_at: null,
      pdf_downloaded_at: null,
    });
  });

  it("benennt nur die Datei Bewerbung und lässt Dokument- und Blocktitel unverändert", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/office-cases/questionnaire/session-1/pdf"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      'filename="20260908_123545_Bewerbung.pdf"',
    );
    const text = extractPdfText(new Uint8Array(await response.arrayBuffer()));
    expect(text).toContain("Fragebogen - Bewerberangaben");
    expect(text).toContain("Kontaktdaten");
  });
});
