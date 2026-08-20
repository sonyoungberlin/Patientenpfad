import type { SessionAccount } from "@/lib/auth";

export type CatalogOwnershipFilter = { practice_id: string } | { practice_id?: never };

/**
 * Gibt den Besitzfilter für Katalogabfragen zurück.
 * Praxis-first: Falls ein account eine aktive Praxis hat, wird die Praxis-ID verwendet.
 * Ohne Praxis ist kein Katalogzugriff möglich (leerer Filter, der nichts zurückgibt).
 */
export function getCatalogOwnershipFilter(
  account: Pick<SessionAccount, "current_practice">,
): { practice_id: string } | null {
  const practiceId = account.current_practice?.id ?? null;
  if (!practiceId) return null;
  return { practice_id: practiceId };
}

/**
 * Gibt die Praxis-ID oder wirft, wenn keine Praxis vorhanden.
 * Für Schreiboperationen verwenden.
 */
export function requirePracticeId(
  account: Pick<SessionAccount, "current_practice">,
): string {
  const practiceId = account.current_practice?.id ?? null;
  if (!practiceId) throw new Error("Kein Praxiskontext vorhanden.");
  return practiceId;
}
