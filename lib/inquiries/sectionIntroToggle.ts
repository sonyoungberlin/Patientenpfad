/**
 * Exklusive Toggle-Gruppe für Section-Intro-Checkpoints (M2 „Schubladen").
 *
 * Pilot für AU/LAB/APPOINTMENT. Analog zu `applyIntroToggle`, aber operiert
 * auf der separaten Liste `SECTION_INTRO_CHECKPOINT_IDS`.
 *
 * Regeln:
 * - Klick auf INACTIVE Section-Intro → dieses ACTIVE, alle anderen INACTIVE.
 * - Klick auf ACTIVE Section-Intro   → dieses INACTIVE (kein Section-Intro aktiv).
 *
 * Pro Profil darf maximal ein Section-Intro gleichzeitig ACTIVE sein. Da die
 * Status-Map global pro Session geführt wird, erzwingt die Funktion dies global
 * – das ist konform zur Pilot-Anforderung „maximal ein aktiver SECTION_INTRO".
 *
 * Reine Funktion – keine Seiteneffekte, kein Zugriff auf React-State.
 */
export function applySectionIntroToggle(
  statuses: Record<string, string>,
  clickedId: string,
  sectionIntroIds: readonly string[],
): Record<string, string> {
  const isCurrentlyActive = statuses[clickedId] === "ACTIVE";

  const next = { ...statuses };

  // Alle Section-Intros zunächst auf INACTIVE setzen.
  for (const id of sectionIntroIds) {
    next[id] = "INACTIVE";
  }

  // War das geklickte Section-Intro INACTIVE, wird es jetzt ACTIVE.
  // War es bereits ACTIVE, bleibt es INACTIVE (Toggle-Off).
  if (!isCurrentlyActive) {
    next[clickedId] = "ACTIVE";
  }

  return next;
}
