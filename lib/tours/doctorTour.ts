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
  /**
   * Optionaler Pfad zu einem Demo-Screenshot (relativ zu /public).
   * Wird in der Demo-Tour-Seite (/demo/arzt) angezeigt, falls vorhanden.
   * Beispiel: "/demo/screens/step-1-m1-form.png"
   */
  imageSrc?: string;
  /** Alt-Text für das Demo-Bild (Pflicht, wenn imageSrc gesetzt ist). */
  imageAlt?: string;
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
    body: "Sie verlassen jetzt die ärztliche Vorbereitung. Der Fall liegt in der Fallliste und kann von der Praxis weiter vorbereitet werden.",
    targetDataTourId: "case-list",
    role: "doctor",
  },
  // --- 7 – Vorbereitung (M2, MFA) ------------------------------------------
  {
    id: "m2-preparation",
    route: "/cases",
    title: "Vorbereitung der Informationen",
    body: "Wenn die MFA den Fall öffnet, beginnt die Vorbereitung. Die MFA wählt den sinnvollsten Weg: selbst vorbereiten oder den Patienten bzw. eine Kontaktperson einbeziehen. Es wird nur festgehalten, was vorliegt und was fehlt.",
    role: "doctor",
  },
  // --- 8 – Ärztliche Bewertung (M3) ----------------------------------------
  {
    id: "m3-review",
    route: "/cases",
    title: "Ärztliche Bewertung",
    body: "Nach der Vorbereitung sieht der Arzt den Ist-Stand der vorliegenden Informationen. Jetzt wird bewertet, ob die Informationen für den Moment ausreichen oder ob noch etwas geklärt werden muss.",
    targetDataTourId: "m3-checklist",
    role: "doctor",
  },
  // --- 9 – Entscheidungsreihenfolge ----------------------------------------
  {
    id: "m3-order",
    route: "/cases",
    title: "Wie Sie bewerten",
    body: "Gehen Sie in der Reihenfolge der Buttons vor: zuerst 'reicht aus', dann 'reicht nicht aus', oder 'zurückstellen', wenn Sie noch nicht entscheiden möchten.",
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
    body: "Aus der Bewertung entstehen vorbereitete Texte. Sie können für die Patientenkommunikation und für die Dokumentation im Praxissystem genutzt werden.",
    role: "doctor",
  },
  // --- 12 – Abschluss des Falls --------------------------------------------
  {
    id: "case-done",
    route: "/cases",
    title: "Fall abgeschlossen",
    body: "Der Fall ist eine Momentaufnahme des aktuellen Stands. Nach der Nutzung der Texte wird der Fall aus der Fallliste entfernt.",
    role: "doctor",
  },
];
