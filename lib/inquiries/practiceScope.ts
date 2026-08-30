import type { SessionAccount } from "@/lib/auth";

type InquiryOwnership = {
  owner_account_id: string | null;
  owner_practice_id: string | null;
};

/**
 * Inquiry-Sitzungen bleiben accountbezogen und müssen zusätzlich zum
 * aktuell ausgewählten Praxiskontext gehören. Ohne Praxis gilt der
 * historische Account-Fallback.
 */
export function canAccessInquirySession(
  account: Pick<SessionAccount, "id" | "current_practice">,
  session: InquiryOwnership,
): boolean {
  if (session.owner_account_id !== account.id) return false;
  const practiceId = account.current_practice?.id ?? null;
  return practiceId === null || session.owner_practice_id === practiceId;
}