import { NextRequest, NextResponse } from "next/server";
import { resolvePublicHandoff } from "@/lib/questionnaire/publicHandoffAuth";
import { createRateLimiter, getClientIp } from "@/lib/websiteForms/submitRateLimit";

export const dynamic = "force-dynamic";
const pollLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!pollLimiter.check(`${getClientIp(req.headers)}:${id}`).allowed) {
    return NextResponse.json({ state: "unavailable" }, {
      status: 429,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  const handoff = await resolvePublicHandoff(req, id);
  const response = handoff && (handoff.status !== "questionnaire_ready" || handoff.follow_up_session_id)
    ? NextResponse.json({ state: handoff.status })
    : NextResponse.json({ state: "unavailable" }, { status: 404 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}