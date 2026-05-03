/**
 * Hotfix-Tests (PR 1): Admin-Toggles in `lib/adminActions.ts` schreiben
 * sowohl auf `Account.*` als auch auf `Practice.*` für jede OWNER-Membership
 * des Accounts — atomar in einer `$transaction`. Accounts ohne
 * OWNER-Membership werden ausschließlich auf der Account-Tabelle
 * aktualisiert (kein Crash, kein zusätzlicher Practice-Schreibzugriff).
 *
 * Hintergrund: nach Phase P2 ist `Practice` die Quelle der Wahrheit für die
 * Feature-Flags (gespiegelt in `SessionAccount`). Vor diesem Fix lief
 * `/admin/accounts` ausschließlich auf `Account.*` und blieb für die App
 * unsichtbar.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    practice: {
      update: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { prisma } from "@/lib/prisma";
import { PracticeRole } from "@prisma/client";
import {
  approveAccount,
  revokeAccount,
  enableInquiryAssistant,
  disableInquiryAssistant,
  enablePatientCommunication,
  disablePatientCommunication,
  enableWebsiteForms,
  disableWebsiteForms,
} from "@/lib/adminActions";

type PrismaMock = {
  account: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  practice: {
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

const pm = prisma as unknown as PrismaMock;

beforeEach(() => {
  jest.clearAllMocks();
  pm.account.update.mockResolvedValue({});
  pm.practice.update.mockResolvedValue({});
  pm.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
});

function mockAccountWithOwnerPractices(practiceIds: string[]) {
  pm.account.findUnique.mockResolvedValue({
    id: "acc-1",
    memberships: practiceIds.map((id) => ({ practice_id: id })),
  });
}

// ---------------------------------------------------------------------------
// Verhalten je nach Membership-Lage (am Beispiel approveAccount/is_approved)
// ---------------------------------------------------------------------------

describe("Doppelschreiben Account + OWNER-Practice(s)", () => {
  it("approveAccount: schreibt Account.is_approved=true UND Practice.is_approved=true", async () => {
    mockAccountWithOwnerPractices(["practice-pilot"]);

    const res = await approveAccount("pilot@example.com");

    expect(res.ok).toBe(true);
    expect(pm.account.update).toHaveBeenCalledTimes(1);
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "pilot@example.com" },
      data: { is_approved: true },
    });
    expect(pm.practice.update).toHaveBeenCalledTimes(1);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "practice-pilot" },
      data: { is_approved: true },
    });
    expect(pm.$transaction).toHaveBeenCalledTimes(1);
    // Beide Updates wurden in derselben Transaktion gebündelt (genau 2 Ops).
    const opsArg = pm.$transaction.mock.calls[0][0] as unknown[];
    expect(opsArg).toHaveLength(2);
  });

  it("liest nur OWNER-Memberships (Filter role=OWNER)", async () => {
    mockAccountWithOwnerPractices(["practice-pilot"]);

    await approveAccount("pilot@example.com");

    expect(pm.account.findUnique).toHaveBeenCalledWith({
      where: { email: "pilot@example.com" },
      select: {
        id: true,
        memberships: {
          where: { role: PracticeRole.OWNER },
          select: { practice_id: true },
        },
      },
    });
  });

  it("Account ohne OWNER-Membership: nur Account-Update, keine Practice-Schreibung, kein Crash", async () => {
    mockAccountWithOwnerPractices([]);

    const res = await approveAccount("solo@example.com");

    expect(res.ok).toBe(true);
    expect(pm.account.update).toHaveBeenCalledTimes(1);
    expect(pm.practice.update).not.toHaveBeenCalled();
    // Transaktion wird trotzdem genutzt (mit nur einer Op), damit der
    // Codepfad einheitlich bleibt.
    expect(pm.$transaction).toHaveBeenCalledTimes(1);
    const opsArg = pm.$transaction.mock.calls[0][0] as unknown[];
    expect(opsArg).toHaveLength(1);
  });

  it("memberships-Feld fehlt komplett (defensives Fallback): nur Account-Update", async () => {
    pm.account.findUnique.mockResolvedValue({ id: "acc-1" });

    const res = await approveAccount("legacy@example.com");

    expect(res.ok).toBe(true);
    expect(pm.account.update).toHaveBeenCalledTimes(1);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("mehrere OWNER-Practices: alle werden bedient", async () => {
    mockAccountWithOwnerPractices(["practice-a", "practice-b", "practice-c"]);

    await approveAccount("multi@example.com");

    expect(pm.practice.update).toHaveBeenCalledTimes(3);
    const ids = pm.practice.update.mock.calls.map(
      (c) => (c[0] as { where: { id: string } }).where.id,
    );
    expect(ids).toEqual(
      expect.arrayContaining(["practice-a", "practice-b", "practice-c"]),
    );
  });

  it("unbekannte E-Mail: weder Account- noch Practice-Update, keine Transaktion", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const res = await approveAccount("nobody@example.com");

    expect(res.ok).toBe(false);
    expect(pm.account.update).not.toHaveBeenCalled();
    expect(pm.practice.update).not.toHaveBeenCalled();
    expect(pm.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Drift-Reparatur: divergente Flags werden durch Toggle synchronisiert
// ---------------------------------------------------------------------------

describe("Drift-Reparatur durch Toggle", () => {
  it("Account.website_forms_enabled=true, Practice.website_forms_enabled=false → enableWebsiteForms setzt beide auf true", async () => {
    // Vor dem Fix: Admin hatte Account aktiviert, Practice blieb falsch.
    // Aufruf mit demselben Wirkziel (= true) muss die Practice nachziehen.
    mockAccountWithOwnerPractices(["practice-pilot"]);

    const res = await enableWebsiteForms("pilot@example.com");

    expect(res.ok).toBe(true);
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "pilot@example.com" },
      data: { website_forms_enabled: true },
    });
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "practice-pilot" },
      data: { website_forms_enabled: true },
    });
  });

  it("disableWebsiteForms: setzt Account und Practice auf false", async () => {
    mockAccountWithOwnerPractices(["practice-pilot"]);

    await disableWebsiteForms("pilot@example.com");

    expect(pm.account.update).toHaveBeenCalledWith({
      where: { email: "pilot@example.com" },
      data: { website_forms_enabled: false },
    });
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "practice-pilot" },
      data: { website_forms_enabled: false },
    });
  });
});

// ---------------------------------------------------------------------------
// Symmetrie-Test: alle 8 Toggle-Funktionen schreiben doppelt
// ---------------------------------------------------------------------------

type ToggleCase = {
  name: string;
  fn: (email: string) => Promise<{ ok: boolean }>;
  data: Record<string, boolean>;
};

const TOGGLES: ToggleCase[] = [
  { name: "approveAccount", fn: approveAccount, data: { is_approved: true } },
  { name: "revokeAccount", fn: revokeAccount, data: { is_approved: false } },
  {
    name: "enableInquiryAssistant",
    fn: enableInquiryAssistant,
    data: { inquiry_assistant_enabled: true },
  },
  {
    name: "disableInquiryAssistant",
    fn: disableInquiryAssistant,
    data: { inquiry_assistant_enabled: false },
  },
  {
    name: "enablePatientCommunication",
    fn: enablePatientCommunication,
    data: { patient_communication_enabled: true },
  },
  {
    name: "disablePatientCommunication",
    fn: disablePatientCommunication,
    data: { patient_communication_enabled: false },
  },
  {
    name: "enableWebsiteForms",
    fn: enableWebsiteForms,
    data: { website_forms_enabled: true },
  },
  {
    name: "disableWebsiteForms",
    fn: disableWebsiteForms,
    data: { website_forms_enabled: false },
  },
];

describe.each(TOGGLES)(
  "Toggle-Symmetrie: $name doppelschreibt Account + OWNER-Practice",
  ({ fn, data }) => {
    it("schreibt identisches data-Objekt auf Account und Practice", async () => {
      mockAccountWithOwnerPractices(["practice-x"]);

      const res = await fn("user@example.com");

      expect(res.ok).toBe(true);
      expect(pm.account.update).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
        data,
      });
      expect(pm.practice.update).toHaveBeenCalledWith({
        where: { id: "practice-x" },
        data,
      });
    });
  },
);
