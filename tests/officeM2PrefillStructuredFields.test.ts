import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/office-cases/[id]/m2/prefill/route";
import { OFFICE_TOPIC_REGRESS } from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    officeCaseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  officeCaseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const ACCOUNT = {
  id: "acc-1",
  email: "office@example.com",
  is_approved: true,
  is_admin: false,
  office_cases_enabled: true,
  current_practice: null,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/office-cases/case-1/m2/prefill", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/office-cases/[id]/m2/prefill structured fields", () => {
  beforeEach(() => {
    prismaMock.officeCaseSession.findUnique.mockReset();
    prismaMock.officeCaseSession.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("persistiert neue strukturierte Felder pro Checkpoint", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [
          {
            id: "RG-01",
            title: "Anlass dokumentiert",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.OPEN,
            known_note: "",
            missing_note: "",
            answer_source: "",
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const res = await PATCH(makeRequest({
      checkpoints: [
        {
          id: "RG-01",
          deadline: "2026-06-01",
          responsible_role: "Praxisleitung",
          authority: "KV Berlin",
          required_documents: ["Anschreiben", "Nachweis"],
          escalation_needed: true,
        },
      ],
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);
    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    const snapshot = updateArg?.data?.checkpoint_snapshot as {
      checkpoints?: Array<{
        deadline?: string;
        responsible_role?: string;
        authority?: string;
        required_documents?: string[];
        escalation_needed?: boolean;
      }>;
    };

    const checkpoint = snapshot.checkpoints?.[0];
    expect(checkpoint?.deadline).toBe("2026-06-01");
    expect(checkpoint?.responsible_role).toBe("Praxisleitung");
    expect(checkpoint?.authority).toBe("KV Berlin");
    expect(checkpoint?.required_documents).toEqual(["Anschreiben", "Nachweis"]);
    expect(checkpoint?.escalation_needed).toBe(true);
  });

  it("bleibt rueckwaertskompatibel bei alten Snapshots ohne neue Felder", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [
          {
            id: "RG-01",
            title: "Anlass dokumentiert",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.OPEN,
            known_note: "Alt",
            missing_note: "Fehlt",
            answer_source: "Team",
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const res = await PATCH(makeRequest({
      checkpoints: [
        {
          id: "RG-01",
          known_note: "Neu",
        },
      ],
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);
    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    const checkpoint = (updateArg?.data?.checkpoint_snapshot as {
      checkpoints?: Array<{ id?: string; known_note?: string }>;
    }).checkpoints?.[0];

    expect(checkpoint?.id).toBe("RG-01");
    expect(checkpoint?.known_note).toBe("Neu");
  });

  it("persistiert m2_answers pro Checkpoint", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [
          {
            id: "RG-01",
            title: "Anlass dokumentiert",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.OPEN,
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const res = await PATCH(makeRequest({
      checkpoints: [
        {
          id: "RG-01",
          m2_answers: { "M2-01": "YES", "M2-02": "UNCLEAR" },
        },
      ],
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);
    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    const checkpoint = (updateArg?.data?.checkpoint_snapshot as {
      checkpoints?: Array<{ id?: string; m2_answers?: Record<string, string> }>;
    }).checkpoints?.[0];

    expect(checkpoint?.id).toBe("RG-01");
    expect(checkpoint?.m2_answers?.["M2-01"]).toBe("YES");
    expect(checkpoint?.m2_answers?.["M2-02"]).toBe("UNCLEAR");
  });

  it("lehnt ungueltige m2_answers ab", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [
          {
            id: "RG-01",
            title: "Anlass dokumentiert",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.OPEN,
          },
        ],
      },
    });

    const res = await PATCH(makeRequest({
      checkpoints: [
        {
          id: "RG-01",
          m2_answers: { "M2-01": "MAYBE" },
        },
      ],
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(400);
  });
});
