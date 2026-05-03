/**
 * Phase 3b: Tests für app/website-forms/[id]/page.tsx (Detail-Seite).
 *
 * Kernzusicherungen:
 *   - Redirect ohne Gate
 *   - notFound() bei fremder ID (kein 403, kein Datenleck)
 *   - Public-Link-Anzeige + Hinweistext
 */

import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));

jest.mock("next/headers", () => ({
  headers: async () =>
    new Map([
      ["host", "praxis.example.com"],
      ["x-forwarded-proto", "https"],
    ]) as unknown as Headers,
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import WebsiteFormDetailPage from "@/app/website-forms/[id]/page";

type PrismaMock = {
  practiceQuestionnaireForm: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;

const APPROVED = {
  id: "acc-1",
  email: "p@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

async function runPage(id = "form-1"): Promise<{
  redirect: string | null;
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await WebsiteFormDetailPage({
      params: Promise.resolve({ id }),
    });
    return { redirect: null, notFound: false, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__") {
      return { redirect: null, notFound: true, markup: null };
    }
    const r = /^__REDIRECT__:(.*)$/.exec(m);
    return { redirect: r ? r[1] : null, notFound: false, markup: null };
  }
}

beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  getCookies.mockReset();
  pm.practiceQuestionnaireForm.findUnique.mockReset();
});

describe("/website-forms/[id] detail page", () => {
  it("redirectet ohne Gate nach /", async () => {
    getCookies.mockResolvedValue(null);
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("notFound() bei unbekannter ID", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(null);
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("notFound() bei fremder ID (nicht 403, um IDs nicht zu enumerieren)", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-OTHER",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Fremd",
      slug: "fremd",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("rendert eigenen Eintrag mit öffentlichem Link und Hinweis", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      title: "Mein Formular",
      slug: "mein-formular",
      intro_text: "Hallo",
      is_active: true,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runPage();
    expect(r.markup).toContain("Mein Formular");
    expect(r.markup).toContain("https://praxis.example.com/p/mein-formular");
    expect(r.markup).toContain("Öffentliche Formularseite ist aktiv");
    expect(r.markup).toContain("Bestätigungs-E-Mail");
    expect(r.markup).toContain('action="/api/website-forms/form-1"');
    // Toggle-Form vorhanden
    expect(r.markup).toContain('value="toggle_active"');
    // Aktiv-Status sichtbar
    expect(r.markup).toMatch(/aktiv/i);
  });

  it("zeigt Status 'inaktiv' für deaktivierte Einträge", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Inaktiv",
      slug: "inaktiv-x",
      intro_text: null,
      is_active: false,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runPage();
    expect(r.markup).toContain("inaktiv");
    expect(r.markup).toContain("Aktivieren");
  });
});
