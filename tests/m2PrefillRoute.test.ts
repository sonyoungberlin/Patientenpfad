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
  getOpenRun: jest.fn(),
  createOpenRun: jest.fn(),
  freezeRun: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  createOpenRun,
  freezeRun,
  getOpenRun,
} from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;
const getOpenRunMock = getOpenRun as unknown as jest.Mock;
const createOpenRunMock = createOpenRun as unknown as jest.Mock;
const freezeRunMock = freezeRun as unknown as jest.Mock;

describe("PATCH /api/cases/[id]/m2/prefill", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
    getOpenRunMock.mockReset();
    createOpenRunMock.mockReset();
    freezeRunMock.mockReset();
    // Defaults: kein offener Run vorhanden → createOpenRun wird genutzt.
    getOpenRunMock.mockResolvedValue(null);
    createOpenRunMock.mockResolvedValue({ id: "run-new", sequence: 1, frozen_at: null });
    freezeRunMock.mockResolvedValue({ id: "run-new", sequence: 1, frozen_at: new Date() });
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

  describe("Scope-Fix: Delta-Run-Kontaminierung", () => {
    it("friert nur Checkpoints im Run-Scope ein – Out-of-Scope-Antworten vom Client werden nicht übernommen", async () => {
      // Szenario: Ergänzungs-Flow hat Delta-Run nur für K01 angelegt.
      // K04 ist zwar in session.active_checkpoints (DB), gehört aber nicht
      // zum Delta. Der Client schickt trotzdem K04-Antworten mit "offen"
      // (weil M2PrefillClient withDefaultOffenForCheckpoints für alle
      // DB-Checkpoints aufruft). Ohne den Scope-Fix würden diese K04-Antworten
      // blind in den eingefrorenen Run kopiert und in M3 als "offen" erscheinen.
      prismaMock.caseSession.findUnique.mockResolvedValue({
        owner_account_id: "acc-test",
        m2_status: "none",
        active_checkpoints: [{ id: "K01" }, { id: "K04" }],
      });
      prismaMock.caseSession.update.mockResolvedValue({});

      // Existierender offener Delta-Run: scope ist nur K01.
      getOpenRunMock.mockResolvedValue({
        id: "run-delta",
        sequence: 2,
        frozen_at: null,
        active_checkpoints: [{ id: "K01" }],
      });
      freezeRunMock.mockResolvedValue({ id: "run-delta", sequence: 2, frozen_at: new Date() });

      // Client sendet Antworten für K01 UND K04 ("offen" für K04, außerhalb des Deltas).
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

      // freezeRun muss mit Antworten NUR für K01 aufgerufen werden.
      expect(freezeRunMock).toHaveBeenCalledTimes(1);
      const frozenAnswers = (freezeRunMock.mock.calls[0][0] as { answers: Record<string, unknown> }).answers;
      expect(frozenAnswers).toHaveProperty("K01");
      expect(frozenAnswers).not.toHaveProperty("K04");
    });

    it("normaler Run (kein Delta, voller Snapshot) schreibt alle Checkpoint-Antworten", async () => {
      // Szenario: kein offener Run → createOpenRun liefert vollen Snapshot.
      // Alle DB-Checkpoints sind im Scope → scopedPrefill == sanitizedPrefill.
      prismaMock.caseSession.findUnique.mockResolvedValue({
        owner_account_id: "acc-test",
        m2_status: "none",
        active_checkpoints: [{ id: "K01" }, { id: "K04" }],
      });
      prismaMock.caseSession.update.mockResolvedValue({});

      // Kein offener Run – createOpenRun gibt vollen Snapshot zurück.
      getOpenRunMock.mockResolvedValue(null);
      createOpenRunMock.mockResolvedValue({
        id: "run-full",
        sequence: 1,
        frozen_at: null,
        active_checkpoints: [{ id: "K01" }, { id: "K04" }],
      });
      freezeRunMock.mockResolvedValue({ id: "run-full", sequence: 1, frozen_at: new Date() });

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

      // Beide Checkpoints müssen im Run eingefroren sein.
      const frozenAnswers = (freezeRunMock.mock.calls[0][0] as { answers: Record<string, unknown> }).answers;
      expect(frozenAnswers).toHaveProperty("K01");
      expect(frozenAnswers).toHaveProperty("K04");
    });
  });
});
