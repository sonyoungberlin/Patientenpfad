/**
 * Phase 1b: Die alte Route /admin/questionnaires bleibt nur als Redirect
 * erhalten. Diese Tests prüfen das Redirect-Verhalten:
 *  - nicht eingeloggt / nicht freigeschaltet  → "/"
 *  - freigeschaltet (Patientenkommunikation)  → "/questionnaires"
 *
 * Es gibt bewusst keine administrative Gesamtübersicht – auch Admins
 * werden auf ihre eigene Liste umgeleitet.
 */

import AdminQuestionnairesRedirectPage from "@/app/admin/questionnaires/page";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const getSessionAccountFromCookies = jest.fn();
jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: () => getSessionAccountFromCookies(),
}));

async function runPage(): Promise<string | null> {
  try {
    await AdminQuestionnairesRedirectPage();
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const match = /^__REDIRECT__:(.*)$/.exec(message);
    return match ? match[1] : null;
  }
}

describe("/admin/questionnaires redirect stub", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getSessionAccountFromCookies.mockReset();
  });

  it("leitet nicht eingeloggte Aufrufer nach / um", async () => {
    getSessionAccountFromCookies.mockResolvedValue(null);
    const target = await runPage();
    expect(target).toBe("/");
  });

  it("leitet eingeloggte aber nicht freigeschaltete Accounts nach / um", async () => {
    getSessionAccountFromCookies.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
      is_approved: false,
      is_admin: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
    });
    const target = await runPage();
    expect(target).toBe("/");
  });

  it("leitet Accounts ohne patient_communication_enabled nach / um", async () => {
    getSessionAccountFromCookies.mockResolvedValue({
      id: "acc-2",
      email: "user@example.com",
      is_approved: true,
      is_admin: false,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: false,
    });
    const target = await runPage();
    expect(target).toBe("/");
  });

  it("leitet freigeschaltete Praxis-Accounts nach /questionnaires um", async () => {
    getSessionAccountFromCookies.mockResolvedValue({
      id: "acc-3",
      email: "praxis@example.com",
      is_approved: true,
      is_admin: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: true,
    });
    const target = await runPage();
    expect(target).toBe("/questionnaires");
  });

  it("leitet auch Admins nur auf ihre eigene Liste um (kein Admin-Bypass)", async () => {
    getSessionAccountFromCookies.mockResolvedValue({
      id: "acc-admin",
      email: "admin@example.com",
      is_approved: true,
      is_admin: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
    });
    const target = await runPage();
    expect(target).toBe("/questionnaires");
  });
});
