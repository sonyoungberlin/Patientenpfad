import {
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
} from "@/lib/office/checkpointCatalog";

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
  BETROFFENENINFORMATION = "BETROFFENENINFORMATION",
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
  PERSON_COMMUNICATION = "PERSON_COMMUNICATION",
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

  // ─── KV-Schreiben: Antwortschreiben ──────────────────────────────────────
  {
    id: "kv-antwortschreiben",
    label: "KV-Antwortschreiben erstellen",
    outputKind: OfficeWriteOutputKind.KV_ANTWORT,
    writeKind: OfficeWriteKind.AUTHORITY_RESPONSE,
    trigger: {
      topicIds: [OFFICE_TOPIC_KV_BILLING],
      /**
       * Sichtbar wenn beanstandeter Sachverhalt erfasst (KV-01) und
       * Frist/Formalien geprüft (KV-02) – beide müssen YES sein.
       * Solange einer der beiden OPEN ist, ist das Schreiben gesperrt.
       */
      allOf: [
        { checkpointId: "KV-01", state: "YES" },
        { checkpointId: "KV-02", state: "YES" },
      ],
      blockedWhenAnyOpen: ["KV-01", "KV-02"],
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
        key: "aktenzeichen",
        label: "Aktenzeichen des KV-Schreibens",
        kind: "text",
        required: true,
        placeholder: "z. B. ABR-2026-0099",
      },
      {
        key: "datum_kv_schreiben",
        label: "Datum des KV-Schreibens",
        kind: "text",
        required: true,
        placeholder: "z. B. 05.05.2026",
      },
      {
        key: "abrechnungszeitraum",
        label: "Abrechnungszeitraum",
        kind: "text",
        required: true,
        placeholder: "z. B. Quartal 2/2025",
      },
      {
        key: "antwortfrist",
        label: "Antwortfrist (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. 30.05.2026",
      },
      {
        key: "beanstandete_leistung",
        label: "Beanstandete Leistung / GOP",
        kind: "text",
        required: true,
        placeholder: "z. B. GOP 13250 – Hämodynamische Messung",
      },
      {
        key: "sachverhalt",
        label: "Sachverhaltsdarstellung",
        kind: "multiline",
        required: true,
        placeholder: "Kurze Darstellung des beanstandeten Sachverhalts ...",
      },
      {
        key: "fachliche_einschaetzung",
        label: "Fachliche Einschätzung / Begründung",
        kind: "multiline",
        required: true,
        placeholder: "Medizinisch-fachliche Begründung für die Abrechnung ...",
      },
      {
        key: "anlagen",
        label: "Anlagen (optional)",
        kind: "multiline",
        required: false,
        placeholder: "z. B. Diagnoseauszug aus PVS\nExportprotokoll vom 18.05.2026",
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0 oder mail@praxis.de",
      },
    ],
    bodyTemplate: `{{praxisname}}
BSNR: {{bsnr}}
{{datum_schreiben}}

{{empfaenger_block}}

Betreff: Stellungnahme zur Abrechnungsrückfrage – {{beanstandete_leistung}}, {{abrechnungszeitraum}}
Bezug: KV-Schreiben vom {{datum_kv_schreiben}}, Az. {{aktenzeichen}}{{#if antwortfrist}}
Antwortfrist: {{antwortfrist}}{{/if}}

Sehr geehrte Damen und Herren,

hiermit nehmen wir Stellung zu Ihrer Rückfrage vom {{datum_kv_schreiben}} zur Abrechnung für den Zeitraum {{abrechnungszeitraum}}.

Beanstandete Leistung: {{beanstandete_leistung}}

Sachverhalt:
{{sachverhalt}}

Fachliche Einschätzung:
{{fachliche_einschaetzung}}

Wir bitten um Prüfung und Kenntnisnahme unserer Ausführungen und stehen für Rückfragen zur Verfügung.

Mit freundlichen Grüßen
{{arztname}}
{{praxisname}}
LANR: {{lanr}}{{#if kontakt_rueckfragen}}
Kontakt für Rückfragen: {{kontakt_rueckfragen}}
{{/if}}{{#if anlagen}}
Anlagen:
{{anlagen}}
{{/if}}`,
    smoothingEnabled: true,
    audience: "KV",
    estimatedLength: "MEDIUM",
  },

  // ─── KV-Schreiben: Arztgespräch vorbereiten ──────────────────────────────
  {
    id: "kv-arztgespraech-vorbereiten",
    label: "Arztgespräch vorbereiten (KV-Rückfrage)",
    outputKind: OfficeWriteOutputKind.GESPRAECHSLEITFADEN,
    writeKind: OfficeWriteKind.INTERNAL_GUIDE,
    trigger: {
      topicIds: [OFFICE_TOPIC_KV_BILLING],
      /**
       * Sichtbar solange interne fachliche Einschätzung (KV-03) noch offen.
       */
      anyOf: [
        { checkpointId: "KV-03", state: "OPEN" },
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
        key: "aktenzeichen",
        label: "Aktenzeichen (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. ABR-2026-0099",
      },
      {
        key: "abrechnungszeitraum",
        label: "Abrechnungszeitraum (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Quartal 2/2025",
      },
      {
        key: "beanstandete_leistung",
        label: "Beanstandete Leistung / GOP",
        kind: "text",
        required: true,
        placeholder: "z. B. GOP 13250",
      },
      {
        key: "offene_punkte",
        label: "Offene Punkte / Klärungsbedarf",
        kind: "multiline",
        required: true,
        placeholder: "Stichpunkte zu offenen Sachverhalten ...",
      },
      {
        key: "antwortfrist",
        label: "Antwortfrist KV (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. 30.05.2026",
      },
      {
        key: "verantwortliche_person",
        label: "Verantwortliche Person (Folgeschritte, optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Dr. Schmidt (Praxisleitung)",
      },
    ],
    bodyTemplate: `Gesprächsvorbereitung: KV-Abrechnungsrückfrage
Praxis: {{praxisname}}
Az.: {{aktenzeichen}} | Zeitraum: {{abrechnungszeitraum}}{{#if antwortfrist}}
Antwortfrist KV: {{antwortfrist}}{{/if}}

Gesprächspartner: {{gespraechspartner}}
Datum: {{geplantes_datum}}

Hintergrund:
Die KV hat eine Rückfrage zur Abrechnung der Leistung {{beanstandete_leistung}} gestellt.
Vor der Antwort an die KV muss die fachliche Einschätzung intern geklärt werden.

Offene Punkte:
{{offene_punkte}}

Nächste Schritte:
- Fachliche Einschätzung mit {{gespraechspartner}} verbindlich klären und dokumentieren
- Entscheidung zum Vorgehen (Antwort / Widerspruch / Korrektur) festlegen
- Verantwortliche Person für Folgeschritte: {{verantwortliche_person}}{{#if antwortfrist}}
- Fristgerechte Antwort bis {{antwortfrist}} sicherstellen{{/if}}`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  // ─── KV-Schreiben: Interne Klärungsnotiz ─────────────────────────────────
  {
    id: "kv-klaerungsnotiz",
    label: "Interne Klärungsnotiz anlegen",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_KV_BILLING],
      /**
       * Sichtbar solange Vorgehen (KV-04) oder Antwortquelle (KV-05) noch offen.
       */
      anyOf: [
        { checkpointId: "KV-04", state: "OPEN" },
        { checkpointId: "KV-05", state: "OPEN" },
      ],
    },
    inputSchema: [
      {
        key: "datum_notiz",
        label: "Datum der Notiz",
        kind: "text",
        required: true,
        placeholder: "z. B. 19.05.2026",
      },
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
        placeholder: "z. B. ABR-2026-0099",
      },
      {
        key: "abrechnungszeitraum",
        label: "Abrechnungszeitraum (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Quartal 2/2025",
      },
      {
        key: "antwortfrist",
        label: "Antwortfrist KV (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. 30.05.2026",
      },
      {
        key: "beanstandete_leistung",
        label: "Beanstandete Leistung / GOP",
        kind: "text",
        required: true,
        placeholder: "z. B. GOP 13250",
      },
      {
        key: "fehlende_informationen",
        label: "Fehlende Informationen / offene Fragen",
        kind: "multiline",
        required: true,
        placeholder: "Welche Informationen fehlen noch für die Antwort an die KV?",
      },
      {
        key: "entscheidungsstand",
        label: "Aktueller Entscheidungsstand",
        kind: "multiline",
        required: true,
        placeholder: "Was wurde bereits entschieden oder besprochen?",
      },
      {
        key: "naechster_schritt",
        label: "Nächster Schritt",
        kind: "text",
        required: true,
        placeholder: "z. B. Rücksprache mit Dr. Müller bis 30.05.2026",
      },
      {
        key: "verantwortliche_person",
        label: "Verantwortliche Person (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. MFA Meier (Backoffice)",
      },
    ],
    bodyTemplate: `Interne Klärungsnotiz: KV-Abrechnungsrückfrage
Datum: {{datum_notiz}}
Praxis: {{praxisname}}
Az.: {{aktenzeichen}} | Zeitraum: {{abrechnungszeitraum}}{{#if antwortfrist}}
Antwortfrist KV: {{antwortfrist}}{{/if}}

Beanstandete Leistung: {{beanstandete_leistung}}

Fehlende Informationen / offene Fragen:
{{fehlende_informationen}}

Aktueller Entscheidungsstand:
{{entscheidungsstand}}

Nächster Schritt: {{naechster_schritt}}
Verantwortlich: {{verantwortliche_person}}

Interne Arbeitsunterlage – fachlich zu prüfen.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  // ---------------------------------------------------------------------------
  // Datenschutzvorfall-Module
  // ---------------------------------------------------------------------------

  {
    id: "ds-vorfallsnotiz",
    label: "Interne Vorfallsnotiz erstellen",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT],
      anyOf: [{ checkpointId: "DS-01", state: "YES" }],
    },
    inputSchema: [
      {
        key: "datum_vorfall",
        label: "Datum des Vorfalls",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 14.05.2026 ca. 10:30 Uhr",
      },
      {
        key: "datum_bekanntwerden",
        label: "Datum der Kenntniserlangung",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 14.05.2026, 11:00 Uhr (relevant für 72-h-Frist)",
      },
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "beschreibung_vorfall",
        label: "Beschreibung des Vorfalls",
        kind: "multiline" as const,
        required: true,
        placeholder: "Was ist konkret passiert? Wo und wie wurde der Vorfall entdeckt?",
      },
      {
        key: "betroffene_datenkategorien",
        label: "Betroffene Datenkategorien",
        kind: "multiline" as const,
        required: true,
        placeholder: "z. B. Patientennamen, Diagnosen, GKV-Nummern",
      },
      {
        key: "anzahl_betroffene",
        label: "Geschätzte Zahl betroffener Personen",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. ca. 30 Patienten",
      },
      {
        key: "erstverantwortliche_person",
        label: "Person, die den Vorfall gemeldet / entdeckt hat",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. MFA Meier (Anmeldung)",
      },
      {
        key: "sofortmassnahmen",
        label: "Sofortmaßnahmen (optional)",
        kind: "multiline" as const,
        required: false,
        placeholder: "Was wurde unmittelbar nach Bekanntwerden unternommen?",
      },
    ],
    bodyTemplate: `Interne Vorfallsnotiz: Datenschutzvorfall
Datum des Vorfalls: {{datum_vorfall}}
Datum der Kenntniserlangung: {{datum_bekanntwerden}}
Hinweis: Wenn eine meldepflichtige Datenschutzverletzung vorliegt, läuft die 72-Stunden-Frist ab Kenntniserlangung. Meldepflicht und Frist bitte gesondert prüfen.
Praxis: {{praxisname}}

Beschreibung des Vorfalls:
{{beschreibung_vorfall}}

Betroffene Datenkategorien:
{{betroffene_datenkategorien}}

Geschätzte Zahl betroffener Personen: {{anzahl_betroffene}}

Erstmeldung durch: {{erstverantwortliche_person}}{{#if sofortmassnahmen}}

Sofortmaßnahmen:
{{sofortmassnahmen}}{{/if}}

Interne Arbeitsunterlage – fachlich zu prüfen.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  {
    id: "ds-meldung-behoerde",
    label: "Meldung an Berliner Datenschutzbehörde vorbereiten",
    outputKind: OfficeWriteOutputKind.DATENSCHUTZ_MELDUNG,
    writeKind: OfficeWriteKind.AUTHORITY_RESPONSE,
    trigger: {
      topicIds: [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT],
      allOf: [
        { checkpointId: "DS-01", state: "YES" },
        { checkpointId: "DS-02", state: "YES" },
        { checkpointId: "DS-03", state: "YES" },
      ],
      blockedWhenAnyOpen: ["DS-01", "DS-02"],
    },
    inputSchema: [
      {
        key: "datum_vorfall",
        label: "Datum des Vorfalls",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 14.05.2026",
      },
      {
        key: "datum_bekanntwerden",
        label: "Datum der Kenntniserlangung (Beginn der 72-h-Frist)",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 14.05.2026, 11:00 Uhr",
      },
      {
        key: "meldung_fristdatum",
        label: "72-h-Frist endet am (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "z. B. 17.05.2026, 11:00 Uhr",
      },
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "bsnr",
        label: "BSNR (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "z. B. 123456789",
      },
      {
        key: "arztname_verantwortliche",
        label: "Verantwortliche Person (i. S. v. Art. 4 Nr. 7 DSGVO)",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. Dr. med. Müller",
      },
      {
        key: "beschreibung_vorfall",
        label: "Beschreibung des Vorfalls",
        kind: "multiline" as const,
        required: true,
        placeholder: "Art der Datenschutzverletzung, Hergang, betroffene Systeme",
      },
      {
        key: "betroffene_datenkategorien",
        label: "Betroffene Datenkategorien",
        kind: "multiline" as const,
        required: true,
        placeholder: "z. B. Patientennamen, Diagnosen, GKV-Nummern",
      },
      {
        key: "anzahl_betroffene_geschaetzt",
        label: "Geschätzte Zahl betroffener Personen",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. ca. 30 Patienten",
      },
      {
        key: "risikobewertung_ergebnis",
        label: "Ergebnis der Risikobewertung",
        kind: "multiline" as const,
        required: true,
        placeholder: "Wahrscheinliche Folgen der Verletzung und Risikoeinstufung",
      },
      {
        key: "ergriffene_massnahmen",
        label: "Ergriffene Maßnahmen",
        kind: "multiline" as const,
        required: true,
        placeholder: "Welche Schritte wurden zur Eindämmung und Behebung eingeleitet?",
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0",
      },
      {
        key: "verzoegerung_begruendung",
        label: "Begründung bei Überschreitung der 72-Stunden-Frist (optional)",
        kind: "multiline" as const,
        required: false,
        placeholder: "Begründung gem. Art. 33 Abs. 3 lit. e DSGVO, falls Frist überschritten",
      },
    ],
    bodyTemplate: `Meldung Datenschutzverletzung gemäß Art. 33 DSGVO
Verantwortliche: {{praxisname}}{{#if bsnr}} (BSNR {{bsnr}}){{/if}}
Vertretungsberechtigte Person: {{arztname_verantwortliche}}

Datum des Vorfalls: {{datum_vorfall}}
Datum der Kenntniserlangung: {{datum_bekanntwerden}}{{#if meldung_fristdatum}}
72-h-Frist endet: {{meldung_fristdatum}}{{/if}}

Art der Datenschutzverletzung:
{{beschreibung_vorfall}}

Betroffene Datenkategorien:
{{betroffene_datenkategorien}}

Geschätzte Zahl betroffener Personen: {{anzahl_betroffene_geschaetzt}}

Risikobewertung:
{{risikobewertung_ergebnis}}

Ergriffene Maßnahmen:
{{ergriffene_massnahmen}}{{#if kontakt_rueckfragen}}

Kontakt für Rückfragen: {{kontakt_rueckfragen}}{{/if}}{{#if verzoegerung_begruendung}}

Begründung bei Überschreitung der 72-Stunden-Frist:
{{verzoegerung_begruendung}}{{/if}}

Arbeitsentwurf – Meldung muss im offiziellen Kanal der Berliner Datenschutzbehörde erfolgen. Fachlich und rechtlich zu prüfen.`,
    smoothingEnabled: false,
    audience: "BEHOERDE",
    estimatedLength: "MEDIUM",
  },

  {
    id: "ds-betroffeneninformation",
    label: "Betroffeneninformation vorbereiten",
    outputKind: OfficeWriteOutputKind.BETROFFENENINFORMATION,
    writeKind: OfficeWriteKind.PERSON_COMMUNICATION,
    trigger: {
      topicIds: [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT],
      anyOf: [{ checkpointId: "DS-05", state: "OPEN" }],
      blockedWhenAnyOpen: ["DS-01", "DS-02"],
    },
    inputSchema: [
      {
        key: "datum_schreiben",
        label: "Datum des Schreibens",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 17.05.2026",
      },
      {
        key: "anrede_name",
        label: "Name für individuelle Anrede (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "z. B. Frau Müller – leer lassen für allgemeine Anrede",
      },
      {
        key: "datum_vorfall",
        label: "Datum des Vorfalls",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. 14.05.2026",
      },
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. Gemeinschaftspraxis Müller & Schmidt",
      },
      {
        key: "arztname",
        label: "Name der verantwortlichen Ärztin / des verantwortlichen Arztes",
        kind: "text" as const,
        required: true,
        placeholder: "z. B. Dr. med. Müller",
      },
      {
        key: "beschreibung_vorfall_extern",
        label: "Beschreibung des Vorfalls (verständlich für Betroffene)",
        kind: "multiline" as const,
        required: true,
        placeholder: "Was ist passiert? Bitte in verständlicher Sprache formulieren.",
      },
      {
        key: "betroffene_datenkategorien",
        label: "Betroffene Datenkategorien",
        kind: "multiline" as const,
        required: true,
        placeholder: "z. B. Name, Diagnose, Versicherungsnummer",
      },
      {
        key: "moegliche_folgen",
        label: "Wahrscheinliche Folgen der Verletzung",
        kind: "multiline" as const,
        required: true,
        placeholder: "Welche Risiken oder Nachteile könnten für Betroffene entstehen?",
      },
      {
        key: "ergriffene_massnahmen",
        label: "Ergriffene Maßnahmen",
        kind: "multiline" as const,
        required: true,
        placeholder: "Was wurde zur Behebung und zum Schutz der Betroffenen unternommen?",
      },
      {
        key: "empfehlung_betroffene",
        label: "Empfehlungen an Betroffene (optional)",
        kind: "multiline" as const,
        required: false,
        placeholder: "z. B. Passwort ändern, Kontoauszüge prüfen",
      },
      {
        key: "ansprechpartner_ds",
        label: "Datenschutzbeauftragter / Ansprechpartner (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "Name und Kontakt",
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen (optional)",
        kind: "text" as const,
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0",
      },
    ],
    bodyTemplate: `Information über Datenschutzverletzung gemäß Art. 34 DSGVO
{{praxisname}}
Datum: {{datum_schreiben}}

{{#if anrede_name}}Sehr geehrte/r {{anrede_name}},{{/if}}{{#unless anrede_name}}Sehr geehrte Damen und Herren,{{/unless}}

wir informieren Sie hiermit über eine Datenschutzverletzung, die am {{datum_vorfall}} in unserer Praxis eingetreten ist und möglicherweise Ihre personenbezogenen Daten betrifft.

Was ist passiert:
{{beschreibung_vorfall_extern}}

Welche Daten sind betroffen:
{{betroffene_datenkategorien}}

Mögliche Folgen:
{{moegliche_folgen}}

Maßnahmen, die wir ergriffen haben:
{{ergriffene_massnahmen}}{{#if empfehlung_betroffene}}

Empfehlungen an Sie:
{{empfehlung_betroffene}}{{/if}}{{#if ansprechpartner_ds}}

Unser Datenschutzbeauftragter / Ansprechpartner: {{ansprechpartner_ds}}{{/if}}{{#if kontakt_rueckfragen}}

Kontakt für Rückfragen: {{kontakt_rueckfragen}}{{/if}}

Mit freundlichen Grüßen
{{arztname}}
{{praxisname}}

Arbeitsentwurf – Benachrichtigungspflicht besteht nur bei voraussichtlich hohem Risiko. Vor Versand fachlich und rechtlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "MEDIUM",
  },

  // ---------------------------------------------------------------------------
  // MFA-Einstellung-Module
  // ---------------------------------------------------------------------------

  // ─── MFA: Gesprächsleitfaden Einstellungsgespräch ─────────────────────────
  {
    id: "mfa-gespraechsleitfaden",
    label: "Gesprächsleitfaden Einstellungsgespräch",
    outputKind: OfficeWriteOutputKind.GESPRAECHSLEITFADEN,
    writeKind: OfficeWriteKind.INTERNAL_GUIDE,
    trigger: {
      topicIds: [OFFICE_TOPIC_MFA_HIRING],
      /**
       * Sichtbar sobald Berufsabschluss (MF-01) bestätigt ist.
       * Dient der internen Gesprächsvorbereitung vor dem Einstellungsgespräch.
       */
      allOf: [
        { checkpointId: "MF-01", state: "YES" },
      ],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Hausarztpraxis Dr. Müller",
      },
      {
        key: "bewerber_name",
        label: "Name der Bewerberin / des Bewerbers",
        kind: "text",
        required: true,
        placeholder: "z. B. Julia Schmidt",
      },
      {
        key: "gespraechsdatum",
        label: "Datum des Gesprächs (optional)",
        kind: "date",
        required: false,
      },
      {
        key: "einsatzbereich",
        label: "Geplanter Einsatzbereich",
        kind: "text",
        required: true,
        placeholder: "z. B. Anmeldung, Prophylaxe, Röntgen",
      },
      {
        key: "wochenstunden",
        label: "Geplante Wochenstunden",
        kind: "text",
        required: true,
        placeholder: "z. B. 38,5 h / Woche oder Teilzeit 20 h",
      },
      {
        key: "offene_punkte",
        label: "Offene Punkte / Klärungsbedarf",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Urlaubsanspruch, Fortbildungsbereitschaft, Probezeit",
      },
      {
        key: "verantwortliche_person",
        label: "Gesprächsführende Person (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Dr. Müller (Praxisleitung)",
      },
    ],
    bodyTemplate: `Gesprächsleitfaden: Einstellungsgespräch MFA
Praxis: {{praxisname}}{{#if gespraechsdatum}}
Datum: {{gespraechsdatum}}{{/if}}
Bewerberin / Bewerber: {{bewerber_name}}{{#if verantwortliche_person}}
Gesprächsführung: {{verantwortliche_person}}{{/if}}

Geplanter Einsatzbereich: {{einsatzbereich}}
Geplante Wochenstunden: {{wochenstunden}}

Gesprächspunkte:
1. Vorstellung der Praxis und des Teams
2. Aufgaben und Zuständigkeiten im Einsatzbereich: {{einsatzbereich}}
3. Arbeitszeit und Wochenstunden: {{wochenstunden}}
4. Probezeit, Urlaubsregelung, Fortbildungen
5. Offene Punkte klären:
{{offene_punkte}}

Nächste Schritte:
- Unterlagen vollständig vorlegen lassen (Abschlusszeugnis, SV-Daten, Steuer-ID)
- Interne Entscheidung und ggf. Arbeitsvertrag vorbereiten

Interne Arbeitsunterlage – keine Vertragszusage, keine Rechtsbewertung.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  // ─── MFA: Fehlende Personalunterlagen anfordern ───────────────────────────
  {
    id: "mfa-unterlagen-anforderung",
    label: "Fehlende Personalunterlagen anfordern",
    outputKind: OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
    writeKind: OfficeWriteKind.DATA_REQUEST,
    trigger: {
      topicIds: [OFFICE_TOPIC_MFA_HIRING],
      /**
       * Sichtbar wenn Personalunterlagen (MF-03) nicht vollständig (NO) oder
       * noch offen sind (OPEN).
       */
      anyOf: [
        { checkpointId: "MF-03", state: "NO" },
        { checkpointId: "MF-03", state: "OPEN" },
      ],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Hausarztpraxis Dr. Müller",
      },
      {
        key: "datum_schreiben",
        label: "Datum des Schreibens",
        kind: "date",
        required: true,
      },
      {
        key: "bewerber_name",
        label: "Name der Mitarbeiterin / des Mitarbeiters",
        kind: "text",
        required: true,
        placeholder: "z. B. Julia Schmidt",
      },
      {
        key: "fehlende_unterlagen",
        label: "Fehlende Unterlagen",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Steuer-ID, SV-Ausweis, Abschlusszeugnis",
      },
      {
        key: "rueckgabefrist",
        label: "Rückgabefrist (optional)",
        kind: "date",
        required: false,
      },
      {
        key: "kontakt_rueckfragen",
        label: "Kontakt für Rückfragen (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. Tel. 030 / 12345-0 oder mail@praxis.de",
      },
    ],
    bodyTemplate: `{{praxisname}}
{{datum_schreiben}}

An: {{bewerber_name}}

Betreff: Vollständigkeit Ihrer Personalunterlagen

Guten Tag {{bewerber_name}},

für Ihre Einstellung bei uns fehlen noch folgende Unterlagen:

{{fehlende_unterlagen}}

Wir bitten Sie, diese Unterlagen baldmöglichst einzureichen.{{#if rueckgabefrist}}
Bitte übermitteln Sie die Unterlagen bis spätestens {{rueckgabefrist}}.{{/if}}{{#if kontakt_rueckfragen}}

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung: {{kontakt_rueckfragen}}{{/if}}

Vielen Dank für Ihre Unterstützung.

Mit freundlichen Grüßen
{{praxisname}}

Arbeitsentwurf – bitte vor Versand inhaltlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },

  // ─── MFA: Onboarding-Plan neue MFA ───────────────────────────────────────
  {
    id: "mfa-onboarding-plan",
    label: "Onboarding-Plan neue MFA",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_MFA_HIRING],
      /**
       * Sichtbar sobald Arbeitsvertrag freigegeben (MF-02) ist.
       * Dient der internen Einarbeitungsplanung vor dem ersten Arbeitstag.
       */
      allOf: [
        { checkpointId: "MF-02", state: "YES" },
      ],
    },
    inputSchema: [
      {
        key: "praxisname",
        label: "Praxisname",
        kind: "text",
        required: true,
        placeholder: "z. B. Hausarztpraxis Dr. Müller",
      },
      {
        key: "mfa_name",
        label: "Name der neuen MFA",
        kind: "text",
        required: true,
        placeholder: "z. B. Julia Schmidt",
      },
      {
        key: "startdatum",
        label: "Startdatum",
        kind: "date",
        required: true,
      },
      {
        key: "einsatzbereich",
        label: "Einsatzbereich",
        kind: "text",
        required: true,
        placeholder: "z. B. Anmeldung, Prophylaxe, Röntgen",
      },
      {
        key: "systemzugriffe",
        label: "Einzurichtende Systemzugriffe",
        kind: "multiline",
        required: true,
        placeholder: "z. B. PVS-Zugang, Zeiterfassung, E-Mail-Postfach",
      },
      {
        key: "pflichtunterweisungen",
        label: "Pflichtunterweisungen",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Datenschutz, Schweigepflicht, Hygieneplan, Brandschutz",
      },
      {
        key: "erste_aufgaben",
        label: "Erste Aufgaben / Einarbeitungsschwerpunkte",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Begleitung Anmeldung Woche 1, PVS-Schulung Woche 2",
      },
      {
        key: "verantwortliche_person",
        label: "Verantwortliche Person für Einarbeitung (optional)",
        kind: "text",
        required: false,
        placeholder: "z. B. MFA Meyer (Patin)",
      },
    ],
    bodyTemplate: `Onboarding-Plan: Neue MFA
Praxis: {{praxisname}}
Mitarbeiterin / Mitarbeiter: {{mfa_name}}
Startdatum: {{startdatum}}
Einsatzbereich: {{einsatzbereich}}{{#if verantwortliche_person}}
Ansprechperson Einarbeitung: {{verantwortliche_person}}{{/if}}

Systemzugriffe einrichten:
{{systemzugriffe}}

Pflichtunterweisungen durchführen:
{{pflichtunterweisungen}}

Erste Aufgaben / Einarbeitungsschwerpunkte:
{{erste_aufgaben}}

Interne Arbeitsliste – vor dem ersten Arbeitstag abhaken.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "MEDIUM",
  },

  // ---------------------------------------------------------------------------
  // mfa-azubi-unter-18-einstellung
  // ---------------------------------------------------------------------------

  {
    id: "azubi-unterlagen-anforderung",
    label: "Fehlende Unterlagen anfordern (Azubi)",
    outputKind: OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
    writeKind: OfficeWriteKind.DATA_REQUEST,
    trigger: {
      topicIds: [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING],
      anyOf: [
        { checkpointId: "MA-02", state: "OPEN" },
        { checkpointId: "MA-05", state: "NO" },
        { checkpointId: "MA-05", state: "OPEN" },
      ],
    },
    inputSchema: [
      { key: "datum_schreiben", label: "Datum des Schreibens", kind: "date", required: true },
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Müller" },
      { key: "azubi_name", label: "Name der Auszubildenden / des Auszubildenden", kind: "text", required: true, placeholder: "z. B. Lena Hoffmann" },
      { key: "fehlende_unterlagen", label: "Fehlende Unterlagen", kind: "multiline", required: true, placeholder: "z. B. Erstuntersuchungsnachweis, Einwilligungserklärung der Erziehungsberechtigten" },
      { key: "rueckgabefrist", label: "Rückgabefrist (optional)", kind: "date", required: false },
      { key: "kontakt_rueckfragen", label: "Kontakt für Rückfragen (optional)", kind: "text", required: false, placeholder: "z. B. Tel. 030 / 12345-0 oder mail@praxis.de" },
    ],
    bodyTemplate: `{{praxisname}}
{{datum_schreiben}}

An: {{azubi_name}} / Erziehungsberechtigte

Betreff: Vollständigkeit der Unterlagen zum Ausbildungsstart

Guten Tag,

für den Ausbildungsstart von {{azubi_name}} bei uns fehlen noch folgende Unterlagen:

{{fehlende_unterlagen}}

Wir bitten um Einreichung baldmöglichst.{{#if rueckgabefrist}}
Bitte übermitteln Sie die Unterlagen bis spätestens {{rueckgabefrist}}.{{/if}}{{#if kontakt_rueckfragen}}

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung: {{kontakt_rueckfragen}}{{/if}}

Vielen Dank für Ihre Unterstützung.

Mit freundlichen Grüßen
{{praxisname}}

Arbeitsentwurf – bitte vor Versand inhaltlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },

  {
    id: "azubi-gespraechsleitfaden",
    label: "Gesprächsleitfaden Ausbildungsgespräch",
    outputKind: OfficeWriteOutputKind.GESPRAECHSLEITFADEN,
    writeKind: OfficeWriteKind.INTERNAL_GUIDE,
    trigger: {
      topicIds: [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING],
      anyOf: [
        { checkpointId: "MA-01", state: "OPEN" },
        { checkpointId: "MA-01", state: "YES" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Müller" },
      { key: "azubi_name", label: "Name der Auszubildenden / des Auszubildenden", kind: "text", required: true, placeholder: "z. B. Lena Hoffmann" },
      { key: "gespraechsdatum", label: "Datum des Gesprächs (optional)", kind: "date", required: false },
      { key: "ausbildungsbeginn", label: "Geplanter Ausbildungsbeginn", kind: "text", required: true, placeholder: "z. B. 01.09.2026" },
      { key: "einsatzbereich", label: "Geplanter Einsatzbereich", kind: "text", required: true, placeholder: "z. B. Anmeldung, Prophylaxe" },
      { key: "wochenstunden", label: "Geplante Wochenstunden", kind: "text", required: true, placeholder: "z. B. 38,5 h / Woche" },
      { key: "offene_punkte", label: "Offene Punkte / Klärungsbedarf", kind: "multiline", required: true, placeholder: "z. B. Berufsschulplan, Unterlagenstatus" },
      { key: "verantwortliche_person", label: "Gesprächsführende Person (optional)", kind: "text", required: false, placeholder: "z. B. Dr. Müller (Praxisleitung)" },
    ],
    bodyTemplate: `Gesprächsleitfaden: Ausbildungsgespräch MFA-Azubi
Praxis: {{praxisname}}{{#if gespraechsdatum}}
Datum: {{gespraechsdatum}}{{/if}}
Auszubildende/r: {{azubi_name}}{{#if verantwortliche_person}}
Gesprächsführung: {{verantwortliche_person}}{{/if}}

Geplanter Ausbildungsbeginn: {{ausbildungsbeginn}}
Geplanter Einsatzbereich: {{einsatzbereich}}
Geplante Wochenstunden: {{wochenstunden}}

Gesprächspunkte:
1. Vorstellung der Praxis und des Teams
2. Aufgaben und Einsatzbereich: {{einsatzbereich}}
3. Arbeitszeit und Wochenstunden: {{wochenstunden}} – Berufsschultage im Dienstplan berücksichtigen
4. Ausbildungsplan, Probezeit, Urlaubsregelung
5. Unterlagenstatus klären (Erstuntersuchungsnachweis, Ausbildungsvertrag)
6. Einwilligung der Erziehungsberechtigten: Status und nächste Schritte

Offene Punkte:
{{offene_punkte}}

Nächste Schritte:
- Fehlende Unterlagen anfordern
- Ausbildungsvertrag zur Registrierung vorbereiten
- Erziehungsberechtigte einbeziehen

Interne Arbeitsunterlage – keine Vertragszusage, keine Rechtsbewertung.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  {
    id: "azubi-onboarding-plan",
    label: "Onboarding-Plan neue Auszubildende",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING],
      allOf: [
        { checkpointId: "MA-03", state: "YES" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Müller" },
      { key: "azubi_name", label: "Name der Auszubildenden / des Auszubildenden", kind: "text", required: true, placeholder: "z. B. Lena Hoffmann" },
      { key: "startdatum", label: "Startdatum", kind: "date", required: true },
      { key: "ausbildungsjahr", label: "Ausbildungsjahr", kind: "text", required: true, placeholder: "z. B. 1. Ausbildungsjahr" },
      { key: "einsatzbereich", label: "Einsatzbereich", kind: "text", required: true, placeholder: "z. B. Anmeldung, Prophylaxe" },
      { key: "berufsschultage", label: "Berufsschultage", kind: "text", required: true, placeholder: "z. B. Montag und Mittwoch" },
      { key: "systemzugriffe", label: "Einzurichtende Systemzugriffe", kind: "multiline", required: true, placeholder: "z. B. PVS-Zugang, Zeiterfassung" },
      { key: "pflichtunterweisungen", label: "Pflichtunterweisungen", kind: "multiline", required: true, placeholder: "z. B. Datenschutz, Schweigepflicht, Hygieneplan, Brandschutz" },
      { key: "erste_aufgaben", label: "Erste Aufgaben / Einarbeitungsschwerpunkte", kind: "multiline", required: true, placeholder: "z. B. Begleitung Anmeldung Woche 1" },
      { key: "verantwortliche_person", label: "Verantwortliche Person für Einarbeitung (optional)", kind: "text", required: false, placeholder: "z. B. MFA Meyer (Patin)" },
      { key: "notfallkontakt", label: "Notfallkontakt Erziehungsberechtigte (optional)", kind: "text", required: false, placeholder: "z. B. Eltern Hoffmann, Tel. 040 / 12345" },
    ],
    bodyTemplate: `Onboarding-Plan: Neue Auszubildende MFA
Praxis: {{praxisname}}
Auszubildende/r: {{azubi_name}}
Startdatum: {{startdatum}}
Ausbildungsjahr: {{ausbildungsjahr}}
Einsatzbereich: {{einsatzbereich}}
Berufsschultage: {{berufsschultage}} – im Dienstplan berücksichtigen{{#if verantwortliche_person}}
Ansprechperson Einarbeitung: {{verantwortliche_person}}{{/if}}{{#if notfallkontakt}}
Notfallkontakt: {{notfallkontakt}}{{/if}}

Systemzugriffe einrichten:
{{systemzugriffe}}

Pflichtunterweisungen durchführen:
{{pflichtunterweisungen}}

Erste Aufgaben / Einarbeitungsschwerpunkte:
{{erste_aufgaben}}

Interne Arbeitsliste – vor dem ersten Ausbildungstag abhaken.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "MEDIUM",
  },

  // ---------------------------------------------------------------------------
  // arzt-anstellen-nachbesetzung
  // ---------------------------------------------------------------------------

  {
    id: "nc-unterlagen-anforderung",
    label: "Fehlende Unterlagen anfordern (Anstellung Arzt/Ärztin)",
    outputKind: OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
    writeKind: OfficeWriteKind.DATA_REQUEST,
    trigger: {
      topicIds: [OFFICE_TOPIC_HIRING_REPLACEMENT],
      anyOf: [
        { checkpointId: "NC-APPROBATION", state: "NO" },
        { checkpointId: "NC-APPROBATION", state: "OPEN" },
        { checkpointId: "NC-FACHARZTQUALIFIKATION", state: "NO" },
        { checkpointId: "NC-FACHARZTQUALIFIKATION", state: "OPEN" },
        { checkpointId: "NC-BERUFSHAFTPFLICHT", state: "NO" },
        { checkpointId: "NC-BERUFSHAFTPFLICHT", state: "OPEN" },
      ],
    },
    inputSchema: [
      { key: "datum_schreiben", label: "Datum des Schreibens", kind: "date", required: true },
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Gemeinschaftspraxis Dres. Keller & Nowak" },
      { key: "arzt_name", label: "Name des Arztes / der Ärztin", kind: "text", required: true, placeholder: "z. B. Dr. Martina Böhm" },
      { key: "fehlende_unterlagen", label: "Fehlende Unterlagen", kind: "multiline", required: true, placeholder: "z. B. Approbationsurkunde, Berufshaftpflichtnachweis" },
      { key: "rueckgabefrist", label: "Rückgabefrist (optional)", kind: "date", required: false },
      { key: "kontakt_rueckfragen", label: "Kontakt für Rückfragen (optional)", kind: "text", required: false, placeholder: "z. B. Tel. 040 / 12345-0 oder mail@praxis.de" },
    ],
    bodyTemplate: `{{praxisname}}
{{datum_schreiben}}

An: {{arzt_name}}

Betreff: Vollständigkeit der Unterlagen zur geplanten Anstellung

Guten Tag,

für die geplante Anstellung von {{arzt_name}} bei uns fehlen noch folgende Unterlagen:

{{fehlende_unterlagen}}

Wir bitten um Einreichung baldmöglichst.{{#if rueckgabefrist}}
Bitte übermitteln Sie die Unterlagen bis spätestens {{rueckgabefrist}}.{{/if}}{{#if kontakt_rueckfragen}}

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung: {{kontakt_rueckfragen}}{{/if}}

Vielen Dank für Ihre Unterstützung.

Mit freundlichen Grüßen
{{praxisname}}

Arbeitsentwurf – bitte vor Versand inhaltlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },

  {
    id: "nc-gespraechsleitfaden",
    label: "Gesprächsleitfaden Anstellungsgespräch (Arzt/Ärztin)",
    outputKind: OfficeWriteOutputKind.GESPRAECHSLEITFADEN,
    writeKind: OfficeWriteKind.INTERNAL_GUIDE,
    trigger: {
      topicIds: [OFFICE_TOPIC_HIRING_REPLACEMENT],
      anyOf: [
        { checkpointId: "NC-TAETIGKEITSUMFANG", state: "OPEN" },
        { checkpointId: "NC-TAETIGKEITSUMFANG", state: "YES" },
        { checkpointId: "NC-BETRIEBSSTAETTENSTRUKTUR", state: "OPEN" },
        { checkpointId: "NC-BETRIEBSSTAETTENSTRUKTUR", state: "YES" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Gemeinschaftspraxis Dres. Keller & Nowak" },
      { key: "arzt_name", label: "Name des Arztes / der Ärztin", kind: "text", required: true, placeholder: "z. B. Dr. Martina Böhm" },
      { key: "gespraechsdatum", label: "Datum des Gesprächs (optional)", kind: "date", required: false },
      { key: "einstellungsdatum", label: "Geplantes Einstellungsdatum", kind: "text", required: true, placeholder: "z. B. 01.10.2026" },
      { key: "taetigkeitsumfang", label: "Tätigkeitsumfang (intern abgestimmt)", kind: "text", required: true, placeholder: "z. B. 20 h / Woche" },
      { key: "betriebsstaette", label: "Betriebsstätte / Standort", kind: "text", required: true, placeholder: "z. B. Hauptstandort Musterstr. 1" },
      { key: "offene_punkte", label: "Offene Punkte / Klärungsbedarf", kind: "multiline", required: true, placeholder: "z. B. Unterlagenstatus, LANR-Zuordnung" },
      { key: "verantwortliche_person", label: "Gesprächsführende Person (optional)", kind: "text", required: false, placeholder: "z. B. Dr. Keller (Praxisleitung)" },
    ],
    bodyTemplate: `Gesprächsleitfaden: Anstellungsgespräch Arzt/Ärztin
Praxis: {{praxisname}}{{#if gespraechsdatum}}
Datum: {{gespraechsdatum}}{{/if}}
Arzt/Ärztin: {{arzt_name}}{{#if verantwortliche_person}}
Gesprächsführung: {{verantwortliche_person}}{{/if}}

Geplantes Einstellungsdatum: {{einstellungsdatum}}
Tätigkeitsumfang: {{taetigkeitsumfang}}
Betriebsstätte: {{betriebsstaette}}

Gesprächspunkte:
1. Vorstellung Praxis, Team und Struktur
2. Tätigkeitsumfang und Betriebsstätte: {{taetigkeitsumfang}} / {{betriebsstaette}}
3. Einstellungsdatum und weitere Rahmenbedingungen des Arbeitsverhältnisses (Vertrag folgt separat)
4. Unterlagenstatus klären (Approbation, Facharztqualifikation, Berufshaftpflicht)
5. Abrechnungsstart: LANR- und BSNR-Zuordnung klären
6. Systemzugriffe einrichten (PVS, Zeiterfassung, E-Mail)

Offene Punkte:
{{offene_punkte}}

Nächste Schritte:
- Fehlende Unterlagen anfordern
- LANR/BSNR-Zuordnung mit KV klären
- Systemzugriffe vor erstem Einsatztag einrichten

Interne Arbeitsunterlage – keine Vertragszusage, keine Rechtsbewertung.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  {
    id: "nc-onboarding-abrechnungsstart",
    label: "Onboarding- und Abrechnungsstart-Plan (Arzt/Ärztin)",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_HIRING_REPLACEMENT],
      allOf: [
        { checkpointId: "NC-GENEHMIGUNGSSTATUS", state: "YES" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Gemeinschaftspraxis Dres. Keller & Nowak" },
      { key: "arzt_name", label: "Name des Arztes / der Ärztin", kind: "text", required: true, placeholder: "z. B. Dr. Martina Böhm" },
      { key: "startdatum", label: "Startdatum", kind: "date", required: true },
      { key: "betriebsstaette", label: "Betriebsstätte / Standort", kind: "text", required: true, placeholder: "z. B. Hauptstandort Musterstr. 1" },
      { key: "taetigkeitsumfang", label: "Tätigkeitsumfang", kind: "text", required: true, placeholder: "z. B. 20 h / Woche" },
      { key: "lanr_bsnr_status", label: "LANR / BSNR Status", kind: "text", required: true, placeholder: "z. B. LANR 123456789 zugeordnet, BSNR bestätigt" },
      { key: "systemzugriffe", label: "Einzurichtende Systemzugriffe", kind: "multiline", required: true, placeholder: "z. B. PVS-Zugang, Zeiterfassung, E-Mail" },
      { key: "pflichtunterweisungen", label: "Pflichtunterweisungen", kind: "multiline", required: true, placeholder: "z. B. Datenschutz, Schweigepflicht, Hygieneplan, Brandschutz" },
      { key: "erste_aufgaben", label: "Erste Aufgaben / Einarbeitungsschwerpunkte", kind: "multiline", required: true, placeholder: "z. B. Einführung Praxisabläufe Woche 1" },
      { key: "verantwortliche_person", label: "Verantwortliche Person für Einarbeitung (optional)", kind: "text", required: false, placeholder: "z. B. Dr. Keller (Praxisleitung)" },
    ],
    bodyTemplate: `Onboarding- und Abrechnungsstart-Plan: Arzt/Ärztin
Praxis: {{praxisname}}
Arzt/Ärztin: {{arzt_name}}
Startdatum: {{startdatum}}
Betriebsstätte: {{betriebsstaette}}
Tätigkeitsumfang: {{taetigkeitsumfang}}
LANR / BSNR: {{lanr_bsnr_status}}{{#if verantwortliche_person}}
Ansprechperson Einarbeitung: {{verantwortliche_person}}{{/if}}

Systemzugriffe einrichten:
{{systemzugriffe}}

Pflichtunterweisungen durchführen:
{{pflichtunterweisungen}}

Erste Aufgaben / Einarbeitungsschwerpunkte:
{{erste_aufgaben}}

Interne Arbeitsliste – vor dem ersten Einsatztag abhaken.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "MEDIUM",
  },

  // ---------------------------------------------------------------------------
  // praxisschliessung-urlaubsvertretung
  // ---------------------------------------------------------------------------

  {
    id: "uv-patienteninfo-aushang",
    label: "Patienteninformation / Aushang Praxisschließung",
    outputKind: OfficeWriteOutputKind.BETROFFENENINFORMATION,
    writeKind: OfficeWriteKind.PERSON_COMMUNICATION,
    trigger: {
      topicIds: [OFFICE_TOPIC_CLOSURE_COVERAGE],
      anyOf: [
        { checkpointId: "UV-PATIENTENINFO", state: "OPEN" },
        { checkpointId: "UV-PATIENTENINFO", state: "NO" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "schliessungsbeginn", label: "Schließung ab", kind: "date", required: true },
      { key: "schliessungsende", label: "Schließung bis", kind: "date", required: true },
      { key: "vertretung_name", label: "Vertretung: Name", kind: "text", required: true, placeholder: "z. B. Dr. Andrea Nowak" },
      { key: "vertretung_adresse", label: "Vertretung: Adresse", kind: "text", required: true, placeholder: "z. B. Musterstraße 12, 20095 Hamburg" },
      { key: "vertretung_telefon", label: "Vertretung: Telefon", kind: "text", required: true, placeholder: "z. B. 040 / 98765-0" },
      { key: "notfallhinweis", label: "Notfallhinweis (optional)", kind: "text", required: false, placeholder: "z. B. Im Notfall: 116 117 oder 112" },
      { key: "vertretung_oeffnungszeiten", label: "Sprechzeiten / Erreichbarkeit der Vertretung (optional)", kind: "text", required: false, placeholder: "z. B. Mo–Fr 8–12 Uhr und 14–18 Uhr" },
    ],
    bodyTemplate: `Liebe Patientinnen und Patienten,

unsere Praxis {{praxisname}} ist vom {{schliessungsbeginn}} bis einschließlich {{schliessungsende}} geschlossen.

In dieser Zeit wird unsere Praxis vertreten durch:

{{vertretung_name}}
{{vertretung_adresse}}
Tel.: {{vertretung_telefon}}{{#if vertretung_oeffnungszeiten}}
Sprechzeiten / Erreichbarkeit: {{vertretung_oeffnungszeiten}}{{/if}}{{#if notfallhinweis}}

{{notfallhinweis}}{{/if}}

Wir danken für Ihr Verständnis und freuen uns, Sie nach unserer Rückkehr wieder begrüßen zu dürfen.

{{praxisname}}

Arbeitsentwurf – bitte vor Veröffentlichung inhaltlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },

  {
    id: "uv-telefonansage",
    label: "Telefonansage / MFA-Skript Praxisschließung",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_CLOSURE_COVERAGE],
      anyOf: [
        { checkpointId: "UV-PATIENTENINFO", state: "OPEN" },
        { checkpointId: "UV-PATIENTENINFO", state: "NO" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "schliessungsbeginn", label: "Schließung ab", kind: "date", required: true },
      { key: "schliessungsende", label: "Schließung bis", kind: "date", required: true },
      { key: "vertretung_name", label: "Vertretung: Name", kind: "text", required: true, placeholder: "z. B. Dr. Andrea Nowak" },
      { key: "vertretung_telefon", label: "Vertretung: Telefon", kind: "text", required: true, placeholder: "z. B. 040 / 98765-0" },
      { key: "notfallhinweis", label: "Notfallhinweis (optional)", kind: "text", required: false, placeholder: "z. B. Im Notfall: 116 117 oder 112" },
    ],
    bodyTemplate: `Ansagetext / MFA-Skript – Praxisschließung
Praxis: {{praxisname}}
Zeitraum: {{schliessungsbeginn}} bis {{schliessungsende}}

---

Herzlichen Dank für Ihren Anruf bei {{praxisname}}. Unsere Praxis ist vom {{schliessungsbeginn}} bis einschließlich {{schliessungsende}} geschlossen. Ihre Vertretung übernimmt {{vertretung_name}}, erreichbar unter {{vertretung_telefon}}.{{#if notfallhinweis}} {{notfallhinweis}}{{/if}} Bitte wenden Sie sich in dringenden Angelegenheiten an die Vertretungspraxis. Wir sind ab dem {{schliessungsende}} wieder für Sie da. Auf Wiederhören.

---

Internes Arbeitsskript – nicht für Patienten bestimmt.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  {
    id: "uv-uebergabe-checkliste",
    label: "Interne Übergabecheckliste Praxisschließung",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_CLOSURE_COVERAGE],
      allOf: [
        { checkpointId: "UV-05", state: "YES" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "schliessungsbeginn", label: "Schließung ab", kind: "date", required: true },
      { key: "schliessungsende", label: "Schließung bis", kind: "date", required: true },
      { key: "vertretungsarzt_name", label: "Vertretungsarzt: Name", kind: "text", required: true, placeholder: "z. B. Dr. Andrea Nowak" },
      { key: "vertretungsarzt_kontakt", label: "Vertretungsarzt: Kontakt", kind: "text", required: true, placeholder: "z. B. Tel. 040 / 98765-0" },
      { key: "offene_aufgaben", label: "Offene Aufgaben / Übergabepunkte", kind: "multiline", required: true, placeholder: "z. B. Rezeptwiederholungen vorbereiten, Laborbefunde weiterleiten" },
      { key: "abrechnungshinweis", label: "Abrechnungshinweis (optional)", kind: "text", required: false, placeholder: "z. B. Quartalsabschluss noch offen, Rücksprache mit Abrechnungsstelle geplant" },
    ],
    bodyTemplate: `Übergabecheckliste: Praxisschließung
Praxis: {{praxisname}}
Zeitraum: {{schliessungsbeginn}} bis {{schliessungsende}}

Vertretung:
Name: {{vertretungsarzt_name}}
Kontakt: {{vertretungsarzt_kontakt}}

Offene Aufgaben / Übergabepunkte:
{{offene_aufgaben}}{{#if abrechnungshinweis}}

Abrechnungshinweis (Status):
{{abrechnungshinweis}}{{/if}}

Checkliste vor Schließungsbeginn:
- Patienteninformation / Aushang veröffentlicht
- Telefonansage eingerichtet
- Vertretungsarzt informiert und erreichbar
- Terminkalender gesperrt
- Dringende Vorgänge an Vertretung übergeben

Interne Arbeitsliste – vor Schließungsbeginn prüfen.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "MEDIUM",
  },

  // ---------------------------------------------------------------------------
  // oeffnungszeiten-erweiterung-praxis
  // ---------------------------------------------------------------------------

  {
    id: "oe-patienteninfo-oeffnungszeiten",
    label: "Patienteninformation / Aushang neue Öffnungszeiten",
    outputKind: OfficeWriteOutputKind.BETROFFENENINFORMATION,
    writeKind: OfficeWriteKind.PERSON_COMMUNICATION,
    trigger: {
      topicIds: [OFFICE_TOPIC_EXTENDED_OPENING_HOURS],
      anyOf: [
        { checkpointId: "OE-04", state: "OPEN" },
        { checkpointId: "OE-04", state: "NO" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "aenderungsart", label: "Art der Änderung", kind: "select", required: true, options: ["Erweiterung", "Einschränkung", "Änderung", "vorübergehend"] },
      { key: "gueltig_ab", label: "Gültig ab", kind: "date", required: true },
      { key: "neue_oeffnungszeiten", label: "Neue Öffnungszeiten", kind: "multiline", required: true, placeholder: "z. B. Mo–Fr 8–12 Uhr und 15–18 Uhr, Sa 9–12 Uhr" },
      { key: "gueltig_bis", label: "Gültig bis (optional, bei vorübergehender Änderung)", kind: "date", required: false },
      { key: "hinweis", label: "Zusätzlicher Hinweis (optional)", kind: "text", required: false, placeholder: "z. B. Termine nur nach Vereinbarung" },
    ],
    bodyTemplate: `Liebe Patientinnen und Patienten,

wir möchten Sie über eine Änderung unserer Öffnungszeiten informieren.

Art der Änderung: {{aenderungsart}}
Ab {{gueltig_ab}} gelten folgende Öffnungszeiten:{{#if gueltig_bis}}
(Gültig bis {{gueltig_bis}}){{/if}}

{{neue_oeffnungszeiten}}{{#if hinweis}}

Hinweis: {{hinweis}}{{/if}}

Vielen Dank für Ihr Verständnis.

{{praxisname}}

Arbeitsentwurf – bitte vor Veröffentlichung inhaltlich prüfen.`,
    smoothingEnabled: false,
    audience: "EXTERNE_STELLE",
    estimatedLength: "SHORT",
  },

  {
    id: "oe-telefonansage-oeffnungszeiten",
    label: "Telefonansage / MFA-Skript neue Öffnungszeiten",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_EXTENDED_OPENING_HOURS],
      anyOf: [
        { checkpointId: "OE-04", state: "OPEN" },
        { checkpointId: "OE-04", state: "NO" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "gueltig_ab", label: "Gültig ab", kind: "date", required: true },
      { key: "neue_oeffnungszeiten", label: "Neue Öffnungszeiten", kind: "multiline", required: true, placeholder: "z. B. Mo–Fr 8–12 Uhr und 15–18 Uhr, Sa 9–12 Uhr" },
      { key: "hinweis", label: "Zusätzlicher Hinweis (optional)", kind: "text", required: false, placeholder: "z. B. Terminvergabe nur telefonisch" },
    ],
    bodyTemplate: `Ansagetext / MFA-Skript – Neue Öffnungszeiten
Praxis: {{praxisname}}
Gültig ab: {{gueltig_ab}}

---

Herzlichen Dank für Ihren Anruf bei {{praxisname}}. Bitte beachten Sie unsere neuen Öffnungszeiten ab {{gueltig_ab}}:

{{neue_oeffnungszeiten}}{{#if hinweis}}

{{hinweis}}{{/if}}

Wir freuen uns auf Ihren Anruf. Auf Wiederhören.

---

Internes Arbeitsskript – nicht für Patienten bestimmt.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "SHORT",
  },

  {
    id: "oe-umstellungscheckliste",
    label: "Interne Umstellungscheckliste neue Öffnungszeiten",
    outputKind: OfficeWriteOutputKind.INTERNE_NOTIZ,
    writeKind: OfficeWriteKind.INTERNAL_NOTE,
    trigger: {
      topicIds: [OFFICE_TOPIC_EXTENDED_OPENING_HOURS],
      anyOf: [
        { checkpointId: "OE-05", state: "OPEN" },
        { checkpointId: "OE-05", state: "NO" },
      ],
    },
    inputSchema: [
      { key: "praxisname", label: "Praxisname", kind: "text", required: true, placeholder: "z. B. Hausarztpraxis Dr. Keller" },
      { key: "aenderungsart", label: "Art der Änderung", kind: "select", required: true, options: ["Erweiterung", "Einschränkung", "Änderung", "vorübergehend"] },
      { key: "gueltig_ab", label: "Gültig ab", kind: "date", required: true },
      { key: "neue_oeffnungszeiten", label: "Neue Öffnungszeiten", kind: "multiline", required: true, placeholder: "z. B. Mo–Fr 8–12 Uhr und 15–18 Uhr, Sa 9–12 Uhr" },
      { key: "offene_aufgaben", label: "Offene Aufgaben / Abstimmungspunkte", kind: "multiline", required: true, placeholder: "z. B. Dienstplan abstimmen, PVS-Termine anpassen" },
      { key: "verantwortliche_person", label: "Verantwortliche Person (optional)", kind: "text", required: false, placeholder: "z. B. Fr. Müller (Praxismanagement)" },
    ],
    bodyTemplate: `Umstellungscheckliste: Neue Öffnungszeiten
Praxis: {{praxisname}}
Art der Änderung: {{aenderungsart}}
Gültig ab: {{gueltig_ab}}{{#if verantwortliche_person}}
Verantwortlich: {{verantwortliche_person}}{{/if}}

Neue Öffnungszeiten:
{{neue_oeffnungszeiten}}

Offene Aufgaben / Abstimmungspunkte:
{{offene_aufgaben}}

Checkliste vor Inkrafttreten:
- Mitarbeiter informiert (Schicht- / Dienstplan angepasst)
- Praxissoftware / PVS aktualisiert (Terminbuchung, Online-Kalender)
- Telefonansage aktualisiert
- Website und Online-Profile aktualisiert
- Patienteninformation / Aushang veröffentlicht

Interne Arbeitsliste – vor Inkrafttreten der neuen Öffnungszeiten prüfen.`,
    smoothingEnabled: false,
    audience: "INTERN",
    estimatedLength: "MEDIUM",
  },
];
