/**
 * Tests für app/admin/practices/[id]/page.tsx (Detail).
 *
 * Kernzusicherungen:
 *   - Redirect für nicht-Admin / nicht eingeloggt.
 *   - notFound() bei unbekannter Practice-ID.
 *   - Rendert vier Toggle-Forms (POST → /api/admin/practices/[id]).
 *   - Rendert Mitglieder-Liste und Hinzufügen-Form mit OWNER-Option.
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

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import AdminPracticeDetailPage from "@/app/admin/practices/[id]/page";

type PrismaMock = {
  practice: { findUnique: jest.Mock };
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

async function runPage(id: string): Promise<{
  redirect: string | null;
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await AdminPracticeDetailPage({
      params: Promise.resolve({ id }),
    });
    return {
      redirect: null,
      notFound: false,
      markup: renderToStaticMarkup(node),
    };
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
  pm.practice.findUnique.mockReset();
});

describe("/admin/practices/[id] detail page", () => {
  it("redirectet ohne Session nach /", async () => {
    getCookies.mockResolvedValue(null);
    const r = await runPage("p-1");
    expect(r.redirect).toBe("/");
  });

  it("redirectet nicht-Admins nach /", async () => {
    getCookies.mockResolvedValue(adminAccount({ is_admin: false }));
    const r = await runPage("p-1");
    expect(r.redirect).toBe("/");
  });

  it("notFound() bei unbekannter ID", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue(null);
    const r = await runPage("p-missing");
    expect(r.notFound).toBe(true);
  });

  it("rendert Stammdaten, Toggle-Forms, Mitglieder und Hinzufügen-Form", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      slug: "praxis-eins",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      created_at: new Date("2025-01-01"),
      memberships: [
        {
          id: "m-1",
          role: "OWNER",
          created_at: new Date("2025-01-01"),
          account: {
            id: "acc-1",
            email: "owner@example.com",
            default_practice_id: null,
          },
        },
        {
          id: "m-2",
          role: "USER",
          created_at: new Date("2025-02-01"),
          account: {
            id: "acc-2",
            email: "user@example.com",
            default_practice_id: null,
          },
        },
      ],
    });
    const r = await runPage("p-1");
    expect(r.notFound).toBe(false);
    expect(r.markup).toContain("Praxis Eins");
    expect(r.markup).toContain("praxis-eins");

    // Vier Toggle-Forms, jede mit hidden flag-Input.
    const flags = [
      "is_approved",
      "inquiry_assistant_enabled",
      "patient_communication_enabled",
      "website_forms_enabled",
    ];
    for (const f of flags) {
      expect(r.markup).toMatch(
        new RegExp(`name="flag"[^>]*value="${f}"`),
      );
    }
    // Toggle-Form POSTet auf die richtige Detail-API.
    expect(r.markup).toMatch(
      /<form[^>]*action="\/api\/admin\/practices\/p-1"[^>]*method="POST"/i,
    );

    // Mitglieder
    expect(r.markup).toContain("owner@example.com");
    expect(r.markup).toContain("user@example.com");

    // Hinzufügen-Form
    expect(r.markup).toMatch(
      /<form[^>]*action="\/api\/admin\/practices\/p-1\/members"[^>]*method="POST"/i,
    );
    expect(r.markup).toMatch(/name="email"/);
    expect(r.markup).toMatch(/name="role"/);
    // OWNER ist hier erlaubt — Plattform-Admin-Werkzeug.
    expect(r.markup).toMatch(/<option[^>]*value="OWNER"/);
    expect(r.markup).toMatch(/<option[^>]*value="ADMIN"/);
    expect(r.markup).toMatch(/<option[^>]*value="USER"/);
  });

  it("rendert ?error= als alert", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      slug: "p1",
      is_approved: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
      created_at: new Date("2025-01-01"),
      memberships: [],
    });
    const node = await AdminPracticeDetailPage({
      params: Promise.resolve({ id: "p-1" }),
      searchParams: Promise.resolve({ error: "Boom" }),
    });
    const markup = renderToStaticMarkup(node);
    expect(markup).toContain("Boom");
  });

  it("Standard-Praxis: zeigt Setzen-Button für Mitglied ohne Default", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      slug: "p1",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
      created_at: new Date("2025-01-01"),
      memberships: [
        {
          id: "m-1",
          role: "USER",
          created_at: new Date("2025-02-01"),
          account: {
            id: "acc-2",
            email: "user@example.com",
            default_practice_id: null,
          },
        },
      ],
    });
    const r = await runPage("p-1");
    expect(r.markup).toMatch(
      /<form[^>]*action="\/api\/admin\/accounts\/acc-2\/default-practice"/i,
    );
    expect(r.markup).toMatch(/name="action"[^>]*value="set"/);
    expect(r.markup).toMatch(/name="practice_id"[^>]*value="p-1"/);
    expect(r.markup).toContain("Als Standard setzen");
    expect(r.markup).toContain("nicht gesetzt");
  });

  it("Standard-Praxis: zeigt Zurücksetzen-Button wenn diese Praxis Default ist", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      slug: "p1",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
      created_at: new Date("2025-01-01"),
      memberships: [
        {
          id: "m-1",
          role: "USER",
          created_at: new Date("2025-02-01"),
          account: {
            id: "acc-2",
            email: "user@example.com",
            default_practice_id: "p-1",
          },
        },
      ],
    });
    const r = await runPage("p-1");
    expect(r.markup).toMatch(/name="action"[^>]*value="clear"/);
    expect(r.markup).toContain("Standard zurücksetzen");
    expect(r.markup).toContain("diese Praxis");
  });

  it("Standard-Praxis: zeigt 'andere Praxis' wenn Default auf andere Practice zeigt", async () => {
    getCookies.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      slug: "p1",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
      created_at: new Date("2025-01-01"),
      memberships: [
        {
          id: "m-1",
          role: "USER",
          created_at: new Date("2025-02-01"),
          account: {
            id: "acc-2",
            email: "user@example.com",
            default_practice_id: "p-other",
          },
        },
      ],
    });
    const r = await runPage("p-1");
    expect(r.markup).toContain("andere Praxis");
    expect(r.markup).toContain("Als Standard setzen");
  });
});
