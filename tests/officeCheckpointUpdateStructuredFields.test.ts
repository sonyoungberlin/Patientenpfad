import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/office-cases/[id]/checkpoint/update/route";
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
  return new NextRequest("http://localhost/api/office-cases/case-1/checkpoint/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/office-cases/[id]/checkpoint/update structured fields", () => {
  beforeEach(() => {
    prismaMock.officeCaseSession.findUnique.mockReset();
    prismaMock.officeCaseSession.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("persistiert neue strukturierte Felder im Checkpoint-Update", async () => {
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
      checkpoint_id: "RG-01",
      state: OfficeCheckpointState.YES,
      known_note: "Erledigt",
      deadline: "2026-06-15",
      responsible_role: "Praxismanager",
      authority: "Kammer",
      required_documents: ["Formblatt A"],
      escalation_needed: true,
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);

    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    const checkpoint = (updateArg?.data?.checkpoint_snapshot as {
      checkpoints?: Array<{
        state?: string;
        deadline?: string;
        responsible_role?: string;
        authority?: string;
        required_documents?: string[];
        escalation_needed?: boolean;
      }>;
    }).checkpoints?.[0];

    expect(checkpoint?.state).toBe(OfficeCheckpointState.YES);
    expect(checkpoint?.deadline).toBe("2026-06-15");
    expect(checkpoint?.responsible_role).toBe("Praxismanager");
    expect(checkpoint?.authority).toBe("Kammer");
    expect(checkpoint?.required_documents).toEqual(["Formblatt A"]);
    expect(checkpoint?.escalation_needed).toBe(true);
  });

  it("erlaubt OPEN ohne manuelle Freitextfelder", async () => {
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
      checkpoint_id: "RG-01",
      state: OfficeCheckpointState.OPEN,
      deadline: "2026-06-15",
      responsible_role: "Praxismanager",
      authority: "Kammer",
      required_documents: ["Formblatt A"],
      escalation_needed: true,
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(prismaMock.officeCaseSession.update).toHaveBeenCalled();
  });

  it("akzeptiert optionale legacy Freitextfelder bei OPEN weiterhin", async () => {
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
            missing_note: "Alt",
            answer_source: "Team",
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const res = await PATCH(makeRequest({
      checkpoint_id: "RG-01",
      state: OfficeCheckpointState.OPEN,
      missing_note: "Alt",
      answer_source: "Team",
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(res.status).toBe(200);
    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    const checkpoint = (updateArg?.data?.checkpoint_snapshot as {
      checkpoints?: Array<{
        missing_note?: string;
        answer_source?: string;
      }>;
    }).checkpoints?.[0];

    expect(checkpoint?.missing_note).toBe("Alt");
    expect(checkpoint?.answer_source).toBe("Team");
  });
});
