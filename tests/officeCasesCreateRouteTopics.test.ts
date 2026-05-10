import { NextRequest } from "next/server";
import { POST } from "@/app/api/office-cases/create/route";
import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_SEAT_APPROVAL,
} from "@/lib/office/checkpointCatalog";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    officeCaseSession: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  officeCaseSession: { create: jest.Mock };
};

const prismaMock = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const APPROVED_ACCOUNT = {
  id: "acc-1",
  email: "office@example.com",
  is_approved: true,
  is_admin: false,
  office_cases_enabled: true,
  current_practice: null,
};

const NEW_TOPIC_IDS = [
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_SEAT_APPROVAL,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_REPORTING_DUTIES,
] as const;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/office-cases/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/office-cases/create topic validation", () => {
  beforeEach(() => {
    prismaMock.officeCaseSession.create.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("akzeptiert neue topicIds und erstellt serverseitig einen Snapshot", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    for (const topicId of NEW_TOPIC_IDS) {
      prismaMock.officeCaseSession.create.mockResolvedValueOnce({
        id: `office-${topicId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: "Titel",
        trigger_note: "Notiz",
        owner_account_id: "acc-1",
        owner_practice_id: null,
        checkpoint_snapshot: {},
      });

      const res = await POST(
        makeRequest({
          topicId,
          title: "Titel",
          trigger_note: "Notiz",
        }),
      );

      expect(res.status).toBe(201);
      const createArg = prismaMock.officeCaseSession.create.mock.calls.at(-1)?.[0];
      const snapshot = createArg?.data?.checkpoint_snapshot as {
        topicId?: string;
        checkpoints?: Array<{
          checkpointType?: unknown;
          failureEffect?: unknown;
          outcomeAudience?: unknown;
          kind?: unknown;
          office_kind?: unknown;
          deadline?: unknown;
          responsible_role?: unknown;
          authority?: unknown;
          required_documents?: unknown;
          escalation_needed?: unknown;
        }>;
      };

      expect(snapshot.topicId).toBe(topicId);
      expect(Array.isArray(snapshot.checkpoints)).toBe(true);
      expect((snapshot.checkpoints ?? []).length).toBeGreaterThanOrEqual(5);

      const firstCheckpoint = snapshot.checkpoints?.[0];
      // Technische Additiv-Pruefung: diese Assertions validieren keine finale fachliche Typisierung.
      expect(firstCheckpoint?.checkpointType).toBeDefined();
      expect(firstCheckpoint?.failureEffect).toBeDefined();
      expect(Array.isArray(firstCheckpoint?.outcomeAudience)).toBe(true);
      expect((firstCheckpoint?.outcomeAudience as unknown[] | undefined)?.length).toBeGreaterThan(0);

      // Legacy-Felder bleiben additiv erhalten.
      expect(firstCheckpoint?.kind).toBeDefined();
      expect(firstCheckpoint?.deadline).toBe("");
      expect(firstCheckpoint?.responsible_role).toBe("");
      expect(firstCheckpoint?.authority).toBe("");
      expect(firstCheckpoint?.required_documents).toEqual([]);
      expect(firstCheckpoint?.escalation_needed).toBe(false);
    }
  });

  it("lehnt ungueltige topicIds weiterhin mit 400 ab", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const res = await POST(
      makeRequest({
        topicId: "ungueltig-office-topic",
        title: "Titel",
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Ungültige topicId.");
    expect(prismaMock.officeCaseSession.create).not.toHaveBeenCalled();
  });
});
