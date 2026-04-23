/**
 * Schritt 2: Tests, die bestätigen, dass die beiden M2-Schreibrouten die
 * neue `PrefillRun`-Service-Schicht korrekt orchestrieren. Ergänzt die
 * bestehenden `m2PrefillRoute.test.ts` / `m2TokenSubmitRoute.test.ts`
 * (die mocken die Service-Funktionen, hier prüfen wir die Aufrufe
 * explizit und die Koexistenz von MFA- und Patient-Run).
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

jest.mock("@/lib/server/prefillRuns", () => ({
  getOpenRun: jest.fn(),
  createOpenRun: jest.fn(),
  freezeRun: jest.fn(),
  appendFrozenRun: jest.fn(),
}));

import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/m2/prefill/route";
import { POST as POST_TOKEN } from "@/app/api/m2-link/[token]/route";
import { prisma } from "@/lib/prisma";
import {
  appendFrozenRun,
  createOpenRun,
  freezeRun,
  getOpenRun,
} from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;
const getOpenRunMock = getOpenRun as unknown as jest.Mock;
const createOpenRunMock = createOpenRun as unknown as jest.Mock;
const freezeRunMock = freezeRun as unknown as jest.Mock;
const appendFrozenRunMock = appendFrozenRun as unknown as jest.Mock;

function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

beforeEach(() => {
  prismaMock.caseSession.findUnique.mockReset();
  prismaMock.caseSession.update.mockReset();
  getOpenRunMock.mockReset();
  createOpenRunMock.mockReset();
  freezeRunMock.mockReset();
  appendFrozenRunMock.mockReset();
});

describe("Schritt 2 – MFA-Schreibpfad (m2/prefill)", () => {
  it("legt einen neuen offenen Run an, friert ihn ein und hält ctx_prefill als Cache", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "none",
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});
    getOpenRunMock.mockResolvedValue(null);
    createOpenRunMock.mockResolvedValue({ id: "run-42", sequence: 1, frozen_at: null });
    freezeRunMock.mockResolvedValue({ id: "run-42", sequence: 1, frozen_at: new Date() });

    const req = new NextRequest("http://localhost/api/cases/c1/m2/prefill", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: { K01: { "MFA-K01-01": "ja" } } }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);

    // Reihenfolge: getOpenRun → createOpenRun → freezeRun → caseSession.update
    expect(getOpenRunMock).toHaveBeenCalledWith("c1");
    expect(createOpenRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "c1",
        source: "mfa",
        createdByAccountId: "acc-test",
        allowConfirmed: true,
        activeCheckpoints: [{ id: "K01" }],
      }),
    );
    expect(freezeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "c1",
        runId: "run-42",
        allowConfirmed: true,
        answers: expect.objectContaining({
          K01: expect.objectContaining({ "MFA-K01-01": "ja" }),
        }),
      }),
    );

    // Cache-Sync: ctx_prefill + preparation_mode gesetzt.
    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    expect(updateData.preparation_mode).toBe("mfa");
    expect(updateData.ctx_prefill.K01["MFA-K01-01"]).toBe("ja");
  });

  it("führt einen bereits offenen Run weiter (createOpenRun wird nicht aufgerufen)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "none",
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});
    getOpenRunMock.mockResolvedValue({ id: "run-existing", sequence: 3, frozen_at: null });
    freezeRunMock.mockResolvedValue({ id: "run-existing", sequence: 3, frozen_at: new Date() });

    const req = new NextRequest("http://localhost/api/cases/c1/m2/prefill", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: { K01: { "MFA-K01-01": "nein" } } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);

    expect(createOpenRunMock).not.toHaveBeenCalled();
    expect(freezeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-existing" }),
    );
  });

  it("setzt bei waiting_for_patient m2_status='none' und invalidiert den Token (Verhalten unverändert)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "waiting_for_patient",
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});
    getOpenRunMock.mockResolvedValue(null);
    createOpenRunMock.mockResolvedValue({ id: "run-new", sequence: 1, frozen_at: null });
    freezeRunMock.mockResolvedValue({ id: "run-new", sequence: 1, frozen_at: new Date() });

    const req = new NextRequest("http://localhost/api/cases/c1/m2/prefill", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: { K01: { "MFA-K01-01": "ja" } } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);

    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    expect(updateData.m2_status).toBe("none");
    expect(updateData.m2_token).toBeNull();
    expect(updateData.m2_token_expires_at).toBeNull();
  });
});

describe("Schritt 2 – Patient-Schreibpfad (m2-link/[token])", () => {
  it("erzeugt einen eigenen sofort eingefrorenen Patient-Run, auch wenn ein MFA-Run offen ist (kein Merge, kein Overwrite)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "c1",
      m2_token_expires_at: futureDate(7),
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});
    appendFrozenRunMock.mockResolvedValue({
      id: "run-patient",
      sequence: 2,
      source: "patient",
      frozen_at: new Date(),
    });

    const req = new NextRequest("http://localhost/api/m2-link/tok-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: { K01: { "M2-01": "ja" } } }),
    });
    const res = await POST_TOKEN(req, { params: Promise.resolve({ token: "tok-1" }) });
    expect(res.status).toBe(200);

    // Patient-Route nutzt ausschließlich appendFrozenRun — kein
    // getOpenRun/createOpenRun/freezeRun, damit ein eventuell offener
    // MFA-Run garantiert nicht angefasst wird.
    expect(appendFrozenRunMock).toHaveBeenCalledTimes(1);
    expect(getOpenRunMock).not.toHaveBeenCalled();
    expect(createOpenRunMock).not.toHaveBeenCalled();
    expect(freezeRunMock).not.toHaveBeenCalled();

    expect(appendFrozenRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "c1",
        source: "patient",
        patientTokenUsed: "tok-1",
        allowConfirmed: true,
        answers: { K01: { "M2-01": "ja" } },
        activeCheckpoints: [{ id: "K01" }],
      }),
    );

    // Cache-Sync + Token-Invalidierung unverändert.
    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    expect(updateData.preparation_mode).toBe("patient");
    expect(updateData.m2_status).toBe("completed");
    expect(updateData.m2_token).toBeNull();
    expect(updateData.m2_token_expires_at).toBeNull();
  });

  it("schreibt keine Daten, wenn appendFrozenRun fehlschlägt (kein ctx_prefill-Overwrite)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "c1",
      m2_token_expires_at: futureDate(7),
      active_checkpoints: [],
    });
    appendFrozenRunMock.mockRejectedValue(new Error("boom"));

    const req = new NextRequest("http://localhost/api/m2-link/tok-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: { K01: { "M2-01": "ja" } } }),
    });
    const res = await POST_TOKEN(req, { params: Promise.resolve({ token: "tok-1" }) });
    expect(res.status).toBe(500);
    expect(prismaMock.caseSession.update).not.toHaveBeenCalled();
  });
});
