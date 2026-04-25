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
    textByStatus: {
      [DecisionStatus.POSSIBLE]:
        "Eine Arbeitsunfähigkeitsbescheinigung kann ausgestellt werden.",
      [DecisionStatus.NOT_POSSIBLE]:
        "Eine Arbeitsunfähigkeitsbescheinigung kann nicht ausgestellt werden.",
    },
  },

  // ---- SPECIFIC EXPLANATIONS ----

  AU_BACKDATE_ALLOWED: {
    id: "AU_BACKDATE_ALLOWED",
    label: "Rückdatierung",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.NO]:
        "Eine rückwirkende Ausstellung ist nur begrenzt möglich. Der gewünschte Zeitraum liegt darüber hinaus.",
      [ExplanationStatus.UNKNOWN]:
        "Für die Prüfung benötigen wir den genauen Zeitraum der gewünschten Arbeitsunfähigkeit.",
    },
  },

  AU_DURATION_ALLOWED: {
    id: "AU_DURATION_ALLOWED",
    label: "Zulässige Dauer",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.NO]:
        "Eine Arbeitsunfähigkeitsbescheinigung kann nur für einen begrenzten Zeitraum ausgestellt werden.",
      [ExplanationStatus.UNKNOWN]:
        "Für die Prüfung benötigen wir den gewünschten Zeitraum der Arbeitsunfähigkeit.",
    },
  },

  AU_PATIENT_KNOWN: {
    id: "AU_PATIENT_KNOWN",
    label: "Patient bekannt",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.SPECIFIC,
    placement: InquiryCheckpointPlacement.ATTACHED,
    textByStatus: {
      [ExplanationStatus.YES]:
        "Bei bekannten Beschwerden kann eine Arbeitsunfähigkeitsbescheinigung für bis zu fünf Tage ausgestellt werden.",
      [ExplanationStatus.NO]:
        "Bei neuen Patientinnen und Patienten kann eine Arbeitsunfähigkeitsbescheinigung zunächst nur für bis zu drei Tage ausgestellt werden.",
      [ExplanationStatus.UNKNOWN]:
        "Für die Einschätzung ist wichtig, ob bereits eine Behandlung in unserer Praxis erfolgt ist.",
    },
  },

  // ---- GLOBAL EXPLANATIONS ----

  IN_GERMANY: {
    id: "IN_GERMANY",
    label: "Aufenthaltsort Deutschland",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Befindet sich die Person aktuell in Deutschland?",
    textByStatus: {},
  },

  DOCTOR_ASSESSMENT_REQUIRED: {
    id: "DOCTOR_ASSESSMENT_REQUIRED",
    label: "Ärztliche Einschätzung erforderlich",
    kind: InquiryCheckpointKind.EXPLANATION,
    scope: InquiryCheckpointScope.GLOBAL,
    placement: InquiryCheckpointPlacement.ATTACHED,
    question: "Ist für dieses Anliegen eine ärztliche Einschätzung erforderlich?",
    textByStatus: {},
  },

  // ---- GLOBAL ACTIONS ----

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
};
