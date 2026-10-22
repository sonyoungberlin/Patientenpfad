import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/office-cases/[id]/final-review/route";
import { OFFICE_TOPIC_HIRING_REPLACEMENT } from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";
import { isFinalReviewOutdated } from "@/lib/office/finalReview";

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

const prismaMock = prisma as unknown as {
  officeCaseSession: { findUnique: jest.Mock; update: jest.Mock };
};
const getSessionAccountMock = getSessionAccount as jest.Mock;

function account(role: "OWNER" | "ADMIN" | "USER" = "OWNER") {
  return {
    id: "account-1",
    email: "leitung@example.com",
    is_approved: true,
    is_admin: false,
    office_cases_enabled: true,
    current_practice: {
      id: "practice-1",
      is_approved: true,
      office_cases_enabled: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
      arbeitsprozesse_enabled: false,
    },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/office-cases/case-1/final-review", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/office-cases/[id]/final-review", () => {
  beforeEach(() => {
    prismaMock.officeCaseSession.findUnique.mockReset();
    prismaMock.officeCaseSession.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  describe("Office final review validity", () => {
    it("zeigt nach Änderungen entscheidungsrelevanter Revisionen eine erneute Prüfung an", () => {
      expect(isFinalReviewOutdated({ decision: "APPROVED", reviewed_revision: 4 }, 5)).toBe(true);
      expect(isFinalReviewOutdated({ decision: "APPROVED", reviewed_revision: 5 }, 5)).toBe(false);
      expect(isFinalReviewOutdated({ decision: "NOT_APPROVED", reviewed_revision: 4 }, 5)).toBe(false);
    });
  });

  it("speichert die manuelle Freigabe samt Person, Rolle, Datum und geprüfter Revision", async () => {
    getSessionAccountMock.mockResolvedValue(account("OWNER"));
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      internal_saved_at: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
        templateVersion: 2,
        decisionRevision: 7,
        planned_start_date: "2027-02-01",
        checkpoints: [{
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.YES,
        }],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const response = await PATCH(request({ decision: "APPROVED", note: "Voraussetzungen geprüft." }), {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(200);
    const saved = prismaMock.officeCaseSession.update.mock.calls[0]?.[0]
      .data?.checkpoint_snapshot as Record<string, unknown>;
    expect(saved.planned_start_date).toBe("2027-02-01");
    expect(saved.decisionRevision).toBe(7);
    expect(saved.final_review).toMatchObject({
      decision: "APPROVED",
      reviewer_account_id: "account-1",
      reviewer_email: "leitung@example.com",
      reviewer_role: "OWNER",
      reviewed_revision: 7,
    });
    expect(saved.final_review_history).toEqual([saved.final_review]);
    expect(typeof (saved.final_review as Record<string, unknown>).reviewed_at).toBe("string");
  });

  it("verlangt eine dokumentierte Einordnung offener Punkte und lehnt andere Rollen ab", async () => {
    getSessionAccountMock.mockResolvedValue(account("OWNER"));
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
        templateVersion: 2,
        checkpoints: [{
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
        }],
      },
    });

    const unresolved = await PATCH(request({ decision: "APPROVED" }), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(unresolved.status).toBe(400);
    expect(prismaMock.officeCaseSession.update).not.toHaveBeenCalled();

    getSessionAccountMock.mockResolvedValue(account("USER"));
    const forbidden = await PATCH(request({ decision: "APPROVED", note: "geprüft" }), {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(forbidden.status).toBe(403);
    expect(prismaMock.officeCaseSession.update).not.toHaveBeenCalled();
  });
});
