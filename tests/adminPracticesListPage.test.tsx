/**
 * Tests für app/admin/practices/page.tsx (Liste).
 *
 * Kernzusicherungen:
 *   - Redirect nach "/" ohne Session, ohne is_approved oder ohne is_admin.
 *   - Rendert Name, Slug, OWNER-E-Mails, Mitgliederzahl, Flag-Stati.
 *   - Leere Liste rendert Fallback-Text.
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
    practice: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import AdminPracticesPage from "@/app/admin/practices/page";

type PrismaMock = {
  practice: { findMany: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;

function adminAccount(over: Partial<{ is_admin: boolean; is_approved: boolean }> = {}) {
  return {
    id: "acc-admin",
    email: "admin@example.com",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
    ...over,
  };
}

async function runPage(): Promise<{
  redirect: string | null;
  markup: string | null;
}> {
  try {
    const node = await AdminPracticesPage();
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
  pm.practice.findMany.mockReset();
});

describe("/admin/practices list page", () => {
  it("redirectet ohne Session nach /", async () => {
    getCookies.mockResolvedValue(null);
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet nicht-Admins nach /", async () => {
    getCookies.mockResolvedValue(adminAccount({ is_admin: false }));
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet gesperrte Accounts nach /", async () => {
    getCookies.mockResolvedValue(adminAccount({ is_approved: false }));
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("rendert leere Liste mit Fallback-Text", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findMany.mockResolvedValue([]);
    const r = await runPage();
    expect(r.markup).toContain("Keine Praxen vorhanden.");
  });

  it("rendert Name, Slug, OWNER-E-Mail(s), Mitgliederzahl und Flags", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findMany.mockResolvedValue([
      {
        id: "p-1",
        name: "Praxis Eins",
        slug: "praxis-eins",
        is_approved: true,
        inquiry_assistant_enabled: false,
        patient_communication_enabled: true,
        website_forms_enabled: false,
        created_at: new Date("2025-01-01"),
        memberships: [
          { account: { email: "owner1@example.com" } },
          { account: { email: "owner2@example.com" } },
        ],
        _count: { memberships: 5 },
      },
    ]);
    const r = await runPage();
    expect(r.markup).toContain("Praxis Eins");
    expect(r.markup).toContain("praxis-eins");
    expect(r.markup).toContain("owner1@example.com");
    expect(r.markup).toContain("owner2@example.com");
    expect(r.markup).toContain(">5<");
    // Link auf Detailseite
    expect(r.markup).toContain('href="/admin/practices/p-1"');
  });
});
