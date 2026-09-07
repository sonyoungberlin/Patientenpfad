import { redirect } from "next/navigation";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { KioskUnlockForm } from "../KioskActions";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskLockPage() {
  const device = await getQuestionnaireKioskDeviceFromCookies();
  if (!device) redirect("/api/questionnaire-kiosk-recovery");
  return <main><p className="text-muted">{device.deviceName}</p><h1>Praxis-Fragebogen</h1><KioskUnlockForm /></main>;
}