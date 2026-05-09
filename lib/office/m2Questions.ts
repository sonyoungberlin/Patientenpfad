import {
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_KV_BILLING,
  type OfficeTopicId,
} from "@/lib/office/checkpointCatalog";

export type OfficeM2Question = {
  id: string;
  text: string;
};

export type OfficeM2QuestionsByCheckpoint = Record<string, readonly OfficeM2Question[]>;

const M2_QUESTIONS_BY_TOPIC: Record<OfficeTopicId, OfficeM2QuestionsByCheckpoint> = {
  [OFFICE_TOPIC_HIRING_REPLACEMENT]: {
    "HR-01": [
      { id: "M2-01", text: "Welcher konkrete Anlass liegt fuer die Nachbesetzung vor?" },
      { id: "M2-02", text: "Welche Informationen liegen bereits belastbar vor?" },
    ],
    "HR-02": [
      { id: "M2-01", text: "Welche Mindestanforderungen sind intern festgelegt?" },
      { id: "M2-02", text: "Welche Punkte sind noch nicht verbindlich geklaert?" },
    ],
    "HR-03": [
      { id: "M2-01", text: "Welche Einschaetzung liegt von Leitung/Partnern vor?" },
      { id: "M2-02", text: "Welche Einschaetzung fehlt noch und von wem?" },
    ],
    "HR-04": [
      { id: "M2-01", text: "Welche Information ist fuer die Beurteilung noch nicht bekannt?" },
      { id: "M2-02", text: "Welche Information fehlt fuer diese Entscheidung?" },
    ],
    "HR-05": [
      { id: "M2-01", text: "Wer kann offene Punkte verbindlich beantworten?" },
      { id: "M2-02", text: "Wie ist die Antwortquelle erreichbar oder zustaendig?" },
    ],
  },
  [OFFICE_TOPIC_KV_BILLING]: {
    "KV-01": [
      { id: "M2-01", text: "Was beanstandet das KV-Schreiben konkret?" },
      { id: "M2-02", text: "Welche Nachweise dazu liegen bereits vor?" },
    ],
    "KV-02": [
      { id: "M2-01", text: "Welche Frist und formalen Anforderungen sind gesetzt?" },
      { id: "M2-02", text: "Welche formalen Informationen fehlen noch?" },
    ],
    "KV-03": [
      { id: "M2-01", text: "Welche interne Einschaetzung liegt aktuell vor?" },
      { id: "M2-02", text: "Welche fachliche Rueckmeldung fehlt noch?" },
    ],
    "KV-04": [
      { id: "M2-01", text: "Welches Vorgehen fuer die Rueckmeldung wurde festgelegt?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch offen?" },
    ],
    "KV-05": [
      { id: "M2-01", text: "Wer kann offene Abrechnungsfragen verbindlich beantworten?" },
      { id: "M2-02", text: "Welche Kontaktstelle ist dafuer zustaendig?" },
    ],
  },
};

export function getM2QuestionsForTopic(
  topicId: OfficeTopicId,
): OfficeM2QuestionsByCheckpoint {
  return M2_QUESTIONS_BY_TOPIC[topicId] ?? {};
}

export function getM2QuestionsForCheckpoint(
  topicId: OfficeTopicId,
  checkpointId: string,
): readonly OfficeM2Question[] {
  const byCheckpoint = M2_QUESTIONS_BY_TOPIC[topicId];
  if (!byCheckpoint) return [];
  return byCheckpoint[checkpointId] ?? [];
}
