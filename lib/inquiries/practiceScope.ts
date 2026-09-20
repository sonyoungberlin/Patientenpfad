import { PracticeRole } from "@prisma/client";
import type { SessionAccount } from "@/lib/auth";

type InquiryOwnership = {
  owner_account_id: string | null;
  owner_practice_id: string | null;
};

type InquiryTemplateOwnership = {
  owner_practice_id: string | null;
  is_template: boolean;
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

export function canAccessInquiryTemplate(
  account: Pick<SessionAccount, "current_practice">,
  template: InquiryTemplateOwnership,
): boolean {
  const practiceId = account.current_practice?.id;
  return Boolean(
    practiceId &&
    template.is_template &&
    template.owner_practice_id === practiceId,
  );
}

export function canManageInquiryTemplates(
  account: Pick<SessionAccount, "current_practice" | "memberships">,
): boolean {
  const practiceId = account.current_practice?.id;
  if (!practiceId) return false;
  if (!Array.isArray(account.memberships)) return false;
  return account.memberships.some(
    (membership) =>
      membership.practice_id === practiceId &&
      membership.role === PracticeRole.OWNER,
  );
}