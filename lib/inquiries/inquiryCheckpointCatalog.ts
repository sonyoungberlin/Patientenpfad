import {
  InquiryCheckpointStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  InquiryCheckpointPlacement,
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  ResponseKind,
  type InquiryCheckpointTemplate,
  type InquiryCheckpoint,
} from "@/lib/inquiries/types";

/**
 * Statischer Klärpunkt-Katalog für den Anfrage-Assistenten.
 *
 * Jeder Eintrag ist ein vollständiges InquiryCheckpointTemplate ohne Status.
 * Der Status wird bei der Hydration in der Session ergänzt (initial UNGEKLAERT).
 *
 * IC01 – Patientenstatus: dokumentiert nur, ob Bestands- oder Neupatient.
 *         Kein Hinweis auf Online-Anamnese (das ist IC02).
 * IC02 – Online-Anamnese: einziger Checkpoint mit dem Anamnese-Hinweis.
 */
export const INQUIRY_CHECKPOINT_CATALOGUE: Record<string, InquiryCheckpointTemplate> = {
  IC01: {
    id: "IC01",
    title: "Patientenstatus",
    description: "Bestandspatient oder Neupatient?",
    questions: [
      { id: "IC01-Q1", text: "Sind Sie bereits Patient in unserer Praxis?" },
    ],
    hintText:
      "Als Neupatient ist eine vorherige Anmeldung in der Praxis erforderlich.",
    responseKind: ResponseKind.VORAUSSETZUNG,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Patientenstatus: Bestandspatient.",
      [InquiryCheckpointStatus.HINWEIS]: "Neupatient – Anmeldung in der Praxis erforderlich.",
    },
  },

  IC02: {
    id: "IC02",
    title: "Online-Anamnese",
    description: "Wurde die Online-Anamnese vollständig ausgefüllt?",
    questions: [
      {
        id: "IC02-Q1",
        text: "Haben Sie unsere Online-Anamnese bereits vollständig ausgefüllt?",
      },
    ],
    hintText: "Zur Vervollständigung der Krankenakte wird eine ausgefüllte Online-Anamnese benötigt.",
    responseKind: ResponseKind.AKTION,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Online-Anamnese: vollständig vorhanden.",
      [InquiryCheckpointStatus.HINWEIS]: "Online-Anamnese fehlt – Ausfüllen angefordert.",
    },
  },

  IC03: {
    id: "IC03",
    title: "Impfberatung",
    description: "Wurde eine Impfberatung bereits durchgeführt oder wird sie gewünscht?",
    questions: [
      {
        id: "IC03-Q1",
        text: "Haben Sie bereits eine Impfberatung in unserer Praxis erhalten?",
      },
    ],
    /** Notwendig: Beratung ist vor der Impfung erforderlich. */
    hintText: "Zur Durchführung der Impfung ist eine ärztliche Beratung erforderlich.",
    /** Optional: Beratung wird angeboten, ist aber nicht zwingend erforderlich. */
    hintTextOptional:
      "Falls gewünscht, kann vorab ein Termin zur Impfberatung gebucht werden.",
    responseKind: ResponseKind.VORAUSSETZUNG,
    responseKindOptional: ResponseKind.INFO,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Impfberatung: bereits erfolgt.",
      [InquiryCheckpointStatus.HINWEIS]: "Impfberatung notwendig – Termin empfohlen.",
      [InquiryCheckpointStatus.HINWEIS_OPTIONAL]: "Impfberatung optional – Beratungstermin angeboten.",
    },
  },

  IC04: {
    id: "IC04",
    title: "Impfpass / Impfstatus",
    description: "Liegt ein Impfpass vor?",
    questions: [
      {
        id: "IC04-Q1",
        text: "Haben Sie Ihren Impfpass zur Hand?",
      },
    ],
    hintText: "Zum Termin wird der Impfpass benötigt.",
    responseKind: ResponseKind.VORBEREITUNG,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Impfpass: vorhanden.",
      [InquiryCheckpointStatus.HINWEIS]: "Impfpass – Mitbringen erbeten.",
    },
  },

  IC05: {
    id: "IC05",
    title: "Terminwunsch",
    description: "Liegt ein konkreter Terminwunsch vor?",
    questions: [
      {
        id: "IC05-Q1",
        text: "Haben Sie einen Wunschtermin oder einen bevorzugten Zeitraum?",
      },
    ],
    hintText:
      "Zur Terminbuchung wird ein bevorzugter Zeitraum benötigt.",
    responseKind: ResponseKind.AKTION,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Terminwunsch: angegeben.",
      [InquiryCheckpointStatus.HINWEIS]:
        "Kein Terminwunsch angegeben – Rückfrage gestellt.",
    },
  },

  IC06: {
    id: "IC06",
    title: "Online-Terminbuchung",
    description: "Hat die Person einen Zugang zur Online-Terminbuchung?",
    questions: [
      {
        id: "IC06-Q1",
        text: "Haben Sie bereits einen Zugang zur Online-Terminbuchung unserer Praxis?",
      },
    ],
    hintText:
      "Termine können über die Online-Terminbuchung der Praxis vereinbart werden.",
    responseKind: ResponseKind.AKTION,
    docText: {
      [InquiryCheckpointStatus.GEKLAERT]: "Online-Terminbuchung: Zugang vorhanden.",
      [InquiryCheckpointStatus.HINWEIS]: "Online-Terminbuchung: Zugang fehlt – Einrichtung empfohlen.",
    },
  },
};

// ---------------------------------------------------------------------------
// Neuer Katalog (Architektur v2) – AU-Checkpoints
// ---------------------------------------------------------------------------

/**
 * Checkpoint-Katalog nach der neuen Architektur.
 *
 * Enthält alle Checkpoints des AU-Anliegen sowie die wiederverwendbaren
 * globalen Checkpoints (GLOBAL scope).
 */
export const INQUIRY_CHECKPOINT_CATALOG_V2: Record<string, InquiryCheckpoint> = {

  // ---- DECISION ----

  AU_DECISION: {
    id: "AU_DECISION",
    label: "AU-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    // Klärungsfragen zur AU-Entscheidung (erscheinen in M2 als Fragenblock und in M3 als Kontext).
    // Nur echte Entscheidungsgrundlagen – kein Thema, das eine eigene Patientenerklärung braucht.
    // Rückdatierung ist ein eigener SPECIFIC Explanation Checkpoint (AU_BACKDATE_LIMIT).
    // Wiederholung ohne Untersuchung wird global über DOCTOR_REVIEW_REQUIRED abgebildet.
    questions: [
      { id: "AU_DECISION-Q1", text: "Sind Beschwerden oder eine Diagnose nachvollziehbar angegeben?" },
      { id: "AU_DECISION-Q2", text: "Liegt der Zeitraum der angefragten Arbeitsunfähigkeit bei maximal fünf Tagen?" },
      { id: "AU_DECISION-Q3", text: "Bei Langzeit-AU: Liegt eine ärztliche Freigabe vor?" },
    ],
    textByStatus: {
      // DecisionStatus.DISABLED ist nicht befüllt: bedeutet „noch keine manuelle Entscheidung
      // getroffen". Der Renderer liefert in diesem Fall mainDecision: null – kein Ausgabetext.
      [DecisionStatus.POSSIBLE]:
        "Ihre Arbeitsunfähigkeitsbescheinigung wurde ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Die von Ihnen angefragte Arbeitsunfähigkeitsbescheinigung wurde nicht ausgestellt.",
    },
  },

  // ---- AU SPECIFIC EXPLANATIONS ----

  AU_BACKDATE_LIMIT: {
    id: "AU_BACKDATE_LIMIT",
    label: "Rückdatierungsgrenze",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_BACKDATE_LIMIT-Q1", text: "Liegt der gewünschte Beginn der Arbeitsunfähigkeit länger als zwei Tage zurück?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Arbeitsunfähigkeitsbescheinigungen können nur bis zu zwei Tage rückwirkend ausgestellt werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_DURATION_LIMIT: {
    id: "AU_DURATION_LIMIT",
    label: "AU-Dauer überschreitet Rahmen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_DURATION_LIMIT-Q1", text: "Überschreitet die gewünschte AU-Dauer den zulässigen Rahmen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "AU-Hinweis: Gewünschte AU-Dauer überschreitet den zulässigen Rahmen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_WORK_ACCIDENT: {
    id: "AU_WORK_ACCIDENT",
    label: "Arbeitsunfall / Wegeunfall",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_WORK_ACCIDENT-Q1", text: "Handelt es sich um Beschwerden im Zusammenhang mit einem Arbeits- oder Wegeunfall?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die medizinische Behandlung und Krankschreibung nach einem Arbeits- oder Wegeunfall erfolgt über einen Durchgangsarzt (D-Arzt).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_CHILD_SICK: {
    id: "AU_CHILD_SICK",
    label: "Kind krank / Kindkrank-Bescheinigung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_CHILD_SICK-Q1", text: "Geht es ausschließlich um eine Bescheinigung zur Betreuung eines erkrankten Kindes?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bescheinigungen zur Betreuung eines erkrankten Kindes werden ausschließlich durch die behandelnde Kinderarztpraxis ausgestellt.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_CONTINUITY_REQUIRED: {
    id: "AU_CONTINUITY_REQUIRED",
    label: "Folge-AU / Lückenlosigkeit",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_CONTINUITY_REQUIRED-Q1", text: "Handelt es sich um eine Folge-AU und besteht dabei eine zeitliche Lücke zum vorherigen Zeitraum?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Folgebescheinigungen müssen unmittelbar an den vorherigen Zeitraum anschließen, um Lücken im Versicherungsverlauf zu vermeiden. Aus diesem Grund ist die Ausstellung einer Folgebescheinigung nicht möglich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_RETURN_TO_WORK: {
    id: "AU_RETURN_TO_WORK",
    label: "Vorzeitige Arbeitsaufnahme / Gesundschreibung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_RETURN_TO_WORK-Q1", text: "Geht es um eine vorzeitige Rückkehr an den Arbeitsplatz oder eine gewünschte Gesundschreibung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Eine formale Gesundschreibung gibt es nicht; eine vorzeitige Rückkehr an den Arbeitsplatz ist möglich, wenn man sich arbeitsfähig fühlt.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- PRESCRIPTION DECISION ----

  PRESCRIPTION_DECISION: {
    id: "PRESCRIPTION_DECISION",
    label: "Rezept-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    // Klärungsfragen zur Rezept-Entscheidung (erscheinen in M2 als Fragenblock und in M3 als Kontext).
    // Nur echte Entscheidungsgrundlagen – kein Thema, das eine eigene Patientenerklärung braucht.
    // Sonderfälle (BtM, Privatrezept, Pille) werden über SPECIFIC Explanation Checkpoints abgebildet.
    questions: [
      { id: "PRESCRIPTION_DECISION-Q1", text: "Ist die Verordnung medizinisch nachvollziehbar / indiziert?" },
      { id: "PRESCRIPTION_DECISION-Q2", text: "Handelt es sich um eine Wiederverordnung von Dauermedikation?" },
      { id: "PRESCRIPTION_DECISION-Q3", text: "Liegt eine ärztliche Anordnung vor?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Ein Rezept kann ausgestellt werden.",
      [DecisionStatus.NOT_POSSIBLE]: "Ein Rezept kann nicht ausgestellt werden.",
    },
  },

  // ---- PRESCRIPTION SPECIFIC EXPLANATIONS ----

  PRESCRIPTION_CONTROL_OVERDUE: {
    id: "PRESCRIPTION_CONTROL_OVERDUE",
    label: "Kontrollintervall überfällig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_CONTROL_OVERDUE-Q1", text: "Ist das erforderliche Kontrollintervall für die Medikation überschritten?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: Kontrolltermin erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: {
    id: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
    label: "Facharztbericht erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED-Q1", text: "Fehlt ein aktueller Facharztbericht für die angefragte Medikation?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: aktueller Facharztbericht erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_BTM_ADHS_RULES: {
    id: "PRESCRIPTION_BTM_ADHS_RULES",
    label: "BtM / ADHS / Facharztpflicht",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_BTM_ADHS_RULES-Q1", text: "Geht es um ein BtM- oder ADHS-Medikament mit fachärztlicher Zuständigkeit?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: fachärztliche Zuständigkeit bei BtM/ADHS.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_PRIVATE_ONLY: {
    id: "PRESCRIPTION_PRIVATE_ONLY",
    label: "Privatrezept / Selbstzahler",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_PRIVATE_ONLY-Q1", text: "Handelt es sich um ein Präparat, das nur privat verordnet werden kann?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: nur als Privatrezept möglich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_GYN_EXCLUSIVITY: {
    id: "PRESCRIPTION_GYN_EXCLUSIVITY",
    label: "Gynäkologische Verordnung / Pille",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_GYN_EXCLUSIVITY-Q1", text: "Handelt es sich um eine gynäkologische Verordnung, z. B. die Pille?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: gynäkologische Zuständigkeit.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_NO_POSTAL_DELIVERY: {
    id: "PRESCRIPTION_NO_POSTAL_DELIVERY",
    label: "Kein Postversand",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "PRESCRIPTION_NO_POSTAL_DELIVERY-Q1", text: "Wurde ein Postversand des Rezepts angefragt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: Postversand nicht möglich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- PRESCRIPTION SPECIFIC EXPLANATIONS (ungebunden / veraltet) ----
  // Diese Checkpoints werden nicht mehr im PRESCRIPTION-Profil gebunden.
  // Sie verbleiben vorerst im Katalog, bis alle Referenzen bereinigt sind.

  PRESCRIPTION_KNOWN_MEDICATION: {
    id: "PRESCRIPTION_KNOWN_MEDICATION",
    label: "Medikament bekannt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.NO]:
        "Rezept-Hinweis: Medikament / Verordnung in der Praxis nicht bekannt.",
    },
  },

  PRESCRIPTION_FOLLOW_UP: {
    id: "PRESCRIPTION_FOLLOW_UP",
    label: "Folgerezept / Dauermedikation",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: Folgerezept / Dauermedikation.",
    },
  },

  PRESCRIPTION_SPECIALIST_REQUIRED: {
    id: "PRESCRIPTION_SPECIALIST_REQUIRED",
    label: "Fachärztliche Mitbehandlung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: Fachärztliche Mitbehandlung / Bericht erforderlich.",
    },
  },

  PRESCRIPTION_SPECIAL_TYPE: {
    id: "PRESCRIPTION_SPECIAL_TYPE",
    label: "Sonderfall",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezept-Hinweis: Sonderfall (BtM, Privatrezept, Pille etc.).",
    },
  },

  // ---- LAB DECISION ----

  LAB_DECISION: {
    id: "LAB_DECISION",
    label: "Labor-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Eine Laboruntersuchung kann veranlasst werden.",
      [DecisionStatus.NOT_POSSIBLE]: "Eine Laboruntersuchung kann derzeit nicht veranlasst werden.",
    },
  },

  // ---- LAB SPECIFIC CHECKPOINTS ----

  // Labor-Anlass / Indikation: klärt den Grund / Kontext für die Laboranforderung.
  // Dieser Checkpoint beschreibt, warum Labor gewünscht oder sinnvoll sein könnte
  // (z. B. Beschwerden, Routinekontrolle, externe Anordnung, Wunschleistung).
  // Er ist ein anliegenspezifischer Kontext-Checkpoint und löst keine automatische
  // Entscheidung aus. Abgrenzung zu DOCTOR_REVIEW_REQUIRED (GLOBAL):
  // DOCTOR_REVIEW_REQUIRED bedeutet, dass vor Weiterbearbeitung erst eine ärztliche
  // Klärung/Freigabe stattfinden muss – unabhängig davon, ob ein Anlass vorliegt.
  LAB_MEDICAL_INDICATION: {
    id: "LAB_MEDICAL_INDICATION",
    label: "Labor-Anlass / Indikation",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_MEDICAL_INDICATION-Q1", text: "Liegen Beschwerden vor?" },
      { id: "LAB_MEDICAL_INDICATION-Q2", text: "Liegt eine Überweisung oder externe Anordnung vor?" },
      { id: "LAB_MEDICAL_INDICATION-Q3", text: "Geht es um eine Routinekontrolle?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Labor-Hinweis: Anlass für Laboruntersuchung ist angegeben.",
      [ExplanationStatus.NO]: "Labor-Hinweis: Kein Laboranlass / Indikation nicht erkennbar.",
    },
  },

  LAB_CHECKUP_ELIGIBLE: {
    id: "LAB_CHECKUP_ELIGIBLE",
    label: "Check-up / Vorsorge",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_CHECKUP_ELIGIBLE-Q1", text: "Geht es um Check-up / Vorsorge?" },
      { id: "LAB_CHECKUP_ELIGIBLE-Q2", text: "Wann war der letzte Check-up?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Labor-Hinweis: Check-up / Vorsorge möglich.",
      [ExplanationStatus.NO]: "Labor-Hinweis: Check-up / Vorsorge derzeit nicht vorgesehen.",
    },
  },

  LAB_VALUES_DEFINED: {
    id: "LAB_VALUES_DEFINED",
    label: "Laborwerte definiert",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_VALUES_DEFINED-Q1", text: "Welche Werte werden gewünscht?" },
      { id: "LAB_VALUES_DEFINED-Q2", text: "Sind die Werte konkret benannt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Labor-Hinweis: Gewünschte Laborwerte sind benannt.",
      [ExplanationStatus.NO]: "Labor-Hinweis: Laborwerte bitte konkret angeben.",
    },
  },

  LAB_FASTING_REQUIRED: {
    id: "LAB_FASTING_REQUIRED",
    label: "Nüchternabnahme erforderlich",
    kind: InquiryCheckpointKind.PREPARATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_FASTING_REQUIRED-Q1", text: "Sind nüchterne Werte erforderlich?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]: "Labor-Hinweis: Bitte nüchtern zur Blutentnahme erscheinen (mind. 8 Std. ohne Essen).",
    },
  },

  // ---- GLOBAL EXPLANATIONS ----

  IS_NEW_PATIENT: {
    id: "IS_NEW_PATIENT",
    label: "Neupatient",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Ist die Person ein neuer Patient (Erstkontakt)?",
    textByStatus: {},
  },

  PATIENT_NOT_IN_GERMANY: {
    id: "PATIENT_NOT_IN_GERMANY",
    label: "Aufenthaltsort außerhalb Deutschland",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Befindet sich der Patient aktuell NICHT in Deutschland?",
    textByStatus: {},
  },

  DOCTOR_REVIEW_REQUIRED: {
    id: "DOCTOR_REVIEW_REQUIRED",
    label: "Ärztliche Einschätzung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Ist für dieses Anliegen eine ärztliche Einschätzung erforderlich?",
    textByStatus: {},
  },

  DATA_INCOMPLETE: {
    id: "DATA_INCOMPLETE",
    label: "Angaben unvollständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Fehlen relevante Angaben oder Daten?",
    textByStatus: {},
  },

  IS_CHRONIC_PATIENT: {
    id: "IS_CHRONIC_PATIENT",
    label: "Chronische Erkrankung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Liegt eine chronische oder dauerhaft behandlungsbedürftige Erkrankung vor?",
    textByStatus: {},
  },

  // ---- GLOBAL ACTIONS ----

  OPEN_CONSULTATION: {
    id: "OPEN_CONSULTATION",
    label: "Ärztliche Konsultation",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  DIGITAL_REQUEST: {
    id: "DIGITAL_REQUEST",
    label: "Digitale Anfrage",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die Anfrage kann über die digitale Anfrage gestellt werden.",
    },
  },

  ONLINE_ANAMNESIS: {
    id: "ONLINE_ANAMNESIS",
    label: "Online-Anamnese",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Fehlende Angaben können über die Online-Anamnese ergänzt werden.",
    },
  },

  BOOK_APPOINTMENT: {
    id: "BOOK_APPOINTMENT",
    label: "Termin buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Termine können über den Online-Kalender vereinbart werden.",
    },
  },

  PROCESSING_DELAY: {
    id: "PROCESSING_DELAY",
    label: "Bearbeitungsverzögerung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Hinweis: Die Bearbeitung kann derzeit länger dauern als üblich.",
    },
  },

  TECHNICAL_ISSUE: {
    id: "TECHNICAL_ISSUE",
    label: "Technische Störung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Hinweis: Aktuell liegt eine technische Störung vor. Der Systemzugriff ist eingeschränkt.",
    },
  },

  E_RECIPE_USE: {
    id: "E_RECIPE_USE",
    label: "eRezept nutzen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Das Rezept wird als eRezept ausgestellt und kann mit der elektronischen Gesundheitskarte (eGK) in der Apotheke eingelöst werden.",
    },
  },

  PHARMACY_INFORMATION: {
    id: "PHARMACY_INFORMATION",
    label: "Apotheke / Direktübermittlung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte geben Sie Ihre bevorzugte Apotheke an, damit das Rezept direkt übermittelt werden kann.",
    },
  },

  DOCUMENT_UPLOAD: {
    id: "DOCUMENT_UPLOAD",
    label: "Unterlagen hochladen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte laden Sie relevante Unterlagen (z. B. Facharztbericht, Medikamentenplan) über die digitale Anfrage hoch.",
    },
  },
};
