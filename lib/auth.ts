import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PracticeRole } from "@prisma/client";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "pp_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Phase P2: Praxis-Kontext, der zusammen mit dem Account aus der Session
 * geladen wird. Quelle ist `PracticeMembership` — aktuell ausschließlich die
 * OWNER-Membership des eingeloggten Accounts (P1-Backfill: genau eine pro
 * Account). Die Feature-Flags werden 1:1 aus der Practice gespiegelt und
 * sind ab P2 die Quelle der Wahrheit für `requireApprovedAccount` & Co.
 */
export type SessionPractice = {
  id: string;
  slug: string;
  name: string;
  is_approved: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
};

/**
 * Phase P2: Mitgliedschaft eines Accounts in einer Practice (verschlankter
 * Snapshot zur Übergabe an Auth-Helper). Wird im selben Prisma-Call wie der
 * Account geladen, um zusätzliche Roundtrips in Routen zu vermeiden.
 */
export type SessionMembership = {
  practice_id: string;
  role: PracticeRole;
};

export type SessionAccount = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
  /**
   * Phase P2: Aktive Praxis (OWNER-Membership des Accounts) oder `null`,
   * falls der Account (noch) keine Membership hat. In diesem Fall fallen
   * die Top-Level-Flags auf die Account-Werte zurück (= Verhalten vor P2).
   */
  current_practice: SessionPractice | null;
  /**
   * Phase P2: Alle Memberships des Accounts (Practice-ID + Rolle). Wird von
   * `requirePracticeRole` konsumiert; in P2 noch ohne produktive Aufrufer.
   */
  memberships: SessionMembership[];
};

/**
 * Phase P2: Wählt aus den Memberships eines Accounts die "aktuelle" Practice.
 * Strategie:
 *   1. OWNER-Membership (nach P1-Backfill genau eine pro Account).
 *   2. Falls keine OWNER existiert: erste Membership nach `created_at`.
 *   3. Falls keine Membership existiert: `null` → Top-Level-Flags fallen auf
 *      die Account-Werte zurück (Sicherheitsnetz für nicht-migrierte Edge
 *      Cases und für Test-Doubles, die `memberships` weglassen).
 */
type LoadedMembership = {
  practice_id: string;
  role: PracticeRole;
  created_at: Date;
  practice: {
    id: string;
    slug: string;
    name: string;
    is_approved: boolean;
    inquiry_assistant_enabled: boolean;
    patient_communication_enabled: boolean;
    website_forms_enabled: boolean;
  };
};

function pickCurrentMembership(
  memberships: LoadedMembership[],
): LoadedMembership | null {
  if (!memberships || memberships.length === 0) return null;
  const owner = memberships.find((m) => m.role === PracticeRole.OWNER);
  if (owner) return owner;
  const sorted = [...memberships].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime(),
  );
  return sorted[0] ?? null;
}

async function resolveAccount(token: string | undefined): Promise<SessionAccount | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          is_approved: true,
          is_admin: true,
          inquiry_assistant_enabled: true,
          patient_communication_enabled: true,
          website_forms_enabled: true,
          memberships: {
            select: {
              practice_id: true,
              role: true,
              created_at: true,
              practice: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  is_approved: true,
                  inquiry_assistant_enabled: true,
                  patient_communication_enabled: true,
                  website_forms_enabled: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  const account = session.account;
  // P2: `memberships` kann in Test-Doubles fehlen → defensiv leeres Array.
  const loadedMemberships: LoadedMembership[] = Array.isArray(
    (account as { memberships?: unknown }).memberships,
  )
    ? ((account as unknown as { memberships: LoadedMembership[] }).memberships)
    : [];

  const picked = pickCurrentMembership(loadedMemberships);
  const current_practice: SessionPractice | null = picked
    ? {
        id: picked.practice.id,
        slug: picked.practice.slug,
        name: picked.practice.name,
        is_approved: picked.practice.is_approved,
        inquiry_assistant_enabled: picked.practice.inquiry_assistant_enabled,
        patient_communication_enabled:
          picked.practice.patient_communication_enabled,
        website_forms_enabled: picked.practice.website_forms_enabled,
      }
    : null;

  const memberships: SessionMembership[] = loadedMemberships.map((m) => ({
    practice_id: m.practice_id,
    role: m.role,
  }));

  // P2: Top-Level-Flags spiegeln current_practice, falls vorhanden. So sehen
  // auch die ~25 bestehenden Inline-Checks (`!account.is_approved`,
  // `!account.inquiry_assistant_enabled`, …) automatisch die Practice-Werte,
  // ohne dass die Routen angefasst werden. Nach P1-Backfill sind die Werte
  // wertgleich → beobachtbares Verhalten unverändert.
  const effective: Pick<
    SessionAccount,
    | "is_approved"
    | "inquiry_assistant_enabled"
    | "patient_communication_enabled"
    | "website_forms_enabled"
  > = current_practice
    ? {
        is_approved: current_practice.is_approved,
        inquiry_assistant_enabled: current_practice.inquiry_assistant_enabled,
        patient_communication_enabled:
          current_practice.patient_communication_enabled,
        website_forms_enabled: current_practice.website_forms_enabled,
      }
    : {
        is_approved: account.is_approved,
        inquiry_assistant_enabled: account.inquiry_assistant_enabled,
        patient_communication_enabled: account.patient_communication_enabled,
        website_forms_enabled: account.website_forms_enabled,
      };

  return {
    id: account.id,
    email: account.email,
    is_admin: account.is_admin,
    is_approved: effective.is_approved,
    inquiry_assistant_enabled: effective.inquiry_assistant_enabled,
    patient_communication_enabled: effective.patient_communication_enabled,
    website_forms_enabled: effective.website_forms_enabled,
    current_practice,
    memberships,
  };
}

/**
 * Liest das Session-Cookie aus dem eingehenden Request und gibt den zugehörigen
 * Account zurück. Gibt null zurück wenn kein gültiges Token vorhanden oder die
 * Session abgelaufen ist.
 */
export async function getSessionAccount(
  req: NextRequest,
): Promise<SessionAccount | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return resolveAccount(token);
}

/**
 * Liest das Session-Cookie aus den Next.js-Headers (für Server-Components / page.tsx).
 * Gibt null zurück wenn kein gültiges Token vorhanden oder die Session abgelaufen ist.
 */
export async function getSessionAccountFromCookies(): Promise<SessionAccount | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return resolveAccount(token);
}
