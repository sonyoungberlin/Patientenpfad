/**
 * Tests für POST /api/bewerben/[slug] – Notification-E-Mail.
 *
 * Prüft best-effort Notification-Mail-Logik im Bewerben-Submit-Endpoint:
 * - E-Mail wird gesendet wenn office_application_notification_email gesetzt
 * - E-Mail wird NICHT gesendet wenn Feld null
 * - 303 auch wenn Mail fehlschlägt (best-effort)
 * - variant="office" wird verwendet
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/websiteForms/submitRateLimit", () => ({
  IP_SLUG_RATE_LIMIT: { windowMs: 60000, max: 100 },
  EMAIL_HASH_RATE_LIMIT: { windowMs: 60000, max: 100 },
  createRateLimiter: () => ({ check: () => ({ allowed: true }) }),
  getClientIp: () => "1.2.3.4",
}));

jest.mock("@/lib/websiteForms/emailHash", () => ({
  hashSubmitterEmail: () => "hashed-email",
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
    },
    digitalRequest: {
      create: jest.fn(),
    },
  },
}));

const sendNotificationMock = jest.fn();
jest.mock("@/lib/mail/sendDigitalRequestNotificationEmail", () => ({
  sendDigitalRequestNotificationEmail: (...args: unknown[]) =>
    sendNotificationMock(...args),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/bewerben/[slug]/route";

type PrismaMock = {
  practice: { findUnique: jest.Mock };
  digitalRequest: { create: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

function activePractice() {
  return {
    id: "p-1",
    is_approved: true,
    office_cases_enabled: true,
    office_application_notification_email: null as string | null,
    memberships: [{ account_id: "acc-owner" }],
  };
}

function makeJsonReq(slug: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/bewerben/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(over: Record<string, unknown> = {}) {
  return {
    submitter_name: "Jane Muster",
    email: "jane@example.com",
    requested_roles: ["MFA"],
    company_website: "",
    ...over,
  };
}

const CTX = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  pm.practice.findUnique.mockReset();
  pm.digitalRequest.create.mockReset();
  pm.digitalRequest.create.mockResolvedValue({ id: "dr-new" });
  sendNotificationMock.mockReset();
  sendNotificationMock.mockResolvedValue("console");
});

describe("POST /api/bewerben/[slug] – Notification-E-Mail", () => {
  it("akzeptiert einen neuen öffentlichen Praxis-Slug", async () => {
    pm.practice.findUnique.mockResolvedValueOnce(activePractice());
    const res = await POST(
      makeJsonReq("praxis-am-markt", validBody()),
      CTX("praxis-am-markt"),
    );
    expect(res.status).toBe(303);
    expect(pm.practice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { public_slug: "praxis-am-markt" } }),
    );
  });

  it("akzeptiert weiterhin den technischen Practice-Slug", async () => {
    pm.practice.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePractice());
    const res = await POST(
      makeJsonReq("technischer-slug", validBody()),
      CTX("technischer-slug"),
    );
    expect(res.status).toBe(303);
    expect(pm.practice.findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { slug: "technischer-slug" } }),
    );
  });

  it("sendet Notification-Mail wenn office_application_notification_email gesetzt", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      office_application_notification_email: "bewerbung@praxis.de",
    });
    const res = await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    expect(res.status).toBe(303);
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationMock).toHaveBeenCalledWith({
      to: "bewerbung@praxis.de",
      variant: "office",
      practiceId: "p-1",
    });
  });

  it("sendet KEINE Notification-Mail wenn Feld null", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("gibt 303 zurück wenn Notification-Mail fehlschlägt (best-effort)", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      office_application_notification_email: "bewerbung@praxis.de",
    });
    sendNotificationMock.mockRejectedValue(new Error("SMTP down"));
    const res = await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).toHaveBeenCalledTimes(1);
  });

  it("nutzt ausschließlich office_application_notification_email (nicht digital_request_notification_email)", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      office_application_notification_email: "bewerbung@praxis.de",
    });
    await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    const call = sendNotificationMock.mock.calls[0][0];
    expect(call.variant).toBe("office");
    expect(call.to).toBe("bewerbung@praxis.de");
  });
});
