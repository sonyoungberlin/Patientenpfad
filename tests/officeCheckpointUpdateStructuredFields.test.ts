import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/office-cases/[id]/checkpoint/update/route";
import {
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_REGRESS,
} from "@/lib/office/checkpointCatalog";
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
  arbeitsprozesse_enabled: false,
  current_practice: {
    id: "p-1",
    is_approved: true,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    office_cases_enabled: true,
  },
  memberships: [{ practice_id: "p-1", role: "OWNER" as const }],
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
      owner_practice_id: "p-1",
      internal_saved_at: null,
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

    // internal_saved_at wird beim ersten Speichern gesetzt
    expect(updateArg?.data?.internal_saved_at).toBeInstanceOf(Date);
  });

  it("überschreibt vorhandenes internal_saved_at nicht", async () => {
    const existingDate = new Date("2026-05-10T08:00:00.000Z");
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: existingDate,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [
          {
            id: "RG-01",
            title: "Anlass dokumentiert",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.YES,
            known_note: "",
            missing_note: "",
            answer_source: "",
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    await PATCH(makeRequest({
      checkpoint_id: "RG-01",
      state: OfficeCheckpointState.YES,
    }), { params: Promise.resolve({ id: "case-1" }) });

    const updateArg = prismaMock.officeCaseSession.update.mock.calls[0]?.[0];
    expect(updateArg?.data?.internal_saved_at).toEqual(existingDate);
  });

  it("erlaubt OPEN ohne manuelle Freitextfelder", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: null,
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
      owner_practice_id: "p-1",
      internal_saved_at: null,
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

  it("erlaubt NOT_REQUIRED nur auf freigegebenen Prüfpunkten, verlangt einen Grund und erhält Snapshot-Felder", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    const finalReview = {
      decision: "APPROVED",
      reviewer_account_id: "acc-1",
      reviewed_revision: 4,
    };
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
        templateVersion: 2,
        decisionRevision: 4,
        planned_start_date: "2027-01-15",
        final_review: finalReview,
          final_review_history: [finalReview],
        checkpoints: [
          {
            id: "NC-ZUSATZQUALIFIKATIONEN",
            title: "Zusatzqualifikationen",
            kind: OfficeCheckpointKind.FACT,
            state: OfficeCheckpointState.OPEN,
          },
        ],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const response = await PATCH(makeRequest({
      checkpoint_id: "NC-ZUSATZQUALIFIKATIONEN",
      state: OfficeCheckpointState.NOT_REQUIRED,
      not_required_reason: "Für den geplanten Tätigkeitsumfang nicht einschlägig.",
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(200);
    const savedSnapshot = prismaMock.officeCaseSession.update.mock.calls[0]?.[0]
      .data?.checkpoint_snapshot as Record<string, unknown>;
    expect(savedSnapshot.templateVersion).toBe(2);
    expect(savedSnapshot.planned_start_date).toBe("2027-01-15");
    expect(savedSnapshot.final_review).toEqual(finalReview);
    expect(savedSnapshot.final_review_history).toEqual([finalReview]);
    expect(savedSnapshot.decisionRevision).toBe(5);
    expect((savedSnapshot.checkpoints as Array<Record<string, unknown>>)[0]?.not_required_reason)
      .toBe("Für den geplanten Tätigkeitsumfang nicht einschlägig.");
  });

  it("weist NOT_REQUIRED für einen nicht ausdrücklich freigegebenen Prüfpunkt zurück", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: null,
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

    const response = await PATCH(makeRequest({
      checkpoint_id: "NC-APPROBATION",
      state: OfficeCheckpointState.NOT_REQUIRED,
      not_required_reason: "Fehlt.",
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(400);
    expect(prismaMock.officeCaseSession.update).not.toHaveBeenCalled();
  });

  it("speichert Falldatum und begründetes Nicht-erforderlich in MFA-V2 samt erneuter Prüfungsrevision", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    const finalReview = { decision: "APPROVED", reviewed_revision: 2 };
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_MFA_HIRING,
        templateVersion: 2,
        decisionRevision: 2,
        planned_event_date: "",
        final_review: finalReview,
        final_review_history: [finalReview],
        checkpoints: [{
          id: "MF-08",
          title: "Einsatzbezogene Versicherungsfragen geprüft",
          kind: OfficeCheckpointKind.ASSESSMENT,
          state: OfficeCheckpointState.OPEN,
          not_required_allowed: true,
        }],
      },
    });
    prismaMock.officeCaseSession.update.mockResolvedValue({ id: "case-1" });

    const response = await PATCH(makeRequest({
      checkpoint_id: "MF-08",
      state: OfficeCheckpointState.NOT_REQUIRED,
      not_required_reason: "Nach fallbezogener Prüfung nicht einschlägig.",
      planned_event_date: "2027-03-01",
      responsible_role: "Praxisleitung",
      deadline: "2027-02-01",
      deadline_kind: "INTERNAL_CONTROL",
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(200);
    const saved = prismaMock.officeCaseSession.update.mock.calls[0]?.[0]
      .data?.checkpoint_snapshot as Record<string, unknown>;
    expect(saved.planned_event_date).toBe("2027-03-01");
    expect(saved.decisionRevision).toBe(3);
    expect(saved.final_review).toEqual(finalReview);
    const checkpoint = (saved.checkpoints as Array<Record<string, unknown>>)[0];
    expect(checkpoint).toMatchObject({
      state: OfficeCheckpointState.NOT_REQUIRED,
      not_required_reason: "Nach fallbezogener Prüfung nicht einschlägig.",
      responsible_role: "Praxisleitung",
      deadline: "2027-02-01",
      deadline_kind: "INTERNAL_CONTROL",
    });
  });

  it("verbietet Notizen zu status-only Personalpunkten in den neuen V2-Themen", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT);
    prismaMock.officeCaseSession.findUnique.mockResolvedValue({
      id: "case-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      internal_saved_at: null,
      checkpoint_snapshot: {
        topicId: OFFICE_TOPIC_MFA_HIRING,
        templateVersion: 2,
        checkpoints: [{
          id: "MF-03",
          title: "Personalunterlagen vorbereitet",
          kind: OfficeCheckpointKind.DEPENDENCY,
          state: OfficeCheckpointState.OPEN,
        }],
      },
    });

    const response = await PATCH(makeRequest({
      checkpoint_id: "MF-03",
      state: OfficeCheckpointState.YES,
      known_note: "IBAN 12345678901234567890",
    }), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(400);
    expect(prismaMock.officeCaseSession.update).not.toHaveBeenCalled();
  });
});
