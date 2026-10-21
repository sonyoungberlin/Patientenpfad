import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getQuestionnaireKioskAccessFromCookies,
  hasQuestionnaireKioskCapability,
} from "@/lib/questionnaireKiosk/auth";
import { KioskAccountLogout } from "@/components/questionnaireKiosk/KioskAccountLogout";
import { KioskCheckInWaitingClient } from "./KioskCheckInWaitingClient";

export const dynamic = "force-dynamic";

export default async function KioskCheckInWaitingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getQuestionnaireKioskAccessFromCookies();
  if (!access || !hasQuestionnaireKioskCapability(access, "questionnaires")) redirect("/questionnaire-kiosk/lock");
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: {
      id,
      owner_practice_id: access.practiceId,
      ...(access.kind === "device"
        ? { created_by_kiosk_device_id: access.deviceId }
        : { owner_account_id: access.accountId, created_by_kiosk_device_id: null }),
      kiosk_handoff_status: { not: null },
    },
    select: { id: true },
  });
  if (!session) notFound();

  return (
    <main className="questionnaire-kiosk-page">
      {access.kind === "account" ? <KioskAccountLogout /> : <p className="text-muted">{access.deviceName}</p>}
      <h1>Check-in übermittelt</h1>
      <KioskCheckInWaitingClient sessionId={session.id} />
    </main>
  );
}