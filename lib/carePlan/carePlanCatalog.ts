/**
 * Statischer Katalog für den internen „Persönlichen Versorgungsplan".
 *
 * Vollständig isoliert von PatientQuestionnaireSession, CaseSession,
 * Checkpoint-Logik und dem Patienten-Fragebogen-System.
 *
 * Nur für interne Nutzung durch Arzt / Praxis – niemals patientenseitig.
 * Kein API-Endpunkt, kein Prisma, keine Persistenz in V1.
 *
 * Feldtypen:
 *   - "checkbox" : Aussage anklicken → erscheint im Output als „✓ …"
 *   - "text"     : Einzeilige Freitext-Eingabe
 *   - "date"     : Datum (ISO-Format aus Browser-Input)
 *   - "textarea" : Mehrzeilige Freitext-Eingabe
 *   - "select"   : Auswahl aus vordefinierten Optionen (→ wie text im Output)
 *
 * Sonderfelder:
 *   - rowGroup     : Felder mit gleicher rowGroup werden im Output als eine
 *                    kombinierte Zeile ausgegeben (Werte mit „ – " verbunden).
 *   - rowGroupLabel: Angezeigter Gruppen-Titel im Panel (nur am ersten Feld).
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type CarePlanFieldKind = "text" | "date" | "checkbox" | "textarea" | "select";

export type CarePlanField = {
  /** Stabile ID – darf nach Einführung nie geändert werden. */
  readonly id: string;
  /** Interne Arztformulierung (nicht patientenseitig). */
  readonly label: string;
  /** Interaktionstyp des Feldes. */
  readonly kind: CarePlanFieldKind;
  /** Optionaler Platzhaltertext (nur für text / textarea). */
  readonly placeholder?: string;
  /** Auswahl-Optionen – nur für kind "select". */
  readonly options?: readonly string[];
  /**
   * Optionale Gruppen-ID für kombinierte Ausgabe:
   * Alle Felder mit gleicher rowGroup werden im Renderer als eine
   * „{part1} – {part2} – {part3}"-Zeile zusammengefasst.
   */
  readonly rowGroup?: string;
  /**
   * Angezeigter Gruppen-Titel im Panel.
   * Nur am ersten Feld einer Gruppe setzen.
   */
  readonly rowGroupLabel?: string;
};

export type CarePlanSection = {
  /** Stabile ID der Sektion. */
  readonly id: string;
  /** Angezeigter Abschnitts-Titel. */
  readonly title: string;
  /** Geordnete Felder dieser Sektion. */
  readonly fields: readonly CarePlanField[];
};

// ---------------------------------------------------------------------------
// Wiederverwendete Optionslisten
// ---------------------------------------------------------------------------

export const INTERVAL_OPTIONS = [
  "1x im Quartal",
  "halbjährlich",
  "jährlich",
  "individuell",
] as const;

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

export const CARE_PLAN_SECTIONS: readonly CarePlanSection[] = [
  // ── 1. Hausärztliche Betreuung ─────────────────────────────────────────
  {
    id: "section_hausarzt",
    title: "Hausärztliche Betreuung",
    fields: [
      {
        id: "ha_datum",
        label: "Datum des Gesprächs",
        kind: "date",
      },
      {
        id: "ha_anlass",
        label: "Anlass / Diagnose",
        kind: "textarea",
        placeholder: "z. B. Hypertonie, Diabetes Typ 2, Herzinsuffizienz …",
      },
      {
        id: "ha_kontrolle_aerztlich",
        label: "Ärztliche Kontrolle",
        kind: "select",
        options: INTERVAL_OPTIONS,
      },
      {
        id: "ha_kontrolle_labor",
        label: "Laborkontrolle",
        kind: "select",
        options: INTERVAL_OPTIONS,
      },
      {
        id: "ha_notizen",
        label: "Notizen / Vereinbarungen",
        kind: "textarea",
        placeholder: "Weitere Informationen zum Behandlungsverlauf …",
      },
    ],
  },

  // ── 2. Fachärztliche Betreuung ─────────────────────────────────────────
  {
    id: "section_fachaerzte",
    title: "Fachärztliche Betreuung",
    fields: [
      // Facharzt 1
      {
        id: "fa_1_fachrichtung",
        label: "Fachrichtung",
        kind: "text",
        rowGroup: "fa_1",
        rowGroupLabel: "Facharzt 1",
        placeholder: "z. B. Kardiologie",
      },
      {
        id: "fa_1_praxis",
        label: "Praxis / Arzt",
        kind: "text",
        rowGroup: "fa_1",
        placeholder: "z. B. Dr. Müller",
      },
      {
        id: "fa_1_intervall",
        label: "Kontrollintervall",
        kind: "select",
        rowGroup: "fa_1",
        options: INTERVAL_OPTIONS,
      },
      // Facharzt 2
      {
        id: "fa_2_fachrichtung",
        label: "Fachrichtung",
        kind: "text",
        rowGroup: "fa_2",
        rowGroupLabel: "Facharzt 2",
        placeholder: "z. B. Diabetologie",
      },
      {
        id: "fa_2_praxis",
        label: "Praxis / Arzt",
        kind: "text",
        rowGroup: "fa_2",
      },
      {
        id: "fa_2_intervall",
        label: "Kontrollintervall",
        kind: "select",
        rowGroup: "fa_2",
        options: INTERVAL_OPTIONS,
      },
      // Facharzt 3
      {
        id: "fa_3_fachrichtung",
        label: "Fachrichtung",
        kind: "text",
        rowGroup: "fa_3",
        rowGroupLabel: "Facharzt 3",
        placeholder: "z. B. Neurologie",
      },
      {
        id: "fa_3_praxis",
        label: "Praxis / Arzt",
        kind: "text",
        rowGroup: "fa_3",
      },
      {
        id: "fa_3_intervall",
        label: "Kontrollintervall",
        kind: "select",
        rowGroup: "fa_3",
        options: INTERVAL_OPTIONS,
      },
    ],
  },

  // ── 3. Versorgung & Organisation ───────────────────────────────────────
  {
    id: "section_versorgung",
    title: "Versorgung & Organisation",
    fields: [
      {
        id: "v_rezepte_digital",
        label:
          "Wenn Kontrolltermine wahrgenommen werden und alle Informationen vollständig vorliegen, sind Rezepte digital möglich.",
        kind: "checkbox",
      },
      {
        id: "v_ueberweisungen_digital",
        label:
          "Wenn Kontrolltermine wahrgenommen werden und alle Informationen vollständig vorliegen, sind Überweisungen digital möglich.",
        kind: "checkbox",
      },
      {
        id: "v_facharztberichte",
        label: "Facharztberichte werden regelmäßig nachgereicht oder angefordert.",
        kind: "checkbox",
      },
      {
        id: "v_medikamentenplan",
        label: "Der Medikamentenplan wird regelmäßig aktualisiert.",
        kind: "checkbox",
      },
      {
        id: "v_digitale_wege",
        label: "Digitale Praxiswege werden bevorzugt genutzt.",
        kind: "checkbox",
      },
      {
        id: "v_notizen",
        label: "Notizen / Offene Punkte",
        kind: "textarea",
        placeholder: "Weitere organisatorische Punkte …",
      },
    ],
  },

  // ── 4. Unterstützende Personen ─────────────────────────────────────────
  {
    id: "section_unterstuetzung",
    title: "Unterstützende Personen",
    fields: [
      {
        id: "u_angehoerige",
        label: "Angehörige / Bezugsperson informiert",
        kind: "checkbox",
      },
      {
        id: "u_sozialberatung",
        label: "Sozialberatung empfohlen",
        kind: "checkbox",
      },
      {
        id: "u_selbsthilfe",
        label: "Selbsthilfegruppe empfohlen",
        kind: "checkbox",
      },
      {
        id: "u_notizen",
        label: "Notizen",
        kind: "textarea",
        placeholder: "Namen, Kontakte, Aufgaben …",
      },
    ],
  },

  // ── 5. Gemeinsame Vereinbarung ─────────────────────────────────────────
  {
    id: "section_vereinbarung",
    title: "Gemeinsame Vereinbarung",
    fields: [
      {
        id: "gv_warnsymptome",
        label: "Warnsymptome erklärt",
        kind: "checkbox",
      },
      {
        id: "gv_notfallplan",
        label: "Notfallplan besprochen",
        kind: "checkbox",
      },
      {
        id: "gv_eigenverantwortung",
        label: "Eigenverantwortung und Mitwirkung besprochen",
        kind: "checkbox",
      },
      {
        id: "gv_freitext",
        label: "Individuelle Vereinbarung",
        kind: "textarea",
        placeholder: "Freitext für individuelle Absprachen …",
      },
      {
        id: "gv_datum",
        label: "Datum der Vereinbarung",
        kind: "date",
      },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Gibt alle Felder aller Sektionen als flache Liste zurück.
 * Wird vom Panel zum Initialisieren des State verwendet.
 */
export function getAllCarePlanFields(): readonly CarePlanField[] {
  return CARE_PLAN_SECTIONS.flatMap((s) => s.fields);
}
