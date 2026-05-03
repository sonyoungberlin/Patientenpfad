/**
 * Tests für den Mail-Konfig-Abschnitt in app/admin/practices/[id]/page.tsx.
 *
 * Sicherungen:
 *   - Render mit gesetzter Konfig: zeigt Status, Host/User/From, KEIN Passwort,
 *     "Passwort gesetzt: ja", inkl. Lösch-Form.
 *   - Render ohne Konfig: "nicht konfiguriert", keine Lösch-Form.
 *   - Warnhinweis, wenn MAIL_SECRET_KEY nicht konfiguriert ist.
 *   - Save-Form POSTet auf /api/admin/practices/[id]/mail mit action=save.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");

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

type PrismaMock = { practice: { findUnique: jest.Mock } };
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;

function admin() {
  return {
    id: "acc-admin",
    email: "a@e.test",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
  };
}

function practiceRow(over: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    name: "Praxis Eins",
    slug: "praxis-eins",
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    created_at: new Date("2025-01-01"),
    smtp_host: null,
    smtp_port: null,
    smtp_secure: null,
    smtp_user: null,
    smtp_pass_encrypted: null,
    smtp_from_email: null,
    smtp_from_name: null,
    smtp_updated_at: null,
    memberships: [],
    ...over,
  };
}

async function render(): Promise<string> {
  const node = await AdminPracticeDetailPage({
    params: Promise.resolve({ id: "p-1" }),
  });
  return renderToStaticMarkup(node);
}

const ORIG_KEY = process.env.MAIL_SECRET_KEY;
beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  getCookies.mockReset();
  pm.practice.findUnique.mockReset();
  process.env.MAIL_SECRET_KEY = VALID_KEY;
});
afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.MAIL_SECRET_KEY;
  else process.env.MAIL_SECRET_KEY = ORIG_KEY;
});

describe("/admin/practices/[id] — Mail-Konfig-Abschnitt", () => {
  it("ohne Konfig: zeigt nicht konfiguriert, keine Lösch-Form", async () => {
    getCookies.mockResolvedValue(admin());
    pm.practice.findUnique.mockResolvedValue(practiceRow());
    const m = await render();
    expect(m).toContain('data-mail-configured="false"');
    expect(m).toContain('data-mail-password-set="false"');
    expect(m).not.toMatch(/data-mail-delete-form/);
    // Save-Form POSTet auf den Mail-Endpoint.
    expect(m).toMatch(
      /<form[^>]*action="\/api\/admin\/practices\/p-1\/mail"[^>]*method="POST"/i,
    );
    expect(m).toMatch(/name="action"[^>]*value="save"/);
  });

  it("mit vollständiger Konfig: zeigt Status + Lösch-Form, KEIN Passwort sichtbar", async () => {
    getCookies.mockResolvedValue(admin());
    pm.practice.findUnique.mockResolvedValue(
      practiceRow({
        smtp_host: "smtp.example.com",
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: "u@e.test",
        smtp_pass_encrypted: "v1:CIPHER_BLOB_VALUE_xxx",
        smtp_from_email: "n@e.test",
        smtp_from_name: "Praxis Eins",
        smtp_updated_at: new Date("2026-05-01T10:00:00Z"),
      }),
    );
    const m = await render();
    expect(m).toContain('data-mail-configured="true"');
    expect(m).toContain('data-mail-password-set="true"');
    expect(m).toContain("smtp.example.com");
    expect(m).toContain("u@e.test");
    expect(m).toContain("n@e.test");
    expect(m).toContain("Praxis Eins");
    // Cipher-Blob darf NICHT im HTML sichtbar werden.
    expect(m).not.toContain("CIPHER_BLOB_VALUE_xxx");
    // Lösch-Form vorhanden.
    expect(m).toMatch(/data-mail-delete-form/);
    expect(m).toMatch(/name="action"[^>]*value="delete"/);
  });

  it("Passwort-Feld ist type=password, autocomplete=new-password, leerer default", async () => {
    getCookies.mockResolvedValue(admin());
    pm.practice.findUnique.mockResolvedValue(
      practiceRow({
        smtp_host: "smtp.example.com",
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: "u@e.test",
        smtp_pass_encrypted: "v1:irrelevant",
        smtp_from_email: "n@e.test",
      }),
    );
    const m = await render();
    expect(m).toMatch(/<input[^>]*name="smtp_pass"/i);
    expect(m).toMatch(/<input[^>]*type="password"[^>]*\/?>/i);
    expect(m).toMatch(/autoComplete="new-password"/i);
    // Passwort-Feld darf keinen nicht-leeren value haben.
    expect(m).not.toMatch(/name="smtp_pass"[^>]*value="[^"]+"/i);
    expect(m).not.toMatch(/value="[^"]+"[^>]*name="smtp_pass"/i);
  });

  it("ohne MAIL_SECRET_KEY: Warnhinweis erscheint", async () => {
    delete process.env.MAIL_SECRET_KEY;
    getCookies.mockResolvedValue(admin());
    pm.practice.findUnique.mockResolvedValue(practiceRow());
    const m = await render();
    expect(m).toMatch(/data-mail-key-missing/);
  });
});
