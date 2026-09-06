/**
 * Der Self-Check-in erwartet die unveränderte Patienten-/Praxisreferenz als
 * QR-Payload. Keine URL, kein Präfix und keine weiteren Daten hinzufügen.
 */
export function buildSelfCheckInQrPayload(reference: string): string {
  return reference.trim();
}

export function appendSelfCheckInQrFlag(
  link: string,
  reference: string | null | undefined,
  enabled: boolean,
): string {
  if (!enabled || !reference?.trim()) return link;

  const url = new URL(link);
  url.searchParams.set("selfCheckInQr", "1");
  return url.toString();
}