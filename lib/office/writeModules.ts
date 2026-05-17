import { OFFICE_TOPIC_REGRESS } from "@/lib/office/checkpointCatalog";

// ---------------------------------------------------------------------------
// OfficeWriteOutputKind – dokumentenspezifische Ausgabeart
// ---------------------------------------------------------------------------

/**
 * Kategorisiert ein WRITE-Modul nach dem erzeugten Dokumenttyp.
 *
 * Verwendet in `OfficeWriteTemplate.outputKind`.
 * Kein Bezug zu InquiryCheckpointKind.ACTION oder DerivedAction.
 */
export enum OfficeWriteOutputKind {
  STELLUNGNAHME          = "STELLUNGNAHME",
  WIDERSPRUCH            = "WIDERSPRUCH",
  ANFRAGE                = "ANFRAGE",
  GESPRAECHSLEITFADEN    = "GESPRAECHSLEITFADEN",
  INTERNE_NOTIZ          = "INTERNE_NOTIZ",
  UNTERLAGEN_ANFORDERUNG = "UNTERLAGEN_ANFORDERUNG",
  DATENSCHUTZ_MELDUNG    = "DATENSCHUTZ_MELDUNG",
  KV_ANTWORT             = "KV_ANTWORT",
}

// ---------------------------------------------------------------------------
// OfficeWriteKind – funktionale Rolle des Moduls
// ---------------------------------------------------------------------------

/**
 * Klassifiziert ein WRITE-Modul nach seiner kommunikativen Funktion.
 *
 * Orthogonal zu `OfficeWriteOutputKind`: ein GESPRAECHSLEITFADEN kann
 * INTERNAL_GUIDE sein; eine STELLUNGNAHME ist AUTHORITY_RESPONSE.
 *
 * Verwendet in `OfficeWriteTemplate.writeKind`.
 */
export enum OfficeWriteKind {
  AUTHORITY_RESPONSE  = "AUTHORITY_RESPONSE",
  INTERNAL_GUIDE      = "INTERNAL_GUIDE",
  DATA_REQUEST        = "DATA_REQUEST",
  INTERNAL_NOTE       = "INTERNAL_NOTE",
  STAFF_COMMUNICATION = "STAFF_COMMUNICATION",
}

// ---------------------------------------------------------------------------
// Input-Felder
// ---------------------------------------------------------------------------

export type OfficeWriteInputFieldKind = "text" | "multiline" | "date" | "select";

/**
 * Ein einzelnes Eingabefeld im Formular eines WRITE-Moduls.
 *
 * `defaultFromCheckpoint` ist ein optionaler Hinweis für die UI,
 * aus welchem Checkpoint-Snapshot-Feld ein Vorgabewert gelesen werden kann.
 * Format: "<checkpointId>.<feldname>", z. B. "RG-06.deadline".
 * Nicht ausgewertet durch den Renderer – reine UI-Konvention.
 */
export type OfficeWriteInputField = {
  key: string;
  label: string;
  kind: OfficeWriteInputFieldKind;
  required: boolean;
  defaultFromCheckpoint?: string;
  options?: string[];
  placeholder?: string;
};

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * Eine Einzelbedingung für den Trigger: Checkpoint muss den genannten State haben.
 * Fehlende Checkpoints im Snapshot gelten als OPEN (defensiver Default).
 */
export type OfficeWriteConditionItem = {
  checkpointId: string;
  state: "YES" | "NO" | "OPEN";
};

/**
 * Bestimmt, wann ein WRITE-Modul sichtbar (verfügbar) ist.
 *
 * Auswertungsreihenfolge:
 *   1. topicIds – falsches Topic → sofort nicht verfügbar.
 *   2. blockedWhenAnyOpen – mindestens ein genannter Checkpoint OPEN → gesperrt.
 *   3. allOf – alle Bedingungen müssen erfüllt sein.
 *   4. anyOf – mindestens eine Bedingung muss erfüllt sein.
 *   5. noneOf – keine der Bedingungen darf erfüllt sein.
 *
 * Leere Arrays gelten als erfüllt (vacuous truth).
 */
export type OfficeWriteTrigger = {
  /** Nur für diese Topic-IDs verfügbar. Leer = gilt für alle Topics. */
  topicIds: string[];
  /** Modul gesperrt, solange mindestens einer dieser Checkpoints OPEN ist. */
  blockedWhenAnyOpen?: string[];
  /** Alle Bedingungen müssen erfüllt sein (AND). */
  allOf?: OfficeWriteConditionItem[];
  /** Mindestens eine Bedingung muss erfüllt sein (OR). */
  anyOf?: OfficeWriteConditionItem[];
  /** Keine der Bedingungen darf erfüllt sein. */
  noneOf?: OfficeWriteConditionItem[];
};

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Statische Vorlage für ein WRITE-Modul.
 *
 * `bodyTemplate` nutzt `{{key}}`-Platzhalter.
 * Der Renderer (`renderOfficeWriteTemplate`) ersetzt bekannte Keys;
 * fehlende oder leere Keys erscheinen als `[{{key}}]` im Output.
 *
 * `smoothingEnabled` ist ein reines Flag – kein LLM-Aufruf im Renderer.
 * Die UI entscheidet anhand dieses Flags, ob der „Glätten"-Button sichtbar ist.
 */
export type OfficeWriteTemplate = {
  id: string;
  label: string;
  outputKind: OfficeWriteOutputKind;
  writeKind: OfficeWriteKind;
  trigger: OfficeWriteTrigger;
  inputSchema: OfficeWriteInputField[];
  /** Mustertext mit {{key}}-Platzhaltern. */
  bodyTemplate: string;
  /** Empfehlung: GPT-Glättung über POST /api/text/smooth sinnvoll? */
  smoothingEnabled: boolean;
  audience: "KV" | "KASSE" | "BEHOERDE" | "INTERN" | "EXTERNE_STELLE";
  estimatedLength: "SHORT" | "MEDIUM" | "LONG";
};

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/**
 * Statischer Katalog aller WRITE-Module.
 *
 * Phase 1: Pilot-Templates für Topic `regress-wirtschaftlichkeitspruefung`.
 * Weitere Topics werden in späteren Phasen ergänzt.
 */
export const OFFICE_WRITE_TEMPLATES: readonly OfficeWriteTemplate[] = [
  // ─── Regress: Stellungnahme ───────────────────────────────────────────────
  {
    id: "regress-stellungnahme",
    label: "Stellungnahme vorbereiten",
    outputKind: OfficeWriteOutputKind.STELLUNGNAHME,
    writeKind: OfficeWriteKind.AUTHORITY_RESPONSE,
    trigger: {
      topicIds: [OFFICE_TOPIC_REGRESS],
      /**
       * Sichtbar wenn Anlass (RG-01) und Pflichten/Fristen (RG-02) geklärt sind.
       * RG-04 und RG-05 dürfen NO/OPEN sein – die Stellungnahme soll auch
       * offene Unterlagen und fehlende Begründungen sichtbar machen.
       */
      allOf: [
        { checkpointId: "RG-01", state: "YES" },
        { checkpointId: "RG-02", state: "YES" },
      ],
      blockedWhenAnyOpen: ["RG-01", "RG-02"],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "bsnr",
        label: "Betriebsstättennummer (BSNR)",
        kind: "text",
        required: true,
        placeholder: "z. B. 123456789",
      },
      {
        key: "arztname",
        label: "Name des Vertragsarztes",
        kind: "text",
        required: true,
        placeholder: "z. B. Dr. med. Anna Müller",
      },
      {
        key: "lanr",
        label: "Lebenslange Arztnummer (LANR)",
        kind: "text",
        required: true,
        placeholder: "z. B. 123456789",
      },
      {
        key: "datum_schreiben",
        label: "Datum des Schreibens",
        kind: "date",
        required: true,
      },
      {
        key: "empfaenger_block",
        label: "Empfänger (vollständige Anschrift)",
        kind: "multiline",
        required: true,
        placeholder: "z. B. KV Berlin\nMasurenallee 6-8\n14057 Berlin",
      },
      {
        key: "pruefungszeitraum",
        label: "Geprüfter Zeitraum",
        kind: "text",
        required: true,
        placeholder: "z. B. Quartal 3/2024",
      },
      {
        key: "pruefungsgegenstand",
        label: "Prüfungsgegenstand",
        kind: "select",
        required: true,
        options: [
          "Verordnungskosten",
          "Überweisungsrate",
          "Arzneimittelkosten",
          "Sonstige",
        ],
      },
      {
        key: "aktenzeichen",
        label: "Aktenzeichen des Prüfbescheids",
        kind: "text",
        required: true,
        placeholder: "z. B. WP-2026-0042",
      },
      {
        key: "bescheid_datum",
        label: "Datum des Prüfbescheids",
        kind: "date",
        required: true,
      },
      {
        key: "begruendung",
        label: "Begründung / Stellungnahme",
        kind: "multiline",
        required: true,
        placeholder: "Sachliche Begründung zur Prüfung ...",
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen",
        kind: "text",
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0 oder mail@praxis.de",
      },
    ],
    bodyTemplate: `{{praxisname}}
BSNR: {{bsnr}}
{{datum_schreiben}}

{{empfaenger_block}}

Betreff: Stellungnahme zur Wirtschaftlichkeitsprüfung – {{pruefungsgegenstand}}, {{pruefungszeitraum}}
Bezug: Prüfbescheid vom {{bescheid_datum}}, Az. {{aktenzeichen}}

Sehr geehrte Damen und Herren,

hiermit nehmen wir Stellung zur laufenden Wirtschaftlichkeitsprüfung (§ 106 SGB V) für den Zeitraum {{pruefungszeitraum}}.

Prüfungsgegenstand: {{pruefungsgegenstand}}

Begründung:
{{begruendung}}

Wir bitten um Kenntnisnahme und stehen für Rückfragen zur Verfügung.

Mit freundlichen Grüßen
{{arztname}}
{{praxisname}}
LANR: {{lanr}}{{#if kontakt_rueckfragen}}
Kontakt für Rückfragen: {{kontakt_rueckfragen}}
{{/if}}`,
    smoothingEnabled: true,
    audience: "KV",
    estimatedLength: "MEDIUM",
  },

  // ─── Regress: Arztgespräch vorbereiten ───────────────────────────────────
  {
    id: "regress-arztgespraech-vorbereiten",
    label: "Arztgespräch vorbereiten",
    outputKind: OfficeWriteOutputKind.GESPRAECHSLEITFADEN,
    writeKind: OfficeWriteKind.INTERNAL_GUIDE,
    trigger: {
      topicIds: [OFFICE_TOPIC_REGRESS],
      /**
       * Sichtbar, sobald interne Verantwortung (RG-03) oder die
       * Entscheidung zum Vorgehen (RG-05) noch offen ist.
       */
      anyOf: [
        { checkpointId: "RG-03", state: "OPEN" },
        { checkpointId: "RG-05", state: "OPEN" },
      ],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "aktenzeichen",
        label: "Aktenzeichen (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. WP-2026-0042",
      },
      {
        key: "pruefungszeitraum",
        label: "Prüfungszeitraum (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Quartal 2/2024",
      },
      {
        key: "gespraechspartner",
        label: "Gesprächspartner",
        kind: "text",
        required: true,
        placeholder: "z. B. Dr. Müller",
      },
      {
        key: "geplantes_datum",
        label: "Geplantes Datum",
        kind: "date",
        required: false,
      },
      {
        key: "widerspruchsfrist",
        label: "Widerspruchsfrist",
        kind: "date",
        required: false,
      },
      {
        key: "offene_punkte",
        label: "Offene Punkte / Klärungsbedarf",
        kind: "multiline",
        required: true,
        placeholder: "Stichpunkte zu offenen Sachverhalten ...",
      },
      {
        key: "verantwortliche_person",
        label: "Verantwortliche Person (Folgeschritte)",
        kind: "text",
        required: false,
        placeholder: "z. B. Dr. Schmidt (Praxisleitung)",
      },
    ],
    bodyTemplate: `Gesprächsvorbereitung: Wirtschaftlichkeitsprüfung – Regress
Praxis: {{praxisname}}
Az.: {{aktenzeichen}} | Zeitraum: {{pruefungszeitraum}}

Gesprächspartner: {{gespraechspartner}}
Datum: {{geplantes_datum}}
Widerspruchsfrist: {{widerspruchsfrist}}

Ziel des Gesprächs:
Interne Klärung offener Sachverhalte zur laufenden Wirtschaftlichkeitsprüfung.

Offene Punkte:
{{offene_punkte}}

Nächste Schritte:
- Entscheidung zum weiteren Vorgehen verbindlich festlegen und dokumentieren
- Verantwortliche Person für Folgeschritte benennen: {{verantwortliche_person}}
- Fristgerechte Stellungnahme sicherstellen (Widerspruchsfrist: {{widerspruchsfrist}})`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  // ─── Regress: Unterlagen nachfordern ─────────────────────────────────────
  {
    id: "regress-unterlagen-nachfordern",
    label: "Unterlagen nachfordern",
    outputKind: OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
    writeKind: OfficeWriteKind.DATA_REQUEST,
    trigger: {
      topicIds: [OFFICE_TOPIC_REGRESS],
      /**
       * Sichtbar, wenn Nachweise (RG-04) fehlen (NO) oder noch offen sind.
       */
      anyOf: [
        { checkpointId: "RG-04", state: "NO" },
        { checkpointId: "RG-04", state: "OPEN" },
      ],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "bsnr",
        label: "Betriebsstättennummer (BSNR)",
        kind: "text",
        required: true,
        placeholder: "z. B. 123456789",
      },
      {
        key: "arztname",
        label: "Name des Vertragsarztes",
        kind: "text",
        required: true,
        placeholder: "z. B. Dr. med. Anna Müller",
      },
      {
        key: "lanr",
        label: "Lebenslange Arztnummer (LANR)",
        kind: "text",
        required: true,
        placeholder: "z. B. 123456789",
      },
      {
        key: "datum_schreiben",
        label: "Datum des Schreibens",
        kind: "date",
        required: true,
      },
      {
        key: "empfaenger_block",
        label: "Empfänger (vollständige Anschrift)",
        kind: "multiline",
        required: true,
        placeholder: "z. B. KV Berlin\nMasurenallee 6-8\n14057 Berlin",
      },
      {
        key: "pruefungszeitraum",
        label: "Geprüfter Zeitraum",
        kind: "text",
        required: true,
        placeholder: "z. B. Quartal 3/2024",
      },
      {
        key: "aktenzeichen",
        label: "Aktenzeichen des Prüfbescheids",
        kind: "text",
        required: true,
        placeholder: "z. B. WP-2026-0042",
      },
      {
        key: "frist_datum",
        label: "Antwortfrist",
        kind: "date",
        required: true,
      },
      {
        key: "fehlende_unterlagen",
        label: "Fehlende Unterlagen",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Verordnungsdaten, Praxisbesonderheiten ...",
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen",
        kind: "text",
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0 oder mail@praxis.de",
      },
    ],
    bodyTemplate: `{{praxisname}}
BSNR: {{bsnr}}
{{datum_schreiben}}

{{empfaenger_block}}

Betreff: Anforderung fehlender Unterlagen – Wirtschaftlichkeitsprüfung {{pruefungszeitraum}}
Bezug: Az. {{aktenzeichen}}

Sehr geehrte Damen und Herren,

zur vollständigen Bearbeitung der laufenden Wirtschaftlichkeitsprüfung ({{pruefungszeitraum}}) bitten wir Sie, uns bis spätestens {{frist_datum}} folgende Unterlagen zu übermitteln:

{{fehlende_unterlagen}}

Wir bitten um fristgerechte Rücksendung.

Mit freundlichen Grüßen
{{arztname}}
{{praxisname}}
LANR: {{lanr}}{{#if kontakt_rueckfragen}}
Kontakt für Rückfragen: {{kontakt_rueckfragen}}
{{/if}}`,
    smoothingEnabled: true,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },
];
