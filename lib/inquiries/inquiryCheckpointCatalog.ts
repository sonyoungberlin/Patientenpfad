import {
  InquiryCheckpointStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  InquiryCheckpointPlacement,
  ResponseKind,
  type InquiryCheckpointTemplate,
  type InquiryFact,
  type InquiryOutputBlock,
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
// M2-Fakten-Katalog – erzeugen KEINEN Patiententext
// ---------------------------------------------------------------------------

/**
 * Katalog der M2-Klärfragen/Fakten für den AU-Assistenten.
 *
 * Facts sammeln Kontext für M3 (Prefill/Entscheidungshilfe).
 * Sie haben kein text-Feld und dürfen den Renderer nie direkt speisen.
 */
export const INQUIRY_FACT_CATALOG: Record<string, InquiryFact> = {

  AU_BACKDATE_IN_RANGE: {
    id: "AU_BACKDATE_IN_RANGE",
    label: "Rückdatierung im zulässigen Bereich",
    scope: InquiryCheckpointScope.SPECIFIC,
  },

  AU_DURATION_IN_RANGE: {
    id: "AU_DURATION_IN_RANGE",
    label: "Dauer im zulässigen Bereich",
    scope: InquiryCheckpointScope.SPECIFIC,
  },

  AU_PATIENT_KNOWN: {
    id: "AU_PATIENT_KNOWN",
    label: "Patient bekannt",
    scope: InquiryCheckpointScope.SPECIFIC,
  },

  IN_GERMANY: {
    id: "IN_GERMANY",
    label: "Aufenthaltsort Deutschland",
    scope: InquiryCheckpointScope.GLOBAL,
  },

  DOCTOR_ASSESSMENT_CONTEXT: {
    id: "DOCTOR_ASSESSMENT_CONTEXT",
    label: "Ärztliche Einschätzung erforderlich",
    scope: InquiryCheckpointScope.GLOBAL,
  },
};

// ---------------------------------------------------------------------------
// M3-Ausgabebausteine-Katalog – erzeugen Patiententext
// ---------------------------------------------------------------------------

/**
 * Katalog der M3-Ausgabebausteine für den AU-Assistenten sowie globale Aktionen.
 *
 * OutputBlocks werden vom Arzt/MFA explizit ausgewählt.
 * Sie enthalten direkt den Patiententext (kein textByStatus-Mapping).
 */
export const INQUIRY_OUTPUT_BLOCK_CATALOG: Record<string, InquiryOutputBlock> = {

  // ---- DECISION ----

  AU_DECISION_POSSIBLE: {
    id: "AU_DECISION_POSSIBLE",
    label: "AU – möglich",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Eine Arbeitsunfähigkeitsbescheinigung kann ausgestellt werden.",
  },

  AU_DECISION_NOT_POSSIBLE: {
    id: "AU_DECISION_NOT_POSSIBLE",
    label: "AU – nicht möglich",
    kind: InquiryCheckpointKind.DECISION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Eine Arbeitsunfähigkeitsbescheinigung kann nicht ausgestellt werden.",
  },

  // ---- SPECIFIC EXPLANATIONS ----

  AU_REASON_TOO_LATE: {
    id: "AU_REASON_TOO_LATE",
    label: "Begründung: Rückdatierung zu spät",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Eine rückwirkende Ausstellung ist nur begrenzt möglich. Der gewünschte Zeitraum liegt darüber hinaus.",
  },

  AU_INFO_KNOWN_PATIENT_5_DAYS: {
    id: "AU_INFO_KNOWN_PATIENT_5_DAYS",
    label: "Info: Bekannter Patient – bis 5 Tage",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Bei bekannten Beschwerden kann eine Arbeitsunfähigkeitsbescheinigung für bis zu fünf Tage ausgestellt werden.",
  },

  AU_INFO_NEW_PATIENT_3_DAYS: {
    id: "AU_INFO_NEW_PATIENT_3_DAYS",
    label: "Info: Neuer Patient – bis 3 Tage",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Bei neuen Patientinnen und Patienten kann eine Arbeitsunfähigkeitsbescheinigung zunächst nur für bis zu drei Tage ausgestellt werden.",
  },

  // ---- GLOBAL EXPLANATIONS ----

  AU_REASON_ABROAD: {
    id: "AU_REASON_ABROAD",
    label: "Begründung: Ausland",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Bestimmte Leistungen können wir nur durchführen, wenn sich die Person in Deutschland befindet.",
  },

  AU_REASON_DOCTOR_REQUIRED: {
    id: "AU_REASON_DOCTOR_REQUIRED",
    label: "Begründung: Ärztliche Einschätzung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    text: "Für dieses Anliegen ist eine ärztliche Einschätzung erforderlich.",
  },

  // ---- GLOBAL ACTIONS ----

  DIGITAL_REQUEST: {
    id: "DIGITAL_REQUEST",
    label: "Digitale Anfrage",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    text: "Die Anfrage kann über die digitale Anfrage gestellt werden.",
  },

  ONLINE_ANAMNESIS: {
    id: "ONLINE_ANAMNESIS",
    label: "Online-Anamnese",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    text: "Fehlende Angaben können über die Online-Anamnese ergänzt werden.",
  },

  BOOK_APPOINTMENT: {
    id: "BOOK_APPOINTMENT",
    label: "Termin buchen",
    kind: InquiryCheckpointKind.ACTION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
    text: "Termine können über den Online-Kalender vereinbart werden.",
  },
};
