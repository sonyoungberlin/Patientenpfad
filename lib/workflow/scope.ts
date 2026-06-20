import type { SessionAccount } from "@/lib/auth";

export type WorkflowOwnershipFilter =
  | { owner_practice_id: string }
  | { owner_account_id: string };

export type WorkflowCreateOwnershipData = {
  owner_account_id: string;
  owner_practice_id?: string;
};

export function getWorkflowOwnershipFilter(
  account: Pick<SessionAccount, "id" | "current_practice">,
): WorkflowOwnershipFilter {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

export function getWorkflowCreateOwnershipData(
  account: Pick<SessionAccount, "id" | "current_practice">,
): WorkflowCreateOwnershipData {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_account_id: account.id, owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}
