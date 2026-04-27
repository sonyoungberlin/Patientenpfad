import {
  InquiryType,
  DecisionStatus,
  ExplanationStatus,
  type InquiryProfile,
  type InquiryProfileV2,
  type CommunicationReason,
  type ResponseGoal,
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_AU_INITIAL",
        label: "AU erstmalig anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_AU_EXTENSION",
        label: "AU verlängern",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_AU_BACKDATE",
        label: "Rückwirkende AU anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_TIME_LIMIT",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_AU_CLARIFICATION",
        label: "Rückfrage zu AU",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_AU_ISSUED",
        label: "AU wurde ausgestellt",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_AU_DECLINED",
        label: "AU kann nicht ausgestellt werden",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_TIME_LIMIT",
          "ISSUE_BLOCKED_EXTERNAL",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "AU ausgestellt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_TIME_LIMIT",
        label: "Rückdatierung / Fristgrenze",
        relevantSpecificRoles: ["RULE_TIME_LIMIT"],
        relevantActionGuidanceIds: ["AU_BOOK_APPOINTMENT_VISIBLE"],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: ["AU_BOOK_APPOINTMENT_VISIBLE"],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: ["AU_DIGITAL_REQUEST_VISIBLE"],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [
          "AU_BOOK_APPOINTMENT_VISIBLE",
          "AU_DIGITAL_REQUEST_VISIBLE",
        ],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / digitale AU erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: ["AU_DIGITAL_REQUEST_VISIBLE"],
      },
    ] satisfies ResponseGoal[],
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_RENEWAL",
        label: "Wiederverordnung Dauermedikation",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_NEW_PRESCRIPTION",
        label: "Neuverordnung / erstmaliges Präparat",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_MISSING_DOC",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_PRESCRIPTION_CLARIFICATION",
        label: "Rückfrage zu ausgestelltem oder abgelehntem Rezept",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_MISSING_DOC",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_DELIVERY_FORMAT",
        label: "Frage zu eRezept / Apotheke / Zustellweg",
        direction: "INCOMING",
        suggestedResponseGoalIds: ["PROCESS_EXPLAINED"],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_RECIPE_READY_INFO",
        label: "Rezept liegt bereit / wurde ausgestellt",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "ISSUE_BLOCKED_MISSING_DOC",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
      {
        id: "OUT_PRACTICE_CLARIFICATION",
        label: "Praxis klärt organisatorisch nach",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_DOC",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "PROCESS_EXPLAINED",
        ],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Rezept ausgestellt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_E_RECIPE_USE_RECOMMENDED",
          "PRESCRIPTION_PHARMACY_INFORMATION_RECOMMENDED",
        ],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_BOOK_APPOINTMENT_CAUTION",
          "PRESCRIPTION_BOOK_APPOINTMENT_VISIBLE",
          "PRESCRIPTION_DIGITAL_REQUEST_VISIBLE",
        ],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_DOC",
        label: "Unterlagen oder Nachweis fehlen",
        relevantSpecificRoles: ["MISSING_DOCUMENT"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_DOCUMENT_UPLOAD_RECOMMENDED",
          "PRESCRIPTION_DIGITAL_REQUEST_VISIBLE",
        ],
      },
      {
        id: "ISSUE_BLOCKED_COST_COVERAGE",
        label: "Kassenleistung / Privatrezept / Kostenklärung",
        relevantSpecificRoles: ["RULE_COST_COVERAGE"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_DIGITAL_REQUEST_VISIBLE",
          "PRESCRIPTION_BOOK_APPOINTMENT_VISIBLE",
        ],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "eRezept / Apotheke / Zustellweg erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_E_RECIPE_USE_RECOMMENDED",
          "PRESCRIPTION_PHARMACY_INFORMATION_RECOMMENDED",
        ],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [
          "PRESCRIPTION_BOOK_APPOINTMENT_VISIBLE",
          "PRESCRIPTION_DIGITAL_REQUEST_VISIBLE",
        ],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_LAB_INITIAL",
        label: "Laboruntersuchung anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_LAB_CLARIFICATION",
        label: "Rückfrage zu Laborauftrag oder Befund",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_LAB_ORDERED",
        label: "Labor wurde veranlasst",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_LAB_DECLINED",
        label: "Labor kann nicht veranlasst werden",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Labor wurde veranlasst",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_COST_COVERAGE",
        label: "Selbstzahler / keine Kassenleistung",
        relevantSpecificRoles: ["RULE_COST_COVERAGE"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / Vorbereitung erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_SAMPLE_INITIAL",
        label: "Probenabgabe anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_SAMPLE_CLARIFICATION",
        label: "Rückfrage zu Ablauf / Vorbereitung / Befund",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_SAMPLE_ORDERED",
        label: "Probe wurde veranlasst / Abgabe bestätigt",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Probe veranlasst / Abgabe bestätigt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / Vorbereitung / Probe erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_ACUTE_INITIAL",
        label: "Akuttermin / offene Sprechstunde anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
      {
        id: "REQ_ACUTE_CLARIFICATION",
        label: "Rückfrage zu Akutsprechstunde / Ablauf",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_ACUTE_OFFERED",
        label: "Akuttermin / offene Sprechstunde angeboten",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis benötigt weitere Informationen zu den Beschwerden",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Akuttermin möglich / angeboten",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Andere Terminart / anderer Weg erforderlich",
        relevantSpecificRoles: ["CHANNEL_NOT_SUITABLE", "EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf Akutsprechstunde / offene Sprechstunde erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
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

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_REFERRAL_INITIAL",
        label: "Überweisung anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_REFERRAL_CLARIFICATION",
        label: "Rückfrage zu Überweisung / Prozess / Befund",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_REFERRAL_ISSUED",
        label: "Überweisung wurde ausgestellt / liegt bereit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Überweisung ausgestellt / liegt bereit",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Buchungscode / digital vs. Original / Psychotherapie erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  IMMUNIZATION: {
    id: "IMMUNIZATION",
    label: "Impfung",
    decisionCheckpointId: "IMMUNIZATION_DECISION",
    specificCheckpointIds: [
      "IMMUNIZATION_STATUS_UNCLEAR",
      "IMMUNIZATION_PASS_MISSING",
      "IMMUNIZATION_TRAVEL_MEDICINE",
      "IMMUNIZATION_RISK_REVIEW_REQUIRED",
      "MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "ONLINE_ANAMNESIS",
      "DIGITAL_REQUEST",
    ],

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_IMMUNIZATION_INITIAL",
        label: "Impfung anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_IMMUNIZATION_CLARIFICATION",
        label: "Rückfrage zu Impfung / Impfstatus / Ablauf",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_IMMUNIZATION_OFFERED",
        label: "Impfung möglich / Termin anbieten",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: ["ISSUE_BLOCKED_EXTERNAL"],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Impfung möglich / wird durchgeführt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe / andere Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben / Impfstatus unklar",
        relevantSpecificRoles: ["MISSING_INFORMATION", "MISSING_DOCUMENT"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / Vorbereitung / Impfung erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },
};
