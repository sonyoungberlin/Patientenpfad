/**
 * Rollenkatalog für öffentliche Bewerbungsanfragen (/bewerben/[slug]).
 *
 * Bewusst getrennt von DIGITAL_REQUEST_TOPICS (Patienten-Anliegen).
 * Validierung ausschließlich gegen VALID_APPLICATION_ROLES, nie gegen VALID_TOPICS.
 */

export const OFFICE_APPLICATION_ROLES = {
  MFA: "MFA",
  RECEPTION_OFFICE: "Rezeption / Büro",
  PHYSICIAN: "Arzt / Ärztin",
} as const;

export type OfficeApplicationRole = keyof typeof OFFICE_APPLICATION_ROLES;

export const VALID_APPLICATION_ROLES = new Set<string>(
  Object.keys(OFFICE_APPLICATION_ROLES),
);

/** Gibt den deutschen Label zu einem Rollen-Key zurück. */
export function applicationRoleLabel(role: string): string {
  return OFFICE_APPLICATION_ROLES[role as OfficeApplicationRole] ?? role;
}
