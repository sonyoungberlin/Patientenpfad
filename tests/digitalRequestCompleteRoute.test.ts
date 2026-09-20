import { NextRequest } from "next/server";

const sendCompletionEmailMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authz", () => ({
  requireDigitalRequestWorkAccess: jest.fn(),
}));

jest.mock("@/lib/mail/sendDigitalRequestCompletionEmail", () => ({
  sendDigitalRequestCompletionEmail: (...args: unknown[]) =>
    sendCompletionEmailMock(...args),
}));

import { POST } from "@/app/api/digital-requests/[id]/complete/route";
import { prisma } from "@/lib/prisma";
import { requireDigitalRequestWorkAccess } from "@/lib/authz";

type PrismaMock = {
  digitalRequest: {
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const accessMock = requireDigitalRequestWorkAccess as jest.Mock;

const PRACTICE = {
  id: "p-1",
  name: "Praxis Muster",
  message_signature: "Praxis Muster",
};
const ACCOUNT = {
  id: "account-1",
  current_practice: { id: "p-1" },
};
const DR = {
  id: "dr-1",
  status: "new",
  submitter_email: "patient@example.com",
  owner_practice_id: "p-1",
  owner_practice: PRACTICE,
};

function request(body: unknown = { completion_message: "  Danke.  " }) {
  return new NextRequest("http://localhost/api/digital-requests/dr-1/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: "dr-1" }) };

describe("POST /api/digital-requests/[id]/complete", () => {
  beforeEach(() => {
    accessMock.mockReset().mockResolvedValue({ account: ACCOUNT, error: null });
    pm.digitalRequest.findFirst.mockReset().mockResolvedValue(DR);
    pm.digitalRequest.updateMany.mockReset();
    pm.digitalRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    sendCompletionEmailMock.mockReset().mockResolvedValue("practice");
  });

  it.each(["OWNER", "ADMIN", "USER", "INBOX_ONLY"])(
    "%s darf die Aktion verwenden",
    async (role) => {
      accessMock.mockResolvedValue({
        account: { ...ACCOUNT, memberships: [{ practice_id: "p-1", role }] },
        error: null,
      });
      const response = await POST(request(), ctx);
      expect(response.status).toBe(200);
      expect(sendCompletionEmailMock).toHaveBeenCalledTimes(1);
    },
  );

  it("weist nicht angemeldete Accounts zurück", async () => {
    accessMock.mockResolvedValue({ account: null, error: new Response(null, { status: 401 }) });
    const response = await POST(request(), ctx);
    expect(response.status).toBe(401);
    expect(pm.digitalRequest.findFirst).not.toHaveBeenCalled();
  });

  it("weist fremde oder unbekannte Requests neutral mit 404 zurück", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(null);
    const response = await POST(request(), ctx);
    expect(response.status).toBe(404);
  });

  it.each(["sent", "closed", "rejected"])(
    "weist Status %s zurück",
    async (status) => {
      pm.digitalRequest.findFirst.mockResolvedValue({ ...DR, status });
      const response = await POST(request(), ctx);
      expect(response.status).toBe(409);
      expect(pm.digitalRequest.updateMany).not.toHaveBeenCalled();
      expect(sendCompletionEmailMock).not.toHaveBeenCalled();
    },
  );

  it("akzeptiert in_review und benötigt keine Patientenzuordnung", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR, status: "in_review" });
    const response = await POST(request(), ctx);
    expect(response.status).toBe(200);
    expect(sendCompletionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "patient@example.com",
        completionMessage: "Danke.",
      }),
    );
  });

  it.each(["", "   ", "x".repeat(1001)])(
    "weist ungültige Nachricht ab",
    async (completion_message) => {
      const response = await POST(request({ completion_message }), ctx);
      expect(response.status).toBe(400);
      expect(pm.digitalRequest.findFirst).not.toHaveBeenCalled();
    },
  );

  it("speichert den getrimmten Text und schließt erfolgreich", async () => {
    const response = await POST(request({ completion_message: "  Danke.  " }), ctx);
    expect(response.status).toBe(200);
    expect(sendCompletionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ completionMessage: "Danke." }),
    );
    expect(pm.digitalRequest.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        completion_message: null,
        completed_at: null,
        OR: [
          { completion_claimed_at: null },
          { completion_claimed_at: { lt: expect.any(Date) } },
        ],
      }),
      data: { completion_claimed_at: expect.any(Date) },
    }));
    expect(pm.digitalRequest.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        completion_message: null,
        completed_at: null,
        completion_claimed_at: expect.any(Date),
      }),
      data: {
        status: "closed",
        completion_message: "Danke.",
        completed_at: expect.any(Date),
        completion_claimed_at: null,
      },
    }));
  });

  it("setzt bei Mailfehler den Claim zurück und bleibt retrybar", async () => {
    sendCompletionEmailMock.mockRejectedValueOnce(new Error("SMTP failed"));
    const failed = await POST(request(), ctx);
    expect(failed.status).toBe(500);
    expect(pm.digitalRequest.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        completion_message: null,
        completed_at: null,
        completion_claimed_at: expect.any(Date),
      }),
      data: { completion_claimed_at: null },
    }));

    pm.digitalRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    sendCompletionEmailMock.mockResolvedValueOnce("practice");
    const retry = await POST(request(), ctx);
    expect(retry.status).toBe(200);
  });

  it("übernimmt einen abgelaufenen Claim, aber keinen frischen Claim", async () => {
    const response = await POST(request(), ctx);
    const claimWhere = pm.digitalRequest.updateMany.mock.calls[0][0].where;
    expect(claimWhere.OR).toEqual([
      { completion_claimed_at: null },
      { completion_claimed_at: { lt: expect.any(Date) } },
    ]);
    expect(claimWhere.completion_message).toBeNull();
    expect(claimWhere.completed_at).toBeNull();
    expect(response.status).toBe(200);

    pm.digitalRequest.updateMany.mockReset().mockResolvedValue({ count: 0 });
    const blocked = await POST(request(), ctx);
    expect(blocked.status).toBe(409);
    expect(sendCompletionEmailMock).toHaveBeenCalledTimes(1);
  });

  it("verhindert einen zweiten Versand, wenn der atomare Claim verloren wurde", async () => {
    pm.digitalRequest.updateMany.mockReset().mockResolvedValue({ count: 0 });
    const response = await POST(request(), ctx);
    expect(response.status).toBe(409);
    expect(sendCompletionEmailMock).not.toHaveBeenCalled();
  });
});
