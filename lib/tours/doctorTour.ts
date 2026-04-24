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
  // --- 1 – Einstieg --------------------------------------------------------
  {
    id: "why-this-tool",
    route: "/",
    title: "Warum dieses Tool?",
    body: "Dieses Tool nutzen Sie, wenn im Termin klar wird, dass wichtige Informationen fehlen. Zum Beispiel bei Neupatienten oder unklarer Vorgeschichte. Statt alles im Termin klären zu müssen, wird hier strukturiert vorbereitet, was noch fehlt.",
    role: "doctor",
  },
  // --- 2 – Anlass / Besonderheiten -----------------------------------------
  {
    id: "multi-select",
    route: "/",
    title: "Anlass festlegen (optional)",
    body: "Hier können Sie den Kontext des Falls markieren, z. B. Neupatient oder Formularanliegen. Das hilft bei der Einordnung, ist aber optional.",
    targetDataTourId: "multi-select-section",
    role: "doctor",
  },
  // --- 3 – Unklare Bereiche ------------------------------------------------
  {
    id: "unclear-areas",
    route: "/",
    title: "Was ist noch unklar?",
    body: "Alle Bereiche sind zunächst auf unklar gesetzt. Sie klicken nur weg, was bereits geklärt ist. So legen Sie fest, was vorbereitet werden soll.",
    targetDataTourId: "m1-form",
    role: "doctor",
  },
  // --- 4 – Einschätzung (K12) ----------------------------------------------
  {
    id: "k12-assessment",
    route: "/",
    title: "Einschätzung hinzufügen (optional)",
    body: "Hier können Sie zusätzlich eine Rückmeldung zur Alltagssituation einholen. Das ist sinnvoll, wenn eine Kontaktperson den Patienten gut kennt.",
    targetDataTourId: "k12-checkbox",
    role: "doctor",
  },
  // --- 5 – Ärztlich vorbereitet --------------------------------------------
  {
    id: "mark-prepared",
    route: "/",
    title: "Vorbereitung abschließen",
    body: "Hier legen Sie fest: Das sind die offenen Bereiche, die jetzt geklärt werden sollen. Der Fall erscheint anschließend in der Fallliste.",
    targetDataTourId: "create-actions",
    role: "doctor",
  },
  // --- 6 – Fallliste -------------------------------------------------------
  {
    id: "case-list",
    route: "/cases",
    title: "Weitergabe an die Praxis",
    body: "Der Fall liegt jetzt in der Fallliste. Die MFA übernimmt die Vorbereitung und sammelt die fehlenden Informationen.",
    targetDataTourId: "case-list",
    role: "doctor",
  },
  // --- 7 – Vorbereitung (M2, MFA) ------------------------------------------
  {
    id: "m2-preparation",
    route: "/cases",
    title: "Vorbereitung der Informationen",
    body: "Die MFA wählt den sinnvollsten Weg: entweder selbst vorbereiten oder den Patienten bzw. eine Kontaktperson einbeziehen. Es wird nur festgehalten, was vorliegt und was fehlt.",
    role: "doctor",
  },
  // --- 8 – Ärztliche Bewertung (M3) ----------------------------------------
  {
    id: "m3-review",
    route: "/cases",
    title: "Ärztliche Bewertung",
    body: "Sie entscheiden: reicht aus, reicht nicht aus oder zurückstellen. Damit legen Sie fest, welche Bereiche noch geklärt werden müssen.",
    targetDataTourId: "m3-checklist",
    role: "doctor",
  },
  // --- 9 – Entscheidungsreihenfolge ----------------------------------------
  {
    id: "m3-order",
    route: "/cases",
    title: "Wie Sie bewerten",
    body: "Gehen Sie von oben nach unten vor: Zuerst 'reicht aus', dann 'reicht nicht aus', oder 'zurückstellen', wenn Sie noch nicht entscheiden möchten.",
    role: "doctor",
  },
  // --- 10 – Abschluss ------------------------------------------------------
  {
    id: "confirm-case",
    route: "/cases",
    title: "Ärztlich bestätigt",
    body: "Hier wird der aktuelle Stand festgelegt. Danach wird der Fall nicht mehr verändert.",
    targetDataTourId: "confirm-action",
    role: "doctor",
  },
  // --- 11 – Texte nutzen ---------------------------------------------------
  {
    id: "use-texts",
    route: "/cases",
    title: "Texte verwenden",
    body: "Sie müssen keinen Freitext mehr schreiben. Die vorbereiteten Texte können für Patientenkommunikation und Dokumentation genutzt werden.",
    role: "doctor",
  },
  // --- 12 – Abschluss des Falls --------------------------------------------
  {
    id: "case-done",
    route: "/cases",
    title: "Fall abgeschlossen",
    body: "Der Fall ist eine Momentaufnahme des aktuellen Stands. Nach der Nutzung der Texte wird er aus der Fallliste entfernt.",
    role: "doctor",
  },
];
