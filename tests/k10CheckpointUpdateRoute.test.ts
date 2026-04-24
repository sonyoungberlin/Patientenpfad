import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/checkpoint/update/route";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
  type StandardCheckpoint,
} from "@/lib/types";

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

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const k10: ActiveCheckpointMultiSelect = {
  id: "K10",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Besonderer Versorgungsaufwand",
  options: [
    "Neupatient / unbekannt",
    "Multimedikation",
    "postoperative / akute Nachsorge",
    "erhöhter Betreuungsbedarf",
    "eingeschränkte Kommunikation",
  ],
  selections: [],
  enabled: false,
};

const stdCheckpoint: ActiveCheckpoint = {
  id: "K03",
  block_id: "medizinische_lage",
  type: CheckpointType.NACHWEIS,
  category: CheckpointCategory.M,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  status: "TO_DO",
  title: "Diagnosenlage",
  m4: { type: "ACTION", text: "Bitte Befunde mitbringen." },
};

// K12 as it appears after hydrateActiveCheckpointsFromSnapshot (always-present, enabled=false)
const k12Assessment: StandardCheckpoint = {
  id: "K12",
  block_id: "pflegebeobachtung",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.M,
  perspectives: [],
  mode: CheckpointMode.ASSESSMENT,
  enabled: false,
  status: "TO_DO",
  title: "Alltagssituation – Rückmeldung Kontaktperson",
  m4: { type: "NOTICE", text: "" },
};

describe("PATCH /api/cases/[id]/checkpoint/update – MULTI_SELECT (K10)", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
  });

  it("aktiviert K10 mit enabled=true und leerer Auswahl", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k10],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K10",
        enabled: true,
        selections: [],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK10 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K10") as ActiveCheckpointMultiSelect;
    expect(updatedK10.enabled).toBe(true);
    expect(updatedK10.selections).toEqual([]);
  });

  it("setzt Auswahl für K10", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, { ...k10, enabled: true }],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K10",
        enabled: true,
        selections: ["Multimedikation", "erhöhter Betreuungsbedarf"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK10 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K10") as ActiveCheckpointMultiSelect;
    expect(updatedK10.enabled).toBe(true);
    expect(updatedK10.selections).toEqual(["Multimedikation", "erhöhter Betreuungsbedarf"]);
  });

  it("deaktiviert K10 → selections werden geleert", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-test",
      active_checkpoints: [
        stdCheckpoint,
        { ...k10, enabled: true, selections: ["Multimedikation"] },
      ],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K10",
        enabled: false,
        selections: [],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK10 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K10") as ActiveCheckpointMultiSelect;
    expect(updatedK10.enabled).toBe(false);
    expect(updatedK10.selections).toEqual([]);
  });

  it("weist Multi-Select-Update auf Standard-Checkpoint ab", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k10],
    });

    const req = new NextRequest("http://localhost/api/cases/case-1/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K03",
        enabled: true,
        selections: [],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe("Checkpoint is not a multi-select type");
  });

  it("Standard-Checkpoint-Update funktioniert weiterhin neben K10", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k10],
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-1/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K03",
        status: "OK",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK03 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K03");
    expect((updatedK03 as { status: string }).status).toBe("OK");
    // K10 remains unchanged
    const updatedK10 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K10") as ActiveCheckpointMultiSelect;
    expect(updatedK10.enabled).toBe(false);
    expect(updatedK10.selections).toEqual([]);
  });
});

describe("PATCH /api/cases/[id]/checkpoint/update – ASSESSMENT (K12)", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
  });

  it("aktiviert K12 mit enabled=true", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-2",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k10, k12Assessment],
      doctor_confirmed: false,
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-2/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K12",
        enabled: true,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-2" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK12 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K12");
    expect((updatedK12 as { enabled: boolean }).enabled).toBe(true);
  });

  it("deaktiviert K12 mit enabled=false", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-2",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k10, { ...k12Assessment, enabled: true }],
      doctor_confirmed: false,
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-2/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({
        checkpoint_id: "K12",
        enabled: false,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-2" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK12 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K12");
    expect((updatedK12 as { enabled: boolean }).enabled).toBe(false);
  });

  it("K12-Update setzt kein status-Feld zurück (status bleibt TO_DO)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-2",
      owner_account_id: "acc-test",
      active_checkpoints: [k12Assessment],
      doctor_confirmed: false,
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/cases/case-2/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K12", enabled: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-2" }) });
    expect(response.status).toBe(200);

    const updatedCheckpoints = prismaMock.caseSession.update.mock.calls[0][0].data.active_checkpoints;
    const updatedK12 = updatedCheckpoints.find((c: ActiveCheckpoint) => c.id === "K12");
    expect((updatedK12 as { status: string }).status).toBe("TO_DO");
  });

  it("enabled-Update auf normalen Standard-Checkpoint (K03) gibt 400 zurück", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-2",
      owner_account_id: "acc-test",
      active_checkpoints: [stdCheckpoint, k12Assessment],
      doctor_confirmed: false,
    });

    const req = new NextRequest("http://localhost/api/cases/case-2/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "K03", enabled: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: "case-2" }) });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Checkpoint is not a multi-select type");
  });
});
