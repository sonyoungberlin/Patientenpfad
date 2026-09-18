import type { SessionAccount } from "./auth";

export type AppShellPracticeRole =
  | "OWNER"
  | "ADMIN"
  | "USER"
  | "INBOX_ONLY";

export type AppShellAccount = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
  office_cases_enabled: boolean;
  arbeitsprozesse_enabled: boolean;
  current_practice: { id: string } | null;
  memberships: Array<{ practice_id: string; role: AppShellPracticeRole }>;
};

export function toAppShellAccount(
  account: SessionAccount | null,
): AppShellAccount | null {
  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    is_approved: account.is_approved,
    is_admin: account.is_admin,
    inquiry_assistant_enabled: account.inquiry_assistant_enabled,
    patient_communication_enabled: account.patient_communication_enabled,
    website_forms_enabled: account.website_forms_enabled,
    office_cases_enabled: account.office_cases_enabled,
    arbeitsprozesse_enabled: account.arbeitsprozesse_enabled,
    current_practice: account.current_practice
      ? { id: account.current_practice.id }
      : null,
    memberships: account.memberships.map(({ practice_id, role }) => ({
      practice_id,
      role,
    })),
  };
}