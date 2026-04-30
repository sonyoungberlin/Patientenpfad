/**
 * Exklusive Toggle-Gruppe für Intro-Checkpoints.
 *
 * Regeln:
 * - Klick auf INACTIVE Intro → dieses Intro ACTIVE, alle anderen INACTIVE
 * - Klick auf ACTIVE Intro  → dieses Intro INACTIVE (kein Intro aktiv)
 *
 * Reine Funktion – keine Seiteneffekte, kein Zugriff auf React-State.
 * Kann direkt in Tests validiert werden.
 *
 * @param statuses  Aktueller Status-Blob der Session (wird nicht mutiert).
 * @param clickedId ID des Intro-Checkpoints, auf den geklickt wurde.
 * @param introIds  Geordnete Liste aller bekannten Intro-Checkpoint-IDs.
 * @returns Neue Status-Map mit angewendeter Toggle-Logik.
 */
export function applyIntroToggle(
  statuses: Record<string, string>,
  clickedId: string,
  introIds: readonly string[],
): Record<string, string> {
  const isCurrentlyActive = statuses[clickedId] === "ACTIVE";

  const next = { ...statuses };

  // Alle Intros zunächst auf INACTIVE setzen.
  for (const id of introIds) {
    next[id] = "INACTIVE";
  }

  // War das geklickte Intro INACTIVE, wird es jetzt ACTIVE.
  // War es bereits ACTIVE, bleibt es INACTIVE (Toggle-Off).
  if (!isCurrentlyActive) {
    next[clickedId] = "ACTIVE";
  }

  return next;
}
