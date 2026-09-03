import { prisma } from "@/lib/prisma";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";
import { sendViaSmtp } from "@/lib/mail/smtpTransport";
import { PATIENT_COPY_EMAIL_ID } from "@/lib/questionnaire/confirmation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPatientCopyEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export async function sendPatientQuestionnaireCopyIfRequired(sessionId: string): Promise<void> {
  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true, patient_reference: true, submitted_at: true, submitted_by: true,
      selected_block_ids: true, deduplicated_questions: true, answers: true,
      source: true, frozen_blocks: true, patient_copy_email: true, patient_copy_return_email: true,
      patient_copy_sent_at: true, owner_practice_id: true,
      practice_form: { select: { title: true } },
    },
  });
  if (!session || session.patient_copy_sent_at || !session.patient_copy_email) return;

  const blocks = parseFrozenBlocks(session.frozen_blocks);
  const copyRequired = !!blocks?.some((block) =>
    block.questions.some((question) => question.type === "confirmation" && question.send_patient_copy === true),
  );
  if (!copyRequired || !isValidPatientCopyEmail(session.patient_copy_email) || !session.patient_copy_return_email) return;
  if (!session.owner_practice_id) return;

  try {
    const smtp = await loadPracticeSmtpConfig(session.owner_practice_id);
    if (!smtp) throw new Error("practice smtp unavailable");
    const answers = (session.answers ?? {}) as Record<string, string>;
    const confirmed = blocks?.flatMap((block) => block.questions)
      .filter((question) => question.type === "confirmation" && question.send_patient_copy === true)
      .every((question) => answers[question.id] === "true");
    if (!confirmed) return;
    const { bytes, filename } = await buildQuestionnairePdfBytes(session, {
      title: "Ihre Unterlagen für die Praxis",
      referenceLabel: "Patientenreferenz",
      blockCatalog: BLOCK_CATALOG,
      patientCopy: { returnEmail: session.patient_copy_return_email },
    });
    await sendViaSmtp(smtp, {
      to: session.patient_copy_email,
      subject: "Ihre Unterlagen für die Praxis",
      text: `Anbei erhalten Sie eine Kopie Ihrer Angaben.\n\nBitte unterschreiben Sie das Dokument an der vorgesehenen Stelle und senden Sie es an ${session.patient_copy_return_email} zurück oder bringen Sie es zu Ihrem Termin mit.`,
      attachments: [{ filename, content: Buffer.from(bytes), contentType: "application/pdf" }],
    });
    await prisma.patientQuestionnaireSession.update({
      where: { id: session.id, patient_copy_sent_at: null },
      data: { patient_copy_sent_at: new Date(), patient_copy_failed_at: null },
    });
  } catch (error) {
    console.error("[patient-copy] send_failed", {
      sessionId: session.id,
      practiceId: session.owner_practice_id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await prisma.patientQuestionnaireSession.update({
      where: { id: session.id },
      data: { patient_copy_failed_at: new Date() },
    });
  }
}