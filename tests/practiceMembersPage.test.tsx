/**
 * Phase P4a: Tests für app/practice/members/page.tsx (read-only Liste).
 *
 * Kernzusicherungen:
 *   - Redirect nach "/" ohne Session bzw. ohne `is_approved`.
 *   - notFound() bei USER (kein 403).
 *   - notFound() für Plattform-Admin ohne Membership (kein Bypass).
 *   - OWNER und ADMIN sehen die Mitgliederliste der aktuellen Practice
 *     mit E-Mail und Rolle.
 *   - Es gibt **keine** Mutations-Forms (read-only).
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
    practiceMembership: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import PracticeMembersPage from "@/app/practice/members/page";

type PrismaMock = {
  practiceMembership: { findMany: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;

const PRACTICE = {
  id: "p-1",
  slug: "p1",
  name: "Praxis Eins",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeAccount(role: "OWNER" | "ADMIN" | "USER") {
  return {
    id: "acc-1",
    email: "self@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    current_practice: PRACTICE,
    memberships: [{ practice_id: "p-1", role }],
  };
}

async function runPage(): Promise<{
  redirect: string | null;
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await PracticeMembersPage();
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
  pm.practiceMembership.findMany.mockReset();
});

describe("/practice/members read-only page", () => {
  it("redirectet ohne Session nach /", async () => {
    getCookies.mockResolvedValue(null);
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("redirectet nicht freigeschaltete Accounts nach /", async () => {
    getCookies.mockResolvedValue({
      ...makeAccount("OWNER"),
      is_approved: false,
    });
    const r = await runPage();
    expect(r.redirect).toBe("/");
  });

  it("notFound() für USER (kein 403, Konvention für Praxis-Pfade)", async () => {
    getCookies.mockResolvedValue(makeAccount("USER"));
    const r = await runPage();
    expect(r.notFound).toBe(true);
    expect(pm.practiceMembership.findMany).not.toHaveBeenCalled();
  });

  it("notFound() für Plattform-Admin ohne Membership (kein Bypass)", async () => {
    getCookies.mockResolvedValue({
      ...makeAccount("OWNER"),
      is_admin: true,
      memberships: [],
    });
    const r = await runPage();
    expect(r.notFound).toBe(true);
    expect(pm.practiceMembership.findMany).not.toHaveBeenCalled();
  });

  it("OWNER sieht die Mitgliederliste der aktuellen Practice", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceMembership.findMany.mockResolvedValue([
      {
        id: "m-1",
        role: "OWNER",
        created_at: new Date("2025-01-01"),
        account: { id: "acc-1", email: "self@example.com" },
      },
      {
        id: "m-2",
        role: "USER",
        created_at: new Date("2025-02-01"),
        account: { id: "acc-2", email: "kollege@example.com" },
      },
    ]);
    const r = await runPage();
    expect(r.notFound).toBe(false);
    expect(r.markup).toContain("Mitglieder");
    expect(r.markup).toContain("Praxis Eins");
    expect(r.markup).toContain("self@example.com");
    expect(r.markup).toContain("kollege@example.com");
    // Eigene Zeile markiert
    expect(r.markup).toContain("(Du)");
    // Filter strikt auf eigene Practice
    const args = pm.practiceMembership.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ practice_id: "p-1" });
  });

  it("ADMIN sieht die Mitgliederliste der aktuellen Practice", async () => {
    getCookies.mockResolvedValue(makeAccount("ADMIN"));
    pm.practiceMembership.findMany.mockResolvedValue([
      {
        id: "m-1",
        role: "OWNER",
        created_at: new Date("2025-01-01"),
        account: { id: "acc-2", email: "owner@example.com" },
      },
    ]);
    const r = await runPage();
    expect(r.notFound).toBe(false);
    expect(r.markup).toContain("owner@example.com");
  });

  it("rendert das Hinzufügen-Formular ohne OWNER-Option (Mutationen begrenzt)", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceMembership.findMany.mockResolvedValue([
      {
        id: "m-1",
        role: "OWNER",
        created_at: new Date("2025-01-01"),
        account: { id: "acc-1", email: "self@example.com" },
      },
    ]);
    const r = await runPage();
    // Hinzufügen-Form vorhanden und POSTet an die API-Route.
    expect(r.markup).toMatch(/<form[^>]*action="\/api\/practice\/members"[^>]*method="POST"/i);
    expect(r.markup).toMatch(/name="email"/);
    expect(r.markup).toMatch(/name="role"/);
    // Rollen-Auswahl bietet ADMIN und USER, aber **nicht** OWNER.
    expect(r.markup).toMatch(/<option[^>]*value="ADMIN"/);
    expect(r.markup).toMatch(/<option[^>]*value="USER"/);
    expect(r.markup).not.toMatch(/<option[^>]*value="OWNER"/);
  });

  it("zeigt ?error=… als Fehlermeldung", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceMembership.findMany.mockResolvedValue([]);
    try {
      const node = await PracticeMembersPage({
        searchParams: Promise.resolve({ error: "Ungültige E-Mail." }),
      });
      const markup = renderToStaticMarkup(node);
      expect(markup).toContain("Ungültige E-Mail.");
      expect(markup).toMatch(/role="alert"/);
    } catch (err) {
      throw err;
    }
  });

  it("zeigt ?added=<email> als Erfolgsmeldung", async () => {
    getCookies.mockResolvedValue(makeAccount("ADMIN"));
    pm.practiceMembership.findMany.mockResolvedValue([]);
    const node = await PracticeMembersPage({
      searchParams: Promise.resolve({ added: "neu@example.com" }),
    });
    const markup = renderToStaticMarkup(node);
    expect(markup).toContain("neu@example.com");
    expect(markup).toMatch(/role="status"/);
  });
});
