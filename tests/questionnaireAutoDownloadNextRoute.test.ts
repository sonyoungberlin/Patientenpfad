import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
    patientQuestionnaireSession: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));
jest.mock("@/lib/questionnaire/pdfRenderer", () => ({
  buildQuestionnairePdfBytes: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { GET } from "@/app/api/questionnaire/auto-download/next/route";
import { hashQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDevice";

const DEVICE_A = "123e4567-e89b-42d3-a456-426614174000";
const ENABLED_AT = new Date("2026-09-03T08:00:00.000Z");

const practiceMock = prisma.practice as unknown as { findUnique: jest.Mock };
const sessionMock = prisma.patientQuestionnaireSession as unknown as {
  findFirst: jest.Mock;
  updateMany: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;
const pdfMock = buildQuestionnairePdfBytes as jest.Mock;

function request(deviceId = DEVICE_A) {
  return new NextRequest(
    "http://localhost/api/questionnaire/auto-download/next",
    { headers: { "X-Questionnaire-Auto-Device": deviceId } },
  );
}

const SESSION = {
  id: "session-1",
  patient_reference: "4711",
  submitted_at: new Date("2026-09-03T09:00:00.000Z"),
  submitted_by: "patient",
  selected_block_ids: ["VERSICHERUNG"],
  deduplicated_questions: [],
  answers: {},
  source: "internal_link",
  practice_form: null,
};

beforeEach(() => {
  accessMock.mockReset().mockResolvedValue({
    account: { current_practice: { id: "practice-1" } },
    error: null,
  });
  practiceMock.findUnique.mockReset().mockResolvedValue({
    questionnaire_auto_pdf_device_hash:
      hashQuestionnaireAutoDeviceId(DEVICE_A),
    questionnaire_auto_pdf_enabled_at: ENABLED_AT,
  });
  sessionMock.findFirst.mockReset().mockResolvedValue(SESSION);
  sessionMock.updateMany.mockReset().mockResolvedValue({ count: 1 });
  pdfMock.mockReset().mockResolvedValue({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: "20260903_4711_Versicherungsdaten.pdf",
  });
});

it("liefert nur dem registrierten Gerät eine PDF und claimt nur den Auto-Marker", async () => {
  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toContain(
    "20260903_4711_Versicherungsdaten.pdf",
  );
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(1);
  const claim = sessionMock.updateMany.mock.calls[0][0];
  expect(claim.data).toEqual({
    auto_pdf_download_claimed_at: expect.any(Date),
  });
  expect(claim.data).not.toHaveProperty("pdf_downloaded_at");
  expect(claim.where.AND).toEqual(
    expect.arrayContaining([
      { submitted_at: { gte: ENABLED_AT } },
      { auto_pdf_download_claimed_at: null },
    ]),
  );
});

it("weist ein anderes Gerät vor Kandidatensuche zurück", async () => {
  const response = await GET(
    request("123e4567-e89b-42d3-b456-426614174001"),
  );
  expect(response.status).toBe(403);
  expect(sessionMock.findFirst).not.toHaveBeenCalled();
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
});

it("liefert 204 wenn keine eligible Session existiert", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  const response = await GET(request());
  expect(response.status).toBe(204);
  expect(pdfMock).not.toHaveBeenCalled();
});

it("wendet Practice-, Sichtbarkeits-, Zeit- und Claim-Filter an", async () => {
  await GET(request());
  const where = sessionMock.findFirst.mock.calls[0][0].where;
  expect(where.AND).toEqual(
    expect.arrayContaining([
      { owner_practice_id: "practice-1" },
      { context: "patient" },
      { deleted_at: null },
      { status: "completed" },
      { submitted_at: { gte: ENABLED_AT } },
      { auto_pdf_download_claimed_at: null },
    ]),
  );
  expect(where.AND.some((part: { OR?: unknown }) => part.OR)).toBe(true);
});

it("claimt nicht, wenn die PDF-Erzeugung fehlschlägt", async () => {
  pdfMock.mockRejectedValue(new Error("render failed"));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET(request());

  expect(response.status).toBe(500);
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

it("liefert bei verlorenem atomarem Claim 204", async () => {
  sessionMock.updateMany.mockResolvedValue({ count: 0 });
  const response = await GET(request());
  expect(response.status).toBe(204);
});

it("lässt bei zwei parallelen Requests genau einen gewinnen", async () => {
  sessionMock.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });

  const [first, second] = await Promise.all([GET(request()), GET(request())]);

  expect([first.status, second.status].sort()).toEqual([200, 204]);
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(2);
});

it("prüft beim Claim erneut Gerätehash und Aktivierungszeitpunkt", async () => {
  await GET(request());
  const claimWhere = sessionMock.updateMany.mock.calls[0][0].where;
  expect(claimWhere.AND).toEqual(
    expect.arrayContaining([
      {
        owner_practice: {
          is: {
            questionnaire_auto_pdf_device_hash:
              hashQuestionnaireAutoDeviceId(DEVICE_A),
            questionnaire_auto_pdf_enabled_at: ENABLED_AT,
          },
        },
      },
    ]),
  );
});