/** Maximale Aufbewahrungsdauer für temporäre Kommunikationsdaten in Tagen. */
export const COMMUNICATION_RETENTION_DAYS = 7;

/** Hilfsfunktion: gibt den Cutoff-Zeitpunkt für die Retention zurück. */
export function retentionCutoff(
  referenceDate: Date = new Date(),
  days: number = COMMUNICATION_RETENTION_DAYS,
): Date {
  return new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
}
