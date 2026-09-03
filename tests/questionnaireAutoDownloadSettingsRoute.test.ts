import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  DELETE,
  GET,
  PUT,
} from "@/app/api/practice/questionnaire-auto-download/route";
import { hashQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDevice";

const DEVICE_A = "123e4567-e89b-42d3-a456-426614174000";
const DEVICE_B = "123e4567-e89b-42d3-b456-426614174001";

const practiceMock = prisma.practice as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};
const getAccountMock = getSessionAccount as jest.Mock;

function account(role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY") {
  return {
    id: "account-1",
    email: "test@example.com",
    is_approved: true,
    is_admin: false,
    patient_communication_enabled: true,
    current_practice: { id: "practice-1" },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

function request(method: "GET" | "PUT" | "DELETE", deviceId = DEVICE_A) {
  return new NextRequest(
    "http://localhost/api/practice/questionnaire-auto-download",
    {
      method,
      headers: { "X-Questionnaire-Auto-Device": deviceId },
    },
  );
}

beforeEach(() => {
  getAccountMock.mockReset();
  practiceMock.findUnique.mockReset();
  practiceMock.update.mockReset().mockResolvedValue({});
  practiceMock.updateMany.mockReset();
});

describe("questionnaire auto-download settings status", () => {
  it.each(["OWNER", "ADMIN", "USER", "INBOX_ONLY"] as const)(
    "%s darf den Status lesen",
    async (role) => {
      getAccountMock.mockResolvedValue(account(role));
      practiceMock.findUnique.mockResolvedValue({
        questionnaire_auto_pdf_device_hash:
          hashQuestionnaireAutoDeviceId(DEVICE_A),
        questionnaire_auto_pdf_enabled_at: new Date(),
      });

      const response = await GET(request("GET"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        enabled: true,
        isCurrentDevice: true,
        canManage: role === "OWNER" || role === "ADMIN",
      });
      expect(JSON.stringify(body)).not.toContain(DEVICE_A);
      expect(JSON.stringify(body)).not.toContain(
        hashQuestionnaireAutoDeviceId(DEVICE_A),
      );
    },
  );

  it("erkennt ein anderes Gerät und den deaktivierten Zustand", async () => {
    getAccountMock.mockResolvedValue(account("OWNER"));
    practiceMock.findUnique
      .mockResolvedValueOnce({
        questionnaire_auto_pdf_device_hash:
          hashQuestionnaireAutoDeviceId(DEVICE_B),
        questionnaire_auto_pdf_enabled_at: new Date(),
      })
      .mockResolvedValueOnce({
        questionnaire_auto_pdf_device_hash: null,
        questionnaire_auto_pdf_enabled_at: null,
      });

    const otherBody = await (await GET(request("GET"))).json();
    expect(otherBody.enabled).toBe(true);
    expect(otherBody.isCurrentDevice).toBe(false);

    const disabledBody = await (await GET(request("GET"))).json();
    expect(disabledBody.enabled).toBe(false);
    expect(disabledBody.isCurrentDevice).toBe(false);
  });

  it("weist ungültige Gerätekennungen zurück", async () => {
    getAccountMock.mockResolvedValue(account("OWNER"));
    const response = await GET(request("GET", "invalid"));
    expect(response.status).toBe(400);
    expect(practiceMock.findUnique).not.toHaveBeenCalled();
  });
});

describe("questionnaire auto-download settings mutations", () => {
  it.each(["OWNER", "ADMIN"] as const)(
    "%s darf erstmals aktivieren",
    async (role) => {
      getAccountMock.mockResolvedValue(account(role));
      practiceMock.updateMany.mockResolvedValue({ count: 1 });

      const response = await PUT(request("PUT"));

      expect(response.status).toBe(200);
      expect(practiceMock.updateMany).toHaveBeenCalledWith({
        where: {
          id: "practice-1",
          questionnaire_auto_pdf_enabled_at: null,
        },
        data: {
          questionnaire_auto_pdf_device_hash:
            hashQuestionnaireAutoDeviceId(DEVICE_A),
          questionnaire_auto_pdf_enabled_at: expect.any(Date),
        },
      });
      expect(practiceMock.update).not.toHaveBeenCalled();
    },
  );

  it("ersetzt nur den Hash und bewahrt enabled_at", async () => {
    getAccountMock.mockResolvedValue(account("OWNER"));
    practiceMock.updateMany.mockResolvedValue({ count: 0 });

    const response = await PUT(request("PUT", DEVICE_B));

    expect(response.status).toBe(200);
    expect(practiceMock.update).toHaveBeenCalledWith({
      where: { id: "practice-1" },
      data: {
        questionnaire_auto_pdf_device_hash:
          hashQuestionnaireAutoDeviceId(DEVICE_B),
      },
    });
  });

  it.each(["USER", "INBOX_ONLY"] as const)(
    "%s darf weder setzen noch deaktivieren",
    async (role) => {
      getAccountMock.mockResolvedValue(account(role));
      expect((await PUT(request("PUT"))).status).toBe(403);
      getAccountMock.mockResolvedValue(account(role));
      expect((await DELETE(request("DELETE"))).status).toBe(403);
      expect(practiceMock.updateMany).not.toHaveBeenCalled();
    },
  );

  it("deaktiviert nur auf dem aktiven Gerät", async () => {
    getAccountMock.mockResolvedValue(account("ADMIN"));
    practiceMock.updateMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(request("DELETE"));

    expect(response.status).toBe(200);
    expect(practiceMock.updateMany).toHaveBeenCalledWith({
      where: {
        id: "practice-1",
        questionnaire_auto_pdf_device_hash:
          hashQuestionnaireAutoDeviceId(DEVICE_A),
      },
      data: {
        questionnaire_auto_pdf_device_hash: null,
        questionnaire_auto_pdf_enabled_at: null,
      },
    });
  });
});