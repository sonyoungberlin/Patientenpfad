/**
 * Tests für POST /api/admin/practices/[id] (Flag-Toggle).
 *
 * Prüft Auth-Gate (nur Plattform-Admin), Whitelist von Flags,
 * Boolean-Wert-Validierung, Practice-Existenz (P2025 → 404), und dass
 * tatsächlich nur auf `Practice` (nicht auf `Account`) geschrieben wird.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/adminActions", () => ({
  deletePracticeById: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { deletePracticeById } from "@/lib/adminActions";
import { POST } from "@/app/api/admin/practices/[id]/route";

type PrismaMock = {
  practice: { update: jest.Mock; findUnique: jest.Mock };
  account: { update: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;
const deletePracticeByIdMock = deletePracticeById as jest.Mock;

const completeLegalProfile = {
  official_practice_name: "Praxis Eins",
  street: "Musterweg",
  house_number: "1",
  postal_code: "12345",
  city: "Musterstadt",
  country: "Deutschland",
  official_email: "praxis@example.test",
  phone: "030 123",
  official_imprint_url: "https://praxis.example/impressum",
  official_privacy_url: "https://praxis.example/datenschutz",
};

function adminAccount(over: Partial<{ is_admin: boolean }> = {}) {
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

function jsonReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/practices/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formReq(id: string, fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return new NextRequest(`http://localhost/api/admin/practices/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  pm.practice.update.mockReset();
  pm.practice.findUnique.mockReset();
  pm.account.update.mockReset();
  getSessionAccountMock.mockReset();
  deletePracticeByIdMock.mockReset();
});

describe("POST /api/admin/practices/[id] — Auth-Gate", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(401);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("403 wenn is_admin = false", async () => {
    getSessionAccountMock.mockResolvedValue(
      adminAccount({ is_admin: false }),
    );
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/practices/[id] — Validierung", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("400 bei unbekanntem Flag", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_admin", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("400 bei fehlendem Flag", async () => {
    const res = await POST(jsonReq("p-1", { value: true }), ctx("p-1"));
    expect(res.status).toBe(400);
  });

  it("400 bei ungültigem Wert", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: "yes" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/practices/p-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req, ctx("p-1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/practices/[id] — Happy Path", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({ legal_profile: completeLegalProfile });
    pm.practice.update.mockResolvedValue({
      id: "p-1",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
    });
  });

  it.each([
    "is_approved",
    "inquiry_assistant_enabled",
    "patient_communication_enabled",
    "website_forms_enabled",
  ])("schreibt nur auf Practice für Flag %s", async (flag) => {
    const res = await POST(jsonReq("p-1", { flag, value: true }), ctx("p-1"));
    expect(res.status).toBe(200);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p-1" });
    if (flag === "is_approved") {
      expect(args.data).toEqual({ is_approved: true, disabled_at: null });
    } else {
      expect(args.data).toEqual({ [flag]: true });
    }
    // Bewusst keine Account-Spiegelung — Account-Spalten sind Legacy.
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("akzeptiert value=false", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: false }),
      ctx("p-1"),
    );
    expect(res.status).toBe(200);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.data.is_approved).toBe(false);
    expect(args.data.disabled_at).toBeInstanceOf(Date);
  });

  it('akzeptiert string "true" / "false" (Form-Pfad)', async () => {
    const res = await POST(
      formReq("p-1", { flag: "is_approved", value: "false" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.data.is_approved).toBe(false);
    expect(args.data.disabled_at).toBeInstanceOf(Date);
  });

  it("Form-encoded: 303-Redirect mit ?toggled=<flag>", async () => {
    const res = await POST(
      formReq("p-1", { flag: "website_forms_enabled", value: "true" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-1");
    expect(loc).toContain("toggled=website_forms_enabled");
  });

  it.each([
    ["official_practice_name", "Praxisname"],
    ["street", "Straße"],
    ["house_number", "Hausnummer"],
    ["postal_code", "PLZ"],
    ["city", "Ort"],
    ["country", "Land"],
    ["official_email", "offizielle E-Mail-Adresse"],
    ["phone", "Telefonnummer"],
    ["official_imprint_url", "Impressums-URL"],
    ["official_privacy_url", "Datenschutz-URL"],
  ])("verhindert neue Freischaltung bei fehlendem Feld %s", async (field, label) => {
    pm.practice.findUnique.mockResolvedValue({
      legal_profile: { ...completeLegalProfile, [field]: null },
    });
    const res = await POST(jsonReq("p-1", { flag: "is_approved", value: true }), ctx("p-1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(label);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("weist ungültige Rechts-URL bei neuer Freischaltung ab", async () => {
    pm.practice.findUnique.mockResolvedValue({
      legal_profile: { ...completeLegalProfile, official_privacy_url: "javascript:alert(1)" },
    });
    const res = await POST(jsonReq("p-1", { flag: "is_approved", value: true }), ctx("p-1"));
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("deaktiviert eine bereits aktive Alt-Praxis trotz unvollständigem Profil weiterhin", async () => {
    pm.practice.findUnique.mockResolvedValue({ legal_profile: { official_practice_name: "Praxis Eins" } });
    const res = await POST(jsonReq("p-1", { flag: "is_approved", value: false }), ctx("p-1"));
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalled();
  });
});

describe("POST /api/admin/practices/[id] — Fehler", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("404 bei unbekannter Practice (P2025)", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practice.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq("p-missing", { flag: "is_approved", value: true }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(404);
  });

  it("Form-Pfad: 303-Redirect mit ?error=… bei P2025", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practice.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      formReq("p-missing", { flag: "is_approved", value: "true" }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-missing");
    expect(loc).toContain("error=");
  });
});

describe("POST /api/admin/practices/[id] — delete_practice", () => {
  it("403 wenn kein Admin", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount({ is_admin: false }));
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(403);
    expect(deletePracticeByIdMock).not.toHaveBeenCalled();
  });

  it("400 bei falschem confirmName", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 400,
      code: "confirm_name_mismatch",
      error: "Bitte den Praxisnamen exakt bestätigen.",
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "falsch" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("confirm_name_mismatch");
  });

  it("404 bei unbekannter Practice", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 404,
      code: "practice_not_found",
      error: "Practice nicht gefunden.",
    });
    const res = await POST(
      jsonReq("p-missing", { action: "delete_practice", confirmName: "Praxis" }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("practice_not_found");
  });

  it("409 mit Blockern wenn nicht leer", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 409,
      code: "practice_not_empty",
      error: "Praxis kann nicht gelöscht werden, solange noch Daten vorhanden sind.",
      blockers: [{ model: "CaseSession", count: 2, reason: "not_empty" }],
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("practice_not_empty");
    expect(json.blockers).toHaveLength(1);
  });

  it("200 wenn leer und gelöscht", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: true,
      deleted: true,
      status: 200,
      code: "practice_deleted",
      practiceId: "p-1",
      name: "Praxis Eins",
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("practice_deleted");
    expect(deletePracticeByIdMock).toHaveBeenCalledWith("p-1", "Praxis Eins");
  });
});
