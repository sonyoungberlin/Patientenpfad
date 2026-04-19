/**
 * Tests für lib/adminActions.ts (approveAccount, revokeAccount, listAccounts).
 *
 * Prisma wird vollständig gemockt; es wird keine Datenbankverbindung benötigt.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  approveAccount,
  revokeAccount,
  listAccounts,
} from "@/lib/adminActions";

type PrismaMock = {
  account: {
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// approveAccount
// ---------------------------------------------------------------------------

describe("approveAccount", () => {
  it("schaltet einen vorhandenen Account frei (is_approved = true)", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "tester@example.com",
      is_approved: false,
    });
    pm.account.update.mockResolvedValue({});

    const result = await approveAccount("tester@example.com");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("freigeschaltet");
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "tester@example.com" },
      data: { is_approved: true },
    });
  });

  it("gibt Fehler zurück wenn E-Mail nicht existiert", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const result = await approveAccount("unbekannt@example.com");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("unbekannt@example.com");
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("berührt andere Accounts nicht", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "tester@example.com",
      is_approved: false,
    });
    pm.account.update.mockResolvedValue({});

    await approveAccount("tester@example.com");

    expect(pm.account.update).toHaveBeenCalledTimes(1);
    expect(pm.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "tester@example.com" } }),
    );
  });
});

// ---------------------------------------------------------------------------
// revokeAccount
// ---------------------------------------------------------------------------

describe("revokeAccount", () => {
  it("setzt is_approved = false für vorhandenen Account", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "tester@example.com",
      is_approved: true,
    });
    pm.account.update.mockResolvedValue({});

    const result = await revokeAccount("tester@example.com");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("gesperrt");
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "tester@example.com" },
      data: { is_approved: false },
    });
  });

  it("gibt Fehler zurück wenn E-Mail nicht existiert", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const result = await revokeAccount("unbekannt@example.com");

    expect(result.ok).toBe(false);
    expect(pm.account.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// listAccounts
// ---------------------------------------------------------------------------

describe("listAccounts", () => {
  it("gibt alle Accounts zurück", async () => {
    const now = new Date();
    pm.account.findMany.mockResolvedValue([
      { id: "acc-1", email: "a@example.com", is_approved: true, is_admin: false, createdAt: now },
      { id: "acc-2", email: "b@example.com", is_approved: false, is_admin: false, createdAt: now },
    ]);

    const accounts = await listAccounts();

    expect(accounts).toHaveLength(2);
    expect(accounts[0].email).toBe("a@example.com");
    expect(accounts[1].is_approved).toBe(false);
    expect(pm.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, email: true, is_approved: true, is_admin: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("gibt leeres Array zurück wenn keine Accounts vorhanden", async () => {
    pm.account.findMany.mockResolvedValue([]);

    const accounts = await listAccounts();

    expect(accounts).toHaveLength(0);
  });
});
