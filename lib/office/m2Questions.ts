import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_SEAT_APPROVAL,
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
  [OFFICE_TOPIC_REGRESS]: {
    "RG-01": [
      { id: "M2-01", text: "Welcher Anlass wurde beanstandet und welcher Zeitraum ist betroffen?" },
      { id: "M2-02", text: "Welche Basisfakten sind bereits gesichert dokumentiert?" },
    ],
    "RG-02": [
      { id: "M2-01", text: "Welche Fristen und Formvorgaben gelten konkret?" },
      { id: "M2-02", text: "Welche Regelpunkte sind noch unklar oder offen?" },
    ],
    "RG-03": [
      { id: "M2-01", text: "Wer fuehrt den Fall fachlich und organisatorisch?" },
      { id: "M2-02", text: "Wer vertritt die Verantwortung bei Abwesenheit?" },
    ],
    "RG-04": [
      { id: "M2-01", text: "Welche Nachweise liegen bereits vollstaendig vor?" },
      { id: "M2-02", text: "Welche Unterlagen muessen noch beschafft werden?" },
    ],
    "RG-05": [
      { id: "M2-01", text: "Welches Vorgehen wurde verbindlich entschieden?" },
      { id: "M2-02", text: "Welche Freigabe fehlt fuer die Umsetzung noch?" },
    ],
    "RG-06": [
      { id: "M2-01", text: "Welche externe Stelle ist fuer Rueckfragen zustaendig?" },
      { id: "M2-02", text: "Ueber welchen Kanal erfolgt die Kommunikation?" },
    ],
    "RG-07": [
      { id: "M2-01", text: "Welche Risiken sind aktuell absehbar?" },
      { id: "M2-02", text: "Welche Abhaengigkeiten koennen den Ablauf verzoegern?" },
    ],
  },
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: {
    "UV-01": [
      { id: "M2-01", text: "Welcher Zeitraum und welche Leistungen sind von der Schliessung betroffen?" },
      { id: "M2-02", text: "Welche internen Angaben zum Anlass sind bereits gesichert?" },
    ],
    "UV-02": [
      { id: "M2-01", text: "Welche Melde- und Informationsfristen muessen eingehalten werden?" },
      { id: "M2-02", text: "Welche formalen Pflichten sind noch nicht abschliessend geklaert?" },
    ],
    "UV-03": [
      { id: "M2-01", text: "Wer verantwortet die operative Vertretungsplanung?" },
      { id: "M2-02", text: "Wer verantwortet die externe Kommunikation?" },
    ],
    "UV-04": [
      { id: "M2-01", text: "Welche Vertretungsnachweise liegen vor?" },
      { id: "M2-02", text: "Welche Unterlagen muessen fuer den Zeitraum noch ergaenzt werden?" },
    ],
    "UV-05": [
      { id: "M2-01", text: "Welches Vertretungsmodell wurde freigegeben?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch offen?" },
    ],
    "UV-06": [
      { id: "M2-01", text: "Welche externe Stelle wurde informiert?" },
      { id: "M2-02", text: "Welcher Kontaktkanal wird verbindlich genutzt?" },
    ],
  },
  [OFFICE_TOPIC_SEAT_APPROVAL]: {
    "ZA-01": [
      { id: "M2-01", text: "Welches Zielbild fuer Sitz/Zulassung wird verfolgt?" },
      { id: "M2-02", text: "Welche Ausgangsdaten sind bereits belastbar vorhanden?" },
    ],
    "ZA-02": [
      { id: "M2-01", text: "Welche Fristen und Verfahrensregeln gelten fuer den Fall?" },
      { id: "M2-02", text: "Welche formalen Anforderungen sind noch unklar?" },
    ],
    "ZA-03": [
      { id: "M2-01", text: "Wer ist fuer welchen Verfahrensschritt verantwortlich?" },
      { id: "M2-02", text: "Welche Vertretung ist fuer Engpaesse festgelegt?" },
    ],
    "ZA-04": [
      { id: "M2-01", text: "Welche Antragsnachweise sind bereits vorhanden?" },
      { id: "M2-02", text: "Welche Unterlagen fehlen noch bis zur Einreichung?" },
    ],
    "ZA-05": [
      { id: "M2-01", text: "Welche Reihenfolge der Schritte wurde entschieden?" },
      { id: "M2-02", text: "Welche Freigabe fehlt fuer den naechsten Schritt?" },
    ],
    "ZA-06": [
      { id: "M2-01", text: "Welche externe Stelle ist federfuehrend?" },
      { id: "M2-02", text: "Wie wird die Kommunikation dokumentiert und nachgehalten?" },
    ],
  },
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: {
    "AM-01": [
      { id: "M2-01", text: "Welcher Antrag liegt vor und welches Ziel wird verfolgt?" },
      { id: "M2-02", text: "Welche Kerninformationen zum Anlass sind gesichert?" },
    ],
    "AM-02": [
      { id: "M2-01", text: "Welche Fristen und Einreichungsvorgaben sind bindend?" },
      { id: "M2-02", text: "Welche Pflichtschritte sind noch offen?" },
    ],
    "AM-03": [
      { id: "M2-01", text: "Wer ist fuer Erstellung, Pruefung und Einreichung zustaendig?" },
      { id: "M2-02", text: "Wie ist die Vertretung bei Ausfall geregelt?" },
    ],
    "AM-04": [
      { id: "M2-01", text: "Welche Nachweise liegen bereits vollstaendig vor?" },
      { id: "M2-02", text: "Welche Dokumente fehlen fuer die Einreichung noch?" },
    ],
    "AM-05": [
      { id: "M2-01", text: "Welche Entscheidung zur Einreichung wurde getroffen?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch zu eskalieren?" },
    ],
    "AM-06": [
      { id: "M2-01", text: "Welche Risiken bedrohen den fristgerechten Abschluss?" },
      { id: "M2-02", text: "Welche Abhaengigkeiten koennen den Antrag blockieren?" },
    ],
  },
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: {
    "WB-01": [
      { id: "M2-01", text: "Welche Rollen oder Personen sind vom Nachweisthema betroffen?" },
      { id: "M2-02", text: "Welche Ausgangslage ist bereits dokumentiert?" },
    ],
    "WB-02": [
      { id: "M2-01", text: "Welche Fristen und Regeln fuer Punkte/Nachweise gelten?" },
      { id: "M2-02", text: "Welche Pflichtvorgaben sind noch nicht abschliessend geklaert?" },
    ],
    "WB-03": [
      { id: "M2-01", text: "Wer verantwortet die Nachverfolgung je Person?" },
      { id: "M2-02", text: "Wer prueft die Vollstaendigkeit vor Fristablauf?" },
    ],
    "WB-04": [
      { id: "M2-01", text: "Welche Nachweise/Punkte liegen bereits vor?" },
      { id: "M2-02", text: "Welche Belege muessen noch nachgereicht werden?" },
    ],
    "WB-05": [
      { id: "M2-01", text: "Welche Massnahmen wurden priorisiert?" },
      { id: "M2-02", text: "Welche Entscheidung steht noch aus?" },
    ],
    "WB-06": [
      { id: "M2-01", text: "Welche externe Stelle bestaetigt die Nachweise?" },
      { id: "M2-02", text: "Wie erfolgt die Uebermittlung an die externe Stelle?" },
    ],
  },
  [OFFICE_TOPIC_REPORTING_DUTIES]: {
    "MP-01": [
      { id: "M2-01", text: "Welches meldepflichtige Ereignis liegt vor?" },
      { id: "M2-02", text: "Welche Basisdaten sind bereits belastbar erfasst?" },
    ],
    "MP-02": [
      { id: "M2-01", text: "Welche Meldefrist und welche Formvorgaben gelten?" },
      { id: "M2-02", text: "Welche Pflichtteile der Meldung sind noch offen?" },
    ],
    "MP-03": [
      { id: "M2-01", text: "Wer erstellt, prueft und gibt die Meldung frei?" },
      { id: "M2-02", text: "Wie ist die Vertretung fuer den Meldeweg geregelt?" },
    ],
    "MP-04": [
      { id: "M2-01", text: "Welche Nachweise sind fuer die Meldung vorhanden?" },
      { id: "M2-02", text: "Welche Unterlagen fehlen noch bis zur finalen Abgabe?" },
    ],
    "MP-05": [
      { id: "M2-01", text: "Welche Entscheidung zur finalen Abgabe wurde getroffen?" },
      { id: "M2-02", text: "Welche interne Freigabe ist noch erforderlich?" },
    ],
    "MP-06": [
      { id: "M2-01", text: "Welche externe Stelle ist fuer die Meldung zustaendig?" },
      { id: "M2-02", text: "Welcher Kanal ist fuer Rueckfragen verbindlich?" },
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
