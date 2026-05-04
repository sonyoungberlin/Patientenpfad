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
  type M5ReasonCode,
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
    textByAudience: {
      contact_person: {
        [DecisionStatus.POSSIBLE]:
          "Die Arbeitsunfähigkeitsbescheinigung wurde ausgestellt.",
        [DecisionStatus.NOT_POSSIBLE]:
          "Die angefragte Arbeitsunfähigkeitsbescheinigung wurde nicht ausgestellt.",
      },
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "AU ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "AU nicht ausgestellt.",
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

  // ---- AU NEW SPECIFIC CHECKPOINTS ----

  AU_NEW_PATIENT_LIMIT: {
    id: "AU_NEW_PATIENT_LIMIT",
    label: "Neupatient – AU-Höchstdauer",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "RULE_TIME_LIMIT" as SpecificRole,
    questions: [
      { id: "AU_NEW_PATIENT_LIMIT-Q1", text: "Handelt es sich um einen Neupatienten?" },
    ],
    textByStatus: {
      // bewusst leer – reiner M2-Schalter; Inhalte kommen über boundActionConditions
    },
  },

  AU_NEW_PATIENT_3DAY_LIMIT: {
    id: "AU_NEW_PATIENT_3DAY_LIMIT",
    label: "Neupatient – 3-Tage-Limit",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bei Neupatienten kann eine Arbeitsunfähigkeitsbescheinigung zunächst für maximal 3 Tage ausgestellt werden.",
    },
  },

  AU_FOLLOWUP_REQUIRES_VISIT: {
    id: "AU_FOLLOWUP_REQUIRES_VISIT",
    label: "Folgebescheinigung – persönliche Vorstellung erforderlich",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Für eine Folgebescheinigung ist eine persönliche Vorstellung in der Praxis erforderlich.",
    },
  },

  AU_DIGITAL_AU_PROCESS: {
    id: "AU_DIGITAL_AU_PROCESS",
    label: "Digitaler AU-Anfrageprozess",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "AU_DIGITAL_AU_PROCESS-Q1", text: "Soll der digitale AU-Anfrageprozess erklärt werden?" },
    ],
    textByStatus: {
      // YES: bewusst leer – reiner M2-Schalter, Inhalte kommen über boundActionCheckpointIds
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  AU_NO_APPOINTMENT_ACUTE: {
    id: "AU_NO_APPOINTMENT_ACUTE",
    label: "Akute Beschwerden – kein kurzfristiger Termin",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "AU_NO_APPOINTMENT_ACUTE-Q1", text: "Hat der Patient akute Beschwerden und keinen kurzfristigen Termin erhalten?" },
    ],
    textByStatus: {
      // YES: bewusst leer – reiner M2-Schalter, Inhalte erscheinen über konditionell angezeigte
      //      ACTION-Checkpoints (ACUTE_OPEN_CONSULTATION_INFO, DIGITAL_REQUEST, ONLINE_ANAMNESIS)
      //      via boundActionConditions → showWhenAny [{ AU_NO_APPOINTMENT_ACUTE: "YES" }]
      // NO: bewusst still – keine Aktion erforderlich
    },
  },

  // ---- AU MISSING INFO CHECKPOINTS ----

  AU_MISSING_EGK: {
    id: "AU_MISSING_EGK",
    label: "Versichertendaten fehlen (eGK)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "AU_MISSING_EGK-Q1", text: "Die Versichertendaten (eGK) liegen nicht vor." },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Ausstellung der AU benötigen wir Ihre Versichertendaten. Bitte senden Sie uns über Doctolib entweder ein Foto Ihrer Gesundheitskarte von Vorder- und Rückseite oder eine elektronische Ersatzbescheinigung Ihrer Krankenkasse. Alternativ können Sie die Versichertendaten über die App Ihrer Krankenkasse digital übermitteln. Die Gesundheitskarte muss im laufenden Quartal nachgereicht bzw. eingelesen werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Versichertendaten fehlen (eGK)",
    },
  },

  AU_MISSING_QUESTIONNAIRE: {
    id: "AU_MISSING_QUESTIONNAIRE",
    label: "Angaben zur Erkrankung fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "AU_MISSING_QUESTIONNAIRE-Q1", text: "Es fehlen noch Angaben zur aktuellen Erkrankung." },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Bearbeitung Ihrer Anfrage benötigen wir noch Angaben zu Ihren aktuellen Beschwerden.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Angaben zur Erkrankung fehlen",
    },
  },

  AU_FOLLOWUP: {
    id: "AU_FOLLOWUP",
    label: "Folge-AU / Verlängerung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "AU_FOLLOWUP-Q1", text: "Es handelt sich um eine Folge-AU." },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die aktuelle Anfrage betrifft eine Folgebescheinigung.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Folge-AU / Verlängerung",
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
    textByAudience: {
      contact_person: {
        [DecisionStatus.POSSIBLE]: "Das Rezept wurde ausgestellt.",
        [DecisionStatus.NOT_POSSIBLE]: "Das angefragte Rezept wurde nicht ausgestellt.",
      },
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Rezept ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "Rezept nicht ausgestellt.",
    },
  },

  // ---- PRESCRIPTION SPECIFIC EXPLANATIONS ----

  /** @deprecated Nicht mehr in PRESCRIPTION.specificCheckpointIds gebunden. Inhalt wird aktuell über Termin-/Kontrollhinweise im M3 abgebildet. */
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

  /**
   * Fehlender Krankenhaus- oder Entlassbericht.
   *
   * SPECIFIC-Scope: erscheint im Profil-Abschnitt (section.specificCheckpoints) und ist
   * damit im PRESCRIPTION-Accordion nutzbar. Durch die Aufnahme in specificCheckpointIds
   * anderer Profile (AU, REFERRAL, ACUTE_CARE etc.) später profilübergreifend wiederverwendbar.
   *
   * ATTACHED-Placement: Der Text soll direkt im Kontext des Anliegens erscheinen (kein
   * profilübergreifendes Footer-Element). SHARED_BOTTOM wäre nur korrekt, wenn derselbe
   * Hinweis am Ende aller Profilabschnitte erscheinen soll.
   *
   * specificRole MISSING_DOCUMENT: korrekt für fehlende Dokumente/Nachweise.
   */
  HOSPITAL_DISCHARGE_REPORT_MISSING: {
    id: "HOSPITAL_DISCHARGE_REPORT_MISSING",
    label: "Krankenhaus-/Entlassbericht fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "HOSPITAL_DISCHARGE_REPORT_MISSING-Q1", text: "Fehlt der Krankenhaus- oder Entlassbericht?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Es liegt kein aktueller Krankenhaus- oder Entlassbericht vor.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Krankenhaus-/Entlassbericht fehlt",
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
    specificRole: "RULE_COST_COVERAGE" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_PRIVATE_ONLY-Q1", text: "Handelt es sich um ein Präparat, das nur privat verordnet werden kann?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Dieses Präparat ist keine Leistung der gesetzlichen Krankenkasse und wird als Privatrezept verordnet.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  PRESCRIPTION_NO_PRESCRIPTION_REQUIRED: {
    id: "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
    label: "Kein Rezept erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "OUTCOME_INFO" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED-Q1", text: "Ist für das angefragte Präparat kein Rezept erforderlich?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für dieses Präparat ist kein Rezept erforderlich. Sie können es direkt in der Apotheke erwerben.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "kein Rezept erforderlich / frei verkäuflich",
    },
  },

  PRESCRIPTION_SPECIALIST_RESPONSIBLE: {
    id: "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
    label: "Facharzt zuständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "PRESCRIPTION_SPECIALIST_RESPONSIBLE-Q1", text: "Soll die Verordnung über die zuständige Facharztpraxis erfolgen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Verordnung erfolgt über die zuständige Facharztpraxis.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Verordnung über Facharztpraxis",
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
        "Ein Postversand von Rezepten erfolgt nicht.",
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
      { id: "PRESCRIPTION_STATUTORY_POSSIBLE-Q1", text: "Wird das Rezept als Kassenrezept ausgestellt?" },
    ],
    textByStatus: {
      // YES: bewusst still – Prozessdetail wird über E_RECIPE_USE (boundAction) transportiert
      // NO: nur Sachaussage – kein Kassenrezept ausgestellt.
      //     Ob Privatrezept oder anderer Grund: wird über PRESCRIPTION_PRIVATE_ONLY o.ä. erklärt.
      [ExplanationStatus.NO]: "Das Rezept wurde nicht als Kassenrezept ausgestellt.",
    },
  },

  // ---- PRESCRIPTION SPECIFIC EXPLANATIONS (ungebunden / veraltet) ----
  // Diese Checkpoints werden nicht mehr im PRESCRIPTION-Profil gebunden.
  // Sie verbleiben vorerst im Katalog, bis alle Referenzen bereinigt sind.

  /** @deprecated Nicht mehr in PRESCRIPTION.specificCheckpointIds gebunden. Legacy-Baustein aus früherer Rezept-Triage. */
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

  /** @deprecated Nicht mehr in PRESCRIPTION.specificCheckpointIds gebunden. Legacy-Baustein; Wiederverordnung wird heute über die aktive Rezept-Logik abgebildet. */
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

  /** @deprecated Nicht mehr in PRESCRIPTION.specificCheckpointIds gebunden. Inhaltlich durch PRESCRIPTION_SPECIALIST_RESPONSIBLE abgelöst. */
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

  /** @deprecated Nicht mehr in PRESCRIPTION.specificCheckpointIds gebunden. Legacy-Baustein aus früherer Sonderformen-Triage. */
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
    label: "Kann der Termin für die Blutentnahme direkt vereinbart werden?",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Ein Termin für die Blutentnahme kann direkt vereinbart werden.",
      [DecisionStatus.NOT_POSSIBLE]: "Vor der Blutentnahme ist zunächst eine ärztliche Abklärung erforderlich. Alternativ kann die Untersuchung als Selbstzahlerleistung erfolgen.",
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Laboruntersuchung veranlasst.",
      [DecisionStatus.NOT_POSSIBLE]: "Laboruntersuchung nicht veranlasst.",
    },
  },

  // ---- LAB SPECIFIC CHECKPOINTS ----

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
    textByAudience: {
      contact_person:
        "Zur Blutentnahme nüchtern erscheinen (mindestens 8 Stunden vorher nichts essen; Wasser ist erlaubt, Kaffee nicht).",
    },
  },

  /** @deprecated Abrechnungsaussagen gehören in BILLING. Ersetzt durch BILLING_COST_NOT_COVERED + BILLING_EXTERNAL_PROVIDER. Nicht mehr in LAB.specificCheckpointIds. */
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
      [ExplanationStatus.YES]:
        "Blutuntersuchungen ohne konkreten medizinischen Anlass oder außerhalb der gesetzlichen Vorsorgefristen sind Selbstzahlerleistungen (IGeL). Die Abrechnung dieser Werte erfolgt privat nach der Gebührenordnung für Ärzte (GOÄ); Sie erhalten die Rechnung hierfür direkt von unserem Partnerlabor.",
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
      // M2-Schalter: reine Ausschlussaussage – keine Handlungsaufforderung.
      [ExplanationStatus.YES]: "Untersuchungen für eine MPU werden hier nicht durchgeführt.",
      [ExplanationStatus.NO]: "",
    },
  },

  LAB_RESULTS_PENDING: {
    id: "LAB_RESULTS_PENDING",
    label: "Laborergebnisse liegen noch nicht vor",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "LAB_RESULTS_PENDING-Q1", text: "Befunde noch nicht da?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Ihre Laborergebnisse sind bei uns noch nicht eingegangen. Die Auswertung im Labor kann einige Tage dauern. Sobald die Befunde bei uns vorliegen, senden wir sie Ihnen automatisch zu – eine erneute Nachfrage ist nicht erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]:
        "Patient über ausstehende Laborergebnisse informiert; automatischer Versand bei Eingang zugesagt.",
    },
  },

  // ---- LAB SPECIFIC CHECKPOINTS (neue Prozesslogik) ----

  LAB_INTERNAL_ORDER: {
    id: "LAB_INTERNAL_ORDER",
    label: "Interne ärztliche Anordnung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "LAB_INTERNAL_ORDER-Q1", text: "Liegt eine interne ärztliche Laboranordnung vor?" },
    ],
    textByStatus: {
      // Schalter-only: YES markiert nur die Situation.
      // Der Buchungsweg wird als M3-Baustein in LAB_APPOINTMENT_INTERNAL gerendert.
      [ExplanationStatus.YES]: "",
      [ExplanationStatus.NO]: "",
    },
  },

  LAB_EXTERNAL_REFERRAL: {
    id: "LAB_EXTERNAL_REFERRAL",
    label: "Externe Überweisung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "LAB_EXTERNAL_REFERRAL-Q1", text: "Liegt eine Überweisung eines Facharztes vor?" },
    ],
    textByStatus: {
      // Schalter-only: YES/NO markiert nur die Situation.
      // Buchungshinweis, Überweisungsmitnahme und Kostenhinweis
      // werden als M3-Bausteine gerendert (LAB_APPOINTMENT_INDIVIDUAL,
      // LAB_BRING_REFERRAL, LAB_COST_COVERED_BY_REFERRAL).
      [ExplanationStatus.YES]: "",
      [ExplanationStatus.NO]: "",
    },
  },

  // ---- LAB ACTION CHECKPOINTS (Terminplanung, basierend auf Specific-Checkpoint-Status) ----

  LAB_APPOINTMENT_INTERNAL: {
    id: "LAB_APPOINTMENT_INTERNAL",
    label: "Termin intern buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Um einen Termin nach ärztlicher Anordnung zu vereinbaren, wählen Sie bitte im Online-Buchungskalender:\n\n1. Labor\n2. Ärztliche Anordnung\n3. Blutwerte\n\nGeben Sie den folgenden Code ein, um den Termin zu bestätigen:\nLKBP25",
    },
    textByAudience: {
      contact_person:
        "Um einen Termin nach ärztlicher Anordnung zu vereinbaren, bitte im Online-Buchungskalender wählen:\n\n1. Labor\n2. Ärztliche Anordnung\n3. Blutwerte\n\nZur Bestätigung wird der Code LKBP25 benötigt.",
    },
  },

  LAB_APPOINTMENT_CHECKUP: {
    id: "LAB_APPOINTMENT_CHECKUP",
    label: "Termin Check-up-Labor buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte vereinbaren Sie im Online-Buchungskalender den Termin \u201ECheck-Up - 1. Termin (Basiswerte Labor)\u201C. F\u00FCr diesen Termin ist kein Code erforderlich.",
    },
    textByAudience: {
      contact_person:
        "Bitte im Online-Buchungskalender den Termin \u201ECheck-Up - 1. Termin (Basiswerte Labor)\u201C vereinbaren. F\u00FCr diesen Termin ist kein Code erforderlich.",
    },
  },

  LAB_APPOINTMENT_INDIVIDUAL: {
    id: "LAB_APPOINTMENT_INDIVIDUAL",
    label: "Termin für individuelle Laborwerte buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]: "Bitte vereinbaren Sie einen Termin für individuelle Laborwerte.",
    },
    textByAudience: {
      contact_person: "Bitte einen Termin für individuelle Laborwerte vereinbaren.",
    },
  },

  LAB_APPOINTMENT_DOCTOR: {
    id: "LAB_APPOINTMENT_DOCTOR",
    label: "Ärztliche Abklärung erforderlich",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]: "Für die Laboruntersuchung ist zunächst eine ärztliche Abklärung erforderlich.",
    },
  },

  LAB_BRING_REFERRAL: {
    id: "LAB_BRING_REFERRAL",
    label: "Überweisung mitbringen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "PREPARATION",
    textByStatus: {
      [ActionStatus.ACTIVE]: "Bitte bringen Sie die Überweisung Ihres Facharztes im Original zum Termin mit.",
    },
    textByAudience: {
      contact_person:
        "Bitte die Überweisung im Original zum Termin mitbringen.",
    },
  },

  LAB_COST_COVERED_BY_REFERRAL: {
    id: "LAB_COST_COVERED_BY_REFERRAL",
    label: "Kostenhinweis: Abrechnung über Überweisung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Mit einer gültigen Originalüberweisung kann die Laborleistung über die Überweisung abgerechnet werden; es fällt dafür keine Selbstzahlerleistung an.",
    },
  },

  LAB_SELF_PAYER_NOTE: {
    id: "LAB_SELF_PAYER_NOTE",
    label: "Hinweis: Selbstzahlerleistung / Wunschwerte",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Laborwerte ohne ärztliche Anordnung oder gültige Überweisung sind als Selbstzahlerleistung möglich. Die Abrechnung erfolgt direkt über das Labor.",
    },
  },

  /** @deprecated Konsolidiert in LAB_EXTERNAL_REFERRAL. Nicht mehr in LAB.specificCheckpointIds. */
  LAB_EXTERNAL_DOCUMENT_PRESENT: {
    id: "LAB_EXTERNAL_DOCUMENT_PRESENT",
    label: "Überweisungsdokument vorhanden",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "LAB_EXTERNAL_DOCUMENT_PRESENT-Q1", text: "Liegt die Überweisung des behandelnden Facharztes im Original vor?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "",
      [ExplanationStatus.NO]: "Für die Durchführung der Laboruntersuchung benötigen wir die Überweisung Ihres behandelnden Facharztes im Original.\n\nBitte bringen Sie das Dokument zum Termin mit.",
    },
  },

  /** @deprecated Konsolidiert in LAB_SELF_PAYER_IGEL. Nicht mehr in LAB.specificCheckpointIds. */
  LAB_SELF_PAY: {
    id: "LAB_SELF_PAY",
    label: "Selbstzahler / IGeL",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "RULE_COST_COVERAGE" as SpecificRole,
    questions: [
      { id: "LAB_SELF_PAY-Q1", text: "Handelt es sich um Laborwerte als individuelle Gesundheitsleistung (IGeL)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Die gewünschten Laborwerte können als individuelle Gesundheitsleistung durchgeführt werden.\n\nDie Abrechnung erfolgt in diesem Fall privat. Sie erhalten die Rechnung direkt vom Labor.",
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
  /** @deprecated Nicht mehr in LAB.specificCheckpointIds gebunden. Labor-Anlass wird heute über spezifischere LAB-Checkpoints und Termin-/Kostenlogik abgebildet. */
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

  /** @deprecated Nicht mehr in LAB.specificCheckpointIds gebunden. Ersetzt durch LAB_CHECKUP_RULES. */
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

  /** @deprecated Nicht mehr in LAB.specificCheckpointIds gebunden. Legacy-Baustein zur früheren Laborwerte-Triage. */
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

  /**
   * @deprecated Wurde durch profilspezifische Checkpoints ersetzt.
   * Nicht mehr aktiv in Profilen gebunden.
   */
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

  /**
   * @deprecated Durch profilspezifischen SpecificCheckpoint PRESCRIPTION_PATIENT_NOT_IN_GERMANY ersetzt.
   * Nicht mehr aktiv in Profilen gebunden.
   */
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

  /**
   * @deprecated Wurde durch profilspezifische Checkpoints ersetzt.
   * Nicht mehr aktiv in Profilen gebunden.
   */
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

  /**
   * @deprecated Wurde durch profilspezifische Checkpoints ersetzt.
   * Nicht mehr aktiv in Profilen gebunden.
   */
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

  /**
   * @deprecated Durch profilspezifischen SpecificCheckpoint PRESCRIPTION_CHRONIC_PATIENT ersetzt.
   * Nicht mehr aktiv in Profilen gebunden.
   */
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

  /**
   * @deprecated Durch profilspezifische SpecificCheckpoints ersetzt
   * (AU_MEDICAL_CONSULTATION_REQUIRED, LAB_MEDICAL_CONSULTATION_REQUIRED,
   * REF_MEDICAL_CONSULTATION_REQUIRED, MEDICAL_DOCUMENT_CONSULTATION_REQUIRED).
   * Nicht mehr aktiv in Profilen gebunden.
   */
  MEDICAL_CONSULTATION_REQUIRED: {
    id: "MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    m5Code: "NEED_VISIT" as M5ReasonCode,
    question: "Ist für dieses Anliegen eine ärztliche Konsultation erforderlich?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  /** @deprecated Generischer Vorbereitungsschalter – handlungsbezogene Vorbereitungshinweise werden als ACTION-Checkpoints modelliert. Nicht mehr aktiv in Profilen gebunden. */
  TERMIN_PREPARATION_REQUIRED: {
    id: "TERMIN_PREPARATION_REQUIRED",
    label: "Terminvorbereitung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    questions: [
      {
        id: "TERMIN_PREPARATION_REQUIRED-Q1",
        text: "Gibt es für diesen Termin besondere Vorbereitungshinweise?",
      },
    ],
    textByStatus: {
      // bewusst leer – Inhalte kommen ausschließlich über globalHints
    },
  },

  IMMUNIZATION_BRING_VACCINATION_RECORD: {
    id: "IMMUNIZATION_BRING_VACCINATION_RECORD",
    label: "Impfpass / Impfnachweis mitbringen",
    kind: InquiryCheckpointKind.ACTION,
    // SPECIFIC: Der Hinweis bezieht sich ausschließlich auf Impftermine und ist
    // nicht sinnvoll auf andere Anliegen übertragbar.
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "PREPARATION",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte bringen Sie Ihren Impfpass oder vorhandene Impfnachweise zum Termin mit.",
    },
    textByAudience: {
      contact_person:
        "Bitte den Impfpass oder vorhandene Impfnachweise zum Termin mitbringen.",
    },
  },

  IMMUNIZATION_BOOK_VACCINATION: {
    id: "IMMUNIZATION_BOOK_VACCINATION",
    label: "Impftermin buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie den Impftermin über unseren Online-Buchungskalender.\n\nWählen Sie:\n1. Labor\n2. Impfung\n3. gewünschte Impfung",
    },
    textByAudience: {
      contact_person:
        "Bitte den Impftermin über den Online-Buchungskalender buchen: Labor → Impfung → gewünschte Impfung.",
    },
  },

  IMMUNIZATION_BOOK_COUNSELING: {
    id: "IMMUNIZATION_BOOK_COUNSELING",
    label: "Impfberatung buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie für eine Impfberatung einen Termin über unseren Online-Buchungskalender.\n\nWählen Sie:\n1. Hausarzt / Allgemeinmedizin\n2. Impfberatung",
    },
    textByAudience: {
      contact_person:
        "Bitte für die Impfberatung einen Termin über den Online-Buchungskalender buchen: Hausarzt / Allgemeinmedizin → Impfberatung.",
    },
  },

  DIGITAL_REQUEST: {
    id: "DIGITAL_REQUEST",
    label: "Digitale Anfrage",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte stellen Sie eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.",
    },
    textByAudience: {
      contact_person:
        "Bitte eine digitale Anfrage über den folgenden Link stellen und die Fragen beantworten.",
    },
  },

  DIGITAL_REQUEST_PROCESSING_TIME: {
    id: "DIGITAL_REQUEST_PROCESSING_TIME",
    label: "Bearbeitungszeit digitale Anfrage",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die Bearbeitung digitaler Anfragen dauert je nach Auslastung 8–12 Stunden. Bitte sehen Sie in dieser Zeit von Nachfragen zum Bearbeitungsstand ab.",
    },
  },

  /**
   * @deprecated Fachlich überholt: Fragebögen werden inzwischen direkt versendet,
   * der Checkpoint wird nicht mehr automatisch in Profilen gebunden.
   * Definition bleibt vorerst im Katalog, um historische Datensätze und Referenzen
   * (z. B. PRESCRIPTION_EXCLUSIVE_ACTIONS, M3_HIDDEN_BOUND_ACTION_IDS) intakt zu halten.
   */
  DIGITAL_REQUEST_REQUIRED: {
    id: "DIGITAL_REQUEST_REQUIRED",
    label: "Digitale Anfrage zur Prüfung erforderlich",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Für die Prüfung Ihres Anliegens benötigen wir noch einige Angaben.\nBitte stellen Sie dazu eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.",
    },
    textByAudience: {
      contact_person:
        "Für die Prüfung werden noch Angaben benötigt.\nBitte dazu eine digitale Anfrage über den folgenden Link stellen und die Fragen beantworten.",
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
      [ActionStatus.ACTIVE]: "",
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
        "Sie können das eRezept mit Ihrer elektronischen Gesundheitskarte (eGK) in der Apotheke einlösen. Alternativ erhalten Sie einen QR-Code als PDF oder in Papierform.",
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
        "Bitte laden Sie relevante Unterlagen über Ihren Doctolib Account hoch.",
    },
    textByAudience: {
      contact_person:
        "Bitte relevante Unterlagen über den Doctolib-Account hochladen.",
    },
  },

  /**
   * Generischer Hinweis auf Selbstzahler-/Privatleistungen: Zahlung vor Ort
   * per EC- oder Kreditkarte. Bewusst profil-agnostisch formuliert (kein
   * Bezug zu Attest, Onboarding o. ä.), damit derselbe Baustein über
   * `boundActionConditions` in beliebigen Profilen freigeschaltet werden
   * kann (z. B. MEDICAL_DOCUMENTS bei Selbstzahlerleistung, ONBOARDING bei
   * fehlendem Versicherungsschutz, weitere Selbstzahlerfälle).
   */
  PAYMENT_ONSITE_INFO: {
    id: "PAYMENT_ONSITE_INFO",
    label: "Zahlung vor Ort",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die Zahlung erfolgt vor Ort per EC- oder Kreditkarte.",
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

  CARE_CHANNEL_CHOICE: {
    id: "CARE_CHANNEL_CHOICE",
    label: "Versorgungsweg – persönlich oder digital",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Für eine persönliche Vorstellung können Sie einen Akuttermin buchen oder die offene Sprechstunde nutzen. Alternativ können Sie eine digitale Anfrage stellen.",
    },
  },

  /**
   * Globaler Versorgungsweg-Baustein: demnächst Kontrolltermin / persönliche Vorstellung.
   *
   * Scope GLOBAL + Placement ATTACHED: erscheint gebunden an das jeweilige Profil,
   * ist aber profilübergreifend wiederverwendbar (AU, PRESCRIPTION, ggf. weitere).
   *
   * Wird in der VERSORGUNGSWEG_CONFLICT_GROUP mit ACUTE_OPEN_CONSULTATION_ACTION
   * und CARE_CHANNEL_CHOICE geführt: nur eine Option kann gleichzeitig ACTIVE sein.
   */
  CONTROL_APPOINTMENT_RECOMMENDED: {
    id: "CONTROL_APPOINTMENT_RECOMMENDED",
    label: "Kontrolltermin empfohlen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie demnächst einen Termin zur Kontrolle bzw. persönlichen Vorstellung in der Praxis.",
    },
    docByStatus: {
      [ActionStatus.ACTIVE]: "Kontrolltermin / persönliche Vorstellung empfohlen",
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
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Probenabgabe angenommen.",
      [DecisionStatus.NOT_POSSIBLE]: "Probenabgabe nicht möglich.",
    },
  },

  // ---- SAMPLE_COLLECTION SPECIFIC CHECKPOINTS ----

  SAMPLE_COLLECTION_ORDER_AVAILABLE: {
    id: "SAMPLE_COLLECTION_ORDER_AVAILABLE",
    label: "Probenanordnung liegt vor",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "SAMPLE_COLLECTION_ORDER_AVAILABLE-Q1", text: "Liegt eine ärztliche Anordnung für die Probenabgabe vor?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Für die Probenabgabe liegt eine entsprechende Anordnung vor.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

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

  /** @deprecated Abrechnungsaussagen gehören in BILLING. Ersetzt durch BILLING_EXTERNAL_PROVIDER. Nicht mehr in LAB.specificCheckpointIds. */
  LAB_EXTERNAL_BILLING: {
    id: "LAB_EXTERNAL_BILLING",
    label: "Laborabrechnung über Partnerlabor",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "LAB_EXTERNAL_BILLING-Q1", text: "Fragt der Patient nach der Laborrechnung oder deren Herkunft?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Abrechnung der Laborleistungen erfolgt direkt über unser Partnerlabor. Sie erhalten die Rechnung unabhängig von uns vom Labor.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patient über externe Laborabrechnung informiert.",
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
    textByAudience: {
      contact_person: {
        [DecisionStatus.POSSIBLE]:
          "Für das Anliegen ist eine persönliche Vorstellung im Rahmen eines Akuttermins oder der offenen Sprechstunde möglich.",
        // NOT_POSSIBLE fällt auf textByStatus zurück
      },
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Akutvorstellung empfohlen.",
      [DecisionStatus.NOT_POSSIBLE]: "Akutvorstellung nicht empfohlen.",
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
      // YES: Text ausgelagert in ACTION-Baustein ACUTE_BOOKING_INFO (Buchungshandlung + zwei Aussagen)
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

  /** @deprecated Bitte ACUTE_OPEN_CONSULTATION_ACTION verwenden. */
  ACUTE_OPEN_CONSULTATION_INFO: {
    id: "ACUTE_OPEN_CONSULTATION_INFO",
    label: "Offene Sprechstunde – Info",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    question: "Soll ein Hinweis zur offenen Sprechstunde angezeigt werden?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die offene Sprechstunde findet täglich von 9–10 Uhr statt. Eine vorherige Terminvereinbarung ist nicht erforderlich. Bitte beachten Sie, dass es je nach Auslastung zu Wartezeiten kommen kann und die Aufnahme begrenzt ist.",
    },
  },

  ACUTE_OPEN_CONSULTATION_ACTION: {
    id: "ACUTE_OPEN_CONSULTATION_ACTION",
    label: "Offene Sprechstunde – Hinweis",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die offene Sprechstunde findet täglich von 9–10 Uhr statt. Eine vorherige Terminvereinbarung ist nicht erforderlich. Bitte beachten Sie, dass es je nach Auslastung zu Wartezeiten kommen kann und die Aufnahme begrenzt ist.",
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

  ACUTE_BOOKING_INFO: {
    id: "ACUTE_BOOKING_INFO",
    label: "Akuttermin – Buchung online / Videosprechstunde",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Akuttermine können in der Regel 24 Stunden im Voraus online gebucht werden und sind auch als Videosprechstunde möglich.",
    },
  },

  INFECTIOUS_PROTOCOL: {
    id: "INFECTIOUS_PROTOCOL",
    label: "Infektionsschutz – Hinweis",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    m5Code: "INFECTIOUS" as M5ReasonCode,
    questions: [
      { id: "INFECTIOUS_PROTOCOL-Q1", text: "Besteht Verdacht auf eine ansteckende Erkrankung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Es besteht der Verdacht auf eine ansteckende Erkrankung.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  INFECTIOUS_CONTACT_DIGITALLY: {
    id: "INFECTIOUS_CONTACT_DIGITALLY",
    label: "Infektionsschutz – vorab digital melden",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte melden Sie sich vorab digital bei uns.",
    },
  },

  INFECTIOUS_VIDEO_CONSULTATION: {
    id: "INFECTIOUS_VIDEO_CONSULTATION",
    label: "Infektionsschutz – Videosprechstunde",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Alternativ können Sie eine Videosprechstunde wählen.",
    },
  },

  INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED: {
    id: "INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED",
    label: "Infektionsschutz – nicht unangemeldet erscheinen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte kommen Sie bei Verdacht auf eine ansteckende Erkrankung nicht unangemeldet in die Praxis.",
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
    textByAudience: {
      contact_person: {
        [DecisionStatus.POSSIBLE]:
          "Die Überweisung wurde ausgestellt und liegt zur Abholung in der Praxis bereit.",
        [DecisionStatus.NOT_POSSIBLE]:
          "Die angefragte Überweisung wurde nicht ausgestellt.",
      },
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Überweisung ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "Überweisung nicht ausgestellt.",
    },
  },

  // ---- REFERRAL SPECIFIC EXPLANATIONS ----

  /** @deprecated Nicht mehr in REFERRAL.specificCheckpointIds gebunden. Ersetzt durch REF_MEDICAL_CONSULTATION_REQUIRED. */
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
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    m5Code: "NO_SPECIALTY" as M5ReasonCode,
    questions: [
      { id: "REF_SPECIALTY_REQUIRED-Q1", text: "Ist die Fachrichtung noch nicht angegeben?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Fachrichtung für die Überweisung ist noch nicht angegeben.",
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

  REF_HAV_CASE: {
    id: "REF_HAV_CASE",
    label: "Hausarztvermittlungsfall (mit Buchungscode)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    m5Code: "HAV" as M5ReasonCode,
    questions: [
      { id: "REF_HAV_CASE-Q1", text: "Handelt es sich um einen Hausarztvermittlungsfall (mit Buchungscode)?" },
    ],
    // Reiner M2-Schalter – kein eigener Ausgabetext.
    textByStatus: {},
  },

  REFERRAL_CAN_BE_ISSUED: {
    id: "REFERRAL_CAN_BE_ISSUED",
    label: "Überweisung kann ausgestellt werden",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "OUTCOME_INFO" as SpecificRole,
    questions: [
      { id: "REFERRAL_CAN_BE_ISSUED-Q1", text: "Kann die Überweisung ausgestellt werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Die Überweisung kann ausgestellt werden.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Überweisung kann ausgestellt werden",
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
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Impfung empfohlen/angeboten.",
      [DecisionStatus.NOT_POSSIBLE]: "Impfung nicht durchgeführt.",
    },
  },

  // ---- IMMUNIZATION SPECIFIC EXPLANATIONS ----

  IMMUNIZATION_STANDARD_AVAILABLE: {
    id: "IMMUNIZATION_STANDARD_AVAILABLE",
    label: "Grippe / COVID-Booster möglich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_STANDARD_AVAILABLE-Q1", text: "Geht es um eine Grippeimpfung oder einen COVID-Booster?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Grippeimpfung und COVID-Booster können ohne vorherige Impfberatung direkt gebucht werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

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

  IMMUNIZATION_VACCINATION_RECORD_MISSING: {
    id: "IMMUNIZATION_VACCINATION_RECORD_MISSING",
    label: "Impfpass fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "IMMUNIZATION_VACCINATION_RECORD_MISSING-Q1", text: "Liegt kein Impfpass oder Impfnachweis vor?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Beurteilung Ihres Impfstatus benötigen wir einen Impfpass oder einen anderen Impfnachweis. Falls kein Impfpass vorliegt, können Sie diesen auch bei uns in der Praxis erwerben.",
      // NO: bewusst still – keine Erklärung nötig
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Für die Beurteilung des Impfstatus wird ein Impfpass oder ein anderer Impfnachweis benötigt. Falls kein Impfpass vorhanden ist, kann dieser auch in der Praxis erworben werden.",
      },
    },
  },

  /** @deprecated Vorbereitender Impfpass-Hinweis – nicht mehr in IMMUNIZATION.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
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
      // M2-Schalter: reine Zuständigkeitsaussage – keine Handlungsaufforderung.
      [ExplanationStatus.YES]:
        "Reiseimpfungen liegen im Zuständigkeitsbereich reisemedizinisch spezialisierter Stellen.",
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

  APPOINTMENT_CAN_BE_BOOKED: {
    id: "APPOINTMENT_CAN_BE_BOOKED",
    label: "Termin kann gebucht werden",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_CAN_BE_BOOKED-Q1", text: "Kann für dieses Anliegen grundsätzlich ein Termin gebucht werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für Ihr Anliegen kann grundsätzlich ein Termin vereinbart werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Für das Anliegen kann grundsätzlich ein Termin vereinbart werden.",
      },
    },
  },

  APPOINTMENT_CANCEL_OR_RESCHEDULE: {
    id: "APPOINTMENT_CANCEL_OR_RESCHEDULE",
    label: "Termin absagen oder verschieben",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_CANCEL_OR_RESCHEDULE-Q1", text: "Möchte der Patient einen bestehenden Termin absagen oder verschieben?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Sie können Ihren Termin jederzeit über den Online-Kalender absagen oder verschieben.",
      // NO: bewusst still – keine Erklärung nötig
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Der Termin kann jederzeit über den Online-Kalender abgesagt oder verschoben werden.",
      },
    },
  },

  // ---- APPOINTMENT ACTION CHECKPOINTS (terminartspezifische Buchungsanleitungen) ----

  APPOINTMENT_BOOK_FINDINGS_REVIEW: {
    id: "APPOINTMENT_BOOK_FINDINGS_REVIEW",
    label: "Befundbesprechung buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie im Online-Buchungskalender eine Befundbesprechung. F\u00FCr diesen Termin ben\u00F6tigen Sie den Buchungscode BFSP25.",
    },
    textByAudience: {
      contact_person:
        "Bitte im Online-Buchungskalender eine Befundbesprechung buchen. Zur Best\u00E4tigung wird der Buchungscode BFSP25 ben\u00F6tigt.",
    },
  },

  APPOINTMENT_BOOK_CHECKUP_SECOND: {
    id: "APPOINTMENT_BOOK_CHECKUP_SECOND",
    label: "Check-Up 2. Termin buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie im Online-Buchungskalender den Termin \u201ECheck-Up - 2. Termin\u201C. Dieser Termin ist erst sinnvoll, wenn die Laborwerte aus dem ersten Termin vorliegen. Zur Best\u00E4tigung ben\u00F6tigen Sie den Buchungscode CHECK25. Bitte bringen Sie Ihren Impfpass mit.",
    },
    textByAudience: {
      contact_person:
        "Bitte im Online-Buchungskalender den Termin \u201ECheck-Up - 2. Termin\u201C buchen. Dieser Termin ist erst sinnvoll, wenn die Laborwerte aus dem ersten Termin vorliegen. Zur Best\u00E4tigung wird der Buchungscode CHECK25 ben\u00F6tigt. Bitte den Impfpass mitbringen.",
    },
  },

  APPOINTMENT_BOOK_CHRONIC_CONTROL: {
    id: "APPOINTMENT_BOOK_CHRONIC_CONTROL",
    label: "Chroniker-Kontrolltermin buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie im Online-Buchungskalender einen Chroniker-Kontrolltermin. F\u00FCr diesen Termin ben\u00F6tigen Sie den Buchungscode CHKT25.",
    },
    textByAudience: {
      contact_person:
        "Bitte im Online-Buchungskalender einen Chroniker-Kontrolltermin buchen. Zur Best\u00E4tigung wird der Buchungscode CHKT25 ben\u00F6tigt.",
    },
  },

  APPOINTMENT_BOOK_GENERAL: {
    id: "APPOINTMENT_BOOK_GENERAL",
    label: "Termin über Online-Kalender buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte buchen Sie Ihren Termin über unseren Online-Buchungskalender.\n\nWählen Sie:\n1. Hausarzt / Allgemeinmedizin\n2. passende Terminart\n\nFalls Sie unsicher sind, welcher Termin für Ihr Anliegen passt, geben Sie uns bitte kurz eine Rückmeldung.",
    },
    textByAudience: {
      contact_person: {
        [ActionStatus.ACTIVE]:
          "Termin bitte über Online-Kalender buchen (Hausarzt / Allgemeinmedizin → passende Terminart). Bei Unsicherheit kurze Rückmeldung einholen.",
      },
    },
  },

  APPOINTMENT_BOOKING_CODE_REQUIRED: {
    id: "APPOINTMENT_BOOKING_CODE_REQUIRED",
    label: "Buchungscode erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_BOOKING_CODE_REQUIRED-Q1", text: "Ist für die gewünschte Terminart ein Buchungscode erforderlich oder fehlt dieser?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die gewünschte Terminart ist ein Buchungscode erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  APPOINTMENT_EXTERNAL_FINDING_PRESENT: {
    id: "APPOINTMENT_EXTERNAL_FINDING_PRESENT",
    label: "Befundbesprechung zu externem Befund",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_EXTERNAL_FINDING_PRESENT-Q1", text: "Soll die Befundbesprechung zu einem externen Befund erfolgen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Befundbesprechung soll zu einem externen Befund (z. B. Facharzt, Krankenhaus) erfolgen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

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
      // M2-Schalter: reine Kontextaussage – Buchungsaufforderung ist in BOOK_APPOINTMENT (M3).
      [ExplanationStatus.YES]:
        "Der gebuchte Termintyp passt nicht zum Anliegen.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Fachprozesswissen (z. B. Labor → Arzttermin) gehört ins jeweilige Fachprofil, nicht in APPOINTMENT. Nicht mehr in APPOINTMENT.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
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

  /** @deprecated Generischer Vorbereitungshinweis – wird jetzt über TERMIN_PREPARATION_REQUIRED (GLOBAL) + globalHints abgebildet. Nicht mehr in APPOINTMENT.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
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

  /** @deprecated Dokumentenlogik gehört in das jeweilige Fachprofil (eGK → ONBOARDING; Befunde → MEDICAL_DOCUMENTS; Impfpass → IMMUNIZATION). Nicht mehr in APPOINTMENT.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
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

  /** @deprecated Fachliches Kanal-Urteil (körperliche Untersuchung, akute Beschwerden) ist abhängig vom konkreten Anliegen und gehört ins Fachprofil, nicht in APPOINTMENT. Nicht mehr in APPOINTMENT.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
  APPOINTMENT_VIDEO_LIMITATIONS: {
    id: "APPOINTMENT_VIDEO_LIMITATIONS",
    label: "Videosprechstunde nicht geeignet",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_VIDEO_LIMITATIONS-Q1", text: "Ist die Videosprechstunde für dieses Anliegen ungeeignet (z. B. körperliche Untersuchung, akute oder schwere Beschwerden, unbekannte Patienten)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für dieses Anliegen ist eine Videosprechstunde leider nicht geeignet – bitte buchen Sie einen Termin in der Praxis (z. B. bei körperlichen Untersuchungen, akuten oder schweren Beschwerden).",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Technische Voraussetzungen der Videosprechstunde (Kamera, Mikrofon, Link, Region) sind Technik-Infrastruktur und gehören in TECH_SUPPORT. Nicht mehr in APPOINTMENT.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
  APPOINTMENT_VIDEO_REQUIREMENTS: {
    id: "APPOINTMENT_VIDEO_REQUIREMENTS",
    label: "Voraussetzungen Videosprechstunde",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "APPOINTMENT_VIDEO_REQUIREMENTS-Q1", text: "Müssen Voraussetzungen für die Videosprechstunde erläutert werden (z. B. Technik, Wohnort, Ablauf)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Videosprechstunde benötigen Sie eine stabile Internetverbindung sowie ein Gerät mit Kamera und Mikrofon. Bitte wählen Sie sich rechtzeitig über den zugesandten Link ein. Beachten Sie ggf. regionale Einschränkungen (z. B. Wohnsitz im Einzugsgebiet).",
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
        "Die angefragte Laboruntersuchung erfolgt ohne klare medizinische Indikation oder außerhalb der vorgesehenen Vorsorgeintervalle und ist daher keine Kassenleistung. Die Durchführung ist als Selbstzahlerleistung möglich.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Leistung ist keine Kassenleistung (Selbstzahler/IGeL).",
    },
  },

  /** @deprecated Ersetzt durch BILLING_EXTERNAL_PROVIDER. Nicht mehr in BILLING.specificCheckpointIds. */
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

  /** @deprecated Ersetzt durch BILLING_ADDRESS_MISSING. Nicht mehr in BILLING.specificCheckpointIds. */
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
        "Für die Abrechnung benötigen wir noch fehlende Unterlagen (z. B. Gesundheitskarte oder Privatärztlichen Abrechnungsschein).",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Abrechnungsunterlagen angefordert.",
    },
  },

  BILLING_EXTERNAL_PROVIDER: {
    id: "BILLING_EXTERNAL_PROVIDER",
    label: "Abrechnung über externen Dienstleister",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "BILLING_EXTERNAL_PROVIDER-Q1", text: "Läuft die Abrechnung über einen externen Abrechnungsdienstleister (PAS)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Rechnung erhalten Sie von einem externen Abrechnungsdienstleister oder einem Partnerlabor.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patient über externe Abrechnung informiert.",
    },
  },

  BILLING_ADDRESS_MISSING: {
    id: "BILLING_ADDRESS_MISSING",
    label: "Adresse für Rechnungszustellung fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "BILLING_ADDRESS_MISSING-Q1", text: "Konnte eine Rechnung nicht zugestellt werden, weil die Adresse fehlt oder veraltet ist?" },
    ],
    textByStatus: {
      // M2-Schalter: reine Zustandsaussage – Adressanforderung in BILLING_ADDRESS_UPDATE_REQUESTED (M3).
      [ExplanationStatus.YES]:
        "Die aktuelle Postadresse für die Rechnungszustellung konnte nicht ermittelt werden.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Adresse für Rechnungszustellung angefordert.",
    },
  },

  BILLING_INVOICE_TIMING: {
    id: "BILLING_INVOICE_TIMING",
    label: "Zeitpunkt der Rechnungsstellung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "BILLING_INVOICE_TIMING-Q1", text: "Fragt der Patient nach dem Zeitpunkt oder Ablauf der Rechnungsstellung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Die Abrechnung erfolgt in der Regel quartalsweise über unsere Buchhaltung. Sie erhalten Ihre Rechnung anschließend automatisch vom Abrechnungsdienstleister.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patient über quartalsweise Abrechnung informiert.",
    },
  },

  // ---- BILLING ACTION CHECKPOINTS (freigeschaltet durch BILLING_COST_NOT_COVERED = YES) ----

  /**
   * Hinweis: Leistung nicht von der gesetzlichen Krankenkasse übernommen.
   * Wird in M3 angezeigt, wenn BILLING_COST_NOT_COVERED = YES gesetzt ist.
   */
  BILLING_NOT_COVERED_BY_STATUTORY: {
    id: "BILLING_NOT_COVERED_BY_STATUTORY",
    label: "Hinweis: Keine Kassenleistung",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die angefragte Leistung wird nicht von der gesetzlichen Krankenkasse übernommen.",
    },
  },

  /**
   * Hinweis: Abrechnung erfolgt privat nach GOÄ.
   * Wird in M3 angezeigt, wenn BILLING_COST_NOT_COVERED = YES gesetzt ist.
   */
  BILLING_GOA_BILLING: {
    id: "BILLING_GOA_BILLING",
    label: "Hinweis: Abrechnung nach GOÄ",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Die Abrechnung erfolgt privat nach der Gebührenordnung für Ärzte (GOÄ).",
    },
  },

  /**
   * Hinweis: Kartenzahlung vor Ort möglich.
   * Reaktiviert als ACTION-Baustein (war @deprecated als EXPLANATION-Schalter).
   * Wird in M3 angezeigt, wenn BILLING_COST_NOT_COVERED = YES gesetzt ist.
   */
  BILLING_ONSITE_PAYMENT: {
    id: "BILLING_ONSITE_PAYMENT",
    label: "Selbstzahler-Zahlung vor Ort",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Selbstzahlerleistungen können vor Ort in der Praxis per Karte bezahlt werden.",
    },
  },

  // ---- TECH_SUPPORT SPECIFIC EXPLANATIONS ----

  TECH_VIDEO_NOT_WORKING: {
    id: "TECH_VIDEO_NOT_WORKING",
    label: "Videosprechstunde technisch nicht möglich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    m5Code: "TECH" as M5ReasonCode,
    questions: [
      { id: "TECH_VIDEO_NOT_WORKING-Q1", text: "Funktioniert die Videosprechstunde technisch nicht (z. B. kein Ton, kein Bild, Verbindungsabbruch)?" },
    ],
    textByStatus: {
      // M2-Schalter: genau eine klare Information – kein Lösungsvorschlag durch die Praxis,
      // klarer Verweis auf den externen Doctolib-Support.
      [ExplanationStatus.YES]:
        "Scheinbar konnte die Videosprechstunde aus technischen Gründen nicht stattfinden. Wenden Sie sich bei Fragen an den Doctolib Support.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  TECH_UPLOAD_FAILED: {
    id: "TECH_UPLOAD_FAILED",
    label: "Dokument unleserlich – erneuter Upload erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "CHANNEL_NOT_SUITABLE" as SpecificRole,
    m5Code: "TECH" as M5ReasonCode,
    questions: [
      { id: "TECH_UPLOAD_FAILED-Q1", text: "Ist das hochgeladene Dokument nicht ausreichend lesbar oder unbrauchbar?" },
    ],
    textByStatus: {
      // M2-Schalter: genau eine klare Information – Aufforderung zum erneuten Upload,
      // ohne Hinweis auf Post, Fax oder Vor-Ort-Abgabe und ohne technische Details.
      [ExplanationStatus.YES]:
        "Das hochgeladene Dokument ist nicht ausreichend lesbar und kann so nicht verwendet werden. Bitte laden Sie das Dokument erneut hoch.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---- ONBOARDING SPECIFIC EXPLANATIONS ----

  ONBOARDING_DOCTOLIB_INFO: {
    id: "ONBOARDING_DOCTOLIB_INFO",
    label: "Doctolib – Nutzung und Kommunikation",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ONBOARDING_DOCTOLIB_INFO-Q1", text: "Doctolib unklar?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Kommunikation mit unserer Praxis nutzen wir Doctolib.\n\nSie können dort Termine online buchen und verwalten sowie Rezepte oder Bescheinigungen digital anfragen.\n\nBitte nutzen Sie dafür Ihren Doctolib-Account.",
      // NO: bewusst still – keine Erklärung nötig
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Für die Kommunikation mit unserer Praxis wird Doctolib genutzt.\n\nDort können Termine online gebucht und verwaltet sowie Rezepte oder Bescheinigungen digital angefragt werden.\n\nBitte dafür den Doctolib-Account nutzen.",
      },
    },
  },

  ONBOARDING_DATA_INCOMPLETE: {
    id: "ONBOARDING_DATA_INCOMPLETE",
    label: "Patientendaten unvollständig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "ONBOARDING_DATA_INCOMPLETE-Q1", text: "Registrierungsdaten unvollständig?" },
    ],
    textByStatus: {
      // bewusst leer – reiner M2-Schalter; Inhalte kommen über boundActionConditions
      [ExplanationStatus.YES]: "",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patient zur Datenvervollständigung via Online-Anamnese aufgefordert.",
    },
  },

  ONBOARDING_DATA_UPDATE_REQUIRED: {
    id: "ONBOARDING_DATA_UPDATE_REQUIRED",
    label: "Patientendaten aktualisieren",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ONBOARDING_DATA_UPDATE_REQUIRED-Q1", text: "Patientendaten aktualisieren?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine sichere und vollständige Behandlung benötigen wir aktuelle Angaben zu Ihrer Person und Ihrer Gesundheit.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Aktualisierung der Patientendaten angefordert.",
    },
  },

  /** @deprecated Kombinierter GKV/PKV-Nachweis-Baustein – abgelöst durch ONBOARDING_GKV_DOCUMENT_MISSING und ONBOARDING_PKV_PAS_MISSING. Nicht mehr in specificCheckpointIds des ONBOARDING-Profils. Checkpoint bleibt im Katalog erhalten. */
  ONBOARDING_DOCUMENT_MISSING: {
    id: "ONBOARDING_DOCUMENT_MISSING",
    label: "Identitäts- oder Versicherungsnachweis fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "ONBOARDING_DOCUMENT_MISSING-Q1", text: "Fehlen notwendige Dokumente zur Patientenaufnahme (z. B. eGK, Identitätsnachweis, Versicherungsnachweis)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Bearbeitung Ihrer Anfrage benötigen wir noch einen Versicherungsnachweis:\n\n- Gesetzlich versichert: Bitte senden Sie uns ein Foto Ihrer Gesundheitskarte (Vorder- und Rückseite) oder eine aktuelle Ersatzbescheinigung Ihrer Krankenkasse.\n\n- Privat versichert: Bitte senden Sie uns einen Identitätsnachweis (z. B. Personalausweis) sowie das ausgefüllte und unterschriebene PAS-Formular.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Versicherungs-/Identitätsnachweis angefordert (GKV/PKV).",
    },
  },

  ONBOARDING_GKV_DOCUMENT_MISSING: {
    id: "ONBOARDING_GKV_DOCUMENT_MISSING",
    label: "Versicherungsnachweis GKV fehlt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "ONBOARDING_GKV_DOCUMENT_MISSING-Q1", text: "Versicherungsnachweis fehlt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Zur Bearbeitung Ihrer Anfrage benötigen wir noch einen gültigen Versicherungsnachweis, z. B. Ihre Gesundheitskarte (Vorder- und Rückseite) oder eine aktuelle Ersatzbescheinigung Ihrer Krankenkasse.",
      // NO: bewusst still – keine Erklärung nötig
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Zur Bearbeitung wird noch ein gültiger Versicherungsnachweis benötigt, z. B. die Gesundheitskarte (Vorder- und Rückseite) oder eine aktuelle Ersatzbescheinigung der Krankenkasse.",
      },
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Versicherungsnachweis GKV angefordert.",
    },
  },

  ONBOARDING_PKV_PAS_MISSING: {
    id: "ONBOARDING_PKV_PAS_MISSING",
    label: "Unterlagen Privatpatient fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "ONBOARDING_PKV_PAS_MISSING-Q1", text: "Privat-Unterlagen fehlen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Als privat versicherte Patientin oder privat versicherter Patient benötigen wir für die korrekte Abrechnung einmalig einen Identitätsnachweis (z. B. Personalausweis) sowie das ausgefüllte und unterschriebene PAS-Formular.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Identitätsnachweis/PAS-Formular für Privatabrechnung angefordert.",
    },
  },

  ONBOARDING_IDENTITY_MISMATCH: {
    id: "ONBOARDING_IDENTITY_MISMATCH",
    label: "Patient nicht eindeutig zuordenbar",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "ONBOARDING_IDENTITY_MISMATCH-Q1", text: "Unbekannter Patient?" },
    ],
    textByStatus: {
      // bewusst leer – reiner M2-Schalter; Inhalte kommen über boundActionConditions
      [ExplanationStatus.YES]: "",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patientendaten nicht eindeutig zuordenbar; Abgleich angefordert.",
    },
  },

  /** @deprecated Redundanter Baustein – Registrierungsablauf-Erklärung. Nicht mehr in specificCheckpointIds des ONBOARDING-Profils. Checkpoint bleibt im Katalog erhalten. */
  ONBOARDING_PROCESS_REQUIRED: {
    id: "ONBOARDING_PROCESS_REQUIRED",
    label: "Registrierungsablauf erklären",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "ONBOARDING_PROCESS_REQUIRED-Q1", text: "Muss der Registrierungsablauf erläutert werden (z. B. erforderliche Schritte, benötigte Dokumente, Ablauf der Aufnahme)?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Aufnahme als Neupatient sind folgende Schritte erforderlich: Registrierung über unser Patientenportal, Vorlage der Versichertenkarte sowie ggf. Ausfüllen eines Anamnesebogens. Bitte kommen Sie für den Ersttermin etwas früher.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  ONBOARDING_WRONG_PRACTICE: {
    id: "ONBOARDING_WRONG_PRACTICE",
    label: "Patient nicht dieser Praxis zugehörig",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "EXTERNAL_RESPONSIBILITY" as SpecificRole,
    questions: [
      { id: "ONBOARDING_WRONG_PRACTICE-Q1", text: "Falsche Praxis?" },
    ],
    textByStatus: {
      // bewusst leer – reiner M2-Schalter; Inhalte kommen über boundActionConditions
      [ExplanationStatus.YES]: "",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Anfrage nicht zuordenbar; vermutlich falsche Praxis kontaktiert.",
    },
  },

  // ---------------------------------------------------------------------------
  // ONBOARDING – M3 ACTION-Bausteine (freigeschaltet über boundActionConditions)
  // ---------------------------------------------------------------------------

  ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED: {
    id: "ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED",
    label: "Identitätsabgleich – Kontext",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Leider konnten wir Ihre Anfrage nicht eindeutig zuordnen.",
    },
    textByAudience: {
      contact_person:
        "Leider konnte die Anfrage nicht eindeutig zugeordnet werden.",
    },
  },

  ONBOARDING_PROVIDE_IDENTITY_DATA: {
    id: "ONBOARDING_PROVIDE_IDENTITY_DATA",
    label: "Identitätsabgleich – Aktion",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte teilen Sie uns Ihren vollständigen Namen und Ihr Geburtsdatum mit, damit wir Ihre Daten korrekt abgleichen können.",
    },
    textByAudience: {
      contact_person:
        "Bitte teilen Sie uns den vollständigen Namen und das Geburtsdatum der Patientin / des Patienten mit, damit wir die Daten korrekt abgleichen können.",
    },
  },

  ONBOARDING_DATA_MISSING_CONTEXT: {
    id: "ONBOARDING_DATA_MISSING_CONTEXT",
    label: "Datenvervollständigung – Kontext",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Leider fehlen uns noch aktuelle Angaben, um Ihr Anliegen bearbeiten zu können.",
    },
    textByAudience: {
      contact_person:
        "Leider fehlen noch aktuelle Angaben, um das Anliegen bearbeiten zu können.",
    },
  },

  ONBOARDING_WRONG_PRACTICE_NOTICE: {
    id: "ONBOARDING_WRONG_PRACTICE_NOTICE",
    label: "Falsche Praxis – Hinweis",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "INFO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Leider konnten wir Sie nicht als Patient in unserem System finden.",
    },
    textByAudience: {
      contact_person:
        "Die angegebene Person konnte nicht in unserem System gefunden werden.",
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
      // M2-Schalter: reine Zuständigkeitsaussage – Weiterleitungshinweis in BILLING_CONTACT_EXTERNAL_PARTY (M3).
      [ExplanationStatus.YES]:
        "Die Zuständigkeit für diese Anfrage liegt bei der Krankenkasse oder einer anderen externen Stelle.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Patient an externe Stelle (Krankenkasse) verwiesen.",
    },
  },

  // ---- BILLING ACTION-Bausteine (freigeschaltet über boundActionConditions) ----

  /**
   * Weiterleitungshinweis bei externer Abrechnungszuständigkeit.
   * Wird in M3 angezeigt, wenn BILLING_EXTERNAL_RESPONSIBILITY = YES gesetzt ist.
   */
  BILLING_CONTACT_EXTERNAL_PARTY: {
    id: "BILLING_CONTACT_EXTERNAL_PARTY",
    label: "Hinweis: Krankenkasse / externe Stelle kontaktieren",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Für Fragen zur Kostenübernahme oder Abrechnung wenden Sie sich bitte direkt an Ihre Krankenkasse oder die zuständige Stelle.",
    },
    textByAudience: {
      contact_person:
        "Für Fragen zur Kostenübernahme oder Abrechnung bitte direkt an die zuständige Krankenkasse oder externe Stelle wenden.",
    },
  },

  /**
   * Adressanforderung bei fehlender oder veralteter Rechnungsadresse.
   * Wird in M3 angezeigt, wenn BILLING_ADDRESS_MISSING = YES gesetzt ist.
   */
  BILLING_ADDRESS_UPDATE_REQUESTED: {
    id: "BILLING_ADDRESS_UPDATE_REQUESTED",
    label: "Aktion: Aktuelle Postadresse anfordern",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte teilen Sie uns Ihre aktuelle Postadresse mit, damit wir diese weitergeben können.",
    },
  },

  // ---- MEDICAL_DOCUMENTS DECISION ----

  MEDICAL_DOCUMENTS_DECISION: {
    id: "MEDICAL_DOCUMENTS_DECISION",
    label: "Attest-/Bescheinigungs-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "MEDICAL_DOCUMENTS_DECISION-Q1", text: "Kann das angefragte Attest oder die angefragte Bescheinigung ausgestellt werden?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]:
        "Das angefragte Attest / die angefragte Bescheinigung kann erstellt werden.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Das angefragte Attest / die angefragte Bescheinigung kann derzeit nicht erstellt werden.",
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Bescheinigung/Attest ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "Bescheinigung/Attest nicht ausgestellt.",
    },
  },

  // ---- MEDICAL_DOCUMENTS SPECIFIC EXPLANATIONS ----

  MEDICAL_DOCUMENT_POSSIBLE: {
    id: "MEDICAL_DOCUMENT_POSSIBLE",
    label: "Attest / Bescheinigung möglich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_POSSIBLE-Q1", text: "Kann für dieses Anliegen grundsätzlich ein Attest oder eine Bescheinigung ausgestellt werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Atteste oder Bescheinigungen können nur nach ärztlicher Beurteilung ausgestellt werden.",
      // NO: bewusst still – kein Text
    },
    textByAudience: {
      contact_person: {
        [ExplanationStatus.YES]:
          "Atteste oder Bescheinigungen können nur nach ärztlicher Beurteilung ausgestellt werden.",
      },
    },
  },

  /** @deprecated Nicht mehr in MEDICAL_DOCUMENTS.specificCheckpointIds. Fachlich durch globales MEDICAL_CONSULTATION_REQUIRED ersetzt. */
  MEDICAL_DOCUMENT_REVIEW_REQUIRED: {
    id: "MEDICAL_DOCUMENT_REVIEW_REQUIRED",
    label: "Ärztliche Einschätzung für Attest erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_REVIEW_REQUIRED-Q1", text: "Ist für das Attest oder die Bescheinigung eine ärztliche Einschätzung erforderlich?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für ein Attest oder eine Bescheinigung ist eine ärztliche Einschätzung erforderlich.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  MEDICAL_DOCUMENT_INFO_MISSING: {
    id: "MEDICAL_DOCUMENT_INFO_MISSING",
    label: "Angaben zum Verwendungszweck fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_INFO_MISSING-Q1", text: "Fehlen genaue Angaben dazu, wofür das Attest oder die Bescheinigung benötigt wird?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bitte geben Sie an, wofür das Attest oder die Bescheinigung benötigt wird.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  /** @deprecated Text zu unscharf – nicht mehr in MEDICAL_DOCUMENTS.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
  MEDICAL_DOCUMENT_DOCUMENTATION_MISSING: {
    id: "MEDICAL_DOCUMENT_DOCUMENTATION_MISSING",
    label: "Vorhandene Befunde / Nachweise fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_DOCUMENT" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_DOCUMENTATION_MISSING-Q1", text: "Fehlen für die Beurteilung relevante Befunde oder Nachweise?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Beurteilung können vorhandene Befunde oder Nachweise erforderlich sein.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  MEDICAL_DOCUMENT_PRIVATE_SERVICE: {
    id: "MEDICAL_DOCUMENT_PRIVATE_SERVICE",
    label: "Attest / Bescheinigung als Selbstzahlerleistung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "RULE_COST_COVERAGE" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_PRIVATE_SERVICE-Q1", text: "Handelt es sich um eine Bescheinigung, die nicht im Leistungsumfang der gesetzlichen Krankenversicherung enthalten ist?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bestimmte Atteste und Bescheinigungen zählen nicht zur medizinisch notwendigen Versorgung und sind daher Selbstzahlerleistungen. Dazu gehören z. B. Atteste für Sport, Schule oder Reisen. Wir berechnen in der Regel eine Pauschale von 10 Euro. Medizinisch notwendige Nachweise wie eine Arbeitsunfähigkeitsbescheinigung sind kostenfrei.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  MEDICAL_DOCUMENT_AU_DIFFERENCE: {
    id: "MEDICAL_DOCUMENT_AU_DIFFERENCE",
    label: "Unterschied Attest und Arbeitsunfähigkeitsbescheinigung (AU)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_AU_DIFFERENCE-Q1", text: "Besteht Unklarheit über den Unterschied zwischen Attest und Arbeitsunfähigkeitsbescheinigung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Eine Arbeitsunfähigkeitsbescheinigung (AU), umgangssprachlich Krankschreibung, bestätigt, dass Sie aktuell aus gesundheitlichen Gründen nicht arbeitsfähig sind.\nEin Attest ist eine individuelle ärztliche Bescheinigung für einen bestimmten Zweck und kann kostenpflichtig sein.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED: {
    id: "MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED",
    label: "Unterlagen übersetzen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED-Q1", text: "Unterlagen übersetzen?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine sichere Behandlung benötigen wir medizinische Unterlagen auf Deutsch oder Englisch. Bitte lassen Sie vorhandene Unterlagen entsprechend übersetzen.",
      // NO: bewusst still – keine Erklärung nötig
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Übersetzung medizinischer Unterlagen erforderlich.",
    },
  },

  /** @deprecated Generischer Ablaufhinweis (Erstellung/Abholung/Übermittlung) ohne Entscheidungsbezug – beschreibt nur den Prozess, keine echte Begründung. Nicht mehr in MEDICAL_DOCUMENTS.specificCheckpointIds. Checkpoint bleibt im Katalog erhalten. */
  MEDICAL_DOCUMENT_PROCESS_INFO: {
    id: "MEDICAL_DOCUMENT_PROCESS_INFO",
    label: "Ablauf der Attest-/Bescheinigungserstellung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "MEDICAL_DOCUMENT_PROCESS_INFO-Q1", text: "Muss der Ablauf der Erstellung, Abholung oder Übermittlung des Dokuments erläutert werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Nach ärztlicher Prüfung informieren wir Sie über Erstellung, Abholung oder Übermittlung des Dokuments.",
      // NO: bewusst still – keine Erklärung nötig
    },
  },

  // ---------------------------------------------------------------------------
  // Intro-Bausteine (Nachrichteneinstieg)
  //
  // Optionale Einstiegssätze für Praxis-Antworten. Sie erklären nur den
  // Kommunikationskontext – keine medizinische Bewertung, keine Entscheidung,
  // keine Links, keine Handlungsdetails.
  //
  // Architektur:
  //   - kind: ACTION, scope: GLOBAL, actionCategory: "INTRO"
  //   - Werden NICHT in sharedBottom geschrieben.
  //   - Der Renderer befüllt stattdessen output.intro mit dem Text des ersten
  //     aktiven INTRO-Checkpoints (weitere aktive INTROs werden ignoriert).
  //   - Maximal ein Intro erscheint im Output.
  //   - Keine M2-Schalter, keine Decision-Logik.
  // ---------------------------------------------------------------------------

  MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED: {
    id: "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED",
    label: "Nachricht eingegangen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "INTRO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Ihre Nachricht ist bei uns eingegangen.",
    },
    textByAudience: {
      contact_person:
        "Die Nachricht für Ihre Angehörige / Ihren Angehörigen ist bei uns eingegangen.",
    },
  },

  MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED: {
    id: "MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED",
    label: "Fragebogen eingegangen – Angaben geprüft",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "INTRO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Vielen Dank für das Ausfüllen des Fragebogens.",
    },
    textByAudience: {
      contact_person:
        "Vielen Dank für das Ausfüllen des Fragebogens für Ihre Angehörige / Ihren Angehörigen.",
    },
  },

  MESSAGE_INTRO_PRACTICE_FOLLOWUP: {
    id: "MESSAGE_INTRO_PRACTICE_FOLLOWUP",
    label: "Praxis schreibt aktiv – Angaben fehlen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "INTRO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Sie waren kürzlich in unserer Praxis. Dabei ist uns aufgefallen, dass einige Angaben fehlen oder veraltet sein könnten.",
    },
    textByAudience: {
      contact_person:
        "Ihre Angehörige / Ihr Angehöriger war kürzlich in unserer Praxis. Dabei ist uns aufgefallen, dass einige Angaben fehlen oder veraltet sein könnten.",
    },
  },

  MESSAGE_INTRO_MISSING_INFO: {
    id: "MESSAGE_INTRO_MISSING_INFO",
    label: "Zusatzangaben benötigt",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "INTRO",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Zur weiteren Bearbeitung Ihres Anliegens benötigen wir noch folgende Angaben:",
    },
    textByAudience: {
      contact_person:
        "Zur weiteren Bearbeitung des Anliegens Ihrer Angehörigen / Ihres Angehörigen benötigen wir noch folgende Angaben:",
    },
  },

  // ---------------------------------------------------------------------------
  // Profilspezifische Konsultations- / Zustandshinweise
  // (migriert von Global-Checkpoints)
  // ---------------------------------------------------------------------------

  AU_MEDICAL_CONSULTATION_REQUIRED: {
    id: "AU_MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich (AU)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    m5Code: "NEED_VISIT" as M5ReasonCode,
    question: "Ist für dieses Anliegen eine ärztliche Konsultation erforderlich?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  LAB_MEDICAL_CONSULTATION_REQUIRED: {
    id: "LAB_MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich (Labor)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    m5Code: "NEED_VISIT" as M5ReasonCode,
    question: "Ist für dieses Anliegen eine ärztliche Konsultation erforderlich?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  REF_MEDICAL_CONSULTATION_REQUIRED: {
    id: "REF_MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich (Überweisung)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    m5Code: "NEED_VISIT" as M5ReasonCode,
    question: "Ist für dieses Anliegen eine ärztliche Konsultation erforderlich?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  MEDICAL_DOCUMENT_CONSULTATION_REQUIRED: {
    id: "MEDICAL_DOCUMENT_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich (Atteste)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    m5Code: "NEED_VISIT" as M5ReasonCode,
    question: "Ist für dieses Anliegen eine ärztliche Konsultation erforderlich?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für eine abschließende Einschätzung ist eine ärztliche Konsultation erforderlich.",
    },
  },

  PRESCRIPTION_PATIENT_NOT_IN_GERMANY: {
    id: "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
    label: "Aufenthaltsort außerhalb Deutschland (Rezept)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    question: "Befindet sich der Patient aktuell NICHT in Deutschland?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Rezepte können in deutschen Apotheken eingelöst werden. Im Ausland ist die Einlösung eingeschränkt.",
    },
  },

  PRESCRIPTION_CHRONIC_PATIENT: {
    id: "PRESCRIPTION_CHRONIC_PATIENT",
    label: "Chronische Erkrankung (Rezept)",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    question: "Liegt eine chronische oder dauerhaft behandlungsbedürftige Erkrankung vor?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bei Dauermedikation sind regelmäßige Kontrolltermine vorgesehen.",
    },
  },

  PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK: {
    id: "PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK",
    label: "Rezept geändert nach Apothekenrückmeldung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    question: "Wurde das Rezept nach Rückmeldung der Apotheke geändert?",
    textByStatus: {
      [ExplanationStatus.YES]:
        "Das Rezept wurde entsprechend angepasst.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Rezept nach Apothekenrückmeldung angepasst",
    },
  },

  // ---- HOSPITAL_ADMISSION DECISION ----

  HOSPITAL_ADMISSION_DECISION: {
    id: "HOSPITAL_ADMISSION_DECISION",
    label: "Krankenhauseinweisung-Entscheidung",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    questions: [
      { id: "HOSPITAL_ADMISSION_DECISION-Q1", text: "Kann die Krankenhauseinweisung ausgestellt werden?" },
    ],
    textByStatus: {
      [DecisionStatus.POSSIBLE]: "Die Krankenhauseinweisung wurde ausgestellt.",
      [DecisionStatus.NOT_POSSIBLE]: "Die angefragte Krankenhauseinweisung wurde nicht ausgestellt.",
    },
    docByStatus: {
      [DecisionStatus.POSSIBLE]: "Krankenhauseinweisung ausgestellt",
      [DecisionStatus.NOT_POSSIBLE]: "Krankenhauseinweisung nicht ausgestellt",
    },
  },

  // ---- HOSPITAL_ADMISSION SPECIFIC EXPLANATIONS ----

  HOSPITAL_ADMISSION_MISSING_INFO: {
    id: "HOSPITAL_ADMISSION_MISSING_INFO",
    label: "Angaben zur Einweisung fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MISSING_INFORMATION" as SpecificRole,
    questions: [
      { id: "HOSPITAL_ADMISSION_MISSING_INFO-Q1", text: "Fehlen noch Angaben zur geplanten Krankenhauseinweisung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die Bearbeitung der Krankenhauseinweisung fehlen noch Angaben.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Angaben zur Krankenhauseinweisung fehlen",
    },
  },

  HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED: {
    id: "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED",
    label: "Ärztliche Konsultation erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "MEDICAL_REVIEW_REQUIRED" as SpecificRole,
    questions: [
      { id: "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED-Q1", text: "Ist vor Ausstellung eine ärztliche Konsultation erforderlich?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Vor Ausstellung der Krankenhauseinweisung ist eine ärztliche Konsultation erforderlich.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "ärztliche Konsultation vor Krankenhauseinweisung erforderlich",
    },
  },

  HOSPITAL_ADMISSION_CAN_BE_ISSUED: {
    id: "HOSPITAL_ADMISSION_CAN_BE_ISSUED",
    label: "Krankenhauseinweisung kann ausgestellt werden",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "OUTCOME_INFO" as SpecificRole,
    questions: [
      { id: "HOSPITAL_ADMISSION_CAN_BE_ISSUED-Q1", text: "Kann die Krankenhauseinweisung ausgestellt werden?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Die Krankenhauseinweisung kann ausgestellt werden.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Krankenhauseinweisung kann ausgestellt werden",
    },
  },

  HOSPITAL_TRANSPORT_REQUIRED: {
    id: "HOSPITAL_TRANSPORT_REQUIRED",
    label: "Krankentransport erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    specificRole: "PROCESS_INFO" as SpecificRole,
    questions: [
      { id: "HOSPITAL_TRANSPORT_REQUIRED-Q1", text: "Wird ein Krankentransport benötigt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]:
        "Für die stationäre Aufnahme wird ein Krankentransport benötigt.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Krankentransport erforderlich",
    },
  },

  // ---- GLOBAL TRANSPORT STATUS (Konfliktgruppe: TRANSPORT_STATUS) ----
  //
  // Diese drei Checkpoints bilden eine Exklusivgruppe: In M3 darf maximal einer
  // davon auf SHOW gesetzt werden. Die Invariante wird serverseitig durch
  // `applyExclusiveGroupConstraints` in inquirySessionService durchgesetzt:
  // Wenn einer auf SHOW gesetzt wird, setzen die anderen automatisch auf HIDE.
  //
  // Scope GLOBAL + classification "MODULAR": wiederverwendbar in mehreren
  // Profilen (HOSPITAL_ADMISSION, APPOINTMENT, ACUTE_CARE). Gebunden via
  // boundGlobalCheckpointIds. specificRole entfällt bei GLOBAL scope.

  TRANSPORT_APPROVED: {
    id: "TRANSPORT_APPROVED",
    label: "Krankenbeförderung zugesagt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    exclusiveGroupId: "TRANSPORT_STATUS",
    questions: [
      { id: "TRANSPORT_APPROVED-Q1", text: "Wurde eine Krankenbeförderung zugesagt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Die Krankenbeförderung wurde veranlasst.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Krankenbeförderung veranlasst",
    },
  },

  TRANSPORT_NOT_APPROVED: {
    id: "TRANSPORT_NOT_APPROVED",
    label: "Krankenbeförderung nicht zugesagt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    exclusiveGroupId: "TRANSPORT_STATUS",
    questions: [
      { id: "TRANSPORT_NOT_APPROVED-Q1", text: "Wurde die Krankenbeförderung nicht zugesagt?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Eine Krankenbeförderung kann derzeit nicht veranlasst werden.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Krankenbeförderung nicht veranlasst",
    },
  },

  TRANSPORT_INFO_MISSING: {
    id: "TRANSPORT_INFO_MISSING",
    label: "Angaben zur Krankenbeförderung fehlen",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    classification: "MODULAR",
    exclusiveGroupId: "TRANSPORT_STATUS",
    m5Code: "NO_DATA" as M5ReasonCode,
    questions: [
      { id: "TRANSPORT_INFO_MISSING-Q1", text: "Fehlen Angaben zur benötigten Krankenbeförderung?" },
    ],
    textByStatus: {
      [ExplanationStatus.YES]: "Für die Prüfung der Krankenbeförderung fehlen noch Angaben.",
    },
    docByStatus: {
      [ExplanationStatus.YES]: "Angaben zur Krankenbeförderung fehlen",
    },
  },

  // ---- TRANSPORT ACTION CHECKPOINTS ----

  TRANSPORT_QUESTIONNAIRE_REQUEST: {
    id: "TRANSPORT_QUESTIONNAIRE_REQUEST",
    label: "Fragebogen Krankentransport ausfüllen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    actionCategory: "NEXT_STEP",
    textByStatus: {
      [ActionStatus.ACTIVE]:
        "Bitte beantworten Sie die Fragen zum Krankentransport, damit wir die Verordnung prüfen können.",
    },
    docByStatus: {
      [ActionStatus.ACTIVE]: "Fragebogen Krankentransport ausfüllen",
    },
  },
};

/**
 * Geordnete Liste der Intro-Checkpoint-IDs.
 *
 * Der Renderer verwendet diese Reihenfolge, um bei mehreren aktiven
 * Intro-Checkpoints deterministisch den ersten zu wählen.
 * Nur der erste aktive Intro erscheint in output.intro – alle weiteren
 * werden ignoriert.
 */
export const INTRO_CHECKPOINT_IDS: readonly string[] = [
  "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED",
  "MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED",
  "MESSAGE_INTRO_PRACTICE_FOLLOWUP",
  "MESSAGE_INTRO_MISSING_INFO",
] as const;

/**
 * Exklusivgruppe Krankenbeförderungsstatus.
 *
 * In M3 darf maximal einer dieser drei Checkpoints auf SHOW gesetzt werden.
 * Datenseitig ist die Gruppe vollständig deklariert (exclusiveGroupId = "TRANSPORT_STATUS").
 * Die Durchsetzung erfolgt serverseitig in `applyExclusiveGroupConstraints`
 * (lib/inquiries/inquirySessionService.ts): Wird einer auf SHOW gesetzt, werden
 * alle anderen Mitglieder automatisch auf HIDE gesetzt.
 *
 * Angebundene Profile (über boundGlobalCheckpointIds):
 *   HOSPITAL_ADMISSION, APPOINTMENT, ACUTE_CARE
 */
export const TRANSPORT_STATUS_CONFLICT_GROUP: readonly string[] = [
  "TRANSPORT_APPROVED",
  "TRANSPORT_NOT_APPROVED",
  "TRANSPORT_INFO_MISSING",
] as const;
