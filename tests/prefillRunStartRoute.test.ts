/**
 * Schritt 4: Tests für die neue Route
 * `POST /api/cases/[id]/prefill-run/start`. Sie startet aus M3 heraus
 * eine weitere Vorbereitung, ohne den bestehenden Fall zu verlassen.
 *
 * Wichtige Garantien dieser Tests:
 *   * existiert bereits ein offener Run, wird **idempotent** wiederverwendet
 *     (weder geändert noch gelöscht) – `createOpenRun` wird **nicht** gerufen.
 *   * existiert kein offener Run, wird `createOpenRun` mit `source = "mfa"`
 *     und dem aktuellen `active_checkpoints`-Snapshot aufgerufen.
 *   * Confirmed-Fälle (`doctor_confirmed = true` oder
 *     `clinical_status === "confirmed"`) werden mit 403 hart abgelehnt;
 *     `createOpenRun` wird **nicht** gerufen.
 *   * Auth/Owner-Checks verhalten sich konsistent zu den übrigen
 *     `/api/cases/[id]/...`-Routen.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/server/prefillRuns", () => {
  // Auch `PrefillRunError` wird von der Route benutzt – wir liefern eine
  // echte Klasse, damit `instanceof`-Checks zuverlässig greifen.
  class PrefillRunError extends Error {
    public readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "PrefillRunError";
      this.code = code;
    }
  }
  return {
    getOpenRun: jest.fn(),
    createOpenRun: jest.fn(),
    PrefillRunError,
  };
});

import { NextRequest } from "next/server";
import { POST } from "@/app/api/cases/[id]/prefill-run/start/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  getOpenRun,
  createOpenRun,
  PrefillRunError,
} from "@/lib/server/prefillRuns";

type PrismaMock = { caseSession: { findUnique: jest.Mock } };
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as unknown as jest.Mock;
const getOpenRunMock = getOpenRun as unknown as jest.Mock;
const createOpenRunMock = createOpenRun as unknown as jest.Mock;

function startReq(id = "case-1") {
  return new NextRequest(`http://localhost/api/cases/${id}/prefill-run/start`, {
    method: "POST",
  });
}

beforeEach(() => {
  pm.caseSession.findUnique.mockReset();
  getSessionAccountMock.mockReset();
  getOpenRunMock.mockReset();
  createOpenRunMock.mockReset();
});

describe("POST /api/cases/[id]/prefill-run/start", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(401);
    expect(getOpenRunMock).not.toHaveBeenCalled();
    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("403 wenn Account nicht freigeschaltet ist", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: false,
    });
    const res = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(403);
    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("404 wenn Fall fehlt oder fremder Owner", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue(null);
    const res = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(404);

    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "other",
      active_checkpoints: [],
      doctor_confirmed: false,
      clinical_status: "none",
    });
    const res2 = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res2.status).toBe(404);
    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("403 wenn doctor_confirmed = true (kein createOpenRun)", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }],
      doctor_confirmed: true,
      clinical_status: "none",
    });
    const res = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(403);
    expect(getOpenRunMock).not.toHaveBeenCalled();
    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("403 wenn clinical_status = 'confirmed' (kein createOpenRun)", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }],
      doctor_confirmed: false,
      clinical_status: "confirmed",
    });
    const res = await POST(startReq(), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(403);
    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("legt neuen offenen Run an (source=mfa) und liefert Redirect nach M2", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }, { id: "K02" }],
      doctor_confirmed: false,
      clinical_status: "none",
    });
    getOpenRunMock.mockResolvedValue(null);
    createOpenRunMock.mockResolvedValue({
      id: "run-new",
      sequence: 3,
      frozen_at: null,
    });

    const res = await POST(startReq("case-1"), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.runId).toBe("run-new");
    expect(body.sequence).toBe(3);
    expect(body.reused).toBe(false);
    expect(body.redirect).toBe("/cases/case-1/m2");

    expect(createOpenRunMock).toHaveBeenCalledTimes(1);
    const args = createOpenRunMock.mock.calls[0][0];
    expect(args.caseId).toBe("case-1");
    expect(args.source).toBe("mfa");
    expect(args.activeCheckpoints).toEqual([{ id: "K01" }, { id: "K02" }]);
    expect(args.createdByAccountId).toBe("acc-1");
    // KEIN allowConfirmed → Service-Guard greift zusätzlich.
    expect(args.allowConfirmed).toBeUndefined();
  });

  it("idempotent: existierender offener Run wird wiederverwendet, ohne createOpenRun aufzurufen", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }],
      doctor_confirmed: false,
      clinical_status: "none",
    });
    getOpenRunMock.mockResolvedValue({
      id: "run-existing",
      sequence: 2,
      frozen_at: null,
    });

    const res = await POST(startReq("case-1"), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.runId).toBe("run-existing");
    expect(body.sequence).toBe(2);
    expect(body.reused).toBe(true);
    expect(body.redirect).toBe("/cases/case-1/m2");

    expect(createOpenRunMock).not.toHaveBeenCalled();
  });

  it("Race-Condition: createOpenRun wirft 'open_run_exists' → fallback liest offenen Run nach", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }],
      doctor_confirmed: false,
      clinical_status: "none",
    });
    // Erster Lookup: kein offener Run; nach dem konkurrierenden create
    // gibt es plötzlich einen.
    getOpenRunMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "run-race", sequence: 4, frozen_at: null });
    createOpenRunMock.mockRejectedValue(
      new PrefillRunError("open_run_exists", "race"),
    );

    const res = await POST(startReq("case-1"), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.runId).toBe("run-race");
    expect(body.reused).toBe(true);
  });

  it("Service-seitiger Confirm-Block (case_confirmed) wird sauber als 403 weitergereicht", async () => {
    getSessionAccountMock.mockResolvedValue({
      id: "acc-1",
      email: "x@y",
      is_approved: true,
    });
    // Defensive Pfad: die Route sollte zwar schon vor dem Service-Aufruf
    // blocken; falls sich Daten zwischenzeitlich ändern, muss der
    // Service-Fehler trotzdem korrekt als 403 ankommen.
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-1",
      active_checkpoints: [{ id: "K01" }],
      doctor_confirmed: false,
      clinical_status: "none",
    });
    getOpenRunMock.mockResolvedValue(null);
    createOpenRunMock.mockRejectedValue(
      new PrefillRunError("case_confirmed", "boom"),
    );

    const res = await POST(startReq("case-1"), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(403);
  });
});
