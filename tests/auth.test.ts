/**
 * Auth-Tests: Account-Anlage, Freischaltprüfung, Fallfilterung, Logout.
 *
 * Gemockt werden:
 *   - @/lib/prisma  (Datenbankoperationen)
 *   - crypto        (randomBytes → vorhersehbares Token im Test)
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Prisma-Mock
// ---------------------------------------------------------------------------

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    caseSession: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// crypto-Mock (stable token fuer Session-Generierung).
// `randomBytes` wird hier vorhersagbar gemacht; `scrypt` und `timingSafeEqual`
// (von `lib/password.ts` benoetigt) werden auf die echten Implementierungen
// durchgereicht.
// ---------------------------------------------------------------------------

jest.mock("crypto", () => {
  const actual = jest.requireActual("crypto");
  return {
    ...actual,
    randomBytes: jest.fn((n: number) => {
      // Stable, vorhersagbares Token NUR fuer den Session-Token-Pfad
      // (`randomBytes(32).toString("hex")` in `app/api/auth/login/route.ts`).
      // Andere Aufrufer (z. B. `lib/password.ts`-Salt mit 16 Byte) erhalten
      // echte Bytes, damit `scrypt`/`Buffer`-Operationen funktionieren.
      if (n === 32) {
        return { toString: () => "test-token-hex-value" };
      }
      return actual.randomBytes(n);
    }),
  };
});

import { prisma } from "@/lib/prisma";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { GET as casesHandler } from "@/app/api/cases/route";
import { POST as createCaseHandler } from "@/app/api/cases/create/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const TEST_PASSWORD = "test-password-1234";
let TEST_PASSWORD_HASH: string;
beforeAll(async () => {
  TEST_PASSWORD_HASH = await hashPassword(TEST_PASSWORD);
});

type PrismaMock = {
  account: { upsert: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  session: {
    create: jest.Mock;
    findUnique: jest.Mock;
    deleteMany: jest.Mock;
    delete: jest.Mock;
  };
  caseSession: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;

// Helper: create a NextRequest with a session cookie
function requestWithCookie(url: string, opts?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(url, {
    method: opts?.method,
    body: opts?.body,
    headers: {
      ...(opts?.headers ?? {}),
      Cookie: `${SESSION_COOKIE}=test-token-hex-value`,
    },
  });
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  it("gibt 401 (neutral) bei fehlender E-Mail zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("ungültig");
  });

  it("gibt 401 (neutral) bei ungültiger E-Mail zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "kein-at-zeichen", password: "irgendwas" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt 401 (neutral) bei fehlendem Passwort zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt 401 (neutral) zurück wenn Account nicht existiert", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "unknown@example.com", password: "irgendwas-langes" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // Neutraler Fehlertext — keine Account-Enumeration.
    expect(json.error).toContain("ungültig");
  });

  it("gibt 401 (neutral) zurück wenn Passwort falsch ist", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      password_hash: TEST_PASSWORD_HASH,
    });

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "falsches-passwort" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("ungültig");
    expect(pm.session.create).not.toHaveBeenCalled();
  });

  it("gibt 401 (neutral) zurück wenn Account kein Passwort gesetzt hat", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      password_hash: null,
    });

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "irgendwas-langes" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
    expect(pm.session.create).not.toHaveBeenCalled();
  });

  it("gibt 403 zurück wenn Account nicht freigeschaltet (nach erfolgreichem Passwort-Check)", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: false,
      password_hash: TEST_PASSWORD_HASH,
    });

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: TEST_PASSWORD }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("nicht freigeschaltet");
    expect(pm.session.create).not.toHaveBeenCalled();
  });

  it("erstellt Session bei korrektem Passwort + freigeschaltetem Account", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      default_practice_id: null,
      memberships: [],
      password_hash: TEST_PASSWORD_HASH,
    });
    pm.session.create.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: TEST_PASSWORD }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.account.email).toBe("test@example.com");
    expect(json.redirectTo).toBe("/dashboard");
    expect(pm.account.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      select: {
        id: true,
        email: true,
        is_approved: true,
        password_hash: true,
        default_practice_id: true,
        memberships: {
          select: {
            practice_id: true,
            role: true,
            created_at: true,
          },
        },
      },
    });
    expect(pm.session.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token: "test-token-hex-value", account_id: "acc-1" }) }),
    );
  });

  it("liefert /questionnaires als Redirect-Ziel für INBOX_ONLY in der aktiven Praxis", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      password_hash: TEST_PASSWORD_HASH,
      default_practice_id: "p-1",
      memberships: [
        {
          practice_id: "p-1",
          role: "INBOX_ONLY",
          created_at: new Date("2025-01-01T00:00:00.000Z"),
        },
      ],
    });
    pm.session.create.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: TEST_PASSWORD }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.redirectTo).toBe("/questionnaires");
  });

  it("setzt httpOnly-Cookie im Response", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      password_hash: TEST_PASSWORD_HASH,
    });
    pm.session.create.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: TEST_PASSWORD }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginHandler(req);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain(SESSION_COOKIE);
    expect(setCookie).toContain("HttpOnly");
  });
});

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  it("gibt 400 bei fehlender E-Mail zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 400 bei fehlendem Passwort zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Passwort");
  });

  it("gibt 400 bei zu kurzem Passwort zurück", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", password: "kurz" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(400);
  });

  it("gibt 409 zurück wenn E-Mail bereits existiert", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
    });

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "ein-langes-passwort" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("bereits registriert");
  });

  it("legt Account mit gehashtem Passwort an (kein Klartext gespeichert)", async () => {
    pm.account.findUnique.mockResolvedValue(null);
    pm.account.create.mockResolvedValue({
      id: "acc-new",
      email: "new@example.com",
      is_approved: false,
    });

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", password: "ein-langes-passwort" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.message).toContain("freigeschaltet");
    expect(pm.account.create).toHaveBeenCalledTimes(1);
    const createArgs = pm.account.create.mock.calls[0][0];
    expect(createArgs.data.email).toBe("new@example.com");
    expect(createArgs.data.is_approved).toBe(false);
    // Hash ist gespeichert, NICHT das Klartext-Passwort
    expect(typeof createArgs.data.password_hash).toBe("string");
    expect(createArgs.data.password_hash).toMatch(/^scrypt\$/);
    expect(createArgs.data.password_hash).not.toContain("ein-langes-passwort");
  });

  it("erstellt keine Session bei Registrierung", async () => {
    pm.account.findUnique.mockResolvedValue(null);
    pm.account.create.mockResolvedValue({
      id: "acc-new",
      email: "new@example.com",
      is_approved: false,
    });

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", password: "ein-langes-passwort" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await registerHandler(req);

    expect(res.status).toBe(200);
    expect(pm.session.create).not.toHaveBeenCalled();
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe("POST /api/auth/logout", () => {
  it("löscht Session und leert Cookie", async () => {
    pm.session.deleteMany.mockResolvedValue({ count: 1 });

    const req = requestWithCookie("http://localhost/api/auth/logout", {
      method: "POST",
    });
    const res = await logoutHandler(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(pm.session.deleteMany).toHaveBeenCalledWith({
      where: { token: "test-token-hex-value" },
    });
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("funktioniert auch ohne Cookie (kein Fehler)", async () => {
    const req = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
    });
    const res = await logoutHandler(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.session.deleteMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

describe("GET /api/auth/me", () => {
  it("gibt 401 zurück wenn kein Cookie gesetzt", async () => {
    const req = new NextRequest("http://localhost/api/auth/me");
    const res = await meHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt 401 zurück wenn Token nicht in DB gefunden", async () => {
    pm.session.findUnique.mockResolvedValue(null);
    const req = requestWithCookie("http://localhost/api/auth/me");
    const res = await meHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt Account zurück bei gültigem Token", async () => {
    pm.session.findUnique.mockResolvedValue({
      token: "test-token-hex-value",
      expiresAt: new Date(Date.now() + 100_000),
      account: { id: "acc-1", email: "test@example.com", is_approved: true },
    });

    const req = requestWithCookie("http://localhost/api/auth/me");
    const res = await meHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.account.email).toBe("test@example.com");
  });

  it("gibt 401 zurück bei abgelaufener Session", async () => {
    pm.session.findUnique.mockResolvedValue({
      token: "test-token-hex-value",
      expiresAt: new Date(Date.now() - 1000),
      account: { id: "acc-1", email: "test@example.com", is_approved: true },
    });
    pm.session.delete.mockResolvedValue({});

    const req = requestWithCookie("http://localhost/api/auth/me");
    const res = await meHandler(req);
    expect(res.status).toBe(401);
    expect(pm.session.delete).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET /api/cases – nur eigene Fälle
// ---------------------------------------------------------------------------

describe("GET /api/cases", () => {
  it("gibt 401 zurück ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases");
    const res = await casesHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt nur Fälle des eingeloggten Accounts zurück", async () => {
    pm.session.findUnique.mockResolvedValue({
      token: "test-token-hex-value",
      expiresAt: new Date(Date.now() + 100_000),
      account: { id: "acc-1", email: "test@example.com", is_approved: true },
    });
    pm.caseSession.findMany.mockResolvedValue([
      { id: "case-1", createdAt: new Date(), mode: "guest", patient_reference: null, active_checkpoints: [] },
    ]);

    const req = requestWithCookie("http://localhost/api/cases");
    const res = await casesHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.cases).toHaveLength(1);
    expect(pm.caseSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { owner_account_id: "acc-1" } }),
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/cases/create – Auth + is_approved
// ---------------------------------------------------------------------------

describe("POST /api/cases/create", () => {
  it("gibt 401 zurück ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/create", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createCaseHandler(req);
    expect(res.status).toBe(401);
  });

  it("gibt 403 zurück wenn Account nicht freigeschaltet", async () => {
    pm.session.findUnique.mockResolvedValue({
      token: "test-token-hex-value",
      expiresAt: new Date(Date.now() + 100_000),
      account: { id: "acc-1", email: "test@example.com", is_approved: false },
    });

    const req = requestWithCookie("http://localhost/api/cases/create", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createCaseHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("legt Fall an und verknüpft owner_account_id bei freigeschaltetem Account", async () => {
    pm.session.findUnique.mockResolvedValue({
      token: "test-token-hex-value",
      expiresAt: new Date(Date.now() + 100_000),
      account: { id: "acc-1", email: "test@example.com", is_approved: true },
    });
    pm.caseSession.create.mockResolvedValue({
      id: "new-case",
      stage_status: "INTAKE",
      mode: "guest",
      patient_reference: null,
    });

    const m1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
    };

    const req = requestWithCookie("http://localhost/api/cases/create", {
      method: "POST",
      body: JSON.stringify({ m1Selection, mode: "guest" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createCaseHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(pm.caseSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ owner_account_id: "acc-1" }),
      }),
    );
  });
});
