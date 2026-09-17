import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPublicCheckInSession } from "@/lib/questionnaire/publicCheckIn";

export const PUBLIC_HANDOFF_DURATION_MS = 12 * 60 * 60 * 1000;
const COOKIE_PREFIX = "pp_public_check_in_";

export function createPublicHandoffSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPublicHandoffSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function secretHashMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPublicHandoffSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function publicHandoffCookieName(parentSessionId: string): string {
  return `${COOKIE_PREFIX}${parentSessionId}`;
}

export function publicHandoffCookieOptions(parentSessionId: string, expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: `/public-check-in/${parentSessionId}`,
    expires,
  };
}

export async function resolvePublicHandoff(req: NextRequest, parentSessionId: string) {
  const secret = req.cookies.get(publicHandoffCookieName(parentSessionId))?.value;
  if (!secret) return null;

  const handoff = await prisma.publicQuestionnaireHandoff.findUnique({
    where: { parent_session_id: parentSessionId },
    select: {
      parent_session_id: true,
      secret_hash: true,
      expires_at: true,
      status: true,
      follow_up_session_id: true,
      parent_session: {
        select: {
          source: true,
          session_kind: true,
          context: true,
          owner_account_id: true,
          owner_practice_id: true,
          created_by_kiosk_device_id: true,
          selected_block_ids: true,
          frozen_blocks: true,
          status: true,
          deleted_at: true,
          patient_reference: true,
        },
      },
    },
  });
  if (
    !handoff ||
    !secretHashMatches(secret, handoff.secret_hash) ||
    handoff.expires_at <= new Date() ||
    !["waiting", "closed", "questionnaire_ready"].includes(handoff.status) ||
    handoff.parent_session.status !== "completed" ||
    handoff.parent_session.deleted_at !== null ||
    !isPublicCheckInSession(handoff.parent_session)
  ) return null;

  return handoff;
}