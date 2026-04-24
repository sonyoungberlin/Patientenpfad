/**
 * Testet, dass MULTI_SELECT-Auswahlen (K10/K11) aus dem Create-Payload
 * direkt beim Erzeugen in active_checkpoints gespeichert werden.
 */

import { NextRequest } from "next/server";
import { POST } from "@/app/api/cases/create/route";
import {
  CheckpointMode,
  isMultiSelectCheckpoint,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      create: jest.fn(),
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
  caseSession: { create: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const BASE_M1_SELECTION = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
  pflegebeobachtung: "unklar",
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/cases/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/cases/create – MULTI_SELECT-Payload", () => {
  beforeEach(() => {
    pm.caseSession.create.mockReset();
    pm.caseSession.create.mockResolvedValue({
      id: "case-new",
      stage_status: "INTAKE",
      mode: "guest",
      patient_reference: null,
    });
  });

  it("speichert K10 mit enabled=true und Auswahlen wenn im Payload übergeben", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
      multiSelectSelections: {
        K10: { enabled: true, selections: ["Multimedikation", "Neupatient / unbekannt"] },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    const k10 = savedCheckpoints.find((cp) => cp.id === "K10");
    expect(k10).toBeDefined();
    expect(isMultiSelectCheckpoint(k10!)).toBe(true);
    if (isMultiSelectCheckpoint(k10!)) {
      expect(k10.enabled).toBe(true);
      expect(k10.selections).toEqual(["Multimedikation", "Neupatient / unbekannt"]);
      expect(k10.mode).toBe(CheckpointMode.MULTI_SELECT);
    }
  });

  it("speichert K10 mit enabled=false und leeren Auswahlen wenn disabled übergeben", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
      multiSelectSelections: {
        K10: { enabled: false, selections: ["Multimedikation"] },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    const k10 = savedCheckpoints.find((cp) => cp.id === "K10");
    expect(k10).toBeDefined();
    if (isMultiSelectCheckpoint(k10!)) {
      expect(k10.enabled).toBe(false);
      // Selections werden geleert wenn enabled=false
      expect(k10.selections).toEqual([]);
    }
  });

  it("speichert K10 mit Default-Werten (enabled=false) wenn kein multiSelectSelections übergeben", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    const k10 = savedCheckpoints.find((cp) => cp.id === "K10");
    expect(k10).toBeDefined();
    if (isMultiSelectCheckpoint(k10!)) {
      expect(k10.enabled).toBe(false);
      expect(k10.selections).toEqual([]);
    }
  });

  it("Standard-Checkpoints bleiben unverändert", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
      multiSelectSelections: {
        K10: { enabled: true, selections: ["Multimedikation"] },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    const k03 = savedCheckpoints.find((cp) => cp.id === "K03");
    expect(k03).toBeDefined();
    expect(isMultiSelectCheckpoint(k03!)).toBe(false);
    if (!isMultiSelectCheckpoint(k03!)) {
      expect(k03.status).toBe("TO_DO");
    }
  });

  it("multiSelectSelections mit leerem Objekt ändert nichts (Default bleibt)", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
      multiSelectSelections: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    const k10 = savedCheckpoints.find((cp) => cp.id === "K10");
    expect(k10).toBeDefined();
    if (isMultiSelectCheckpoint(k10!)) {
      expect(k10.enabled).toBe(false);
      expect(k10.selections).toEqual([]);
    }
  });

  it("unbekannte IDs in multiSelectSelections werden ignoriert", async () => {
    const req = makeRequest({
      m1Selection: BASE_M1_SELECTION,
      multiSelectSelections: {
        K99: { enabled: true, selections: ["Foo"] },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const savedCheckpoints: ActiveCheckpoint[] =
      pm.caseSession.create.mock.calls[0][0].data.active_checkpoints;

    // K99 existiert nicht → keine Änderung; K10/K11 bleiben auf Default
    const k10 = savedCheckpoints.find((cp) => cp.id === "K10");
    if (isMultiSelectCheckpoint(k10!)) {
      expect(k10.enabled).toBe(false);
    }
  });
});
