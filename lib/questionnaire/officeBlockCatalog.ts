/**
 * Statischer Block-Katalog für Office-/Bewerbungsfragebögen.
 *
 * Vollständig getrennt vom patientenseitigen BLOCK_CATALOG.
 * Verwendet dieselben Typen (QuestionnaireBlock, QuestionDefinition),
 * aber komplett eigene IDs und Inhalte.
 *
 * Blöcke (Startmenge v1):
 *   10 BEWERBER_KONTAKT          – Vorname, Nachname, E-Mail, Telefon
 *   20 BEWERBER_AUSBILDUNG       – Abschluss, Institution, Jahr, Zusatzqualifikationen
 *   30 BEWERBER_BERUFSERFAHRUNG  – Jahre, Bereiche, Beschreibung
 *   40 BEWERBER_SPRACHKENNTNISSE – Sprache + Niveau (repeatable_group)
 *   50 BEWERBER_FUEHRERSCHEIN    – Führerschein ja/nein + Klassen (conditional)
 *   60 BEWERBER_ARBEITSZEITEN    – Modell, Einschränkungen, Frühestbeginn
 */

import type { QuestionnaireBlock, QuestionDefinition } from "./blockCatalog";

// ---------------------------------------------------------------------------
// Question Catalog
// ---------------------------------------------------------------------------

export const OFFICE_QUESTION_CATALOG: Record<string, QuestionDefinition> = {
  // BEWERBER_KONTAKT
  OFF_VORNAME: {
    id: "OFF_VORNAME",
    text: "Vorname",
    type: "text",
    required: true,
  },
  OFF_NACHNAME: {
    id: "OFF_NACHNAME",
    text: "Nachname",
    type: "text",
    required: true,
  },
  OFF_EMAIL: {
    id: "OFF_EMAIL",
    text: "E-Mail-Adresse",
    type: "text",
    required: false,
    helperText: "Für Rückfragen",
  },
  OFF_TELEFON: {
    id: "OFF_TELEFON",
    text: "Telefonnummer",
    type: "text",
    required: false,
  },

  // BEWERBER_AUSBILDUNG
  OFF_ABSCHLUSS: {
    id: "OFF_ABSCHLUSS",
    text: "Berufsabschluss",
    type: "select",
    required: true,
    options: [
      "MFA (Medizinische Fachangestellte)",
      "ZFA (Zahnmedizinische Fachangestellte)",
      "Arzthelfer/in",
      "Pflegefachkraft",
      "Krankenpfleger/in",
      "Altenpfleger/in",
      "Rettungssanitäter/in",
      "Notfallsanitäter/in",
      "Sonstiges",
    ],
  },
  OFF_INSTITUTION: {
    id: "OFF_INSTITUTION",
    text: "Ausbildungsstätte",
    type: "text",
    required: false,
  },
  OFF_ABSCHLUSSJAHR: {
    id: "OFF_ABSCHLUSSJAHR",
    text: "Jahr des Abschlusses",
    type: "number",
    required: false,
    step: 1,
  },
  OFF_ZUSATZQUALIFIKATIONEN: {
    id: "OFF_ZUSATZQUALIFIKATIONEN",
    text: "Weiterbildungen / Zusatzqualifikationen",
    type: "textarea",
    required: false,
    helperText: "z. B. Wundmanagement, EKG, Notfallkurs",
  },

  // BEWERBER_BERUFSERFAHRUNG
  OFF_BERUFSJAHRE: {
    id: "OFF_BERUFSJAHRE",
    text: "Berufserfahrung (Jahre)",
    type: "number",
    required: false,
    step: 1,
    unit: "Jahre",
  },
  OFF_TAETIGKEITSBEREICHE: {
    id: "OFF_TAETIGKEITSBEREICHE",
    text: "Bisherige Tätigkeitsbereiche",
    type: "multi_select",
    required: false,
    options: [
      "Hausarztpraxis / Allgemeinmedizin",
      "Facharztpraxis",
      "Krankenhaus / Klinik",
      "Pflegeeinrichtung",
      "Ambulanter Pflegedienst",
      "Labor",
      "Sonstiges",
    ],
  },
  OFF_BERUF_BESCHREIBUNG: {
    id: "OFF_BERUF_BESCHREIBUNG",
    text: "Kurze Beschreibung der bisherigen Tätigkeit",
    type: "textarea",
    required: false,
  },

  // BEWERBER_ARZT_BASIS
  OFF_ARZT_APPROBATION: {
    id: "OFF_ARZT_APPROBATION",
    text: "Wie ist Ihr aktueller Approbationsstatus?",
    type: "select",
    required: true,
    options: [
      "Deutsche Approbation vorhanden",
      "Approbation in Deutschland beantragt",
      "Berufserlaubnis vorhanden",
      "Ausländische ärztliche Zulassung vorhanden",
      "Noch keine ärztliche Zulassung",
    ],
  },
  OFF_ARZT_FACHARZTSTATUS: {
    id: "OFF_ARZT_FACHARZTSTATUS",
    text: "Wie ist Ihr aktueller fachärztlicher Weiterbildungsstatus?",
    type: "select",
    required: true,
    options: [
      "Facharztanerkennung vorhanden",
      "In fachärztlicher Weiterbildung",
      "Noch keine fachärztliche Weiterbildung begonnen",
    ],
  },
  OFF_ARZT_FACHGEBIET: {
    id: "OFF_ARZT_FACHGEBIET",
    text: "Facharztbezeichnung / angestrebte Facharztbezeichnung",
    type: "text",
    required: false,
  },
  OFF_ARZT_WEITERBILDUNGSJAHR: {
    id: "OFF_ARZT_WEITERBILDUNGSJAHR",
    text: "Falls Sie sich in Weiterbildung befinden: In welchem Weiterbildungsjahr sind Sie?",
    type: "number",
    required: false,
    step: 1,
  },
  OFF_ARZT_BERUFSERFAHRUNG_JAHRE: {
    id: "OFF_ARZT_BERUFSERFAHRUNG_JAHRE",
    text: "Ärztliche Berufserfahrung insgesamt",
    type: "number",
    required: false,
    step: 1,
    unit: "Jahre",
  },
  OFF_ARZT_AMBULANTE_ERFAHRUNG: {
    id: "OFF_ARZT_AMBULANTE_ERFAHRUNG",
    text: "Haben Sie bereits ambulant ärztlich gearbeitet?",
    type: "yes_no",
    required: false,
  },
  OFF_ARZT_HAUSARZT_ERFAHRUNG: {
    id: "OFF_ARZT_HAUSARZT_ERFAHRUNG",
    text: "Haben Sie bereits in der hausärztlichen Versorgung gearbeitet?",
    type: "yes_no",
    required: false,
  },
  OFF_ARZT_TAETIGKEITSBEREICHE: {
    id: "OFF_ARZT_TAETIGKEITSBEREICHE",
    text: "In welchen ärztlichen Bereichen haben Sie bisher gearbeitet?",
    type: "multi_select",
    required: false,
    options: [
      "Hausarztpraxis",
      "Facharztpraxis",
      "MVZ",
      "Krankenhaus / Klinik",
      "Universitätsklinik",
      "Notaufnahme",
      "Bereitschaftsdienst",
      "Rehabilitation",
      "Öffentlicher Gesundheitsdienst",
      "Sonstiges",
    ],
  },
  OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE: {
    id: "OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE",
    text: "Weitere ärztliche Tätigkeitsbereiche",
    type: "textarea",
    required: false,
  },
  OFF_ARZT_TAETIGKEIT_BESCHREIBUNG: {
    id: "OFF_ARZT_TAETIGKEIT_BESCHREIBUNG",
    text: "Was waren Ihre bisherigen ärztlichen Tätigkeitsschwerpunkte?",
    type: "textarea",
    required: false,
  },

  // BEWERBER_REZEPTION_BUERO – Teil 1: Organisatorische Tätigkeiten (Skala A)
  OFF_REZEPTION_TELEFON: {
    id: "OFF_REZEPTION_TELEFON",
    text: "Telefonische Anfragen entgegennehmen und strukturiert bearbeiten",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_TERMINE: {
    id: "OFF_REZEPTION_TERMINE",
    text: "Termine vergeben, verschieben und koordinieren",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_PATIENTENAUFNAHME: {
    id: "OFF_REZEPTION_PATIENTENAUFNAHME",
    text: "Patientenaufnahme und Stammdatenpflege",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_EMAIL: {
    id: "OFF_REZEPTION_EMAIL",
    text: "E-Mail-Kommunikation im Praxisalltag",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_DOKUMENTE: {
    id: "OFF_REZEPTION_DOKUMENTE",
    text: "Dokumente scannen, zuordnen und digital ablegen",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_FORMULARE: {
    id: "OFF_REZEPTION_FORMULARE",
    text: "Formulare und administrative Unterlagen vorbereiten",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_PRIORISIEREN: {
    id: "OFF_REZEPTION_PRIORISIEREN",
    text: "Mehrere Aufgaben gleichzeitig priorisieren und koordinieren",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_SCHWIERIGE_SITUATIONEN: {
    id: "OFF_REZEPTION_SCHWIERIGE_SITUATIONEN",
    text: "Umgang mit ungeduldigen oder aufgebrachten Personen am Empfang oder Telefon",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_REZEPTION_DATENSCHUTZ: {
    id: "OFF_REZEPTION_DATENSCHUTZ",
    text: "Vertraulicher Umgang mit personenbezogenen und medizinischen Daten",
    type: "select",
    required: false,
    options: [
      "Noch nicht gemacht",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },

  // BEWERBER_REZEPTION_BUERO – Teil 2: Office- / PC-Kompetenzen (Skala B)
  OFF_BUERO_WORD: {
    id: "OFF_BUERO_WORD",
    text: "Microsoft Word oder vergleichbare Textverarbeitung",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_TABELLEN: {
    id: "OFF_BUERO_TABELLEN",
    text: "Microsoft Excel oder vergleichbare Tabellenkalkulation",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_OUTLOOK: {
    id: "OFF_BUERO_OUTLOOK",
    text: "Outlook oder vergleichbare E-Mail-Programme",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_BROWSER: {
    id: "OFF_BUERO_BROWSER",
    text: "Browser und Internetrecherche",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_PDF: {
    id: "OFF_BUERO_PDF",
    text: "PDF-Dateien erstellen, bearbeiten und zusammenführen",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_SCANNER: {
    id: "OFF_BUERO_SCANNER",
    text: "Scanner und digitale Dokumentenverwaltung",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_VIDEOKONFERENZ: {
    id: "OFF_BUERO_VIDEOKONFERENZ",
    text: "Videokonferenz- und Kommunikationsprogramme wie Teams oder Zoom",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },
  OFF_BUERO_WEITERE_PROGRAMME: {
    id: "OFF_BUERO_WEITERE_PROGRAMME",
    text: "Weitere Büroprogramme oder Systeme, mit denen Sie regelmäßig gearbeitet haben",
    type: "textarea",
    required: false,
  },
  OFF_REZEPTION_ABRECHNUNG: {
    id: "OFF_REZEPTION_ABRECHNUNG",
    text: "Erfahrung mit Abrechnung oder administrativen Praxisprozessen",
    type: "select",
    required: false,
    options: [
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ],
  },

  // BEWERBER_MFA_KOMPETENZEN – 4-stufige Kompetenzskala je Tätigkeit
  OFF_MFA_BLUTENTNAHME: {
    id: "OFF_MFA_BLUTENTNAHME",
    text: "Venöse Blutentnahme",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_IMPFUNGEN: {
    id: "OFF_MFA_IMPFUNGEN",
    text: "Impfungen vorbereiten und dokumentieren",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_INJEKTIONEN: {
    id: "OFF_MFA_INJEKTIONEN",
    text: "Subkutane / intramuskuläre Injektionen durchführen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_EKG: {
    id: "OFF_MFA_EKG",
    text: "Ruhe-EKG anlegen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_LANGZEIT_EKG: {
    id: "OFF_MFA_LANGZEIT_EKG",
    text: "Langzeit-EKG anlegen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_LANGZEIT_RR: {
    id: "OFF_MFA_LANGZEIT_RR",
    text: "Langzeit-Blutdruckmessung anlegen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_SPIROMETRIE: {
    id: "OFF_MFA_SPIROMETRIE",
    text: "Spirometrie / Lungenfunktion durchführen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_WUNDVERSORGUNG: {
    id: "OFF_MFA_WUNDVERSORGUNG",
    text: "Wundversorgung und Verbandswechsel",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_SCHNELLTESTS: {
    id: "OFF_MFA_SCHNELLTESTS",
    text: "Urin- und Schnelltests durchführen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_LABOR: {
    id: "OFF_MFA_LABOR",
    text: "Laborproben vorbereiten und verarbeiten",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_ASSISTENZ: {
    id: "OFF_MFA_ASSISTENZ",
    text: "Bei Untersuchungen und kleinen Eingriffen assistieren",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_NOTFALL: {
    id: "OFF_MFA_NOTFALL",
    text: "Umgang mit Notfall- und Reanimationsabläufen",
    type: "select",
    required: false,
    options: [
      "Noch nicht durchgeführt",
      "Mit Anleitung",
      "Weitgehend sicher",
      "Sicher und routiniert",
    ],
  },
  OFF_MFA_ZUSATZQUALIFIKATIONEN: {
    id: "OFF_MFA_ZUSATZQUALIFIKATIONEN",
    text: "Welche Zusatzqualifikationen oder Fortbildungen haben Sie?",
    type: "multi_select",
    required: false,
    options: [
      "Impfmanagement",
      "NäPA",
      "VERAH",
      "Wundmanagement",
      "Kardiologie",
      "Medizinprodukte / Aufbereitung",
      "Praxismanagement",
      "Fachwirt/in für ambulante medizinische Versorgung",
      "Sonstige",
    ],
  },
  OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE: {
    id: "OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE",
    text: "Weitere Zusatzqualifikationen",
    type: "textarea",
    required: false,
  },

  // BEWERBER_PVS_DIGITAL
  OFF_PVS_ERFAHRUNG: {
    id: "OFF_PVS_ERFAHRUNG",
    text: "Haben Sie bereits mit einem Praxisverwaltungssystem (PVS) gearbeitet?",
    type: "yes_no",
    required: true,
  },
  OFF_PVS_SYSTEME: {
    id: "OFF_PVS_SYSTEME",
    text: "Mit welchen Praxisverwaltungssystemen haben Sie gearbeitet?",
    type: "repeatable_group",
    required: false,
    addEntryLabel: "+ Weiteres PVS hinzufügen",
    groupSchema: [
      {
        key: "system",
        label: "Praxisverwaltungssystem",
        type: "text",
        required: true,
      },
      {
        key: "niveau",
        label: "Erfahrung",
        type: "select",
        required: true,
        options: [
          "Nur kurz genutzt",
          "Grundkenntnisse",
          "Sicher",
          "Sehr sicher / tägliche Routine",
        ],
      },
    ],
  },
  OFF_DIGITAL_SELBSTEINSCHAETZUNG: {
    id: "OFF_DIGITAL_SELBSTEINSCHAETZUNG",
    text: "Wie schätzen Sie sich im Umgang mit neuen digitalen Systemen ein?",
    type: "select",
    required: true,
    options: [
      "Digitale Systeme fallen mir eher schwer",
      "Nach kurzer Einarbeitung komme ich gut zurecht",
      "Ich arbeite sicher mit digitalen Systemen",
      "Ich finde mich sehr schnell in neuer Software zurecht",
    ],
  },
  OFF_DIGITAL_ANWENDUNGEN: {
    id: "OFF_DIGITAL_ANWENDUNGEN",
    text: "Mit welchen digitalen Anwendungen im Praxisalltag haben Sie bereits gearbeitet?",
    type: "multi_select",
    required: false,
    options: [
      "eRezept",
      "eAU",
      "ePA",
      "KIM",
      "Online-Terminierung",
      "Digitale Dokumentenverwaltung",
      "Scanner / PDF / Dokumentenimport",
    ],
  },
  OFF_DIGITAL_WEITERE_SYSTEME: {
    id: "OFF_DIGITAL_WEITERE_SYSTEME",
    text: "Weitere Programme oder digitale Systeme, mit denen Sie regelmäßig gearbeitet haben",
    type: "textarea",
    required: false,
  },

  // BEWERBER_SPRACHKENNTNISSE
  OFF_SPRACHKENNTNISSE: {
    id: "OFF_SPRACHKENNTNISSE",
    text: "Sprachkenntnisse",
    type: "repeatable_group",
    required: false,
    addEntryLabel: "+ Weitere Sprache hinzufügen",
    groupSchema: [
      {
        key: "sprache",
        label: "Sprache",
        type: "text",
        required: true,
      },
      {
        key: "niveau",
        label: "Niveau",
        type: "select",
        required: true,
        options: ["Muttersprache", "Verhandlungssicher (C1/C2)", "Gut (B1/B2)", "Grundkenntnisse (A1/A2)"],
      },
    ],
  },

  // BEWERBER_FUEHRERSCHEIN
  OFF_FUEHRERSCHEIN: {
    id: "OFF_FUEHRERSCHEIN",
    text: "Führerschein vorhanden",
    type: "yes_no",
    required: false,
  },
  OFF_FUEHRERSCHEIN_KLASSEN: {
    id: "OFF_FUEHRERSCHEIN_KLASSEN",
    text: "Führerscheinklassen",
    type: "multi_select",
    required: false,
    options: ["Klasse B", "Klasse BE", "Klasse C", "Klasse CE", "Klasse D", "Sonstige"],
  },

  // BEWERBER_ARBEITSZEITEN
  OFF_ARBEITSZEITMODELL: {
    id: "OFF_ARBEITSZEITMODELL",
    text: "Gewünschtes Arbeitszeitmodell",
    type: "multi_select",
    required: false,
    options: ["Vollzeit", "Teilzeit", "Geringfügige Beschäftigung", "Vertretung / Aushilfe"],
  },
  OFF_ZEITEINSCHRAENKUNGEN: {
    id: "OFF_ZEITEINSCHRAENKUNGEN",
    text: "Zeitliche Einschränkungen oder Wünsche",
    type: "textarea",
    required: false,
    helperText: "z. B. keine Abendschichten, kein Wochenende",
  },
  OFF_FRUEHESTBEGINN: {
    id: "OFF_FRUEHESTBEGINN",
    text: "Frühestmöglicher Arbeitsbeginn",
    type: "date",
    required: false,
  },
};

// ---------------------------------------------------------------------------
// Block Catalog
// ---------------------------------------------------------------------------

export const OFFICE_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  BEWERBER_KONTAKT: {
    id: "BEWERBER_KONTAKT",
    label: "Kontaktdaten",
    displayOrder: 10,
    questionIds: ["OFF_VORNAME", "OFF_NACHNAME", "OFF_EMAIL", "OFF_TELEFON"],
  },
  BEWERBER_AUSBILDUNG: {
    id: "BEWERBER_AUSBILDUNG",
    label: "Ausbildung / Qualifikation",
    displayOrder: 20,
    questionIds: [
      "OFF_ABSCHLUSS",
      "OFF_INSTITUTION",
      "OFF_ABSCHLUSSJAHR",
      "OFF_ZUSATZQUALIFIKATIONEN",
    ],
  },
  BEWERBER_BERUFSERFAHRUNG: {
    id: "BEWERBER_BERUFSERFAHRUNG",
    label: "Berufserfahrung",
    displayOrder: 30,
    questionIds: [
      "OFF_BERUFSJAHRE",
      "OFF_TAETIGKEITSBEREICHE",
      "OFF_BERUF_BESCHREIBUNG",
    ],
  },
  BEWERBER_ARZT_BASIS: {
    id: "BEWERBER_ARZT_BASIS",
    label: "Ärztliche Basisqualifikation",
    displayOrder: 31,
    questionIds: [
      "OFF_ARZT_APPROBATION",
      "OFF_ARZT_FACHARZTSTATUS",
      "OFF_ARZT_FACHGEBIET",
      "OFF_ARZT_WEITERBILDUNGSJAHR",
      "OFF_ARZT_BERUFSERFAHRUNG_JAHRE",
      "OFF_ARZT_AMBULANTE_ERFAHRUNG",
      "OFF_ARZT_HAUSARZT_ERFAHRUNG",
      "OFF_ARZT_TAETIGKEITSBEREICHE",
      "OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE",
      "OFF_ARZT_TAETIGKEIT_BESCHREIBUNG",
    ],
    conditionalRules: [
      {
        action: "showQuestion" as const,
        targetId: "OFF_ARZT_WEITERBILDUNGSJAHR",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_ARZT_FACHARZTSTATUS" },
          operator: "equals" as const,
          value: "In fachärztlicher Weiterbildung",
        },
      },
      {
        action: "showQuestion" as const,
        targetId: "OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_ARZT_TAETIGKEITSBEREICHE" },
          operator: "contains" as const,
          value: "Sonstiges",
        },
      },
    ],
  },
  BEWERBER_MFA_KOMPETENZEN: {
    id: "BEWERBER_MFA_KOMPETENZEN",
    label: "Praktische MFA-Kompetenzen",
    displayOrder: 33,
    questionIds: [
      "OFF_MFA_BLUTENTNAHME",
      "OFF_MFA_IMPFUNGEN",
      "OFF_MFA_INJEKTIONEN",
      "OFF_MFA_EKG",
      "OFF_MFA_LANGZEIT_EKG",
      "OFF_MFA_LANGZEIT_RR",
      "OFF_MFA_SPIROMETRIE",
      "OFF_MFA_WUNDVERSORGUNG",
      "OFF_MFA_SCHNELLTESTS",
      "OFF_MFA_LABOR",
      "OFF_MFA_ASSISTENZ",
      "OFF_MFA_NOTFALL",
      "OFF_MFA_ZUSATZQUALIFIKATIONEN",
      "OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE",
    ],
    conditionalRules: [
      {
        action: "showQuestion" as const,
        targetId: "OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_MFA_ZUSATZQUALIFIKATIONEN" },
          operator: "contains" as const,
          value: "Sonstige",
        },
      },
    ],
  },
  BEWERBER_PVS_DIGITAL: {
    id: "BEWERBER_PVS_DIGITAL",
    label: "Praxissoftware & digitale Fähigkeiten",
    displayOrder: 35,
    questionIds: [
      "OFF_PVS_ERFAHRUNG",
      "OFF_PVS_SYSTEME",
      "OFF_DIGITAL_SELBSTEINSCHAETZUNG",
      "OFF_DIGITAL_ANWENDUNGEN",
      "OFF_DIGITAL_WEITERE_SYSTEME",
    ],
    conditionalRules: [
      {
        action: "showQuestion" as const,
        targetId: "OFF_PVS_SYSTEME",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_PVS_ERFAHRUNG" },
          operator: "equals" as const,
          value: "Ja",
        },
      },
    ],
  },
  BEWERBER_REZEPTION_BUERO: {
    id: "BEWERBER_REZEPTION_BUERO",
    label: "Rezeption / Büro",
    displayOrder: 38,
    questionIds: [
      "OFF_REZEPTION_TELEFON",
      "OFF_REZEPTION_TERMINE",
      "OFF_REZEPTION_PATIENTENAUFNAHME",
      "OFF_REZEPTION_EMAIL",
      "OFF_REZEPTION_DOKUMENTE",
      "OFF_REZEPTION_FORMULARE",
      "OFF_REZEPTION_PRIORISIEREN",
      "OFF_REZEPTION_SCHWIERIGE_SITUATIONEN",
      "OFF_REZEPTION_DATENSCHUTZ",
      "OFF_BUERO_WORD",
      "OFF_BUERO_TABELLEN",
      "OFF_BUERO_OUTLOOK",
      "OFF_BUERO_BROWSER",
      "OFF_BUERO_PDF",
      "OFF_BUERO_SCANNER",
      "OFF_BUERO_VIDEOKONFERENZ",
      "OFF_BUERO_WEITERE_PROGRAMME",
      "OFF_REZEPTION_ABRECHNUNG",
    ],
  },
  BEWERBER_SPRACHKENNTNISSE: {
    id: "BEWERBER_SPRACHKENNTNISSE",
    label: "Sprachkenntnisse",
    displayOrder: 40,
    questionIds: ["OFF_SPRACHKENNTNISSE"],
  },
  BEWERBER_FUEHRERSCHEIN: {
    id: "BEWERBER_FUEHRERSCHEIN",
    label: "Führerschein",
    displayOrder: 50,
    questionIds: ["OFF_FUEHRERSCHEIN", "OFF_FUEHRERSCHEIN_KLASSEN"],
    conditionalRules: [
      {
        action: "showQuestion" as const,
        targetId: "OFF_FUEHRERSCHEIN_KLASSEN",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_FUEHRERSCHEIN" },
          operator: "equals" as const,
          value: "Ja",
        },
      },
    ],
  },
  BEWERBER_ARBEITSZEITEN: {
    id: "BEWERBER_ARBEITSZEITEN",
    label: "Arbeitszeiten",
    displayOrder: 60,
    questionIds: [
      "OFF_ARBEITSZEITMODELL",
      "OFF_ZEITEINSCHRAENKUNGEN",
      "OFF_FRUEHESTBEGINN",
    ],
  },
};

export const OFFICE_BLOCK_IDS_SORTED: string[] = Object.values(OFFICE_BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);
