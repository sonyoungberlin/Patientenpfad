/**
 * Automatische Kopplung Text-Checkpoint → Steuer-Checkpoint (LAB-Profil).
 *
 * Hintergrund: Im LAB-Profil dienen `LAB_INTERNAL_ORDER` und `LAB_EXTERNAL_REFERRAL`
 * als reine Steuer-Checkpoints (leerer `textByStatus`). Sie schalten in
 * `boundActionConditions` mehrere M3-Action-Bausteine sichtbar bzw. unsichtbar,
 * tragen selbst aber keinen Patiententext.
 *
 * Damit der Nutzer in M2 nicht zwei Checkpoints (Steuer + Text) parallel pflegen
 * muss, leiten wir aus dem inhaltlichen Text-Checkpoint automatisch den passenden
 * Steuer-Checkpoint ab.
 *
 * Mapping (siehe README am Ende der Datei):
 *
 *   LAB_INTERNAL_ORDER_AVAILABLE = YES        → LAB_INTERNAL_ORDER   = YES
 *   LAB_INTERNAL_ORDER_MISSING   = YES        → LAB_INTERNAL_ORDER   = NO
 *   LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED = YES → LAB_EXTERNAL_REFERRAL = YES
 *
 * Hinweise:
 * - Es werden ausschließlich neue Status für die Steuer-Checkpoints gesetzt;
 *   bestehende IDs, Renderlogik, Actions und Catalog-Einträge bleiben unverändert.
 * - Wird der Text-Checkpoint auf "NO" gesetzt oder geleert, lassen wir den
 *   gekoppelten Steuer-Checkpoint bewusst unverändert. So kann der Bearbeiter
 *   einen widersprüchlichen Befund manuell korrigieren, ohne dass die Kopplung
 *   ihn überschreibt.
 *
 * Reine Funktion – keine Seiteneffekte, kein Zugriff auf React-State.
 */

/**
 * Mapping Text-Checkpoint → Aktion auf Steuer-Checkpoint.
 *
 * `controlValue` wird gesetzt, sobald der Text-Checkpoint mit `triggerValue`
 * (typisch "YES") aktiviert wird.
 */
export const LAB_TEXT_TO_CONTROL_COUPLING: ReadonlyArray<{
  textCheckpointId: string;
  triggerValue: string;
  controlCheckpointId: string;
  controlValue: string;
}> = [
  {
    textCheckpointId: "LAB_INTERNAL_ORDER_AVAILABLE",
    triggerValue: "YES",
    controlCheckpointId: "LAB_INTERNAL_ORDER",
    controlValue: "YES",
  },
  {
    textCheckpointId: "LAB_INTERNAL_ORDER_MISSING",
    triggerValue: "YES",
    controlCheckpointId: "LAB_INTERNAL_ORDER",
    controlValue: "NO",
  },
  {
    textCheckpointId: "LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED",
    triggerValue: "YES",
    controlCheckpointId: "LAB_EXTERNAL_REFERRAL",
    controlValue: "YES",
  },
];

/**
 * Wendet die Text→Steuer-Kopplung für einen einzelnen Statuswechsel an.
 *
 * @param statuses     Aktueller Status-Blob der Session (wird nicht mutiert).
 * @param checkpointId ID des Checkpoints, dessen Status sich ändert.
 * @param value        Neuer Wert für `checkpointId`.
 * @returns Neue Status-Map mit dem gesetzten `checkpointId` plus ggf. dem
 *          zusätzlich gekoppelten Steuer-Checkpoint.
 */
export function applyLabCheckpointCoupling(
  statuses: Record<string, string>,
  checkpointId: string,
  value: string,
): Record<string, string> {
  const next: Record<string, string> = { ...statuses, [checkpointId]: value };

  for (const rule of LAB_TEXT_TO_CONTROL_COUPLING) {
    if (rule.textCheckpointId === checkpointId && rule.triggerValue === value) {
      next[rule.controlCheckpointId] = rule.controlValue;
    }
  }

  return next;
}
