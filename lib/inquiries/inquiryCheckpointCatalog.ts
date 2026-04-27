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
  type SpecificRole,
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
    specificRole: "RULE_TIME_LIMIT" as SpecificRole,
    questions: [
      { id: "AU_BACKDATE_LIMIT-Q1", text: "Liegt der gewünschte Beginn der Arbeitsunfähigkeit länger als zwei Tage zurück?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Arbeitsunfähigkeitsbescheinigungen können nur bis zu zwei Tage rückwirkend ausgestellt werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Nicht mehr an AU gebunden. Inhaltlich durch AU_DECISION-Q2 abgedeckt (entfernt). */
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
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
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
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "AU_CHILD_SICK-Q1", text: "Geht es ausschließlich um eine Bescheinigung zur Betreuung eines erkrankten Kindes?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bescheinigungen zur Betreuung eines erkrankten Kindes werden ausschließlich durch die behandelnde Kinderarztpraxis ausgestellt.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Nicht mehr an AU gebunden. Enthält Entscheidungsaussage (NOT_POSSIBLE) statt Erklärung – falsch eingeordnet. */
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

  /** @deprecated Nicht mehr an AU gebunden. Prozesshinweis ohne Entscheidungsbezug – falsch eingeordnet. */
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
      { id: "PRESCRIPTION_DECISION-Q2", text: "Handelt es sich um eine Wiederverordnung von Dauermedikation?" },
      { id: "PRESCRIPTION_DECISION-Q4", text: "Handelt es sich um einen Neupatienten?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Ihr Rezept wurde ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "Das von Ihnen angefragte Rezept wurde nicht ausgestellt.",
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
        "Rezepte für Dauermedikamente setzen regelmäßige ärztliche Kontrolltermine zur Überprüfung der Therapie voraus.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: {
    id: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
    label: "Facharztbericht erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED-Q1", text: "Fehlt ein aktueller fachärztlicher Behandlungsbericht für die angefragte Medikation?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für diese Medikation ist ein aktueller Facharztbericht erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_BTM_ADHS_RULES: {
    id: "PRESCRIPTION_BTM_ADHS_RULES",
    label: "BtM / ADHS / Facharztpflicht",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_BTM_ADHS_RULES-Q1", text: "Geht es um ein ADHS- oder BtM-Medikament mit fachärztlicher Zuständigkeit?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Einstellung und Dosisanpassung von ADHS-Medikamenten erfolgen durch Fachärzte; die Hausarztpraxis stellt nur stabile Folgerezepte bei bestehender Mitbehandlung aus.",
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
        "Dieses Präparat ist keine Leistung der gesetzlichen Krankenkasse und wird als Privatrezept verordnet.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_GYN_EXCLUSIVITY: {
    id: "PRESCRIPTION_GYN_EXCLUSIVITY",
    label: "Gynäkologische Verordnung / Pille",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_GYN_EXCLUSIVITY-Q1", text: "Handelt es sich um eine gynäkologische Verordnung, z. B. die Pille?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Verordnungen für die Pille erfolgen über die gynäkologische Fachpraxis.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_NO_POSTAL_DELIVERY: {
    id: "PRESCRIPTION_NO_POSTAL_DELIVERY",
    label: "Kein Postversand",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_NO_POSTAL_DELIVERY-Q1", text: "Wurde ein Postversand des Rezepts angefragt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Ein Postversand von Rezepten erfolgt nicht; die Bereitstellung erfolgt als eRezept oder über eine Apotheke.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_STATUTORY_POSSIBLE: {
    id: "PRESCRIPTION_STATUTORY_POSSIBLE",
    label: "Kassenrezept möglich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "OUTCOME",
    specificRole: "OUTCOME_INFO" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_STATUTORY_POSSIBLE-Q1", text: "Ist das Rezept als Kassenrezept möglich?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Das eRezept wurde auf Ihrer Gesundheitskarte gespeichert und kann in der Apotheke eingelöst werden. Alternativ erhalten Sie einen QR-Code als PDF oder in Papierform.",
      // NO: bewusst NICHT still – NO bedeutet fachlich „Privatrezept ausgestellt"
      [ExplanationStatus.NO]:
        "Das Medikament wurde als Privatrezept ausgestellt. Die Kosten werden nicht von der gesetzlichen Krankenkasse übernommen und müssen selbst bezahlt werden.",
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
    questions: [
      { id: "LAB_DECISION-Q1", text: "Liegt eine gültige Laboranforderung vor?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Eine Laboruntersuchung kann veranlasst werden.",
      [DecisionStatus.NOT_POSSIBLE]: "Eine Laboruntersuchung kann derzeit nicht veranlasst werden.",
    },
  },

  // ---- LAB SPECIFIC CHECKPOINTS ----

  /** @deprecated ungebunden – nicht mehr in LAB.specificCheckpointIds */
  LAB_CHECKUP_RULES: {
    id: "LAB_CHECKUP_RULES",
    label: "Check-up-Regelung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_CHECKUP_RULES-Q1", text: "Geht es um eine Laborkontrolle im Rahmen eines gesetzlichen Check-ups?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Der gesetzliche Gesundheits-Check-up ist ab 35 Jahren alle drei Jahre sowie einmalig zwischen 18 und 34 Jahren möglich. Häufigere Kontrollen ohne medizinischen Anlass sind keine Kassenleistung.",
      [ExplanationStatus.NO]: "",
    },
  },

  LAB_FASTING_REQUIRED: {
    id: "LAB_FASTING_REQUIRED",
    label: "Vorbereitung: nüchtern erscheinen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "PREPARATION",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte kommen Sie nüchtern zur Blutentnahme. Essen Sie mindestens acht Stunden vorher nichts; Wasser ist erlaubt, Kaffee bitte nicht.",
    },
  },

  LAB_SELF_PAYER_IGEL: {
    id: "LAB_SELF_PAYER_IGEL",
    label: "Selbstzahlerleistung / IGeL",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "RULE_COST_COVERAGE" as SpecificRole,
    questions: [
      { id: "LAB_SELF_PAYER_IGEL-Q1", text: "Handelt es sich um gewünschte Laborwerte ohne Kassenleistung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Blutuntersuchungen ohne medizinische Indikation oder außerhalb der Vorsorgefristen werden als Selbstzahlerleistung durchgeführt.",
      [ExplanationStatus.NO]: "",
    },
  },

  /** @deprecated ungebunden – nicht mehr in LAB.specificCheckpointIds */
  LAB_DISCUSSION_PROCESS_CODE: {
    id: "LAB_DISCUSSION_PROCESS_CODE",
    label: "Befundbesprechung nach Laboreingang",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_DISCUSSION_PROCESS_CODE-Q1", text: "Geht es um den Ablauf der Befundbesprechung nach der Blutentnahme?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Der Buchungscode für die Befundbesprechung wird automatisch versendet, sobald alle Laborergebnisse vorliegen.",
      [ExplanationStatus.NO]: "",
    },
  },

  LAB_MPU_EXCLUSION: {
    id: "LAB_MPU_EXCLUSION",
    label: "MPU / forensisches Screening",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "LAB_MPU_EXCLUSION-Q1", text: "Wird ein forensisches Labor oder MPU-Screening angefragt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Untersuchungen für eine MPU werden hier nicht durchgeführt. Bitte wenden Sie sich an ein entsprechend zertifiziertes Institut.",
      [ExplanationStatus.NO]: "",
    },
  },

  // ---- LAB SPECIFIC CHECKPOINTS (legacy, ungebunden) ----

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

  // ---- GLOBAL EXPLANATIONS ----

  IS_NEW_PATIENT: {
    id: "IS_NEW_PATIENT",
    label: "Neupatient",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "GLOBAL_STATE",
    question: "Ist die Person ein neuer Patient (Erstkontakt)?",
    textByStatus: {},
  },

  PATIENT_NOT_IN_GERMANY: {
    id: "PATIENT_NOT_IN_GERMANY",
    label: "Aufenthaltsort außerhalb Deutschland",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "GLOBAL_STATE",
    question: "Befindet sich der Patient aktuell NICHT in Deutschland?",
    textByStatus: {},
  },

  DOCTOR_REVIEW_REQUIRED: {
    id: "DOCTOR_REVIEW_REQUIRED",
    label: "Ärztliche Einschätzung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "GLOBAL_STATE",
    question: "Ist für dieses Anliegen eine ärztliche Einschätzung erforderlich?",
    textByStatus: {},
  },

  DATA_INCOMPLETE: {
    id: "DATA_INCOMPLETE",
    label: "Angaben unvollständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "GLOBAL_STATE",
    question: "Fehlen relevante Angaben oder Daten?",
    textByStatus: {},
  },

  IS_CHRONIC_PATIENT: {
    id: "IS_CHRONIC_PATIENT",
    label: "Chronische Erkrankung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "GLOBAL_STATE",
    question: "Liegt eine chronische oder dauerhaft behandlungsbedürftige Erkrankung vor?",
    textByStatus: {},
  },

  MEDICAL_CONSULTATION_REQUIRED: {
    id: "MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  // ---- GLOBAL ACTIONS ----

  DIGITAL_REQUEST: {
    id: "DIGITAL_REQUEST",
    label: "Digitale Anfrage",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
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
    actionCategory: "NEXT_STEP",
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
    actionCategory: "NEXT_STEP",
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
    actionCategory: "INFO",
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
    actionCategory: "INFO",
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
    actionCategory: "INFO",
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
    actionCategory: "NEXT_STEP",
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
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte laden Sie relevante Unterlagen (z. B. Facharztbericht, Medikamentenplan) über die digitale Anfrage hoch.",
    },
  },

  URINE_SAMPLE_ONSITE: {
    id: "URINE_SAMPLE_ONSITE",
    label: "Urinprobe vor Ort",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Eine Urinprobe kann vor Ort in der Praxis abgegeben werden.",
    },
  },

  // ---- SAMPLE_COLLECTION DECISION ----

  SAMPLE_COLLECTION_DECISION: {
    id: "SAMPLE_COLLECTION_DECISION",
    label: "Probenabgabe möglich",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "SAMPLE_COLLECTION_DECISION-Q2", text: "Liegt eine ärztliche Anordnung aus unserer Praxis vor?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Die Probenabgabe kann wie besprochen durchgeführt werden.",
      [DecisionStatus.NOT_POSSIBLE]: "Die angefragte Probenabgabe wurde nicht berücksichtigt.",
    },
  },

  // ---- SAMPLE_COLLECTION SPECIFIC CHECKPOINTS ----

  URINE_SAMPLE_INSTRUCTIONS: {
    id: "URINE_SAMPLE_INSTRUCTIONS",
    label: "Urinprobe – Hinweis",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "PREPARATION",
    questions: [
      { id: "URINE_SAMPLE_INSTRUCTIONS-Q1", text: "Soll eine Urinprobe abgegeben werden?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]: "Die Urinprobe sollte als Mittelstrahl in ein steriles Gefäß abgegeben werden.",
    },
  },

  STOOL_SAMPLE_INSTRUCTIONS: {
    id: "STOOL_SAMPLE_INSTRUCTIONS",
    label: "Stuhlprobe – Hinweis",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "PREPARATION",
    questions: [
      { id: "STOOL_SAMPLE_INSTRUCTIONS-Q1", text: "Soll eine Stuhlprobe abgegeben werden?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]: "Die Stuhlprobe wird mit dem Probenröhrchen entnommen; eine kleine Menge ist ausreichend und sollte nicht aus dem Toilettenwasser entnommen werden.",
    },
  },

  SAMPLE_HANDOVER: {
    id: "SAMPLE_HANDOVER",
    label: "Probenabgabe / Aufbewahrung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "PROCESS",
    questions: [
      { id: "SAMPLE_HANDOVER-Q1", text: "Geht es um die Abgabe oder Aufbewahrung der Probe?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]: "Die Probe sollte mit Name und Datum beschriftet und zeitnah in der Praxis abgegeben werden.",
    },
  },

  LAB_RESULT_TIME: {
    id: "LAB_RESULT_TIME",
    label: "Befundübermittlung / Auswertungsdauer",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    questions: [
      { id: "LAB_RESULT_TIME-Q1", text: "Geht es um die Dauer oder den Ablauf der Befundübermittlung?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]: "Die Auswertung kann mehrere Tage dauern. Die Befunde werden übermittelt, sobald sie vorliegen.",
    },
  },

  // ---- ACUTE_CARE DECISION ----

  ACUTE_CARE_DECISION: {
    id: "ACUTE_CARE_DECISION",
    label: "Akuttermin-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "CONTEXT_SPECIFIC",
    questions: [
      { id: "ACUTE_CARE_DECISION-Q1", text: "Geht es um akute Beschwerden?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]:
        "Sie können sich mit Ihrem Anliegen im Rahmen eines Akuttermins oder der offenen Sprechstunde vorstellen.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Für Ihr Anliegen ist diese Terminart nicht geeignet.",
    },
  },

  // ---- ACUTE_CARE SPECIFIC EXPLANATIONS ----

  /** @deprecated Ersetzt durch ACUTE_PURPOSE + ACUTE_EXCLUSION */
  ACUTE_ONLY_LIMIT: {
    id: "ACUTE_ONLY_LIMIT",
    label: "Nur für akute Beschwerden",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      { id: "ACUTE_ONLY_LIMIT-Q1", text: "Geht es um ein planbares oder organisatorisches Anliegen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Akutsprechstunde ist ausschließlich für akute Beschwerden vorgesehen und nicht für planbare oder organisatorische Anliegen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  ACUTE_APPOINTMENT_INFO: {
    id: "ACUTE_APPOINTMENT_INFO",
    label: "Akuttermin – Buchungshinweis",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "CONTEXT_SPECIFIC",
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ACUTE_APPOINTMENT_INFO-Q1", text: "Geht es um die Buchung eines Akuttermins?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Akuttermine können in der Regel 24 Stunden im Voraus online gebucht werden und sind auch als Videosprechstunde möglich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Ersetzt durch ACUTE_OPEN_CONSULTATION_INFO */
  OPEN_CONSULTATION_INFO: {
    id: "OPEN_CONSULTATION_INFO",
    label: "Offene Sprechstunde – Ablauf",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "CONTEXT_SPECIFIC",
    questions: [
      { id: "OPEN_CONSULTATION_INFO-Q1", text: "Geht es um die offene Sprechstunde?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die offene Sprechstunde findet zwischen 9 und 10 Uhr statt. Sie können ohne Termin in die Praxis kommen; die Behandlung erfolgt durch den jeweils verfügbaren Arzt.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Ersetzt durch OPEN_CONSULTATION_INFO + WAITING_TIME */
  NO_FIXED_TIME: {
    id: "NO_FIXED_TIME",
    label: "Keine festen Uhrzeiten / Wartezeiten",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      { id: "NO_FIXED_TIME-Q1", text: "Geht es um feste Uhrzeiten oder Wartezeiten?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "In der offenen Sprechstunde erfolgt die Behandlung ohne feste Termine; es kann zu Wartezeiten kommen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Ersetzt durch ACUTE_OPEN_CONSULTATION_INFO */
  CAPACITY_LIMIT: {
    id: "CAPACITY_LIMIT",
    label: "Kapazitätsgrenze / Überfüllung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      { id: "CAPACITY_LIMIT-Q1", text: "Geht es um die Verfügbarkeit oder mögliche Überfüllung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bei hoher Auslastung kann es vorkommen, dass keine weiteren Patienten aufgenommen werden können.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- ACUTE_CARE NEW SPECIFIC CHECKPOINTS ----

  ACUTE_PURPOSE: {
    id: "ACUTE_PURPOSE",
    label: "Zweck der Akutsprechstunde",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ACUTE_PURPOSE-Q1", text: "Geht es um kurzfristig aufgetretene oder sich verschlechternde Beschwerden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Dieser Weg ist für Beschwerden gedacht, die kurzfristig auftreten oder sich deutlich verschlechtern und zeitnah abgeklärt werden müssen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  ACUTE_EXCLUSION: {
    id: "ACUTE_EXCLUSION",
    label: "Ausschluss planbarer Anliegen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    questions: [
      { id: "ACUTE_EXCLUSION-Q1", text: "Geht es um ein planbares oder organisatorisches Anliegen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für planbare oder organisatorische Anliegen ist eine reguläre Sprechstunde erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Ersetzt durch ACUTE_OPEN_CONSULTATION_INFO */
  WAITING_TIME: {
    id: "WAITING_TIME",
    label: "Wartezeiten",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      { id: "WAITING_TIME-Q1", text: "Geht es um mögliche Wartezeiten?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Je nach Auslastung kann es zu Wartezeiten kommen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  ACUTE_OPEN_CONSULTATION_INFO: {
    id: "ACUTE_OPEN_CONSULTATION_INFO",
    label: "Offene Sprechstunde – Info",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ACUTE_OPEN_CONSULTATION_INFO-Q1", text: "Soll ein Hinweis zur offenen Sprechstunde angezeigt werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die offene Sprechstunde findet täglich von 9–10 Uhr statt. Eine vorherige Terminvereinbarung ist nicht erforderlich. Bitte beachten Sie, dass es je nach Auslastung zu Wartezeiten kommen kann und die Aufnahme begrenzt ist.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  CHRONIC_EXCLUSION: {
    id: "CHRONIC_EXCLUSION",
    label: "Chronische Erkrankung – Ausschluss planbarer Anliegen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    questions: [
      { id: "CHRONIC_EXCLUSION-Q1", text: "Geht es um ein planbares Anliegen bei chronischer Erkrankung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Auch bei chronischen Erkrankungen gehören planbare Anliegen in die reguläre Sprechstunde und nicht in diesen Bereich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  INFECTIOUS_PROTOCOL: {
    id: "INFECTIOUS_PROTOCOL",
    label: "Infektionsschutz – Hinweis",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      { id: "INFECTIOUS_PROTOCOL-Q1", text: "Besteht Verdacht auf eine ansteckende Erkrankung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bei Verdacht auf eine ansteckende Erkrankung melden Sie sich bitte vorab digital oder wählen Sie eine Videosprechstunde und kommen nicht unangemeldet in die Praxis.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- REFERRAL DECISION ----

  REFERRAL_DECISION: {
    id: "REFERRAL_DECISION",
    label: "Überweisungs-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "REFERRAL_DECISION-Q1", text: "Liegt eine ärztliche Anordnung aus unserer Praxis vor?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]:
        "Ihre Überweisung wurde ausgestellt und liegt zur Abholung in der Praxis bereit.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Die von Ihnen angefragte Überweisung wurde nicht ausgestellt.",
    },
  },

  // ---- REFERRAL SPECIFIC EXPLANATIONS ----

  REF_DOCTOR_CONTACT_REQUIRED: {
    id: "REF_DOCTOR_CONTACT_REQUIRED",
    label: "Ärztlicher Kontakt erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "REF_DOCTOR_CONTACT_REQUIRED-Q1", text: "Handelt es sich um neue oder unklare Beschwerden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bei neuen oder unklaren Beschwerden ist vor einer Überweisung eine ärztliche Einschätzung in der Sprechstunde erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  REF_ORIGINAL_VS_PDF: {
    id: "REF_ORIGINAL_VS_PDF",
    label: "Digitale vs. Original-Überweisung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    questions: [
      { id: "REF_ORIGINAL_VS_PDF-Q1", text: "Geht es um die Nutzung einer digitalen Überweisung?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die Überweisung kann digital für die Terminvereinbarung genutzt werden; für die Vorstellung in der Facharztpraxis wird häufig das Original benötigt.",
    },
  },

  REF_PSYCHOTHERAPY_FIRST_STEP: {
    id: "REF_PSYCHOTHERAPY_FIRST_STEP",
    label: "Psychotherapie – Erstvorstellung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "REF_PSYCHOTHERAPY_FIRST_STEP-Q1", text: "Geht es um eine Erstvorstellung zur Psychotherapie?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Überweisung ist der erste Schritt zur psychotherapeutischen Sprechstunde; dort erfolgt die weitere Einordnung und Planung der Behandlung.",
    },
  },

  REF_SPECIALTY_REQUIRED: {
    id: "REF_SPECIALTY_REQUIRED",
    label: "Fachrichtung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "REF_SPECIALTY_REQUIRED-Q1", text: "Ist die Fachrichtung oder der Facharzt bekannt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Ausstellung einer Überweisung muss die gewünschte Fachrichtung angegeben werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  REF_BOOKING_CODE_PROCESS: {
    id: "REF_BOOKING_CODE_PROCESS",
    label: "Vermittlungs- / Buchungscode",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    questions: [
      { id: "REF_BOOKING_CODE_PROCESS-Q1", text: "Geht es um die Terminbuchung mit Vermittlungs- oder Buchungscode?" },
    ],
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Mit dem Vermittlungs- oder Buchungscode kann ein Termin über die Terminservicestelle (z. B. 116117) vereinbart werden.",
    },
  },

  // ---- IMMUNIZATION DECISION ----

  IMMUNIZATION_DECISION: {
    id: "IMMUNIZATION_DECISION",
    label: "Impf-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "IMMUNIZATION_DECISION-Q1", text: "Kann die Impfung durchgeführt oder angeboten werden?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]:
        "Die angefragte Impfung kann durchgeführt werden.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Die angefragte Impfung kann derzeit nicht durchgeführt werden.",
    },
  },

  // ---- IMMUNIZATION SPECIFIC EXPLANATIONS ----

  IMMUNIZATION_STATUS_UNCLEAR: {
    id: "IMMUNIZATION_STATUS_UNCLEAR",
    label: "Impfstatus unklar",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_STATUS_UNCLEAR-Q1", text: "Ist der Impfstatus unklar?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Beurteilung benötigen wir Angaben zu den bisher durchgeführten Impfungen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  IMMUNIZATION_PASS_MISSING: {
    id: "IMMUNIZATION_PASS_MISSING",
    label: "Impfpass fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_PASS_MISSING-Q1", text: "Liegt kein Impfpass oder kein Impfnachweis vor?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Prüfung des Impfstatus ist ein Impfpass oder ein anderer Impfnachweis hilfreich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  IMMUNIZATION_TRAVEL_MEDICINE: {
    id: "IMMUNIZATION_TRAVEL_MEDICINE",
    label: "Reiseimpfung / reisemedizinische Beratung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_TRAVEL_MEDICINE-Q1", text: "Geht es um eine Reiseimpfung oder reisemedizinische Beratung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für Reiseimpfungen und reisemedizinische Beratungen wenden Sie sich bitte an eine reisemedizinisch spezialisierte Stelle.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  IMMUNIZATION_RISK_REVIEW_REQUIRED: {
    id: "IMMUNIZATION_RISK_REVIEW_REQUIRED",
    label: "Ärztliche Risikoabwägung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_RISK_REVIEW_REQUIRED-Q1", text: "Ist wegen Vorerkrankungen, Medikamenten oder Unsicherheiten eine ärztliche Einschätzung erforderlich?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Vor der Impfung ist eine ärztliche Einschätzung sinnvoll, um mögliche Risiken oder Gegenanzeigen zu prüfen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- APPOINTMENT SPECIFIC EXPLANATIONS ----

  APPOINTMENT_WRONG_TYPE: {
    id: "APPOINTMENT_WRONG_TYPE",
    label: "Falscher Termintyp",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_WRONG_TYPE-Q1", text: "Wurde ein falscher Termintyp gebucht?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Der gebuchte Termintyp passt nicht zum Anliegen. Bitte buchen Sie einen passenden Termin.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  APPOINTMENT_PROCESS_MULTI_STEP: {
    id: "APPOINTMENT_PROCESS_MULTI_STEP",
    label: "Mehrstufiger Ablauf erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_PROCESS_MULTI_STEP-Q1", text: "Ist ein mehrstufiger Ablauf erforderlich (z. B. Labor → Arzttermin)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für Ihr Anliegen sind mehrere Schritte erforderlich – bitte beachten Sie die jeweilige Reihenfolge.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  APPOINTMENT_PREPARATION_REQUIRED: {
    id: "APPOINTMENT_PREPARATION_REQUIRED",
    label: "Vorbereitung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_PREPARATION_REQUIRED-Q1", text: "Ist eine Vorbereitung erforderlich (z. B. nüchtern erscheinen, Unterlagen mitbringen)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bitte beachten Sie die Vorbereitungshinweise für Ihren Termin (z. B. nüchtern erscheinen oder relevante Unterlagen mitbringen).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  APPOINTMENT_DATA_INCOMPLETE: {
    id: "APPOINTMENT_DATA_INCOMPLETE",
    label: "Angaben unvollständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_DATA_INCOMPLETE-Q1", text: "Sind das Anliegen oder notwendige Angaben unklar oder unvollständig?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Terminvereinbarung benötigen wir weitere Angaben zu Ihrem Anliegen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  APPOINTMENT_DOCUMENT_MISSING: {
    id: "APPOINTMENT_DOCUMENT_MISSING",
    label: "Dokument fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_DOCUMENT_MISSING-Q1", text: "Fehlen notwendige Dokumente (z. B. eGK, Befunde, Impfpass)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bitte bringen Sie zum Termin die erforderlichen Unterlagen mit (z. B. Versichertenkarte, Befunde oder Impfpass).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- BILLING SPECIFIC EXPLANATIONS ----

  BILLING_COST_NOT_COVERED: {
    id: "BILLING_COST_NOT_COVERED",
    label: "Leistung keine Kassenleistung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "RULE_COST_COVERAGE" as SpecificRole,
    questions: [
      { id: "BILLING_COST_NOT_COVERED-Q1", text: "Ist die angefragte Leistung keine Kassenleistung (z. B. IGeL, Selbstzahlerleistung)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die angefragte Leistung wird nicht von der gesetzlichen Krankenkasse übernommen und ist selbst zu zahlen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  BILLING_PROCESS_EXTERNAL: {
    id: "BILLING_PROCESS_EXTERNAL",
    label: "Rechnung über externen Dienstleister",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "BILLING_PROCESS_EXTERNAL-Q1", text: "Läuft die Abrechnung über ein externes Labor oder einen Dienstleister?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Rechnung für diese Leistung wird direkt durch das beauftragte Labor oder den externen Dienstleister gestellt.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  BILLING_DATA_MISSING: {
    id: "BILLING_DATA_MISSING",
    label: "Abrechnungsdaten unvollständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "BILLING_DATA_MISSING-Q1", text: "Fehlen Angaben wie Adresse oder Versicherungsstatus für die Abrechnung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Abrechnung benötigen wir noch vollständige Angaben (z. B. aktuelle Adresse oder Versicherungsstatus).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  BILLING_DOCUMENT_MISSING: {
    id: "BILLING_DOCUMENT_MISSING",
    label: "Abrechnungsdokument fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "BILLING_DOCUMENT_MISSING-Q1", text: "Fehlen notwendige Dokumente für die Abrechnung (z. B. eGK, Privatärztlicher Abrechnungsschein, Nachweise)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Abrechnung werden noch Unterlagen benötigt (z. B. Versichertenkarte, Abrechnungsschein oder weitere Nachweise).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  BILLING_EXTERNAL_RESPONSIBILITY: {
    id: "BILLING_EXTERNAL_RESPONSIBILITY",
    label: "Externe Zuständigkeit für Abrechnung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "BILLING_EXTERNAL_RESPONSIBILITY-Q1", text: "Liegt die Zuständigkeit für die Abrechnung bei der Krankenkasse oder einem anderen externen Stellen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für Fragen zur Kostenübernahme oder Abrechnung wenden Sie sich bitte direkt an Ihre Krankenkasse oder die zuständige Stelle.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },
};
