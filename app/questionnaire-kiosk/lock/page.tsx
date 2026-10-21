import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { KIOSK_ACCOUNT_COOKIE, getCurrentKioskMode, getKioskSessionAccountFromCookies } from "@/lib/auth";
import { KioskMode } from "@prisma/client";
import {
  getQuestionnaireKioskDeviceFromCookies,
} from "@/lib/questionnaireKiosk/auth";
import { KioskAccountLogout } from "@/components/questionnaireKiosk/KioskAccountLogout";
import { KioskUnlockForm } from "../KioskActions";

export const dynamic = "force-dynamic";

export default async function QuestionnaireKioskLockPage() {
  const cookieStore = await cookies();
  const kioskAccountMode = cookieStore.get(KIOSK_ACCOUNT_COOKIE)?.value;
  const account = await getKioskSessionAccountFromCookies();
  if (account) {
    const mode = getCurrentKioskMode(account);
    if (mode && mode === kioskAccountMode) {
      redirect(
        mode === KioskMode.INTERNAL_DOCUMENTATION
          ? "/questionnaire-kiosk/internal"
          : "/questionnaire-kiosk/direct",
      );
    }
  }
  if (kioskAccountMode) {
    return (
      <main className="questionnaire-kiosk-page">
        <KioskAccountLogout />
        <h1>Sitzung abgelaufen</h1>
        <p>Bitte melden Sie sich erneut mit Ihrem Kiosk-Zugang an.</p>
      </main>
    );
  }
  const device = await getQuestionnaireKioskDeviceFromCookies();
  if (!device) redirect("/api/questionnaire-kiosk-recovery");
  return <main><p className="text-muted">{device.deviceName}</p><h1>Praxis-Fragebogen</h1><KioskUnlockForm /></main>;
}