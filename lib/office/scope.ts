import type { SessionAccount } from "@/lib/auth";

export type OfficeOwnershipFilter =
  | { owner_practice_id: string }
  | { owner_account_id: string };

export type OfficeCaseOwnership = {
  owner_account_id: string;
  owner_practice_id?: string | null;
};

export type OfficeCreateOwnershipData = {
  owner_account_id: string;
  owner_practice_id?: string;
};

export function canAccessOfficeCases(
  account: Pick<SessionAccount, "office_cases_enabled" | "is_admin">,
): boolean {
  return account.office_cases_enabled || account.is_admin;
}

export function getOfficeOwnershipFilter(
  account: Pick<SessionAccount, "id" | "current_practice">,
): OfficeOwnershipFilter {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

export function ownsOfficeCase(
  account: Pick<SessionAccount, "id" | "current_practice">,
  officeCase: OfficeCaseOwnership,
): boolean {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return officeCase.owner_practice_id === practiceId;
  }
  return officeCase.owner_account_id === account.id;
}

export function getOfficeCreateOwnershipData(
  account: Pick<SessionAccount, "id" | "current_practice">,
): OfficeCreateOwnershipData {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_account_id: account.id, owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}
