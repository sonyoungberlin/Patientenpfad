import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildPracticeConfirmationSlots } from "@/lib/questionnaire/confirmation";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { QuestionnaireRequestSection } from "@/app/inquiries/[id]/m3/InquiryM3Client";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskDirectPage() {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device) redirect("/questionnaire-kiosk/lock");
  const practice = await prisma.practice.findUnique({ where: { id: device.practiceId }, select: { questionnaire_confirmation_text_1: true, questionnaire_confirmation_text_2: true, questionnaire_confirmation_text_3: true } });
  return <main><p className="text-muted">{device.deviceName}</p><h1>Fragebogen starten</h1><QuestionnaireRequestSection practiceConfirmationSlots={buildPracticeConfirmationSlots(practice ?? {})} initialOpen mode="direct" createEndpoint="/api/questionnaire-kiosk/direct" /></main>;
}