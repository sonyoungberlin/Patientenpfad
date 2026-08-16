/**
 * Explizite, katalogbasierte Zuordnung von Prozess-IDs zu Prozessarten.
 *
 * Jede bekannte Prozess-ID muss hier eingetragen sein.
 * Unbekannte IDs liefern undefined – kein stilles Fallback auf STANDARD_PROCESS.
 *
 * Kein Import aus processKind-fremden Workflow-Modulen.
 */

/** Fachliche Prozessart: extern vorgegebener Standardprozess oder praxisindividueller Ablaufprozess. */
export type WorkflowProcessKind = "STANDARD_PROCESS" | "PRACTICE_PROCESS";

/**
 * Explizite Zuordnung aller bekannten Prozess-IDs zur Prozessart.
 *
 * STANDARD_PROCESS: klinische Musterprozesse (AU, Rezept, Überweisung, Heilmittel, Hilfsmittel, Krankentransport)
 * PRACTICE_PROCESS: praxisinterne Ablaufprozesse (aktuell: Patienten ohne Termin)
 */
const PROCESS_KIND_BY_TOPIC_ID: Readonly<Record<string, WorkflowProcessKind>> = {
  // Klinische Musterprozesse (STANDARD_PROCESS)
  "au-musterprozess": "STANDARD_PROCESS",
  "rezept-musterprozess": "STANDARD_PROCESS",
  "ueberweisung-musterprozess": "STANDARD_PROCESS",
  "heilmittel-musterprozess": "STANDARD_PROCESS",
  "hilfsmittel-musterprozess": "STANDARD_PROCESS",
  "krankentransport-musterprozess": "STANDARD_PROCESS",
  // Praxisinterne Ablaufprozesse (PRACTICE_PROCESS)
  "patienten-ohne-termin": "PRACTICE_PROCESS",
};

/**
 * Gibt die Prozessart für eine Prozess-ID zurück.
 * Gibt undefined für unbekannte IDs zurück – kein stilles Fallback auf STANDARD_PROCESS.
 */
export function getProcessKindForTopicId(
  topicId: string,
): WorkflowProcessKind | undefined {
  return PROCESS_KIND_BY_TOPIC_ID[topicId];
}

/** Prüft ob ein Wert eine gültige WorkflowProcessKind ist. */
export function isWorkflowProcessKind(value: unknown): value is WorkflowProcessKind {
  return value === "STANDARD_PROCESS" || value === "PRACTICE_PROCESS";
}
