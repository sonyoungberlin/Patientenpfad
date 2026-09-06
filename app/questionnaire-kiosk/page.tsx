import Link from "next/link";
import { redirect } from "next/navigation";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { KioskLockButton } from "./KioskActions";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskPage() {
  const device = await getQuestionnaireKioskDeviceFromCookies(true);
  if (!device) redirect("/questionnaire-kiosk/lock");
  return <main><p className="text-muted">{device.deviceName}</p><h1>Praxis-Fragebogen</h1><div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}><Link className="button" href="/questionnaire-kiosk/direct">Fragebogen starten</Link><KioskLockButton /></div></main>;
}