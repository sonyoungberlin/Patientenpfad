/**
 * Phase 3a: Tests für lib/adminActions.ts → enableWebsiteForms / disableWebsiteForms
 * sowie für die Erweiterung von listAccounts um `website_forms_enabled`.
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
  enableWebsiteForms,
  disableWebsiteForms,
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

describe("enableWebsiteForms", () => {
  it("setzt website_forms_enabled = true bei vorhandenem Account", async () => {
    pm.account.findUnique.mockResolvedValue({ id: "acc-1" });
    pm.account.update.mockResolvedValue({});

    const result = await enableWebsiteForms("praxis@example.com");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("aktiviert");
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "praxis@example.com" },
      data: { website_forms_enabled: true },
    });
  });

  it("liefert Fehler bei unbekannter E-Mail", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const result = await enableWebsiteForms("nope@example.com");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("nope@example.com");
    expect(pm.account.update).not.toHaveBeenCalled();
  });
});

describe("disableWebsiteForms", () => {
  it("setzt website_forms_enabled = false bei vorhandenem Account", async () => {
    pm.account.findUnique.mockResolvedValue({ id: "acc-1" });
    pm.account.update.mockResolvedValue({});

    const result = await disableWebsiteForms("praxis@example.com");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("deaktiviert");
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "praxis@example.com" },
      data: { website_forms_enabled: false },
    });
  });

  it("liefert Fehler bei unbekannter E-Mail", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const result = await disableWebsiteForms("nope@example.com");

    expect(result.ok).toBe(false);
    expect(pm.account.update).not.toHaveBeenCalled();
  });
});

describe("listAccounts (Phase 3a)", () => {
  it("selektiert website_forms_enabled mit", async () => {
    pm.account.findMany.mockResolvedValue([]);

    await listAccounts();

    expect(pm.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          website_forms_enabled: true,
        }),
      }),
    );
  });
});
