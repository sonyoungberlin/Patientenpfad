import {
  InquiryType,
  DecisionStatus,
  ExplanationStatus,
  type InquiryProfile,
  type InquiryProfileV2,
} from "@/lib/inquiries/types";

/**
 * Statischer Profil-Katalog für den Anfrage-Assistenten.
 *
 * Jeder Eintrag definiert die Kernantwort und die geordnete Checkpoint-Liste
 * für einen Anfragetyp. Profile sind unveränderlich – bestehende Sessions
 * verwenden immer einen eingefrorenen Snapshot des Profils.
 */
export const INQUIRY_PROFILE_CATALOGUE: Record<InquiryType, InquiryProfile> = {
  [InquiryType.FSME_IMPFUNG]: {
    type: InquiryType.FSME_IMPFUNG,
    label: "FSME-Impfung",
    coreAnswer:
      "Vielen Dank für Ihre Anfrage. Ein Termin zur FSME-Impfung kann über unseren Online-Kalender gebucht werden.",
    checkpointIds: ["IC01", "IC02", "IC03", "IC04", "IC05", "IC06"],
  },
};

// ---------------------------------------------------------------------------
// Neuer Profil-Katalog (Architektur v2)
// ---------------------------------------------------------------------------

/**
 * Profil-Katalog nach der neuen Architektur.
 *
 * Jedes Profil bindet einen DECISION-Checkpoint, spezifische Checkpoints,
 * gebundene globale Checkpoints und verfügbare Aktionen.
 * Globale Checkpoints werden bei mehreren Anliegen in M2 nur einmal abgefragt.
 */
export const INQUIRY_PROFILE_CATALOG_V2: Record<string, InquiryProfileV2> = {
  AU: {
    id: "AU",
    label: "AU / Arbeitsunfähigkeitsbescheinigung",
    decisionCheckpointId: "AU_DECISION",
    specificCheckpointIds: [
      "AU_BACKDATE_LIMIT",
      "AU_WORK_ACCIDENT",
      "AU_CHILD_SICK",
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
  },

  PRESCRIPTION: {
    id: "PRESCRIPTION",
    label: "Rezept",
    decisionCheckpointId: "PRESCRIPTION_DECISION",
    specificCheckpointIds: [
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      "PRESCRIPTION_BTM_ADHS_RULES",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "PRESCRIPTION_GYN_EXCLUSIVITY",
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [
      "IS_CHRONIC_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
    ],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "E_RECIPE_USE",
      "PHARMACY_INFORMATION",
      "DOCUMENT_UPLOAD",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      PATIENT_NOT_IN_GERMANY: "Rezepte können in deutschen Apotheken zuverlässig eingelöst werden. Im Ausland kann die Einlösung eingeschränkt sein.",
      IS_CHRONIC_PATIENT: "Bei Dauermedikation sind regelmäßige Kontrolltermine vorgesehen.",
    },
    actionGuidanceRules: [
      // 1. DOCUMENT_UPLOAD empfehlen, wenn Facharztbericht erforderlich
      {
        id: "PRESCRIPTION_DOCUMENT_UPLOAD_RECOMMENDED",
        checkpointId: "DOCUMENT_UPLOAD",
        profileId: "PRESCRIPTION",
        when: {
          allOf: [
            { checkpointId: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // 2. E_RECIPE_USE empfehlen, wenn Entscheidung POSSIBLE und Kassenrezept möglich
      {
        id: "PRESCRIPTION_E_RECIPE_USE_RECOMMENDED",
        checkpointId: "E_RECIPE_USE",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.POSSIBLE,
          allOf: [
            { checkpointId: "PRESCRIPTION_STATUTORY_POSSIBLE", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // 3. E_RECIPE_USE standardmäßig ausblenden, wenn Entscheidung NOT_POSSIBLE
      {
        id: "PRESCRIPTION_E_RECIPE_USE_HIDDEN",
        checkpointId: "E_RECIPE_USE",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.NOT_POSSIBLE,
        },
        hint: "hiddenByDefault",
      },
      // 4. PHARMACY_INFORMATION empfehlen, wenn Entscheidung POSSIBLE
      {
        id: "PRESCRIPTION_PHARMACY_INFORMATION_RECOMMENDED",
        checkpointId: "PHARMACY_INFORMATION",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.POSSIBLE,
        },
        hint: "recommended",
      },
      // 5. BOOK_APPOINTMENT mit Vorsichtshinweis bei BTM/ADHS-Regeln oder gynäkologischer Exklusivität
      {
        id: "PRESCRIPTION_BOOK_APPOINTMENT_CAUTION",
        checkpointId: "BOOK_APPOINTMENT",
        profileId: "PRESCRIPTION",
        when: {
          anyOf: [
            { checkpointId: "PRESCRIPTION_BTM_ADHS_RULES", status: ExplanationStatus.YES },
            { checkpointId: "PRESCRIPTION_GYN_EXCLUSIVITY", status: ExplanationStatus.YES },
          ],
        },
        hint: "caution",
        hintText: "Dieses Anliegen liegt möglicherweise im Zuständigkeitsbereich eines Spezialisten. Ein Termin in der Hausarztpraxis hilft ggf. nicht weiter.",
      },
      // 6. DIGITAL_REQUEST sichtbar schalten wenn Entscheidung NOT_POSSIBLE
      {
        id: "PRESCRIPTION_DIGITAL_REQUEST_VISIBLE",
        checkpointId: "DIGITAL_REQUEST",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.NOT_POSSIBLE,
        },
        hint: "visible",
      },
      // 7. BOOK_APPOINTMENT sichtbar schalten wenn Entscheidung NOT_POSSIBLE
      {
        id: "PRESCRIPTION_BOOK_APPOINTMENT_VISIBLE",
        checkpointId: "BOOK_APPOINTMENT",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.NOT_POSSIBLE,
        },
        hint: "visible",
      },
      // 8. PROCESSING_DELAY sichtbar schalten wenn Entscheidung NOT_POSSIBLE
      {
        id: "PRESCRIPTION_PROCESSING_DELAY_VISIBLE",
        checkpointId: "PROCESSING_DELAY",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.NOT_POSSIBLE,
        },
        hint: "visible",
      },
      // 9. TECHNICAL_ISSUE sichtbar schalten wenn Entscheidung NOT_POSSIBLE
      {
        id: "PRESCRIPTION_TECHNICAL_ISSUE_VISIBLE",
        checkpointId: "TECHNICAL_ISSUE",
        profileId: "PRESCRIPTION",
        when: {
          decisionStatus: DecisionStatus.NOT_POSSIBLE,
        },
        hint: "visible",
      },
    ],
  },

  LAB: {
    id: "LAB",
    label: "Labor",
    decisionCheckpointId: "LAB_DECISION",
    specificCheckpointIds: [
      "LAB_SELF_PAYER_IGEL",
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    boundActionCheckpointIds: [
      "LAB_FASTING_REQUIRED",
    ],
    availableActionIds: [
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "URINE_SAMPLE_ONSITE",
    ],
  },

  SAMPLE_COLLECTION: {
    id: "SAMPLE_COLLECTION",
    label: "Urin- und Stuhlprobe",
    decisionCheckpointId: "SAMPLE_COLLECTION_DECISION",
    specificCheckpointIds: [
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    boundActionCheckpointIds: [
      "URINE_SAMPLE_INSTRUCTIONS",
      "STOOL_SAMPLE_INSTRUCTIONS",
      "SAMPLE_HANDOVER",
      "LAB_RESULT_TIME",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {},
  },

  ACUTE_CARE: {
    id: "ACUTE_CARE",
    label: "Akuttermin / offene Sprechstunde",
    decisionCheckpointId: "ACUTE_CARE_DECISION",
    specificCheckpointIds: [
      "ACUTE_PURPOSE",
      "ACUTE_EXCLUSION",
      "ACUTE_APPOINTMENT_INFO",
      "ACUTE_OPEN_CONSULTATION_INFO",
      "CHRONIC_EXCLUSION",
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [
      "INFECTIOUS_PROTOCOL",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      INFECTIOUS_PROTOCOL:
        "Bei Verdacht auf eine ansteckende Erkrankung melden Sie sich bitte vorab digital oder wählen Sie eine Videosprechstunde und kommen nicht unangemeldet in die Praxis.",
    },
  },

  REFERRAL: {
    id: "REFERRAL",
    label: "Überweisung",
    decisionCheckpointId: "REFERRAL_DECISION",
    specificCheckpointIds: [
      "MEDICAL_CONSULTATION_REQUIRED",
      "REF_PSYCHOTHERAPY_FIRST_STEP",
    ],
    boundGlobalCheckpointIds: [],
    boundActionCheckpointIds: [
      "REF_BOOKING_CODE_PROCESS",
      "REF_ORIGINAL_VS_PDF",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
  },
};
