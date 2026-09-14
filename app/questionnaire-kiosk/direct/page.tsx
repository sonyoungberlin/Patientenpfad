import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildPracticeConfirmationSlots } from "@/lib/questionnaire/confirmation";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { KioskQuestionnaireStart } from "./KioskQuestionnaireStart";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskDirectPage() {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device) redirect("/questionnaire-kiosk/lock");
  const practice = await prisma.practice.findUnique({ where: { id: device.practiceId }, select: { questionnaire_confirmation_text_1: true, questionnaire_confirmation_text_2: true, questionnaire_confirmation_text_3: true } });
  return <main className="questionnaire-kiosk-page"><p className="text-muted">{device.deviceName}</p><h1>Fragebogen starten</h1><KioskQuestionnaireStart practiceConfirmationSlots={buildPracticeConfirmationSlots(practice ?? {})} /></main>;
}