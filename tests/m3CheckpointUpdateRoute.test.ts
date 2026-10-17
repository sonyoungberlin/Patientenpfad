import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/checkpoint/update/route";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("@/lib/prisma", () => ({
  prisma: (() => {
    const caseSession = { findUnique: jest.fn(), update: jest.fn() };
    return {
      caseSession,
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ caseSession }),
      ),
    };
  })(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

const prismaMock = prisma as unknown as PrismaMock;

const mCheckpoint: ActiveCheckpoint = {
  id: "K-M",
  block_id: "diagnosis_status",
  type: CheckpointType.VERIFIKATION,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  title: "Medizinischer Checkpoint",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

const k10Checkpoint: ActiveCheckpoint = {
  id: "K10",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  perspectives: [],
  category: CheckpointCategory.O,
  mode: CheckpointMode.MULTI_SELECT,
  title: "M1-Auswahl",
  options: ["Auswahl"],
  selections: ["Auswahl"],
  enabled: true,
};

describe("PATCH /api/cases/[id]/checkpoint/update", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({ caseSession: prismaMock.caseSession }),
    );
  });

  it("ändert den Status eines Checkpoints und persistiert active_checkpoints", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K-M",
        status: "OK",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-123" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-123" },
      data: {
        active_checkpoints: [{ ...mCheckpoint, status: "OK" }],
      },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
    expect(prismaMock.caseSession.update.mock.calls[0][0].data).not.toHaveProperty(
      "doctor_confirmed",
    );
  });

  it("erhält M1-Selektionen und Felder anderer Checkpoints beim Statusupdate", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint, k10Checkpoint],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K-M", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-123" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints).toEqual([
      { ...mCheckpoint, status: "OK" },
      k10Checkpoint,
    ]);
  });

  it("behält mehrere nacheinander gespeicherte Teilbewertungen im Snapshot", async () => {
    const secondCheckpoint: ActiveCheckpoint = {
      id: "K-O",
      block_id: "kommunikation",
      type: CheckpointType.PRESENCE_CHECK,
      perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
      title: "Organisatorischer Checkpoint",
      category: CheckpointCategory.O,
      status: "TO_DO",
      m4: { type: "NOTICE", text: "M4" },
    };
    let storedCheckpoints: ActiveCheckpoint[] = [mCheckpoint, secondCheckpoint];
    prismaMock.caseSession.findUnique.mockImplementation(async () => ({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: storedCheckpoints,
    }));
    prismaMock.caseSession.update.mockImplementation(async ({ data }) => {
      storedCheckpoints = data.active_checkpoints;
      return {};
    });

    for (const [checkpointId, status] of [["K-M", "OK"], ["K-O", "OK"]]) {
      const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
        method: "PATCH",
        body: JSON.stringify({ checkpoint_id: checkpointId, status }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PATCH(req, {
        params: Promise.resolve({ id: "case-123" }),
      });
      expect(response.status).toBe(200);
    }

    expect(storedCheckpoints).toEqual([
      { ...mCheckpoint, status: "OK" },
      { ...secondCheckpoint, status: "OK" },
    ]);
  });

  it("wiederholt einen fehlgeschlagenen serialisierbaren Schreibversuch", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
    });
    prismaMock.$transaction
      .mockRejectedValueOnce(Object.assign(new Error("serialization conflict"), { code: "P2034" }))
      .mockImplementationOnce((callback: (tx: unknown) => unknown) =>
        callback({ caseSession: prismaMock.caseSession }),
      );
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K-M", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: "case-123" }) });

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it("409 wenn der Fall ärztlich bestätigt ist (M3 eingefroren)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
      doctor_confirmed: true,
    });

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K-M", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-123" }),
    });

    expect(response.status).toBe(409);
    expect(prismaMock.caseSession.update).not.toHaveBeenCalled();
  });

  it("409 wenn clinical_status bereits confirmed ist", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
      doctor_confirmed: false,
      clinical_status: "confirmed",
    });

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K-M", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: "case-123" }) });

    expect(response.status).toBe(409);
    expect(prismaMock.caseSession.update).not.toHaveBeenCalled();
  });

  it("verwirft einen M3-Save mit veraltetem Clinical-Status nach Prefill-Reset", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
      doctor_confirmed: false,
      clinical_status: "prefill_changed:token-new",
    });

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K-M",
        status: "OK",
        expected_clinical_status: "prepared",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: "case-123" }) });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      clinical_status: "prefill_changed:token-new",
      prefill_reset: true,
    });
    expect(prismaMock.caseSession.update).not.toHaveBeenCalled();
  });

  it("akzeptiert M3-Saves aus dem aktuell geladenen Prefill-Änderungsstand", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      active_checkpoints: [mCheckpoint],
      doctor_confirmed: false,
      clinical_status: "prefill_changed:token-current",
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K-M",
        status: "OK",
        expected_clinical_status: "prefill_changed:token-current",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: "case-123" }) });

    expect(response.status).toBe(200);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-123" },
      data: {
        active_checkpoints: [{ ...mCheckpoint, status: "OK" }],
        clinical_status: "none",
      },
    });
  });

  it("behält Teilfortschritt über Saves und entfernt den Marker erst nach allen aktiven Bewertungen", async () => {
    const secondCheckpoint: ActiveCheckpoint = {
      id: "K-O",
      block_id: "kommunikation",
      type: CheckpointType.PRESENCE_CHECK,
      perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
      title: "Organisatorischer Checkpoint",
      category: CheckpointCategory.O,
      status: "TO_DO",
      m4: { type: "NOTICE", text: "M4" },
    };
    const stored = {
      id: "case-123",
      owner_account_id: "acc-test",
      doctor_confirmed: false,
      clinical_status: "prefill_changed:token-review",
      active_checkpoints: [mCheckpoint, secondCheckpoint],
    };
    prismaMock.caseSession.findUnique.mockImplementation(async () => stored);
    prismaMock.caseSession.update.mockImplementation(async ({ data }) => {
      Object.assign(stored, data);
      return {};
    });

    const sendStatus = async (checkpointId: string, expectedClinicalStatus: string) => {
      const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
        method: "PATCH",
        body: JSON.stringify({
          checkpoint_id: checkpointId,
          status: "OK",
          expected_clinical_status: expectedClinicalStatus,
        }),
        headers: { "Content-Type": "application/json" },
      });
      return PATCH(req, { params: Promise.resolve({ id: "case-123" }) });
    };

    const firstResponse = await sendStatus("K-M", stored.clinical_status);
    const firstBody = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstBody.review_complete).toBe(false);
    expect(stored.clinical_status).toContain(":reviewed:");
    expect(stored.clinical_status).toContain("K-M");

    const secondResponse = await sendStatus("K-O", stored.clinical_status);
    const secondBody = await secondResponse.json();
    expect(secondResponse.status).toBe(200);
    expect(secondBody).toMatchObject({ clinical_status: "none", review_complete: true });
    expect(stored.clinical_status).toBe("none");
  });

  it("stellt nach vollständiger Neubewertung den vorbereiteten Zustand wieder her", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
      owner_account_id: "acc-test",
      doctor_confirmed: false,
      clinical_status: "prefill_changed:prepared:token-prepared",
      active_checkpoints: [mCheckpoint, k10Checkpoint],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-123/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K-M",
        status: "TO_DO",
        expected_clinical_status: "prefill_changed:prepared:token-prepared",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: "case-123" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ clinical_status: "prepared", review_complete: true });
  });
});
