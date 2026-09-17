import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPracticeIdentityBySlug } from "@/lib/practice/publicIdentity";
import { isPracticeActive } from "@/lib/practice/lifecycle";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { PUBLIC_CHECK_IN_BLOCK_IDS } from "@/lib/questionnaire/publicCheckIn";
import {
  createPublicHandoffSecret,
  hashPublicHandoffSecret,
  PUBLIC_HANDOFF_DURATION_MS,
  publicHandoffCookieName,
  publicHandoffCookieOptions,
} from "@/lib/questionnaire/publicHandoffAuth";
import { createRateLimiter, getClientIp, IP_SLUG_RATE_LIMIT } from "@/lib/websiteForms/submitRateLimit";
import { validateSlug } from "@/lib/websiteForms/slug";

export const dynamic = "force-dynamic";
const startLimiter = createRateLimiter(IP_SLUG_RATE_LIMIT);

function unavailable() {
  return new NextResponse("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ practiceSlug: string }> }) {
  const origin = req.headers.get("origin");
  if (origin !== req.nextUrl.origin) return unavailable();
  const { practiceSlug } = await params;
  const validation = validateSlug(practiceSlug);
  if (!validation.ok) return unavailable();
  const form = await req.formData().catch(() => null);
  if (!form) return unavailable();
  if (String(form.get("website") ?? "").trim()) {
    return NextResponse.redirect(new URL(`/formular/${validation.slug}/check-in`, req.url), 303);
  }
  if (!startLimiter.check(`${getClientIp(req.headers)}:${validation.slug}`).allowed) {
    return new NextResponse("Zu viele Anfragen.", { status: 429 });
  }
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice || !isPracticeActive(practice) || !practice.patient_communication_enabled) return unavailable();

  const secret = createPublicHandoffSecret();
  const expiresAt = new Date(Date.now() + PUBLIC_HANDOFF_DURATION_MS);
  const result = await prisma.$transaction(async (transaction) => {
    const session = await createQuestionnaireSession({
      selectedBlockIds: [...PUBLIC_CHECK_IN_BLOCK_IDS],
      patientReference: null,
      allowUnassignedPublicCheckIn: true,
      patientLanguage: "de",
      ownerPracticeId: practice.id,
      source: "public_check_in",
      origin: req.nextUrl.origin,
      databaseClient: transaction,
    });
    await transaction.publicQuestionnaireHandoff.create({
      data: {
        parent_session_id: session.sessionId,
        secret_hash: hashPublicHandoffSecret(secret),
        expires_at: expiresAt,
      },
    });
    return session;
  });

  const response = NextResponse.redirect(result.tokenLink, 303);
  response.cookies.set(
    publicHandoffCookieName(result.sessionId),
    secret,
    publicHandoffCookieOptions(result.sessionId, expiresAt),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}