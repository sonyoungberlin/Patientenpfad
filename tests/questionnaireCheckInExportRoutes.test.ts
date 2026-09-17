import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));
jest.mock("@/lib/questionnaire/pdfRenderer", () => ({
  buildQuestionnairePdfBytes: jest.fn().mockResolvedValue({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: "questionnaire.pdf",
  }),
}));
jest.mock("@/lib/questionnaire/questionnaireExportService", () => ({
  resolveQuestionnairePdfOptions: jest.fn(() => ({})),
  resolveQuestionnaireGdtExport: jest.fn((session) => session.patient_reference
    ? {
        patientReference: session.patient_reference,
        filename: "questionnaire.gdt",
        documentationText: "Check-in eingegangen",
      }
    : null),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { GET as getPdf } from "@/app/api/questionnaire/[id]/pdf/route";
import { GET as getGdt } from "@/app/api/questionnaire/[id]/gdt/route";
import { QUESTIONNAIRE_EXPORT_FINALITY_FILTER } from "@/lib/questionnaire/exportFinality";

const sessions = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  updateMany: jest.Mock;
};
const requireAccess = requireQuestionnaireInboxAccess as jest.Mock;

const BASE_SESSION = {
  id: "session-1",
  owner_account_id: "account-1",
  owner_practice_id: "practice-1",
  status: "completed",
  confirmed_at: null,
  deleted_at: null,
  context: "patient",
  patient_reference: "4711",
  submitted_at: new Date("2026-09-17T10:00:00Z"),
  submitted_by: "patient",
  selected_block_ids: ["KONTAKT", "CHECK_IN"],
  deduplicated_questions: [],
  frozen_blocks: null,
  answers: {},
  source: "internal_link",
  session_kind: "patient_communication",
  internal_workflow_id: null,
  pdf_downloaded_at: null,
  gdt_download_claimed_at: null,
  practice_form: null,
  kiosk_handoff_status: null,
  kiosk_follow_up_session: null,
  public_check_in_handoff: null,
};

const CASES: Array<[string, Record<string, unknown>, boolean]> = [
  ["public waiting parent after assignment", {
    source: "public_check_in",
    public_check_in_handoff: { status: "waiting", follow_up_session: null },
  }, false],
  ["public closed parent", {
    source: "public_check_in",
    public_check_in_handoff: { status: "closed", follow_up_session: null },
  }, true],
  ["public parent with pending child", {
    source: "public_check_in",
    public_check_in_handoff: {
      status: "questionnaire_ready",
      follow_up_session: { status: "pending" },
    },
  }, false],
  ["public parent with completed child", {
    source: "public_check_in",
    public_check_in_handoff: {
      status: "questionnaire_ready",
      follow_up_session: { status: "completed" },
    },
  }, true],
  ["kiosk waiting parent after assignment", {
    source: "kiosk_direct",
    kiosk_handoff_status: "waiting",
  }, false],
  ["kiosk closed parent", {
    source: "kiosk_direct",
    kiosk_handoff_status: "closed",
  }, true],
  ["kiosk parent with pending child", {
    source: "kiosk_direct",
    kiosk_handoff_status: "questionnaire_ready",
    kiosk_follow_up_session: { status: "pending" },
  }, false],
  ["kiosk parent with completed child", {
    source: "kiosk_direct",
    kiosk_handoff_status: "questionnaire_ready",
    kiosk_follow_up_session: { status: "completed" },
  }, true],
  ["public pending child", {
    source: "public_check_in",
    status: "pending",
  }, false],
  ["public completed child", { source: "public_check_in" }, true],
  ["kiosk pending child", {
    source: "kiosk_direct",
    status: "pending",
  }, false],
  ["kiosk completed child", { source: "kiosk_direct" }, true],
  ["normal completed questionnaire", {}, true],
];

beforeEach(() => {
  requireAccess.mockReset().mockResolvedValue({
    account: {
      id: "account-1",
      current_practice: { id: "practice-1" },
    },
    error: null,
  });
  sessions.findUnique.mockReset();
  sessions.updateMany.mockReset().mockResolvedValue({ count: 1 });
});

describe.each([
  ["PDF", getPdf, 409],
  ["GDT", getGdt, 404],
] as const)("check-in %s export finality", (_artifact, handler, blockedStatus) => {
  it.each(CASES)("enforces %s", async (_label, override, allowed) => {
    sessions.findUnique.mockResolvedValue({ ...BASE_SESSION, ...override });

    const response = await handler(
      new NextRequest("http://localhost/api/questionnaire/session-1"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(allowed ? 200 : blockedStatus);
  });
});

it("bindet den manuellen GDT-Claim an dieselbe Finalitätsregel", async () => {
  sessions.findUnique.mockResolvedValue({
    ...BASE_SESSION,
    source: "public_check_in",
    public_check_in_handoff: { status: "closed", follow_up_session: null },
  });

  await getGdt(
    new NextRequest("http://localhost/api/questionnaire/session-1/gdt"),
    { params: Promise.resolve({ id: "session-1" }) },
  );

  expect(sessions.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      AND: [QUESTIONNAIRE_EXPORT_FINALITY_FILTER],
    }),
  }));
});