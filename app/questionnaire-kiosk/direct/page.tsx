import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildPracticeConfirmationSlots } from "@/lib/questionnaire/confirmation";
import {
  getQuestionnaireKioskAccessFromCookies,
  hasQuestionnaireKioskCapability,
} from "@/lib/questionnaireKiosk/auth";
import { KioskQuestionnaireStart } from "./KioskQuestionnaireStart";
import { KioskAccountLogout } from "@/components/questionnaireKiosk/KioskAccountLogout";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskDirectPage() {
  const access = await getQuestionnaireKioskAccessFromCookies(true);
  if (!access || !hasQuestionnaireKioskCapability(access, "questionnaires")) redirect("/questionnaire-kiosk/lock");
  const practice = await prisma.practice.findUnique({ where: { id: access.practiceId }, select: { questionnaire_confirmation_text_1: true, questionnaire_confirmation_text_2: true, questionnaire_confirmation_text_3: true } });
  return <main className="questionnaire-kiosk-page">{access.kind === "account" ? <KioskAccountLogout /> : <p className="text-muted">{access.deviceName}</p>}<h1>Fragebogen starten</h1><KioskQuestionnaireStart practiceConfirmationSlots={buildPracticeConfirmationSlots(practice ?? {})} /></main>;
}