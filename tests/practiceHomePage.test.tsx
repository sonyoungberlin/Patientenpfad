import { renderToStaticMarkup } from "react-dom/server";
import { PracticeRole } from "@prisma/client";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/authz", () => ({
  requirePracticeRoleFromCookies: jest.fn(),
}));

import { requirePracticeRoleFromCookies } from "@/lib/authz";
import PracticeHomePage from "@/app/practice/page";

const requirePracticeRole = requirePracticeRoleFromCookies as jest.Mock;

function account(
  role: string,
  overrides: Partial<{
    is_approved: boolean;
    patient_communication_enabled: boolean;
    website_forms_enabled: boolean;
    office_cases_enabled: boolean;
    arbeitsprozesse_enabled: boolean;
  }> = {},
) {
  return {
    id: "acc-1",
    email: "owner@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    office_cases_enabled: true,
    arbeitsprozesse_enabled: true,
    current_practice: { id: "p-1" },
    memberships: [{ practice_id: "p-1", role }],
    ...overrides,
  };
}

async function runPage(): Promise<{ redirect: string | null; markup: string | null }> {
  try {
    const node = await PracticeHomePage();
    return { redirect: null, markup: renderToStaticMarkup(node) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const match = /^__REDIRECT__:(.*)$/.exec(message);
    return { redirect: match?.[1] ?? null, markup: null };
  }
}

beforeEach(() => {
  redirectMock.mockClear();
  requirePracticeRole.mockReset();
});

describe("/practice Praxisübersicht", () => {
  it.each(["OWNER", "ADMIN"])("zeigt %s die erlaubten Praxisaufgaben", async (role) => {
    requirePracticeRole.mockResolvedValue(account(role));

    const result = await runPage();

    expect(result.redirect).toBeNull();
    expect(result.markup).toContain("Mitglieder und Zugänge");
    expect(result.markup).toContain("Dokumentationsbausteine");
    expect(result.markup).toContain('href="/practice/members#members"');
    expect(result.markup).toContain("Offizielle Praxisdaten ansehen · Nur Leseansicht");
    expect(result.markup).toContain("Änderungen kann ausschließlich der Plattformbetreiber vornehmen.");
    if (role === "OWNER") {
      expect(result.markup).toContain("Kiosk-Geräte verwalten");
    } else {
      expect(result.markup).not.toContain("Kiosk-Geräte verwalten");
    }
  });

  it("zeigt OWNER-only- und featuregebundene Karten nur bei Freigabe", async () => {
    requirePracticeRole.mockResolvedValue(account("OWNER"));

    const result = await runPage();

    expect(result.markup).toContain("Kiosk-Geräte verwalten");
    expect(result.markup).toContain("Website-Fragebögen");
    expect(result.markup).toContain("Praxisfälle vorbereiten");
  });

  it("blendet Website-Formulare und Arbeitsabläufe ohne die jeweiligen Freigaben aus", async () => {
    requirePracticeRole.mockResolvedValue(
      account("OWNER", {
        patient_communication_enabled: false,
        website_forms_enabled: true,
        arbeitsprozesse_enabled: false,
      }),
    );

    const result = await runPage();

    expect(result.markup).not.toContain("Website-Fragebögen");
    expect(result.markup).not.toContain("Praxisfälle vorbereiten");
    expect(result.markup).not.toContain("Praxisfall-Ketten verwalten");
    expect(result.markup).toContain("Kiosk-Geräte verwalten");
  });

  it("blendet Patienten- und Bewerbungslinks ohne ihre Praxisfreigabe aus", async () => {
    requirePracticeRole.mockResolvedValue(
      account("OWNER", {
        patient_communication_enabled: false,
        office_cases_enabled: false,
      }),
    );

    const result = await runPage();

    expect(result.markup).not.toContain("Patienten-Check-in und digitale Anfragen");
    expect(result.markup).not.toContain("Bewerbungsanfragen</h3>");
  });

  it("leitet fehlende, nicht freigeschaltete oder unberechtigte Konten um", async () => {
    requirePracticeRole.mockResolvedValue(null);
    expect(await runPage()).toMatchObject({ redirect: "/" });

    requirePracticeRole.mockResolvedValue(account("OWNER", { is_approved: false }));
    expect(await runPage()).toMatchObject({ redirect: "/" });

    expect(requirePracticeRole).toHaveBeenCalledWith([
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
    ]);
  });
});