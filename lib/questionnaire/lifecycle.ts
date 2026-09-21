import type { Prisma } from "@prisma/client";

export const QUESTIONNAIRE_SUBMITTED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const QUESTIONNAIRE_TRASH_RETENTION_MS = 48 * 60 * 60 * 1000;

export function questionnaireSubmittedCutoff(now: Date): Date {
  return new Date(now.getTime() - QUESTIONNAIRE_SUBMITTED_RETENTION_MS);
}

export function questionnaireTrashCutoff(now: Date): Date {
  return new Date(now.getTime() - QUESTIONNAIRE_TRASH_RETENTION_MS);
}

export function activeQuestionnaireLifecycleFilter(
  now: Date,
): Prisma.PatientQuestionnaireSessionWhereInput {
  return {
    OR: [
      {
        session_kind: { not: "patient_communication" },
      },
      {
        session_kind: "patient_communication",
        OR: [
          {
            status: "pending",
            token_expires_at: { gt: now },
          },
          {
            status: "completed",
            submitted_at: { gt: questionnaireSubmittedCutoff(now) },
          },
        ],
      },
    ],
  };
}

export const activeQuestionnaireInboxHandoffFilter: Prisma.PatientQuestionnaireSessionWhereInput = {
  AND: [
    {
      OR: [
        { kiosk_handoff_status: null },
        { kiosk_handoff_status: { notIn: ["closed", "questionnaire_ready"] } },
      ],
    },
    {
      OR: [
        { public_check_in_handoff: { is: null } },
        { public_check_in_handoff: { is: { status: { notIn: ["closed", "questionnaire_ready"] } } } },
      ],
    },
  ],
};

export function trashQuestionnaireLifecycleFilter(
  now: Date,
): Prisma.PatientQuestionnaireSessionWhereInput {
  return {
    status: "completed",
    session_kind: "patient_communication",
    deleted_at: { gt: questionnaireTrashCutoff(now) },
  };
}

export function expiredPendingQuestionnaireFilter(
  now: Date,
): Prisma.PatientQuestionnaireSessionWhereInput {
  return {
    deleted_at: null,
    status: "pending",
    session_kind: "patient_communication",
    token: { not: null },
    token_expires_at: { lte: now },
  };
}

export function expiredCompletedQuestionnaireFilter(
  now: Date,
): Prisma.PatientQuestionnaireSessionWhereInput {
  return {
    deleted_at: null,
    status: "completed",
    session_kind: "patient_communication",
    submitted_at: { lte: questionnaireSubmittedCutoff(now) },
    NOT: { submitted_at: null },
  };
}

export function expiredTrashQuestionnaireFilter(
  now: Date,
): Prisma.PatientQuestionnaireSessionWhereInput {
  return {
    status: "completed",
    session_kind: "patient_communication",
    deleted_at: { lte: questionnaireTrashCutoff(now) },
  };
}