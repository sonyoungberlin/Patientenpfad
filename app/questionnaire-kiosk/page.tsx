import Link from "next/link";
import { redirect } from "next/navigation";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import { KioskLockButton } from "./KioskActions";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskPage() {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device) redirect("/questionnaire-kiosk/lock");
  const canQuestionnaires = hasQuestionnaireKioskCapability(device, "questionnaires");
  const canInternalDocumentation = hasQuestionnaireKioskCapability(device, "internal_documentation");
  return <main><p className="text-muted">{device.deviceName}</p><h1>Kiosk</h1><div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>{canQuestionnaires && <Link className="button" href="/questionnaire-kiosk/direct">Patientenfragebogen</Link>}{canInternalDocumentation && <Link className="button" href="/questionnaire-kiosk/internal">Interne Dokumentation</Link>}<KioskLockButton /></div></main>;
}