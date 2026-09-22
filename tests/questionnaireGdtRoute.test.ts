import { NextRequest } from "next/server";
import iconv from "iconv-lite";

jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock("@/lib/authz", () => ({ requireQuestionnaireInboxAccess: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { GET } from "@/app/api/questionnaire/[id]/gdt/route";

const sessionMock = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  updateMany: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;

const SESSION = {
  id: "session-1",
  owner_account_id: "account-1",
  owner_practice_id: "practice-1",
  status: "completed",
  confirmed_at: null,
  deleted_at: null,
  context: "patient",
  patient_reference: "79383",
  submitted_at: new Date("2026-09-12T10:00:00Z"),
  submitted_by: "patient",
  selected_block_ids: ["KURZANAMNESE"],
  deduplicated_questions: [],
  frozen_blocks: null,
  answers: {},
  source: "internal_link",
  session_kind: "patient_communication",
  internal_workflow_id: null,
  gdt_download_claimed_at: null,
  practice_form: null,
  digital_request_snapshot: null,
};

function request() {
  return new NextRequest("http://localhost/api/questionnaire/session-1/gdt");
}

beforeEach(() => {
  accessMock.mockReset().mockResolvedValue({
    account: { id: "account-1", current_practice: { id: "practice-1" } },
    error: null,
  });
  sessionMock.findUnique.mockReset().mockResolvedValue(SESSION);
  sessionMock.updateMany.mockReset().mockResolvedValue({ count: 1 });
});

it("liefert eine GDT mit PDF-identischem Basestamm und atomarem Claim", async () => {
  const response = await GET(request(), { params: Promise.resolve({ id: "session-1" }) });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain("20260912_79383_Kurzanamnese.gdt");
  expect(iconv.decode(Buffer.from(await response.arrayBuffer()), "cp850"))
    .toContain("6227System: Kurzanamnese eingegangen\r\n");
  expect(sessionMock.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      session_kind: "patient_communication",
      patient_reference: "79383",
      gdt_download_claimed_at: null,
    }),
    data: { gdt_download_claimed_at: expect.any(Date) },
  }));
});

it("überträgt den Snapshot nur in 6227 und lässt 3000 bei der Patientennummer", async () => {
  sessionMock.findUnique.mockResolvedValue({
    ...SESSION,
    digital_request_snapshot: {
      submitter_name: "Erika Muster",
      birth_date: null,
      submitter_email: "erika@example.com",
      patient_relationship: "existing_patient",
      request_intent: "digital_request",
      concern_text: "Rückruf erbeten",
      requested_topics: ["PRESCRIPTION"],
    },
  });

  const response = await GET(request(), { params: Promise.resolve({ id: "session-1" }) });
  const text = iconv.decode(Buffer.from(await response.arrayBuffer()), "cp850");
  expect(response.status).toBe(200);
  expect(text).toContain("300079383");
  expect(text).toContain("6227Ursprüngliche digitale Anfrage:");
  expect(text).toContain("Name: Erika Muster");
  expect(text).toContain("Patientenangabe: Bestandspatient/in");
  expect(text).toContain("System: Kurzanamnese eingegangen");
  expect(text).not.toContain("3000Erika Muster");
});

it("belässt 6227 ohne Snapshot unverändert", async () => {
  const response = await GET(request(), { params: Promise.resolve({ id: "session-1" }) });
  const text = iconv.decode(Buffer.from(await response.arrayBuffer()), "cp850");
  expect(text).toContain("6227System: Kurzanamnese eingegangen\r\n");
});

it.each([
  { patient_reference: null },
  { patient_reference: "47A11" },
])("liefert für nicht GDT-fähige Sessions keine Datei", async (override) => {
  sessionMock.findUnique.mockResolvedValue({ ...SESSION, ...override });
  const response = await GET(request(), { params: Promise.resolve({ id: "session-1" }) });
  expect(response.status).toBe(409);
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
});

it("liefert bei konkurrierenden Claims höchstens eine GDT", async () => {
  sessionMock.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  const [first, second] = await Promise.all([
    GET(request(), { params: Promise.resolve({ id: "session-1" }) }),
    GET(request(), { params: Promise.resolve({ id: "session-1" }) }),
  ]);
  expect([first.status, second.status].sort()).toEqual([200, 204]);
});