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
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type CarePlanFieldKind = "text" | "date" | "checkbox" | "textarea";

export type CarePlanField = {
  /** Stabile ID – darf nach Einführung nie geändert werden. */
  readonly id: string;
  /** Interne Arztformulierung (nicht patientenseitig). */
  readonly label: string;
  /** Interaktionstyp des Feldes. */
  readonly kind: CarePlanFieldKind;
  /** Optionaler Platzhaltertext (nur für text / textarea). */
  readonly placeholder?: string;
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
        id: "ha_naechster_termin",
        label: "Nächster Termin",
        kind: "date",
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
      {
        id: "fa_zeile_1",
        label: "Facharzt 1",
        kind: "text",
        placeholder: "z. B. Kardiologie – Dr. Müller – Termin 10.07.2026",
      },
      {
        id: "fa_zeile_2",
        label: "Facharzt 2",
        kind: "text",
        placeholder: "z. B. Diabetologie – Praxis am Markt – Termin offen",
      },
      {
        id: "fa_zeile_3",
        label: "Facharzt 3",
        kind: "text",
        placeholder: "z. B. Neurologie – noch kein Termin",
      },
    ],
  },

  // ── 3. Versorgung & Organisation ───────────────────────────────────────
  {
    id: "section_versorgung",
    title: "Versorgung & Organisation",
    fields: [
      {
        id: "v_medikamentenplan",
        label: "Medikamentenplan ausgehändigt",
        kind: "checkbox",
      },
      {
        id: "v_pflegedienst",
        label: "Pflegedienst / ambulante Pflege organisiert",
        kind: "checkbox",
      },
      {
        id: "v_hilfsmittel",
        label: "Hilfsmittel verordnet / beantragt",
        kind: "checkbox",
      },
      {
        id: "v_transport",
        label: "Krankentransport / Beförderung geklärt",
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
