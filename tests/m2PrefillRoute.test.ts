import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/m2/prefill/route";

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
  saveCurrentRun: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { saveCurrentRun } from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;
const saveCurrentRunMock = saveCurrentRun as unknown as jest.Mock;

describe("PATCH /api/cases/[id]/m2/prefill", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
    saveCurrentRunMock.mockReset();
    saveCurrentRunMock.mockImplementation(async (input: {
      caseId: string;
      answers: Record<string, unknown>;
      caseSessionUpdate?: Record<string, unknown>;
    }) => {
      await prismaMock.caseSession.update({
        where: { id: input.caseId },
        data: { ...input.caseSessionUpdate, ctx_prefill: input.answers },
      });
      return { run: { id: "run-current", answers: input.answers }, changed: true };
    });
  });

  it("speichert strukturierte Prefill-Daten in ctx_prefill (mode-konsistente MFA-IDs)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "none",
      // Scope-Fix: active_checkpoints muss gesetzt sein, damit K04 im Run-Scope landet.
      active_checkpoints: [{ id: "K04" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    // MFA-Default: nur Antworten mit MFA-IDs werden akzeptiert.
    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K04: { "MFA-K04-01": "ja" } } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    // Die gesendete Antwort "ja" bleibt erhalten; weitere Fragen des Checkpoints
    // werden defensiv mit "offen" aufgefüllt (withtDefaultOffenForCheckpoints).
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: expect.objectContaining({
        ctx_prefill: expect.objectContaining({
          K04: expect.objectContaining({ "MFA-K04-01": "ja" }),
        }),
        preparation_mode: "mfa",
      }),
    });
    expect(saveCurrentRunMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ resetM3RatingsOnChange: true }),
    );
  });

  it("verwirft Cross-Mode-IDs: MFA-Speicherung lässt Patienten-IDs (M2-…) nicht durch", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test", m2_status: "none" });
    prismaMock.caseSession.update.mockResolvedValue({});

    // Mischdaten: Patienten-IDs werden im MFA-Speicherweg verworfen.
    const mixedPrefill = {
      K04: { "M2-01": "ja", "M2-02": "nein", "M2-03": "unklar" },
    };

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: mixedPrefill }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { ctx_prefill: {}, preparation_mode: "mfa" },
    });
  });

  it("setzt preparation_mode='conversation' wenn mode='conversation' übermittelt wird", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "none",
      // Scope-Fix: active_checkpoints muss gesetzt sein, damit K01 im Run-Scope landet.
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K01: { "M2-01": "ja" } }, mode: "conversation" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: expect.objectContaining({
        ctx_prefill: expect.objectContaining({
          K01: expect.objectContaining({ "M2-01": "ja" }),
        }),
        preparation_mode: "conversation",
      }),
    });
  });

  it("bereinigt m2_status='waiting_for_patient' und invalidiert m2_token beim Speichern", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "waiting_for_patient",
      // Scope-Fix: active_checkpoints muss gesetzt sein, damit K01 im Run-Scope landet.
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K01: { "M2-01": "ja" } }, mode: "conversation" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: expect.objectContaining({
        ctx_prefill: expect.objectContaining({
          K01: expect.objectContaining({ "M2-01": "ja" }),
        }),
        preparation_mode: "conversation",
        m2_status: "none",
        m2_token: null,
        m2_token_expires_at: null,
      }),
    });
  });

  it("ignoriert ungültige mode-Werte und fällt auf 'mfa' zurück", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test", m2_status: "none" });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K01: {} }, mode: "bogus" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { ctx_prefill: {}, preparation_mode: "mfa" },
    });
  });

  it("ergänzt fehlende Fragen aktiver Checkpoints defensiv mit 'offen'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "none",
      // K01 hat im MFA-Katalog drei Fragen (MFA-K01-01..03).
      active_checkpoints: [{ id: "K01" }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    // Client schickt nur eine Antwort.
    const partialPrefill = { K01: { "MFA-K01-01": "ja" } };

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: partialPrefill }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    // Alle drei Fragen sind im Prefill, fehlende auf "offen".
    expect(updateData.ctx_prefill).toEqual({
      K01: {
        "MFA-K01-01": "ja",
        "MFA-K01-02": "offen",
        "MFA-K01-03": "offen",
      },
    });
  });

  it("gibt 404 zurück wenn Session nicht gefunden", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/cases/x/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "x" }),
    });

    expect(response.status).toBe(404);
  });

  it("gibt 400 zurück bei fehlendem oder ungültigem prefill-Feld", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: "ungültig" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(400);
  });

  describe("M2-Korrektur über Delta-Runs", () => {
    it("übernimmt Antworten des vollständigen aktiven Scopes trotz offenem Delta-Run", async () => {
      prismaMock.caseSession.findUnique.mockResolvedValue({
        owner_account_id: "acc-test",
        m2_status: "none",
        active_checkpoints: [{ id: "K01" }, { id: "K04" }],
      });
      prismaMock.caseSession.update.mockResolvedValue({});

      // M2 sendet K01 und K04; K04 kann ein früher gespeicherter Checkpoint sein.
      const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
        method: "PATCH",
        body: JSON.stringify({
          prefill: {
            K01: { "MFA-K01-01": "ja" },
            K04: { "MFA-K04-01": "offen" },
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
      expect(response.status).toBe(200);

      // Der Quellen-Upsert erhält den vollständigen aktiven Scope.
      expect(saveCurrentRunMock).toHaveBeenCalledTimes(1);
      const frozenAnswers = (saveCurrentRunMock.mock.calls[0][0] as { answers: Record<string, unknown> }).answers;
      expect(frozenAnswers).toHaveProperty("K01");
      expect(frozenAnswers).toHaveProperty("K04");
    });

    it("normaler Run (kein Delta, voller Snapshot) schreibt alle Checkpoint-Antworten", async () => {
      // Ohne offenen Delta-Run sind alle DB-Checkpoints im Scope.
      prismaMock.caseSession.findUnique.mockResolvedValue({
        owner_account_id: "acc-test",
        m2_status: "none",
        active_checkpoints: [{ id: "K01" }, { id: "K04" }],
      });
      prismaMock.caseSession.update.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
        method: "PATCH",
        body: JSON.stringify({
          prefill: {
            K01: { "MFA-K01-01": "ja" },
            K04: { "MFA-K04-01": "offen" },
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
      expect(response.status).toBe(200);

      // Beide Checkpoints müssen dem aktuellen Quellenstand übergeben werden.
      const frozenAnswers = (saveCurrentRunMock.mock.calls[0][0] as { answers: Record<string, unknown> }).answers;
      expect(frozenAnswers).toHaveProperty("K01");
      expect(frozenAnswers).toHaveProperty("K04");
    });
  });

  it("speichert einen Entwurf ohne einen wartenden Patientenlink abzuschließen", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      m2_status: "waiting_for_patient",
      active_checkpoints: [{ id: "K01" }],
    });

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({
        prefill: { K01: { "MFA-K01-01": "ja" } },
        mode: "mfa",
        draft: true,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(200);
    const update = saveCurrentRunMock.mock.calls[0][0].caseSessionUpdate;
    expect(update).toEqual({ preparation_mode: "mfa" });
    expect(update).not.toHaveProperty("m2_status");
    expect(update).not.toHaveProperty("m2_token");
  });
});
