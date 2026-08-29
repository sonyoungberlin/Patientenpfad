import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
import { PUT } from "@/app/api/practice/public-profile/route";

const pm = prisma as unknown as {
  practice: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};
const getAccount = getSessionAccount as jest.Mock;

function account(role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY") {
  return {
    id: "acc-1",
    email: "x@example.com",
    is_approved: true,
    is_admin: false,
    current_practice: { id: "p-1" },
    memberships: [{ practice_id: "p-1", role }],
  };
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/practice/public-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  pm.practice.findFirst.mockResolvedValue(null);
  pm.practice.update.mockResolvedValue({});
});

describe("PUT /api/practice/public-profile", () => {
  it.each(["OWNER", "ADMIN"] as const)("%s darf erstmals speichern", async (role) => {
    getAccount.mockResolvedValue(account(role));
    pm.practice.findUnique.mockResolvedValue({ public_slug: null });

    const response = await PUT(request({ public_name: "Hausarztpraxis Müller" }));

    expect(response.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: {
        public_name: "Hausarztpraxis Müller",
        public_slug: "hausarztpraxis-mueller",
      },
    });
  });

  it.each(["USER", "INBOX_ONLY"] as const)("%s erhält 403", async (role) => {
    getAccount.mockResolvedValue(account(role));
    const response = await PUT(request({ public_name: "Praxis am Markt" }));
    expect(response.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("ändert bei vorhandenem Slug nur den öffentlichen Namen", async () => {
    getAccount.mockResolvedValue(account("OWNER"));
    pm.practice.findUnique.mockResolvedValue({ public_slug: "stabile-praxis" });

    const response = await PUT(request({ public_name: "Neuer Praxisname" }));

    expect(response.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { public_name: "Neuer Praxisname" },
    });
  });

  it("lehnt leeren Namen auch bei vorhandenem Slug ab", async () => {
    getAccount.mockResolvedValue(account("ADMIN"));
    const response = await PUT(request({ public_name: "   " }));
    expect(response.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("lehnt direkt gesetzten public_slug ab", async () => {
    getAccount.mockResolvedValue(account("OWNER"));
    const response = await PUT(
      request({ public_name: "Praxis am Markt", public_slug: "manipuliert" }),
    );
    expect(response.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("überspringt Kollisionen mit öffentlichen oder technischen Slugs", async () => {
    getAccount.mockResolvedValue(account("OWNER"));
    pm.practice.findUnique.mockResolvedValue({ public_slug: null });
    pm.practice.findFirst
      .mockResolvedValueOnce({ id: "p-2" })
      .mockResolvedValueOnce({ id: "p-3" })
      .mockResolvedValueOnce(null);

    const response = await PUT(request({ public_name: "Praxis am Markt" }));

    expect(response.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ public_slug: "praxis-am-markt-3" }),
      }),
    );
    expect(pm.practice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { public_slug: expect.any(String) },
            { slug: expect.any(String) },
          ],
        }),
      }),
    );
  });
});