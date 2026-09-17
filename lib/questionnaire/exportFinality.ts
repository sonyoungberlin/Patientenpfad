import type { Prisma } from "@prisma/client";

export const QUESTIONNAIRE_EXPORT_FINALITY_FILTER = {
  status: "completed",
  OR: [
    {
      kiosk_handoff_status: null,
      public_check_in_handoff: { is: null },
    },
    { kiosk_handoff_status: "closed" },
    {
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: { is: { status: "completed" } },
    },
    { public_check_in_handoff: { is: { status: "closed" } } },
    {
      public_check_in_handoff: {
        is: {
          status: "questionnaire_ready",
          follow_up_session: { is: { status: "completed" } },
        },
      },
    },
  ],
} satisfies Prisma.PatientQuestionnaireSessionWhereInput;

export function isQuestionnaireExportFinal(session: {
  status: string;
  kiosk_handoff_status?: string | null;
  kiosk_follow_up_session?: { status: string } | null;
  public_check_in_handoff?: {
    status: string;
    follow_up_session: { status: string } | null;
  } | null;
}): boolean {
  if (session.status !== "completed") return false;
  const kioskHandoffStatus = session.kiosk_handoff_status ?? null;
  if (kioskHandoffStatus === "closed") return true;
  if (kioskHandoffStatus === "questionnaire_ready") {
    return session.kiosk_follow_up_session?.status === "completed";
  }
  if (kioskHandoffStatus !== null) return false;

  const publicHandoff = session.public_check_in_handoff ?? null;
  if (!publicHandoff) return true;
  if (publicHandoff.status === "closed") return true;
  return publicHandoff.status === "questionnaire_ready" &&
    publicHandoff.follow_up_session?.status === "completed";
}