import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findMany: jest.fn() },
  },
}));

import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminHomePage from "@/app/admin/page";

const getCookies = getSessionAccountFromCookies as jest.Mock;
const findPractices = prisma.practice.findMany as jest.Mock;

function account(
  over: Partial<{
    is_admin: boolean;
    is_approved: boolean;
    current_practice: { id: string } | null;
    memberships: Array<{ practice_id: string; role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY" | "KIOSK" }>;
  }> = {},
) {
  return {
    id: "acc-admin",
    email: "admin@example.com",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    office_cases_enabled: true,
    arbeitsprozesse_enabled: true,
    current_practice: { id: "p-1" },
    memberships: [{ practice_id: "p-1", role: "OWNER" as const }],
    ...over,
  };
}

async function runPage(): Promise<{ redirect: string | null; markup: string | null }> {
  try {
    const node = await AdminHomePage();
    return { redirect: null, markup: renderToStaticMarkup(node) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const match = /^__REDIRECT__:(.*)$/.exec(message);
    return { redirect: match?.[1] ?? null, markup: null };
  }
}

beforeEach(() => {
  redirectMock.mockClear();
  getCookies.mockReset();
  findPractices.mockReset();
});

describe("/admin start page", () => {
  it("leitet nicht eingeloggte Aufrufer nach / um", async () => {
    getCookies.mockResolvedValue(null);
    expect(await runPage()).toMatchObject({ redirect: "/" });
    expect(findPractices).not.toHaveBeenCalled();
  });

  it.each([
    ["nicht freigeschaltete Admins", { is_approved: false }],
    ["Accounts ohne Plattform-Adminrecht", { is_admin: false }],
  ])("leitet %s nach / um", async (_description, overrides) => {
    getCookies.mockResolvedValue(account(overrides));
    expect(await runPage()).toMatchObject({ redirect: "/" });
    expect(findPractices).not.toHaveBeenCalled();
  });

  it("zeigt konkrete Plattformaufgaben und direkte Einstiege je Praxis", async () => {
    getCookies.mockResolvedValue(account());
    findPractices.mockResolvedValue([{ id: "p-1", name: "Praxis Eins" }]);

    const result = await runPage();
    expect(result.redirect).toBeNull();
    expect(result.markup).toContain("E-Mail-Versand einrichten");
    expect(result.markup).toContain("Fallkontingent ändern");
    expect(result.markup).toContain("Checkpoints und Labels verwalten");
    expect(result.markup).toContain('href="/admin/practices/p-1#mail-config"');
    expect(result.markup).toContain('href="/admin/practices/p-1#case-quota"');
    expect(result.markup).toContain('href="/admin/practices/p-1#members"');
    expect(result.markup).toContain("Praxisverwaltung");
    expect(result.markup).toContain('href="/practice/members"');
    expect(result.markup).toContain('href="/practice/checkpoint-definitions"');
  });

  it("zeigt keine Praxisverwaltung ohne passende Membership", async () => {
    getCookies.mockResolvedValue(
      account({ current_practice: null, memberships: [] }),
    );
    findPractices.mockResolvedValue([]);

    const result = await runPage();
    expect(result.redirect).toBeNull();
    expect(result.markup).not.toContain("Praxisverwaltung</h2>");
    expect(result.markup).toContain("Plattform-Administration");
  });
});