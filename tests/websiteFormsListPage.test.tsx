/**
 * Phase 3b: Tests für app/website-forms/page.tsx (Listen-Seite).
 *
 * Kernzusicherungen:
 *   - Redirect nach "/" ohne doppeltes Feature-Gate
 *   - Prisma-Query strikt auf eigenen Account gefiltert
 *   - Rendert eigene Formulare und das Anlege-Form
 */

import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => {
    throw new Error("__NOTFOUND__");
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import WebsiteFormsPage from "@/app/website-forms/page";

type PrismaMock = {
  practiceQuestionnaireForm: { findMany: jest.Mock };
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

async function runPage(searchParams?: Record<string, string>): Promise<{
  redirect: string | null;
  markup: string | null;
}> {
  try {
    const node = await WebsiteFormsPage({
      searchParams: searchParams ? Promise.resolve(searchParams) : undefined,
    });
    return { redirect: null, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    const r = /^__REDIRECT__:(.*)$/.exec(m);
    return { redirect: r ? r[1] : null, markup: null };
  }
}

beforeEach(() => {
  redirectMock.mockClear();
  getCookies.mockReset();
  pm.practiceQuestionnaireForm.findMany.mockReset();
});

describe("/website-forms list page", () => {
  it("redirectet ohne Session nach /", async () => {
    getCookies.mockResolvedValue(null);
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet ohne patient_communication_enabled nach /", async () => {
    getCookies.mockResolvedValue({
      ...APPROVED,
      patient_communication_enabled: false,
    });
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet ohne website_forms_enabled nach /", async () => {
    getCookies.mockResolvedValue({
      ...APPROVED,
      website_forms_enabled: false,
    });
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet Admin ohne Flags nach / (kein Bypass)", async () => {
    getCookies.mockResolvedValue({
      ...APPROVED,
      is_admin: true,
      website_forms_enabled: false,
    });
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("filtert Prisma-Query auf eigenen Account (Account-Isolation)", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findMany.mockResolvedValue([]);
    await runPage();
    const args = pm.practiceQuestionnaireForm.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ owner_account_id: "acc-1" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("rendert eigene Formulare und Anlege-Form", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findMany.mockResolvedValue([
      {
        id: "form-1",
        createdAt: new Date("2026-01-01"),
        title: "Aufnahme-Formular",
        slug: "aufnahme",
        is_active: true,
        selected_block_ids: ["REZEPT"],
      },
    ]);
    const r = await runPage();
    expect(r.markup).toContain("Aufnahme-Formular");
    expect(r.markup).toContain("aufnahme");
    expect(r.markup).toContain("/website-forms/form-1");
    // Anlege-Form vorhanden
    expect(r.markup).toContain('action="/api/website-forms"');
    expect(r.markup).toContain('name="title"');
    expect(r.markup).toContain('name="slug"');
    expect(r.markup).toContain('name="selected_block_ids"');
  });

  it("zeigt Hinweis wenn keine Formulare vorhanden", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findMany.mockResolvedValue([]);
    const r = await runPage();
    expect(r.markup).toContain("Noch keine Website-Formulare angelegt.");
  });

  it("zeigt Fehlermeldung aus Query-String", async () => {
    getCookies.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findMany.mockResolvedValue([]);
    const r = await runPage({ error: "Slug bereits vergeben." });
    expect(r.markup).toContain("Slug bereits vergeben.");
  });
});
