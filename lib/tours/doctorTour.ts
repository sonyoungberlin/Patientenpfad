/**
 * Zentrale Tour-Definition für die Arzt-Demo-Tour (v1).
 *
 * Jeder Schritt beschreibt eine Station im ärztlichen Workflow.
 * Die Reihenfolge der Schritte entspricht der UI-Reihenfolge.
 *
 * Neue Schritte ergänzen: Einfach ein weiteres Objekt in das DOCTOR_TOUR-Array
 * einfügen. Die Felder `id` (eindeutig), `title` und `body` sind Pflichtfelder.
 * Optional: `route`, `targetDataTourId` (passend zur `data-tour-id`-Eigenschaft
 * des jeweiligen UI-Elements) und `role`.
 */

export type TourStep = {
  /** Eindeutige ID dieses Schritts. */
  id: string;
  /** Route, auf der dieser Schritt stattfindet (z. B. "/" oder "/cases"). */
  route?: string;
  /** Überschrift des Schritts. */
  title: string;
  /** Erklärungstext des Schritts. */
  body: string;
  /**
   * Optionaler Verweis auf ein UI-Element über dessen `data-tour-id`-Attribut.
   * Wenn gesetzt, hebt der TourController das passende Element beim Anzeigen
   * dieses Schritts visuell hervor und scrollt es in den sichtbaren Bereich.
   */
  targetDataTourId?: string;
  /** Zielrolle – aktuell immer "doctor" für die Arzt-Demo-Tour. */
  role?: "doctor";
};

export const DOCTOR_TOUR: TourStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "Willkommen in der Arzt-Demo",
    body: "Diese Tour erklärt den Ablauf aus Arztsicht. Sie führt Sie durch die wichtigsten Schritte der Anwendung – ohne den normalen Workflow zu beeinflussen. Sie können die Tour jederzeit beenden.",
    role: "doctor",
  },
  {
    id: "m1-intro",
    route: "/",
    title: "Schritt 1: Aktivierungsblöcke (M1)",
    body: "Zu Beginn bewerten Sie vier Bereiche: Kommunikation, Medizinische Lage, Versorgung im Alltag und Pflegebeobachtung. Für jeden Bereich wählen Sie, ob die Situation klar oder unklar ist.",
    targetDataTourId: "m1-form",
    role: "doctor",
  },
  {
    id: "m1-blocks",
    route: "/",
    title: "Klar oder Unklar?",
    body: "Klar bedeutet: Es liegen ausreichend Informationen für eine Entscheidung vor. Unklar bedeutet: Es fehlen noch Angaben. Nur unklare Bereiche aktivieren Checkpoints für den weiteren Workflow.",
    targetDataTourId: "m1-form",
    role: "doctor",
  },
  {
    id: "mode-selection",
    route: "/",
    title: "Modus auswählen",
    body: "Sie können einen Fall als Gast starten (ohne Patientenbezug) oder mit Praxiszuordnung. Bei der Praxiszuordnung können Sie eine Patientennummer vergeben, um den Fall später in der Übersicht leicht wiederzufinden.",
    targetDataTourId: "mode-selection",
    role: "doctor",
  },
  {
    id: "multi-select",
    route: "/",
    title: "Optionale Versorgungsaspekte",
    body: "Unterhalb der Hauptbewertung können Sie weitere Versorgungsaspekte dokumentieren. Diese Mehrfachauswahl ist optional und dient der strukturierten Erfassung ergänzender Informationen – ohne Einfluss auf den M1/M2/M3-Workflow.",
    targetDataTourId: "multi-select-section",
    role: "doctor",
  },
  {
    id: "create-case",
    route: "/",
    title: "Fall anlegen oder direkt vorbereiten",
    body: "Mit Fall anlegen starten Sie den Checkpoint-Workflow (M2/M3). Mit Ärztlich vorbereitet markieren Sie den Fall direkt als vorbereitet und gelangen zur Fallübersicht – ohne den M2/M3-Durchlauf.",
    targetDataTourId: "create-actions",
    role: "doctor",
  },
  {
    id: "case-list",
    route: "/cases",
    title: "Fallübersicht",
    body: "In der Fallübersicht sehen Sie alle Ihre Fälle mit ihrem aktuellen Status. Sie können Fälle weiterbearbeiten, nach Patienten-Referenz suchen oder Fälle aus der Liste entfernen.",
    role: "doctor",
  },
  {
    id: "case-status",
    route: "/cases",
    title: "Status der Fälle verstehen",
    body: "Jeder Fall zeigt seinen Bearbeitungsstand: Fall geöffnet, Vorbereitung abgeschlossen, Ärztlich vorbereitet oder Ärztlich bestätigt. So behalten Sie den Überblick über alle laufenden Fälle.",
    role: "doctor",
  },
  {
    id: "finish",
    route: "/",
    title: "Tour abgeschlossen",
    body: "Sie haben die Arzt-Demo-Tour abgeschlossen. Im normalen Workflow stehen Ihnen alle gezeigten Funktionen zur Verfügung. Sie können die Tour jederzeit erneut starten.",
    role: "doctor",
  },
];
