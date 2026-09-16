import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuestionnaireKioskDeviceFromCookies } from "@/lib/questionnaireKiosk/auth";
import { KioskCheckInWaitingClient } from "./KioskCheckInWaitingClient";

export const dynamic = "force-dynamic";

export default async function KioskCheckInWaitingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const device = await getQuestionnaireKioskDeviceFromCookies();
  if (!device) redirect("/questionnaire-kiosk/lock");
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: {
      id,
      owner_practice_id: device.practiceId,
      created_by_kiosk_device_id: device.deviceId,
      kiosk_handoff_status: { not: null },
    },
    select: { id: true },
  });
  if (!session) notFound();

  return (
    <main className="questionnaire-kiosk-page">
      <p className="text-muted">{device.deviceName}</p>
      <h1>Check-in übermittelt</h1>
      <KioskCheckInWaitingClient sessionId={session.id} />
    </main>
  );
}