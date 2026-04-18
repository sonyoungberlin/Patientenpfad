import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "pp_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionAccount = {
  id: string;
  email: string;
  is_approved: boolean;
};

/**
 * Liest das Session-Cookie aus dem eingehenden Request und gibt den zugehörigen
 * Account zurück. Gibt null zurück wenn kein gültiges Token vorhanden oder die
 * Session abgelaufen ist.
 */
export async function getSessionAccount(
  req: NextRequest,
): Promise<SessionAccount | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      account: {
        select: { id: true, email: true, is_approved: true },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return session.account;
}
