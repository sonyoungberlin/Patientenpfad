import { Prisma } from "@prisma/client";

export type DigitalRequestAssignmentResult =
  | { ok: true }
  | { ok: false; status: 404 | 409; error: string };

export const DIGITAL_REQUEST_TERMINAL_STATUSES = new Set([
  "sent",
  "closed",
  "rejected",
]);

export class DigitalRequestAssignmentConflictError extends Error {}

export async function assignDigitalRequestAndLinkedSession(
  tx: Prisma.TransactionClient,
  input: {
    digitalRequestId: string;
    patientReference: string;
    data: Prisma.DigitalRequestUpdateInput;
    requestedStatus?: string;
  },
): Promise<DigitalRequestAssignmentResult> {
  const current = await tx.digitalRequest.findFirst({
    where: {
      id: input.digitalRequestId,
      deleted_at: null,
      request_type: "patient",
    },
    select: {
      status: true,
      patient_reference: true,
      questionnaire_session_id: true,
    },
  });

  if (!current) {
    return { ok: false, status: 404, error: "Anfrage nicht gefunden." };
  }

  if (
    current.patient_reference &&
    current.patient_reference !== input.patientReference
  ) {
    return {
      ok: false,
      status: 409,
      error: "Die Anfrage ist bereits einer anderen Patientennummer zugeordnet.",
    };
  }

  const session = current.questionnaire_session_id
    ? await tx.patientQuestionnaireSession.findUnique({
        where: { id: current.questionnaire_session_id },
        select: { patient_reference: true },
      })
    : null;

  if (
    session?.patient_reference &&
    session.patient_reference !== input.patientReference
  ) {
    return {
      ok: false,
      status: 409,
      error: "Der verknüpfte Fragebogen ist bereits einer anderen Patientennummer zugeordnet.",
    };
  }

  const transactionalData: Prisma.DigitalRequestUpdateInput = {
    ...input.data,
    patient_reference: input.patientReference,
  };
  if (input.requestedStatus === "in_review") {
    if (DIGITAL_REQUEST_TERMINAL_STATUSES.has(current.status)) {
      delete transactionalData.status;
    } else {
      transactionalData.status = "in_review";
    }
  }

  const requestUpdate = await tx.digitalRequest.updateMany({
    where: {
      id: input.digitalRequestId,
      deleted_at: null,
      request_type: "patient",
      status: current.status,
      questionnaire_session_id: current.questionnaire_session_id,
      OR: [
        { patient_reference: null },
        { patient_reference: input.patientReference },
      ],
    },
    data: transactionalData,
  });
  if (requestUpdate.count !== 1) {
    return {
      ok: false,
      status: 409,
      error: "Die Anfrage wurde zwischenzeitlich einer anderen Patientennummer zugeordnet.",
    };
  }

  if (session) {
    const sessionUpdate = await tx.patientQuestionnaireSession.updateMany({
      where: {
        id: current.questionnaire_session_id as string,
        OR: [
          { patient_reference: null },
          { patient_reference: input.patientReference },
        ],
      },
      data: { patient_reference: input.patientReference },
    });
    if (sessionUpdate.count !== 1) {
      throw new DigitalRequestAssignmentConflictError(
        "Der verknüpfte Fragebogen wurde zwischenzeitlich einer anderen Patientennummer zugeordnet.",
      );
    }
  }

  return { ok: true };
}