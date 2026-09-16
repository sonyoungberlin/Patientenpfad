import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { device, error } = await requireQuestionnaireKioskDevice(req);
  if (error) return error;
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: {
      id,
      owner_practice_id: device.practiceId,
      created_by_kiosk_device_id: device.deviceId,
      kiosk_handoff_status: { not: null },
    },
    select: {
      kiosk_handoff_status: true,
      kiosk_follow_up_session: {
        select: {
          token: true,
          token_expires_at: true,
          status: true,
          deleted_at: true,
          owner_practice_id: true,
          created_by_kiosk_device_id: true,
        },
      },
    },
  });
  if (!session) {
    return NextResponse.json({ ok: false, error: "Check-in nicht gefunden." }, { status: 404 });
  }

  const followUp = session.kiosk_follow_up_session;
  const status = session.kiosk_handoff_status === "questionnaire_ready" &&
    followUp?.token &&
    followUp.token_expires_at &&
    followUp.token_expires_at >= new Date() &&
    followUp.status === "pending" &&
    followUp.deleted_at === null &&
    followUp.owner_practice_id === device.practiceId &&
    followUp.created_by_kiosk_device_id === device.deviceId
    ? "questionnaire_ready"
    : session.kiosk_handoff_status === "waiting"
      ? "waiting"
      : "closed";
  const response = NextResponse.json({
    ok: true,
    status,
    ...(status === "questionnaire_ready" ? { link: `/q/${followUp!.token}` } : {}),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}