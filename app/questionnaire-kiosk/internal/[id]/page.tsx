import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuestionnaireKioskDeviceFromCookies, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import { getInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";
import { isNewBlockBasedInternalSession } from "@/lib/questionnaire/documentedContent";
import { parseConditionalRules } from "@/lib/questionnaire/conditionalLogic";

export const dynamic = "force-dynamic";

export default async function InternalDocumentationPage({ params }: { params: Promise<{ id: string }> }) {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device || !hasQuestionnaireKioskCapability(device, "internal_documentation")) redirect("/questionnaire-kiosk/lock");
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findUnique({ where: { id }, select: { status: true, session_kind: true, internal_workflow_id: true, owner_practice_id: true, created_by_kiosk_device_id: true, frozen_blocks: true, frozen_conditional_rules: true, patient_reference: true } });
  if (!session || session.status !== "pending" || session.session_kind !== "internal_documentation" || session.owner_practice_id !== device.practiceId || session.created_by_kiosk_device_id !== device.deviceId) notFound();
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];
  const conditionalRules = parseConditionalRules(session.frozen_conditional_rules);
  const isNewBlockBased = isNewBlockBasedInternalSession({
    sessionKind: session.session_kind,
    internalWorkflowId: session.internal_workflow_id,
    frozenBlocks,
  });
  const workflow = isNewBlockBased ? null : getInternalWorkflow(session.internal_workflow_id);
  if (!isNewBlockBased && !workflow) notFound();
  return <main className="questionnaire-kiosk-page"><h1>{isNewBlockBased ? "Interne Dokumentation" : workflow!.title}</h1><p className="text-muted">Patientenreferenz: {session.patient_reference}</p><QuestionnaireFormClient token={id} submitEndpoint={`/api/questionnaire-kiosk/internal/${id}`} questions={questions} conditionalRules={conditionalRules} frozenBlocks={frozenBlocks} context="patient" source="kiosk_direct" introText="Interne Dokumentation für die Praxis." patientReference={session.patient_reference} kioskRestartPath="/questionnaire-kiosk/internal" internalWorkflowId={workflow?.id ?? null} /></main>;
}