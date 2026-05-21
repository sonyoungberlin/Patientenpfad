/**
 * Erlaubte Anliegen-Typen für Digitale Anfragen.
 *
 * Whitelist der drei konkreten Anliegen, die ein Patient über
 * `/anfrage/[slug]` einreichen kann. Kein DB-Enum, konsistent
 * zu anderen String-Feldern (InquirySession.selected_inquiry_ids etc.).
 *
 * Werte werden als `requested_topics Json?` in `DigitalRequest` gespeichert.
 */

export const DIGITAL_REQUEST_TOPICS = {
  AU: "Arbeitsunfähigkeitsbescheinigung",
  HEILMITTELVERORDNUNG: "Heilmittelverordnung",
  PRESCRIPTION: "Rezept",
  REFERRAL: "Überweisung",
} as const;

export type DigitalRequestTopic = keyof typeof DIGITAL_REQUEST_TOPICS;

export const VALID_TOPICS = new Set<string>(
  Object.keys(DIGITAL_REQUEST_TOPICS),
);

/** Gibt den deutschen Label zu einem Topic-Key zurück. */
export function topicLabel(topic: string): string {
  return (
    DIGITAL_REQUEST_TOPICS[topic as DigitalRequestTopic] ?? topic
  );
}
