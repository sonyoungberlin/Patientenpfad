import type { WorkflowRole } from "./types";
import {
  WORKFLOW_TOPIC_AU,
  WORKFLOW_TOPIC_REZEPT,
  WORKFLOW_TOPIC_UEBERWEISUNG,
  WORKFLOW_TOPIC_HEILMITTEL,
  WORKFLOW_TOPIC_HILFSMITTEL,
  WORKFLOW_TOPIC_KRANKENTRANSPORT,
  type WorkflowTopicId,
} from "./processCatalog";

export type WorkflowM2Question = {
  id: string;
  text: string;
};

/**
 * M2-Fragen pro M3-Checkpoint und Rolle.
 * Analog zu lib/office/m2Questions.ts, aber auf WF-Checkpoint-IDs gemappt.
 */
type M2QuestionsByCheckpoint = Record<
  string,
  { MFA?: readonly WorkflowM2Question[]; ARZT?: readonly WorkflowM2Question[] }
>;

const M2_QUESTIONS_BY_TOPIC: Record<WorkflowTopicId, M2QuestionsByCheckpoint> = {
  [WORKFLOW_TOPIC_AU]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Sind Name und Geburtsdatum im System vorhanden?" },
        { id: "M2-02", text: "Ist ein AU-Zeitraum mit Von-/Bis-Datum vorhanden?" },
        { id: "M2-03", text: "Ist ein ICD-10-Code vorhanden?" },
        { id: "M2-04", text: "Ist das Ausstellungsdatum vorhanden?" },
        { id: "M2-05", text: "Ist Erst- oder Folgebescheinigung angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Sind Zeitraum, ICD-10-Code und Ausstellungsdatum im Fall erfasst?" },
        { id: "M2-02", text: "Ist Erst-/Folge-AU im Fall nachvollziehbar?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Gibt es einen Kontakt-/Untersuchungsvermerk im Krankenblatt?" },
        { id: "M2-02", text: "Ist der Anlass der AU im Krankenblatt beschrieben?" },
        { id: "M2-03", text: "Ist dokumentiert, worauf die AU gestützt wurde? z. B. Praxisbesuch, Videosprechstunde, Telefonkontakt, digitale Anfrage, Angehörige/Pflegedienst." },
      ],
      ARZT: [
        { id: "M2-01", text: "Sind Beschwerden, Befund oder Kontaktinhalt beschrieben?" },
        { id: "M2-02", text: "Ist die Kontaktart dokumentiert? Persönlich, Video, Telefon, digitale Anfrage, Kontaktperson." },
        { id: "M2-03", text: "Ist nachvollziehbar, worauf die Arbeitsunfähigkeit gestützt wurde?" },
        { id: "M2-04", text: "Ist bei besonderer Kontaktart die Grundlage nachvollziehbar beschrieben?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gab es in letzter Zeit mehrere AU-Anfragen?" },
        { id: "M2-02", text: "Gibt es Hinweise auf besondere Rahmenbedingungen? z. B. Arbeitgeber, Jobcenter, Prüfung, Reise, Konflikt, Pflege-/Familiensituation." },
        { id: "M2-03", text: "Gibt es frühere Hinweise oder Absprachen zur AU in der Akte?" },
        { id: "M2-04", text: "Wurde der Patient bereits um Termin, Untersuchung oder Unterlagen gebeten?" },
        { id: "M2-05", text: "Ist erkennbar, ob diese Absprachen eingehalten wurden?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Gibt es im Verlauf Besonderheiten, die fuer die Dokumentation relevant sind?" },
        { id: "M2-02", text: "Gibt es häufige AU-Anfragen, wiederkehrende Muster oder frühere Absprachen?" },
        { id: "M2-03", text: "Gibt es externe Rahmenbedingungen? Arbeitgeber, Jobcenter, Prüfung, Reise, Konflikt." },
        { id: "M2-04", text: "Gibt es psychosoziale Belastungen, bekannte Vorerkrankungen oder Versorgungsthemen, die für den Verlauf relevant sind?" },
        { id: "M2-05", text: "Gibt es Gründe für eine besonders knappe oder ausführliche Dokumentation?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist eine Wiedervorstellung oder Kontrolle angegeben?" },
        { id: "M2-02", text: "Ist ein nächster Schritt dokumentiert? z. B. Termin, Untersuchung, Unterlagen, Rückmeldung, Facharztkontakt." },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, ob und wann eine Wiedervorstellung erforderlich ist?" },
        { id: "M2-02", text: "Ist dokumentiert, ob Unterlagen, Befunde oder weitere Untersuchungen benötigt werden?" },
        { id: "M2-03", text: "Ist dokumentiert, was bei erneuter Anfrage gelten soll?" },
      ],
    },
  },
  [WORKFLOW_TOPIC_REZEPT]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Ist das Präparat benannt?" },
        { id: "M2-02", text: "Sind Wirkstärke, Packungsgröße/Menge und Dosierung erfasst?" },
        { id: "M2-03", text: "Ist erkennbar, ob es sich um Akut- oder Dauermedikation handelt?" },
        { id: "M2-04", text: "Sind Kostenträger / Versichertenstatus erfasst?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist das Präparat mit Wirkstärke und Dosierung erfasst?" },
        { id: "M2-02", text: "Ist erkennbar, ob Akut- oder Dauermedikation?" },
        { id: "M2-03", text: "Sind Kostenträger / Versichertenstatus erfasst?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Liegt eine bekannte Diagnose oder Dauermedikation vor?" },
        { id: "M2-02", text: "Sind Hinweise auf Unverträglichkeiten oder Wechselwirkungen in der Akte erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Indikation für das Präparat aus der Akte nachvollziehbar?" },
        { id: "M2-02", text: "Ist die aktuelle Medikamentenliste im System erkennbar?" },
        { id: "M2-03", text: "Gibt es Hinweise auf Kontraindikationen oder relevante Wechselwirkungen?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gibt es frühere Anfragen für dasselbe oder ähnliche Präparate?" },
        { id: "M2-02", text: "Gibt es Hinweise auf Dosisänderungen oder Therapieabbrüche?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Gibt es Verlaufshinweise, die für die Verordnung relevant sind?" },
        { id: "M2-02", text: "Gibt es Hinweise auf besondere Rahmenbedingungen? z. B. Langzeittherapie, Betäubungsmittel, Hilfsmittelbedarf." },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist dokumentiert, ob Laborkontrolle oder Wiedervorstellung erforderlich ist?" },
        { id: "M2-02", text: "Ist ein nächster Schritt erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, ob und wann eine Kontrolle oder Folgeverordnung geplant ist?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_UEBERWEISUNG]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Ist das Überweisungsziel (Fachrichtung / Einrichtung) angegeben?" },
        { id: "M2-02", text: "Ist der Überweisungsschein vollständig ausgefüllt?" },
        { id: "M2-03", text: "Sind Patientendaten und Datum angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Fragestellung für die Überweisung formuliert?" },
        { id: "M2-02", text: "Sind Fachrichtung und Überweisungsanlass angegeben?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Liegt ein dokumentierter Anlass für die Überweisung vor?" },
        { id: "M2-02", text: "Ist die Dringlichkeit erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Indikation für die Überweisung dokumentiert?" },
        { id: "M2-02", text: "Sind relevante Vorbefunde oder Vorgeschichte angegeben?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gibt es frühere Überweisungen in ähnlichem Kontext?" },
        { id: "M2-02", text: "Gibt es Hinweise auf besondere Rahmenbedingungen?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist der Verlauf dokumentiert, der zur Überweisung geführt hat?" },
        { id: "M2-02", text: "Gibt es Vorbefunde oder Berichte, die mitgegeben werden sollen?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist dokumentiert, ob Befunde erwartet werden?" },
        { id: "M2-02", text: "Ist ein nächster Schritt oder Wiedervorstellungstermin erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, was nach Erhalt des Befunds folgen soll?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_HEILMITTEL]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Sind Heilmittelart, Frequenz und Verordnungsmenge angegeben?" },
        { id: "M2-02", text: "Sind Diagnosegruppe und ICD-10 erfasst?" },
        { id: "M2-03", text: "Ist der Therapiebeginn angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Sind Heilmittel, Menge und Frequenz erkennbar angegeben?" },
        { id: "M2-02", text: "Ist die Diagnosegruppe dokumentiert?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Liegt eine bekannte Indikation für das Heilmittel vor?" },
        { id: "M2-02", text: "Ist erkennbar, ob eine Vorverordnung vorliegt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Therapiebegründung aus der Akte nachvollziehbar?" },
        { id: "M2-02", text: "Ist der aktuelle Therapiebedarf erkennbar?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gibt es Vorverordnungen für dasselbe Heilmittel?" },
        { id: "M2-02", text: "Gibt es Hinweise auf Therapieabbrüche oder Therapieerfolge?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Gibt es Verlaufshinweise, die den Therapiebedarf stützen?" },
        { id: "M2-02", text: "Gibt es Besonderheiten im bisherigen Therapieverlauf?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist dokumentiert, ob ein Kontrolltermin oder eine Verlaufsprüfung geplant ist?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, ab wann und in welchen Abständen der Therapieerfolg geprüft wird?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_HILFSMITTEL]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Sind Patientendaten und das Hilfsmittel vollständig angegeben?" },
        { id: "M2-02", text: "Ist der ICD-10-Code erfasst?" },
        { id: "M2-03", text: "Ist die Versorgungsart angegeben? z. B. Erstversorgung, Ersatz, Reparatur." },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist das Hilfsmittel konkret benannt?" },
        { id: "M2-02", text: "Ist die Diagnose erfasst?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Liegt eine bekannte Indikation für das Hilfsmittel vor?" },
        { id: "M2-02", text: "Gibt es Hinweise auf frühere Versorgungen?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Notwendigkeit des Hilfsmittels aus der Akte nachvollziehbar?" },
        { id: "M2-02", text: "Ist die Grunderkrankung dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gibt es Hinweise auf frühere Versorgung oder Ablehnung durch die Krankenkasse?" },
        { id: "M2-02", text: "Gibt es Hinweise auf veränderten Bedarf oder geänderte Lebensumstände?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist im Verlauf dokumentiert, warum das Hilfsmittel jetzt erforderlich ist?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist dokumentiert, ob Kontakt mit Leistungserbringer (Sanitätshaus o. ä.) geplant ist?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, ob eine Kontrolle des Versorgungserfolgs geplant ist?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Sind Datum, Transportziel und Transportart angegeben?" },
        { id: "M2-02", text: "Sind Patientendaten und Kostenträger erfasst?" },
        { id: "M2-03", text: "Ist erkennbar, ob Einzel- oder Serienfahrten beantragt werden?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Transportart dokumentiert? z. B. Taxi, KTW, RTW." },
        { id: "M2-02", text: "Ist die medizinische Notwendigkeit erkennbar angegeben?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Liegt eine bekannte Erkrankung vor, die den Transport begründet?" },
        { id: "M2-02", text: "Ist die Dringlichkeit oder Transportart erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist die Transportnotwendigkeit aus dem Krankheitsbild nachvollziehbar?" },
        { id: "M2-02", text: "Ist die gewählte Transportart begründbar?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Gab es frühere Transportverordnungen für diesen Patienten?" },
        { id: "M2-02", text: "Gibt es Hinweise auf besondere Rahmenbedingungen? z. B. Pflegesituation, Mobilitätseinschränkung." },
      ],
      ARZT: [
        { id: "M2-01", text: "Gibt es im Verlauf Hinweise, die die Transportnotwendigkeit stützen?" },
        { id: "M2-02", text: "Gibt es Besonderheiten, die für künftige Fahrten relevant sein könnten?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Ist dokumentiert, ob Rücktransport oder weiterer Transport erforderlich ist?" },
        { id: "M2-02", text: "Ist ein nächster Schritt oder Termin erkennbar?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Ist dokumentiert, was nach dem Transport folgen soll?" },
      ],
    },
  },};

export function getM2QuestionsForCheckpoint(
  topicId: WorkflowTopicId,
  checkpointId: string,
  role: WorkflowRole,
): readonly WorkflowM2Question[] {
  const byCheckpoint = M2_QUESTIONS_BY_TOPIC[topicId];
  if (!byCheckpoint) return [];
  const byRole = byCheckpoint[checkpointId];
  if (!byRole) return [];
  return byRole[role] ?? [];
}
