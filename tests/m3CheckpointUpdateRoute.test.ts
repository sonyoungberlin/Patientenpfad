import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/checkpoint/update/route";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const mCheckpoint: ActiveCheckpoint = {
  id: "K-M",
  block_id: "diagnosis_status",
  type: CheckpointType.VERIFIKATION,
  relevance: CheckpointRelevance.P,
  title: "Medizinischer Checkpoint",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

describe("PATCH /api/cases/[id]/checkpoint/update", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
  });

  it("ändert den Status eines Checkpoints und persistiert active_checkpoints", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-123",
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
  });
});
