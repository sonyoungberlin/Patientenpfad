import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => { throw new Error(`__REDIRECT__:${url}`); });
const notFoundMock = jest.fn(() => { throw new Error("__NOT_FOUND__"); });

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));
jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  getQuestionnaireKioskDeviceFromCookies: jest.fn(),
  getQuestionnaireKioskAccessFromCookies: jest.fn(),
  hasQuestionnaireKioskCapability: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { findFirst: jest.fn() } },
}));
jest.mock("@/app/questionnaire-kiosk/check-in/[id]/waiting/KioskCheckInWaitingClient", () => ({
  KioskCheckInWaitingClient: ({ sessionId }: { sessionId: string }) => (
    <div data-waiting-client={sessionId} />
  ),
}));

import WaitingPage from "@/app/questionnaire-kiosk/check-in/[id]/waiting/page";
import {
  getQuestionnaireKioskAccessFromCookies,
  getQuestionnaireKioskDeviceFromCookies,
  hasQuestionnaireKioskCapability,
} from "@/lib/questionnaireKiosk/auth";
import { prisma } from "@/lib/prisma";

const getDevice = getQuestionnaireKioskDeviceFromCookies as jest.Mock;
const getAccess = getQuestionnaireKioskAccessFromCookies as jest.Mock;
const hasCapability = hasQuestionnaireKioskCapability as jest.Mock;
const findFirst = prisma.patientQuestionnaireSession.findFirst as jest.Mock;
const props = { params: Promise.resolve({ id: "check-in-1" }) };

describe("Kiosk Check-in Waiting Page", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    notFoundMock.mockClear();
    getDevice.mockReset().mockResolvedValue({
      deviceId: "device-1",
      practiceId: "practice-1",
      deviceName: "Empfang",
    });
    getAccess.mockReset().mockResolvedValue({
      kind: "device",
      deviceId: "device-1",
      practiceId: "practice-1",
      deviceName: "Empfang",
      capabilities: ["questionnaires"],
    });
    hasCapability.mockReset().mockReturnValue(true);
    findFirst.mockReset().mockResolvedValue({ id: "check-in-1" });
  });

  it("rendert bei Reload für die exakt gebundene Session erneut den Polling-Client", async () => {
    const markup = renderToStaticMarkup(await WaitingPage(props));
    expect(markup).toContain('data-waiting-client="check-in-1"');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "check-in-1",
        owner_practice_id: "practice-1",
        created_by_kiosk_device_id: "device-1",
        kiosk_handoff_status: { not: null },
      },
    }));
  });

  it("leitet ohne registriertes Kioskgerät zum Lock um", async () => {
    getDevice.mockResolvedValue(null);
    getAccess.mockResolvedValue(null);
    await expect(WaitingPage(props)).rejects.toThrow("__REDIRECT__:/questionnaire-kiosk/lock");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("verbirgt manipulierte oder fremd gebundene Session-IDs", async () => {
    findFirst.mockResolvedValue(null);
    await expect(WaitingPage(props)).rejects.toThrow("__NOT_FOUND__");
  });
});