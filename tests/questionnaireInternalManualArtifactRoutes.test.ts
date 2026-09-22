import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));
jest.mock("@/lib/questionnaire/internalDocumentationArtifacts", () => ({
  buildInternalDocumentationXmlArtifact: jest.fn(() => ({
    bytes: new Uint8Array([60, 120, 109, 108, 47, 62]),
    filename: "20260922_81426_Interne_Dokumentation.xml",
    mimeType: "application/xml; charset=utf-8",
  })),
  buildInternalDocumentationGdtArtifact: jest.fn(() => ({
    bytes: new Uint8Array([71, 68, 84]),
    filename: "20260922_81426_Interne_Dokumentation.gdt",
    mimeType: "application/octet-stream",
  })),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { GET as getXml } from "@/app/api/questionnaire/[id]/xml/route";
import { GET as getGdt } from "@/app/api/questionnaire/[id]/gdt/route";

const sessionMock = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;

const INTERNAL_SESSION = {
  id: "internal-1",
  owner_account_id: "account-1",
  owner_practice_id: "practice-1",
  status: "completed",
  confirmed_at: null,
  deleted_at: null,
  context: "patient",
  patient_reference: "81426",
  submitted_at: new Date("2026-09-22T10:00:00.000Z"),
  submitted_by: "practice",
  selected_block_ids: ["CARE_PLAN_HA"],
  deduplicated_questions: [],
  frozen_blocks: [],
  answers: {},
  source: "practice_direct",
  session_kind: "internal_documentation",
  internal_workflow_id: null,
  practice_form: null,
  gdt_download_claimed_at: new Date("2026-09-22T10:01:00.000Z"),
};

beforeEach(() => {
  accessMock.mockReset().mockResolvedValue({
    account: { id: "account-1", current_practice: { id: "practice-1" } },
    error: null,
  });
  sessionMock.findUnique.mockReset().mockResolvedValue(INTERNAL_SESSION);
});

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

it("liefert XML für eine abgeschlossene interne Dokumentation", async () => {
  const response = await getXml(request("/api/questionnaire/internal-1/xml"), {
    params: Promise.resolve({ id: "internal-1" }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  expect(response.headers.get("content-disposition")).toContain(
    "20260922_81426_Interne_Dokumentation.xml",
  );
  await expect(response.text()).resolves.toBe("<xml/>");
});

it("liefert GDT für eine interne Dokumentation auch nach Auto-ACK als manuellen Fallback", async () => {
  const response = await getGdt(request("/api/questionnaire/internal-1/gdt"), {
    params: Promise.resolve({ id: "internal-1" }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toContain(
    "20260922_81426_Interne_Dokumentation.gdt",
  );
  await expect(response.arrayBuffer()).resolves.toEqual(Uint8Array.from([71, 68, 84]).buffer);
});