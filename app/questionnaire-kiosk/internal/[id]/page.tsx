import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuestionnaireKioskDeviceFromCookies, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";

export const dynamic = "force-dynamic";

export default async function InternalDocumentationPage({ params }: { params: Promise<{ id: string }> }) {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device || !hasQuestionnaireKioskCapability(device, "internal_documentation")) redirect("/questionnaire-kiosk/lock");
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findUnique({ where: { id }, select: { status: true, session_kind: true, owner_practice_id: true, created_by_kiosk_device_id: true, frozen_blocks: true, patient_reference: true } });
  if (!session || session.status !== "pending" || session.session_kind !== "internal_documentation" || session.owner_practice_id !== device.practiceId || session.created_by_kiosk_device_id !== device.deviceId) notFound();
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];
  return <main><h1>Persönlicher Versorgungsplan</h1><p className="text-muted">Patientenreferenz: {session.patient_reference}</p><QuestionnaireFormClient token={id} submitEndpoint={`/api/questionnaire-kiosk/internal/${id}`} questions={questions} frozenBlocks={frozenBlocks} context="patient" source="kiosk_direct" introText="Interne Dokumentation für die Praxis." patientReference={session.patient_reference} kioskRestartPath="/questionnaire-kiosk/internal" /></main>;
}