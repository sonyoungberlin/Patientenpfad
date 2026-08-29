/**
 * Tests für GET/PUT /api/practice/notification-settings.
 *
 * Prüft:
 * - Auth-Gate: alle Rollen dürfen GET, nur OWNER/ADMIN dürfen PUT
 * - GET: beide Felder werden korrekt zurückgegeben
 * - PUT: gültige E-Mail wird gespeichert
 * - PUT: leerer String → null (deaktiviert Benachrichtigung)
 * - PUT: ungültige E-Mail → 422
 * - PUT: Komma in E-Mail → 422 (kein Multi-Recipient)
 * - PUT: zu langes Feld → 422
 * - PUT: Whitespace wird getrimmt
 * - PUT: USER → 403
 * - PUT: INBOX_ONLY → 403
 * - Practice-ID stammt ausschließlich aus Session
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { GET, PUT } from "@/app/api/practice/notification-settings/route";

type PrismaMock = {
  practice: { findUnique: jest.Mock; update: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const PRACTICE = {
  id: "p-1",
  slug: "p1",
  name: "P1",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeAccount(role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY" | "NONE") {
  return {
    id: "acc-self",
    email: "self@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    current_practice: role === "NONE" ? null : PRACTICE,
    memberships:
      role === "NONE" ? [] : [{ practice_id: "p-1", role }],
  };
}

function getReq() {
  return new NextRequest(
    "http://localhost/api/practice/notification-settings",
    { method: "GET" },
  );
}

function putReq(body: unknown) {
  return new NextRequest(
    "http://localhost/api/practice/notification-settings",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  pm.practice.findUnique.mockReset();
  pm.practice.update.mockReset();
  getSessionAccountMock.mockReset();
  pm.practice.update.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/practice/notification-settings", () => {
  it("401 wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("liefert beide Felder für OWNER", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    pm.practice.findUnique.mockResolvedValue({
      digital_request_notification_email: "owner@example.com",
      office_application_notification_email: null,
    });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      digitalRequestNotificationEmail: "owner@example.com",
      officeApplicationNotificationEmail: null,
    });
  });

  it("liefert null für nicht gesetzte Felder (USER)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("USER"));
    pm.practice.findUnique.mockResolvedValue({
      digital_request_notification_email: null,
      office_application_notification_email: null,
    });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.digitalRequestNotificationEmail).toBeNull();
  });

  it("403 wenn Account keine Practice hat", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("NONE"));
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });

  it("INBOX_ONLY darf GET aufrufen", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("INBOX_ONLY"));
    pm.practice.findUnique.mockResolvedValue({
      digital_request_notification_email: null,
      office_application_notification_email: null,
    });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe("PUT /api/practice/notification-settings", () => {
  it("401 wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await PUT(putReq({ digitalRequestNotificationEmail: "x@x.de" }));
    expect(res.status).toBe(401);
  });

  it("403 für USER", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("USER"));
    const res = await PUT(putReq({ digitalRequestNotificationEmail: "x@x.de" }));
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("403 für INBOX_ONLY", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("INBOX_ONLY"));
    const res = await PUT(putReq({ digitalRequestNotificationEmail: "x@x.de" }));
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("speichert gültige E-Mail für OWNER", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "notify@example.com" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { digital_request_notification_email: "notify@example.com" },
    });
  });

  it("speichert gültige E-Mail für ADMIN", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    const res = await PUT(
      putReq({ officeApplicationNotificationEmail: "bewerbung@example.com" }),
    );
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { office_application_notification_email: "bewerbung@example.com" },
    });
  });

  it("leerer String → null (deaktiviert Benachrichtigung)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "" }),
    );
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { digital_request_notification_email: null },
    });
  });

  it("Whitespace wird getrimmt", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "  trim@example.com  " }),
    );
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { digital_request_notification_email: "trim@example.com" },
    });
  });

  it("422 bei ungültiger E-Mail", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "kein-at" }),
    );
    expect(res.status).toBe(422);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("422 bei Komma (kein Multi-Recipient)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "a@a.de,b@b.de" }),
    );
    expect(res.status).toBe(422);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("422 bei Semikolon", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: "a@a.de;b@b.de" }),
    );
    expect(res.status).toBe(422);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("422 bei zu langer E-Mail (>254 Zeichen)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const longEmail = "a".repeat(250) + "@b.de"; // 256 chars
    const res = await PUT(
      putReq({ digitalRequestNotificationEmail: longEmail }),
    );
    expect(res.status).toBe(422);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("400 wenn kein bekanntes Feld im Body", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(putReq({ unknownField: "x@x.de" }));
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("beide Felder können gleichzeitig gesetzt werden (gleiche Adresse erlaubt)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(
      putReq({
        digitalRequestNotificationEmail: "same@example.com",
        officeApplicationNotificationEmail: "same@example.com",
      }),
    );
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: {
        digital_request_notification_email: "same@example.com",
        office_application_notification_email: "same@example.com",
      },
    });
  });

  it("Practice-ID stammt aus Session, nicht aus Body", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    await PUT(putReq({ digitalRequestNotificationEmail: "x@x.de" }));
    const call = pm.practice.update.mock.calls[0][0];
    expect(call.where.id).toBe("p-1");
  });
});
