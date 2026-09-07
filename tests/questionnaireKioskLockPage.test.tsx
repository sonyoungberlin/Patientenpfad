import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  getQuestionnaireKioskDeviceFromCookies: jest.fn(),
}));

jest.mock("@/app/questionnaire-kiosk/KioskActions", () => ({
  KioskUnlockForm: () => <form data-testid="kiosk-unlock" />,
}));

import QuestionnaireKioskLockPage from "@/app/questionnaire-kiosk/lock/page";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";

const getDevice = getQuestionnaireKioskDeviceFromCookies as jest.Mock;

describe("Questionnaire Kiosk Lock Page", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getDevice.mockReset();
  });

  it("leitet ein stale Device zum Recovery-Handler statt zurück auf den normalen Einstieg", async () => {
    getDevice.mockResolvedValue(null);

    await expect(QuestionnaireKioskLockPage()).rejects.toThrow(
      "__REDIRECT__:/api/questionnaire-kiosk-recovery",
    );
    expect(redirectMock).toHaveBeenCalledWith("/api/questionnaire-kiosk-recovery");
    expect(redirectMock).not.toHaveBeenCalledWith("/");
  });

  it("behält für ein gültiges Device das bestehende Lock- und PIN-Verhalten", async () => {
    getDevice.mockResolvedValue({
      deviceId: "device-1",
      practiceId: "practice-1",
      deviceName: "Empfang",
    });

    const markup = renderToStaticMarkup(await QuestionnaireKioskLockPage());

    expect(markup).toContain("Empfang");
    expect(markup).toContain("data-testid=\"kiosk-unlock\"");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});