import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicHandoff } from "@/lib/questionnaire/publicHandoffAuth";

export const dynamic = "force-dynamic";

function unavailable() {
  return new NextResponse("Dieser Check-in ist nicht mehr verfügbar.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const handoff = await resolvePublicHandoff(req, id);
  if (!handoff || handoff.status !== "questionnaire_ready" || !handoff.follow_up_session_id) return unavailable();
  const child = await prisma.patientQuestionnaireSession.findUnique({
    where: { id: handoff.follow_up_session_id },
    select: {
      token: true,
      token_expires_at: true,
      status: true,
      deleted_at: true,
      owner_practice_id: true,
      patient_reference: true,
      context: true,
      session_kind: true,
      created_by_kiosk_device_id: true,
      owner_account_id: true,
      source: true,
    },
  });
  if (!child || child.status !== "pending" || child.deleted_at !== null || !child.token ||
      !child.token_expires_at || child.token_expires_at <= new Date() || !child.patient_reference ||
      child.patient_reference !== handoff.parent_session.patient_reference ||
      child.owner_practice_id !== handoff.parent_session.owner_practice_id || child.context !== "patient" ||
      child.session_kind !== "patient_communication" || child.created_by_kiosk_device_id !== null ||
      child.owner_account_id !== null || child.source !== "public_check_in") return unavailable();
  const response = NextResponse.redirect(new URL(`/q/${child.token}`, req.url), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}