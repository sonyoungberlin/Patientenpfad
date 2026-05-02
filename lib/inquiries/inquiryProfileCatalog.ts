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
    displayOrder: 30,
    decisionCheckpointId: "AU_DECISION",
    specificCheckpointIds: [
      "AU_BACKDATE_LIMIT",
      "AU_NEW_PATIENT_LIMIT",
      "AU_MISSING_EGK",
      "AU_MISSING_QUESTIONNAIRE",
      "AU_WORK_ACCIDENT",
      "AU_CHILD_SICK",
      "AU_DIGITAL_AU_PROCESS",
      "AU_NO_APPOINTMENT_ACUTE",
      "AU_MEDICAL_CONSULTATION_REQUIRED",
      "AU_FOLLOWUP",
    ],
    boundGlobalCheckpointIds: [],
    // Kein globalHints-Override nötig.
    globalHints: {},
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    boundActionCheckpointIds: [
      "AU_NEW_PATIENT_3DAY_LIMIT",
      "AU_FOLLOWUP_REQUIRES_VISIT",
      "DIGITAL_REQUEST",
      "DIGITAL_REQUEST_PROCESSING_TIME",
      "DIGITAL_REQUEST_REQUIRED",
      "ACUTE_OPEN_CONSULTATION_ACTION",
      "CARE_CHANNEL_CHOICE",
      "CONTROL_APPOINTMENT_RECOMMENDED",
    ],
    boundActionConditions: {
      AU_NEW_PATIENT_3DAY_LIMIT: {
        showWhenAny: [{ AU_NEW_PATIENT_LIMIT: "YES" }],
      },
      AU_FOLLOWUP_REQUIRES_VISIT: {
        showWhenAny: [{ AU_NEW_PATIENT_LIMIT: "YES" }],
      },
      DIGITAL_REQUEST: {
        showWhenAny: [{ AU_DIGITAL_AU_PROCESS: "YES" }, { AU_NO_APPOINTMENT_ACUTE: "YES" }],
      },
      DIGITAL_REQUEST_PROCESSING_TIME: {
        showWhenAny: [{ AU_DIGITAL_AU_PROCESS: "YES" }, { AU_NO_APPOINTMENT_ACUTE: "YES" }],
      },
      DIGITAL_REQUEST_REQUIRED: {
        hideWhenAny: [],
      },
      ACUTE_OPEN_CONSULTATION_ACTION: {
        showWhenAny: [{ AU_NO_APPOINTMENT_ACUTE: "YES" }],
      },
      CARE_CHANNEL_CHOICE: {
        hideWhenAny: [],
      },
      CONTROL_APPOINTMENT_RECOMMENDED: {
        hideWhenAny: [],
      },
    },

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
    displayOrder: 40,
    decisionCheckpointId: "PRESCRIPTION_DECISION",
    specificCheckpointIds: [
      "PRESCRIPTION_BTM_ADHS_RULES",
      "PRESCRIPTION_GYN_EXCLUSIVITY",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "HOSPITAL_DISCHARGE_REPORT_MISSING",
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      "PRESCRIPTION_PRIVATE_ONLY",
      "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
      "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
      "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
      "PRESCRIPTION_CHRONIC_PATIENT",
      "PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "BOOK_APPOINTMENT",
      "PHARMACY_INFORMATION",
      "DOCUMENT_UPLOAD",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "CONTROL_APPOINTMENT_RECOMMENDED",
    ],
    boundActionCheckpointIds: [
      "E_RECIPE_USE",
      "DIGITAL_REQUEST_REQUIRED",
    ],
    boundActionConditions: {
      E_RECIPE_USE: {
        showWhenAny: [{ PRESCRIPTION_STATUTORY_POSSIBLE: "YES" }],
      },
      DIGITAL_REQUEST_REQUIRED: {
        hideWhenAny: [],
      },
    },
    globalHints: {},
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
      // 10. CONTROL_APPOINTMENT_RECOMMENDED empfehlen, wenn chronische Erkrankung / Dauermedikation
      {
        id: "PRESCRIPTION_CONTROL_APPOINTMENT_RECOMMENDED",
        checkpointId: "CONTROL_APPOINTMENT_RECOMMENDED",
        profileId: "PRESCRIPTION",
        when: {
          allOf: [
            { checkpointId: "PRESCRIPTION_CHRONIC_PATIENT", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
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
    displayOrder: 80,
    decisionCheckpointId: "LAB_DECISION",
    specificCheckpointIds: [
      "LAB_MPU_EXCLUSION",
      "LAB_EXTERNAL_REFERRAL",
      "LAB_INTERNAL_ORDER",
      "LAB_MEDICAL_CONSULTATION_REQUIRED",
      "LAB_CHECKUP_RULES",
      "BILLING_COST_NOT_COVERED",
      "APPOINTMENT_DATA_INCOMPLETE",
    ],
    boundGlobalCheckpointIds: [],
    // Kein globalHints-Override nötig.
    globalHints: {},
    boundActionCheckpointIds: [
      "LAB_APPOINTMENT_INTERNAL",
      "LAB_APPOINTMENT_CHECKUP",
      "LAB_APPOINTMENT_INDIVIDUAL",
      "LAB_APPOINTMENT_DOCTOR",
      "LAB_BRING_REFERRAL",
      "LAB_COST_COVERED_BY_REFERRAL",
      "LAB_SELF_PAYER_NOTE",
      "LAB_FASTING_REQUIRED",
      "LAB_RESULT_TIME",
    ],
    boundActionConditions: {
      LAB_APPOINTMENT_INTERNAL: {
        showWhenAny: [{ LAB_INTERNAL_ORDER: "YES" }],
        hideWhenAny: [{ LAB_CHECKUP_RULES: "YES" }],
      },
      LAB_APPOINTMENT_CHECKUP: {
        showWhenAny: [{ LAB_CHECKUP_RULES: "YES" }],
      },
      LAB_APPOINTMENT_INDIVIDUAL: {
        hideWhenAny: [{ LAB_INTERNAL_ORDER: "YES" }],
      },
      LAB_APPOINTMENT_DOCTOR: {
        hideWhenAny: [
          { LAB_INTERNAL_ORDER: "YES" },
          { LAB_EXTERNAL_REFERRAL: "YES" },
        ],
      },
      LAB_BRING_REFERRAL: {
        showWhenAny: [{ LAB_EXTERNAL_REFERRAL: "YES" }],
      },
      LAB_COST_COVERED_BY_REFERRAL: {
        showWhenAny: [{ LAB_EXTERNAL_REFERRAL: "YES" }],
      },
      LAB_SELF_PAYER_NOTE: {
        hideWhenAny: [
          { LAB_INTERNAL_ORDER: "YES" },
          { LAB_EXTERNAL_REFERRAL: "YES" },
        ],
      },
      // LAB_FASTING_REQUIRED: immer in M3 anzeigen, ohne M2-Schalter.
      // Ausnahme: bei MPU/forensischem Ausschluss nicht anzeigen.
      LAB_FASTING_REQUIRED: {
        hideWhenAny: [{ LAB_MPU_EXCLUSION: "YES" }],
      },
      // LAB_RESULT_TIME: immer in M3 anzeigen, ohne M2-Schalter.
      // Befundübermittlung / Auswertungsdauer ist profiltypisch und nicht fallabhängig.
      // Ausnahme: bei MPU/forensischem Ausschluss nicht anzeigen.
      LAB_RESULT_TIME: {
        hideWhenAny: [{ LAB_MPU_EXCLUSION: "YES" }],
      },
    },
    availableActionIds: [
      "DIGITAL_REQUEST",
      "BOOK_APPOINTMENT",
      "URINE_SAMPLE_ONSITE",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
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
    displayOrder: 90,
    decisionCheckpointId: "SAMPLE_COLLECTION_DECISION",
    specificCheckpointIds: ["SAMPLE_COLLECTION_ORDER_AVAILABLE"],
    boundGlobalCheckpointIds: [],
    globalHints: {},
    boundActionCheckpointIds: [
      "URINE_SAMPLE_INSTRUCTIONS",
      "STOOL_SAMPLE_INSTRUCTIONS",
      "SAMPLE_HANDOVER",
    ],
    availableActionIds: [
      "DIGITAL_REQUEST",
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
    displayOrder: 10,
    decisionCheckpointId: "ACUTE_CARE_DECISION",
    specificCheckpointIds: [
      "ACUTE_EXCLUSION",
      "CHRONIC_EXCLUSION",
      "ACUTE_PURPOSE",
      "ACUTE_APPOINTMENT_INFO",
    ],
    boundGlobalCheckpointIds: [
      "INFECTIOUS_PROTOCOL",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {},
    boundActionCheckpointIds: [
      "ACUTE_OPEN_CONSULTATION_ACTION",
      "ACUTE_BOOKING_INFO",
      "CARE_CHANNEL_CHOICE",
      "INFECTIOUS_CONTACT_DIGITALLY",
      "INFECTIOUS_VIDEO_CONSULTATION",
      "INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED",
    ],
    boundActionConditions: {
      ACUTE_OPEN_CONSULTATION_ACTION: {
        hideWhenAny: [],
      },
      ACUTE_BOOKING_INFO: {
        showWhenAny: [{ ACUTE_APPOINTMENT_INFO: "YES" }],
      },
      CARE_CHANNEL_CHOICE: {
        hideWhenAny: [],
      },
      INFECTIOUS_CONTACT_DIGITALLY: {
        showWhenAny: [{ INFECTIOUS_PROTOCOL: "YES" }],
      },
      INFECTIOUS_VIDEO_CONSULTATION: {
        showWhenAny: [{ INFECTIOUS_PROTOCOL: "YES" }],
      },
      INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED: {
        showWhenAny: [{ INFECTIOUS_PROTOCOL: "YES" }],
      },
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
    displayOrder: 60,
    decisionCheckpointId: "REFERRAL_DECISION",
    specificCheckpointIds: [
      "REFERRAL_CAN_BE_ISSUED",
      "REF_SPECIALTY_REQUIRED",
      "REF_PSYCHOTHERAPY_FIRST_STEP",
      "REF_HAV_CASE",
      "REF_MEDICAL_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    // Kein globalHints-Override nötig.
    globalHints: {},
    boundActionCheckpointIds: [
      "REF_BOOKING_CODE_PROCESS",
      "REF_ORIGINAL_VS_PDF",
      "DIGITAL_REQUEST_REQUIRED",
    ],
    boundActionConditions: {
      // REF_ORIGINAL_VS_PDF: immer in M3 anzeigen, ohne M2-Schalter.
      // Hinweis zu digitaler vs. Original-Überweisung gilt für jede ausgestellte Überweisung.
      REF_ORIGINAL_VS_PDF: {
        hideWhenAny: [],
      },
      // REF_BOOKING_CODE_PROCESS: nur anzeigen, wenn Hausarztvermittlungsfall (mit Buchungscode).
      REF_BOOKING_CODE_PROCESS: {
        showWhenAny: [{ REF_HAV_CASE: "YES" }],
      },
      DIGITAL_REQUEST_REQUIRED: {
        hideWhenAny: [],
      },
    },
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "DOCUMENT_UPLOAD",
      "DIGITAL_REQUEST",
    ],

    actionGuidanceRules: [
      // 1. DIGITAL_REQUEST empfehlen, wenn Angaben fehlen (Fachrichtung nicht angegeben)
      {
        id: "REF_DIGITAL_REQUEST_RECOMMENDED",
        checkpointId: "DIGITAL_REQUEST",
        profileId: "REFERRAL",
        when: {
          allOf: [
            { checkpointId: "REF_SPECIALTY_REQUIRED", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // 2. BOOK_APPOINTMENT sichtbar schalten, wenn ärztliche Einschätzung erforderlich
      {
        id: "REF_BOOK_APPOINTMENT_VISIBLE",
        checkpointId: "BOOK_APPOINTMENT",
        profileId: "REFERRAL",
        when: {
          allOf: [
            { checkpointId: "REF_MEDICAL_CONSULTATION_REQUIRED", status: ExplanationStatus.YES },
          ],
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
        relevantActionGuidanceIds: ["REF_DIGITAL_REQUEST_RECOMMENDED"],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Einschätzung erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: ["REF_BOOK_APPOINTMENT_VISIBLE"],
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

  HOSPITAL_ADMISSION: {
    id: "HOSPITAL_ADMISSION",
    label: "Krankenhauseinweisung",
    displayOrder: 65,
    decisionCheckpointId: "HOSPITAL_ADMISSION_DECISION",
    specificCheckpointIds: [
      "HOSPITAL_ADMISSION_CAN_BE_ISSUED",
      "HOSPITAL_ADMISSION_MISSING_INFO",
      "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED",
      "HOSPITAL_TRANSPORT_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    globalHints: {},
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "DIGITAL_REQUEST",
      "DOCUMENT_UPLOAD",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    boundActionCheckpointIds: [
      "DIGITAL_REQUEST_REQUIRED",
      "CONTROL_APPOINTMENT_RECOMMENDED",
      "TRANSPORT_QUESTIONNAIRE_REQUEST",
    ],
    boundActionConditions: {
      DIGITAL_REQUEST_REQUIRED: {
        hideWhenAny: [],
      },
      CONTROL_APPOINTMENT_RECOMMENDED: {
        hideWhenAny: [],
      },
      TRANSPORT_QUESTIONNAIRE_REQUEST: {
        hideWhenAny: [],
      },
    },

    actionGuidanceRules: [
      // 1. DIGITAL_REQUEST empfehlen, wenn Angaben zur Einweisung fehlen
      {
        id: "HOSP_DIGITAL_REQUEST_RECOMMENDED",
        checkpointId: "DIGITAL_REQUEST",
        profileId: "HOSPITAL_ADMISSION",
        when: {
          allOf: [
            { checkpointId: "HOSPITAL_ADMISSION_MISSING_INFO", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // 2. DOCUMENT_UPLOAD sichtbar schalten, wenn Angaben fehlen
      {
        id: "HOSP_DOCUMENT_UPLOAD_VISIBLE",
        checkpointId: "DOCUMENT_UPLOAD",
        profileId: "HOSPITAL_ADMISSION",
        when: {
          allOf: [
            { checkpointId: "HOSPITAL_ADMISSION_MISSING_INFO", status: ExplanationStatus.YES },
          ],
        },
        hint: "visible",
      },
      // 3. BOOK_APPOINTMENT sichtbar schalten, wenn ärztliche Konsultation erforderlich
      {
        id: "HOSP_BOOK_APPOINTMENT_VISIBLE",
        checkpointId: "BOOK_APPOINTMENT",
        profileId: "HOSPITAL_ADMISSION",
        when: {
          allOf: [
            { checkpointId: "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED", status: ExplanationStatus.YES },
          ],
        },
        hint: "visible",
      },
      // 4. CONTROL_APPOINTMENT_RECOMMENDED empfehlen, wenn ärztliche Konsultation erforderlich
      {
        id: "HOSP_CONTROL_APPOINTMENT_RECOMMENDED",
        checkpointId: "CONTROL_APPOINTMENT_RECOMMENDED",
        profileId: "HOSPITAL_ADMISSION",
        when: {
          allOf: [
            { checkpointId: "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // 5. TRANSPORT_QUESTIONNAIRE_REQUEST empfehlen, wenn Krankentransport erforderlich
      {
        id: "HOSP_TRANSPORT_QUESTIONNAIRE_RECOMMENDED",
        checkpointId: "TRANSPORT_QUESTIONNAIRE_REQUEST",
        profileId: "HOSPITAL_ADMISSION",
        when: {
          allOf: [
            { checkpointId: "HOSPITAL_TRANSPORT_REQUIRED", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
    ],

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_HOSPITAL_ADMISSION_INITIAL",
        label: "Krankenhauseinweisung anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "REQ_HOSPITAL_ADMISSION_CLARIFICATION",
        label: "Rückfrage zur Krankenhauseinweisung / Transport",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_HOSPITAL_ADMISSION_ISSUED",
        label: "Krankenhauseinweisung wurde ausgestellt",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_CONFIRMED",
        label: "Krankenhauseinweisung ausgestellt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION"],
        relevantActionGuidanceIds: ["HOSP_DIGITAL_REQUEST_RECOMMENDED", "HOSP_DOCUMENT_UPLOAD_VISIBLE"],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Ärztliche Konsultation erforderlich",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: ["HOSP_BOOK_APPOINTMENT_VISIBLE", "HOSP_CONTROL_APPOINTMENT_RECOMMENDED"],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / Transport erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  IMMUNIZATION: {
    id: "IMMUNIZATION",
    label: "Impfung",
    displayOrder: 70,
    decisionCheckpointId: "IMMUNIZATION_DECISION",
    specificCheckpointIds: [
      "IMMUNIZATION_STANDARD_AVAILABLE",
      "IMMUNIZATION_RISK_REVIEW_REQUIRED",
      "IMMUNIZATION_STATUS_UNCLEAR",
      "IMMUNIZATION_VACCINATION_RECORD_MISSING",
      "IMMUNIZATION_TRAVEL_MEDICINE",
    ],
    boundGlobalCheckpointIds: [],
    globalHints: {},
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "DIGITAL_REQUEST",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "DOCUMENT_UPLOAD",
    ],
    boundActionCheckpointIds: [
      "IMMUNIZATION_BOOK_VACCINATION",
      "IMMUNIZATION_BOOK_COUNSELING",
      "IMMUNIZATION_BRING_VACCINATION_RECORD",
    ],
    boundActionConditions: {
      IMMUNIZATION_BOOK_VACCINATION: {
        showWhenAny: [{ IMMUNIZATION_STANDARD_AVAILABLE: "YES" }],
      },
      IMMUNIZATION_BOOK_COUNSELING: {
        showWhenAny: [{ IMMUNIZATION_RISK_REVIEW_REQUIRED: "YES" }],
      },
      IMMUNIZATION_BRING_VACCINATION_RECORD: {
        hideWhenAny: [{ IMMUNIZATION_TRAVEL_MEDICINE: "YES" }],
      },
    },

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

  APPOINTMENT: {
    id: "APPOINTMENT",
    label: "Termin",
    displayOrder: 20,
    decisionCheckpointId: "",
    specificCheckpointIds: [
      "APPOINTMENT_CAN_BE_BOOKED",
      "APPOINTMENT_CANCEL_OR_RESCHEDULE",
      "APPOINTMENT_WRONG_TYPE",
      "APPOINTMENT_BOOKING_CODE_REQUIRED",
      "APPOINTMENT_DATA_INCOMPLETE",
    ],
    boundGlobalCheckpointIds: [],
    globalHints: {},
    availableActionIds: [
      "DIGITAL_REQUEST",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    boundActionCheckpointIds: [
      "ACUTE_OPEN_CONSULTATION_ACTION",
      "BOOK_APPOINTMENT",
      "APPOINTMENT_BOOK_FINDINGS_REVIEW",
      "APPOINTMENT_BOOK_CHECKUP_SECOND",
      "APPOINTMENT_BOOK_CHRONIC_CONTROL",
      "APPOINTMENT_BOOK_GENERAL",
    ],
    boundActionConditions: {
      ACUTE_OPEN_CONSULTATION_ACTION: {
        hideWhenAny: [],
      },
      BOOK_APPOINTMENT: {
        showWhenAny: [{ APPOINTMENT_WRONG_TYPE: "YES" }],
      },
      APPOINTMENT_BOOK_FINDINGS_REVIEW: {
        showWhenAny: [{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }],
      },
      APPOINTMENT_BOOK_CHECKUP_SECOND: {
        showWhenAny: [{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }],
      },
      APPOINTMENT_BOOK_CHRONIC_CONTROL: {
        showWhenAny: [{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }],
      },
    },

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_APPOINTMENT_INITIAL",
        label: "Termin anfragen / Terminart unklar",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_APPOINTMENT_CLARIFICATION",
        label: "Rückfrage zu Termin / Ablauf",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_WRONG_APPOINTMENT",
        label: "Falscher Termin gebucht / unsicher",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_APPOINTMENT_OFFERED",
        label: "Passender Termin vorgeschlagen",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_APPOINTMENT_RESCHEDULE",
        label: "Termin muss geändert werden",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
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
        label: "Termin passt / wird bestätigt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Falscher Termintyp / falsche Zuständigkeit",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY", "CHANNEL_NOT_SUITABLE"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben fehlen / Daten unvollständig",
        relevantSpecificRoles: ["MISSING_INFORMATION", "MISSING_DOCUMENT"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Arzt muss Terminart oder Ablauf entscheiden",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf / Vorbereitung / Terminart erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  TECH_SUPPORT: {
    id: "TECH_SUPPORT",
    label: "Technische Probleme / Digitale Infrastruktur",
    displayOrder: 120,
    decisionCheckpointId: "",
    specificCheckpointIds: [
      "TECH_VIDEO_NOT_WORKING",
      "TECH_UPLOAD_FAILED",
      "TECH_LOGIN_PROBLEM",
      "TECH_PROCESS_INSTRUCTION",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    boundActionCheckpointIds: [
      "TECH_VIDEO_NOT_WORKING_ACTION",
      "TECH_UPLOAD_FAILED_ACTION",
      "TECH_LOGIN_PROBLEM_ACTION",
      "TECH_PROCESS_INSTRUCTION_ACTION",
    ],
    boundActionConditions: {
      TECH_VIDEO_NOT_WORKING_ACTION: {
        showWhenAny: [{ TECH_VIDEO_NOT_WORKING: "YES" }],
      },
      TECH_UPLOAD_FAILED_ACTION: {
        showWhenAny: [{ TECH_UPLOAD_FAILED: "YES" }],
      },
      TECH_LOGIN_PROBLEM_ACTION: {
        showWhenAny: [{ TECH_LOGIN_PROBLEM: "YES" }],
      },
      TECH_PROCESS_INSTRUCTION_ACTION: {
        showWhenAny: [{ TECH_PROCESS_INSTRUCTION: "YES" }],
      },
    },

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_TECH_SUPPORT_INITIAL",
        label: "Technisches Problem / Zugang funktioniert nicht",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
      {
        id: "REQ_TECH_SUPPORT_CLARIFICATION",
        label: "Rückfrage zu Nutzung / Technik",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_TECH_INSTRUCTION",
        label: "Praxis erklärt technischen Ablauf",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_TECH_LIMITATION",
        label: "Technische Nutzung nicht möglich / eingeschränkt",
        direction: "OUTGOING",
        // Hinweis: ISSUE_BLOCKED_EXTERNAL bedeutet hier nicht "externe Zuständigkeit",
        // sondern "digitaler Kanal technisch nicht nutzbar / alternativer Weg nötig"
        // (→ CHANNEL_NOT_SUITABLE). Bewusste pragmatische Nutzung des Core-Goals.
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "PROCESS_EXPLAINED",
        label: "Anleitung / Nutzung erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
      // Hinweis: ISSUE_BLOCKED_EXTERNAL wird hier semantisch als "digitaler Kanal
      // technisch nicht nutzbar / alternativer Weg nötig" genutzt (SpecificRole:
      // CHANNEL_NOT_SUITABLE) – nicht als "externe Zuständigkeit" wie in medizinischen
      // Profilen. Dies ist eine bewusste pragmatische Nutzung des Core-Goals, da kein
      // neues Goal eingeführt werden soll.
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Technik nicht nutzbar / alternativer Weg notwendig",
        relevantSpecificRoles: ["CHANNEL_NOT_SUITABLE"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  ONBOARDING: {
    id: "ONBOARDING",
    label: "Patientenaufnahme / Registrierung",
    displayOrder: 100,
    decisionCheckpointId: "",
    specificCheckpointIds: [
      "ONBOARDING_WRONG_PRACTICE",
      "ONBOARDING_DATA_INCOMPLETE",
      "ONBOARDING_IDENTITY_MISMATCH",
      "ONBOARDING_GKV_DOCUMENT_MISSING",
      "ONBOARDING_PKV_PAS_MISSING",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "DOCUMENT_UPLOAD",
      "TECHNICAL_ISSUE",
    ],
    actionGuidanceRules: [
      // DOCUMENT_UPLOAD empfehlen, wenn GKV-Versicherungsnachweis fehlt
      {
        id: "ONBOARDING_GKV_DOCUMENT_UPLOAD_RECOMMENDED",
        checkpointId: "DOCUMENT_UPLOAD",
        profileId: "ONBOARDING",
        when: {
          allOf: [
            { checkpointId: "ONBOARDING_GKV_DOCUMENT_MISSING", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
      // DOCUMENT_UPLOAD empfehlen, wenn PKV-Unterlagen (Identitätsnachweis/PAS-Formular) fehlen
      {
        id: "ONBOARDING_PKV_DOCUMENT_UPLOAD_RECOMMENDED",
        checkpointId: "DOCUMENT_UPLOAD",
        profileId: "ONBOARDING",
        when: {
          allOf: [
            { checkpointId: "ONBOARDING_PKV_PAS_MISSING", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
    ],

    boundActionCheckpointIds: [
      "ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED",
      "ONBOARDING_PROVIDE_IDENTITY_DATA",
      "ONBOARDING_DATA_MISSING_CONTEXT",
      "ONBOARDING_WRONG_PRACTICE_NOTICE",
    ],
    boundActionConditions: {
      ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED: {
        showWhenAny: [{ ONBOARDING_IDENTITY_MISMATCH: "YES" }],
      },
      ONBOARDING_PROVIDE_IDENTITY_DATA: {
        showWhenAny: [{ ONBOARDING_IDENTITY_MISMATCH: "YES" }],
      },
      ONBOARDING_DATA_MISSING_CONTEXT: {
        showWhenAny: [{ ONBOARDING_DATA_INCOMPLETE: "YES" }],
      },
      ONBOARDING_WRONG_PRACTICE_NOTICE: {
        showWhenAny: [{ ONBOARDING_WRONG_PRACTICE: "YES" }],
      },
    },

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_ONBOARDING_INITIAL",
        label: "Neupatient / Aufnahme / Registrierung",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_MISSING_INFO",
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
      {
        id: "REQ_ONBOARDING_CLARIFICATION",
        label: "Rückfrage zu Daten / Registrierung / Status",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_ONBOARDING_REQUIRED",
        label: "Praxis fordert Registrierung / Vervollständigung an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
        ],
      },
      {
        id: "OUT_SPECIALIST_RESPONSIBILITY",
        label: "Praxis verweist auf andere Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
    ] satisfies CommunicationReason[],

    // -----------------------------------------------------------------------
    // M3 – Antwortziele (Pilot)
    // -----------------------------------------------------------------------
    responseGoals: [
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Daten / Dokumente fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION", "MISSING_DOCUMENT"],
        relevantActionGuidanceIds: [
          "ONBOARDING_GKV_DOCUMENT_UPLOAD_RECOMMENDED",
          "ONBOARDING_PKV_DOCUMENT_UPLOAD_RECOMMENDED",
        ],
      },
      {
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Falsche Praxis / falscher Account",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Ablauf Registrierung erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  BILLING: {
    id: "BILLING",
    label: "Abrechnung",
    displayOrder: 110,
    decisionCheckpointId: "",
    specificCheckpointIds: [
      "BILLING_COST_NOT_COVERED",
      "BILLING_EXTERNAL_RESPONSIBILITY",
      "BILLING_ADDRESS_MISSING",
      "BILLING_DOCUMENT_MISSING",
      "BILLING_EXTERNAL_PROVIDER",
      "BILLING_INVOICE_TIMING",
    ],
    boundGlobalCheckpointIds: [],
    boundActionCheckpointIds: [
      "BILLING_NOT_COVERED_BY_STATUTORY",
      "BILLING_GOA_BILLING",
      "BILLING_ONSITE_PAYMENT",
      "BILLING_CONTACT_EXTERNAL_PARTY",
      "BILLING_ADDRESS_UPDATE_REQUESTED",
    ],
    boundActionConditions: {
      // Alle drei Bausteine nur anzeigen, wenn die Leistung keine Kassenleistung ist.
      BILLING_NOT_COVERED_BY_STATUTORY: {
        showWhenAny: [{ BILLING_COST_NOT_COVERED: "YES" }],
      },
      BILLING_GOA_BILLING: {
        showWhenAny: [{ BILLING_COST_NOT_COVERED: "YES" }],
      },
      BILLING_ONSITE_PAYMENT: {
        showWhenAny: [{ BILLING_COST_NOT_COVERED: "YES" }],
      },
      BILLING_CONTACT_EXTERNAL_PARTY: {
        showWhenAny: [{ BILLING_EXTERNAL_RESPONSIBILITY: "YES" }],
      },
      BILLING_ADDRESS_UPDATE_REQUESTED: {
        showWhenAny: [{ BILLING_ADDRESS_MISSING: "YES" }],
      },
    },
    availableActionIds: [
      "DIGITAL_REQUEST",
      "BOOK_APPOINTMENT",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "DOCUMENT_UPLOAD",
    ],
    actionGuidanceRules: [
      // DOCUMENT_UPLOAD empfehlen, wenn Abrechnungsunterlagen fehlen
      {
        id: "BILLING_DOCUMENT_UPLOAD_RECOMMENDED",
        checkpointId: "DOCUMENT_UPLOAD",
        profileId: "BILLING",
        when: {
          allOf: [
            { checkpointId: "BILLING_DOCUMENT_MISSING", status: ExplanationStatus.YES },
          ],
        },
        hint: "recommended",
      },
    ],

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_BILLING_INITIAL",
        label: "Frage zu Kosten / Abrechnung / Privatleistung",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
          "ISSUE_BLOCKED_MISSING_INFO",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      {
        id: "REQ_BILLING_CLARIFICATION",
        label: "Rückfrage zu Rechnung / Kosten / Versicherungsstatus",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "ISSUE_BLOCKED_EXTERNAL",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_BILLING_INFO",
        label: "Praxis erklärt Abrechnung / Kosten / Zuständigkeit",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "OUT_MISSING_REQUIREMENT",
        label: "Praxis fordert fehlende Angaben / Voraussetzungen an",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
          "ISSUE_BLOCKED_MISSING_INFO",
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
        id: "ISSUE_BLOCKED_EXTERNAL",
        label: "Externe Zuständigkeit (Krankenkasse, Labor)",
        relevantSpecificRoles: ["EXTERNAL_RESPONSIBILITY"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Daten / Dokumente fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION", "MISSING_DOCUMENT"],
        relevantActionGuidanceIds: ["BILLING_DOCUMENT_UPLOAD_RECOMMENDED"],
      },
      {
        id: "MEDICAL_REVIEW_NEEDED",
        label: "Medizinische Indikation muss geprüft werden",
        relevantSpecificRoles: ["MEDICAL_REVIEW_REQUIRED"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "PROCESS_EXPLAINED",
        label: "Abrechnung / Kosten / Ablauf erklären",
        relevantSpecificRoles: ["PROCESS_INFO", "RULE_COST_COVERAGE"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },

  MEDICAL_DOCUMENTS: {
    id: "MEDICAL_DOCUMENTS",
    label: "Atteste / Bescheinigungen",
    displayOrder: 50,
    decisionCheckpointId: "MEDICAL_DOCUMENTS_DECISION",
    specificCheckpointIds: [
      "MEDICAL_DOCUMENT_POSSIBLE",
      "MEDICAL_DOCUMENT_PRIVATE_SERVICE",
      "MEDICAL_DOCUMENT_INFO_MISSING",
      "MEDICAL_DOCUMENT_CONSULTATION_REQUIRED",
    ],
    boundGlobalCheckpointIds: [],
    globalHints: {},
    availableActionIds: [
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    boundActionCheckpointIds: [
      "DIGITAL_REQUEST_REQUIRED",
      "DIGITAL_REQUEST",
      "BOOK_APPOINTMENT",
      "DOCUMENT_UPLOAD",
    ],
    boundActionConditions: {
      DIGITAL_REQUEST_REQUIRED: {
        hideWhenAny: [],
      },
      DIGITAL_REQUEST: {
        showWhenAny: [{ MEDICAL_DOCUMENT_INFO_MISSING: "YES" }],
      },
      BOOK_APPOINTMENT: {
        showWhenAny: [{ MEDICAL_DOCUMENT_CONSULTATION_REQUIRED: "YES" }],
      },
      DOCUMENT_UPLOAD: {
        showWhenAny: [{ MEDICAL_DOCUMENT_INFO_MISSING: "YES" }],
      },
    },

    // -----------------------------------------------------------------------
    // M1B – Kommunikationsanlässe (Pilot)
    // -----------------------------------------------------------------------
    communicationReasons: [
      // Eingehende Anfragen (Patient → Praxis)
      {
        id: "REQ_DOCUMENT_INITIAL",
        label: "Attest / Bescheinigung anfragen",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "ISSUE_CONFIRMED",
          "MEDICAL_REVIEW_NEEDED",
          "ISSUE_BLOCKED_MISSING_INFO",
          "ISSUE_BLOCKED_COST_COVERAGE",
          "PROCESS_EXPLAINED",
        ],
      },
      {
        id: "REQ_DOCUMENT_CLARIFICATION",
        label: "Rückfrage zu Attest / Bescheinigung / Ablauf",
        direction: "INCOMING",
        suggestedResponseGoalIds: [
          "PROCESS_EXPLAINED",
          "MEDICAL_REVIEW_NEEDED",
        ],
      },
      // Ausgehende Praxisnachrichten (Praxis → Patient)
      {
        id: "OUT_DOCUMENT_READY",
        label: "Attest / Bescheinigung wurde erstellt",
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
        id: "OUT_BILLING_INFO",
        label: "Praxis erklärt Kosten / Selbstzahlerleistung",
        direction: "OUTGOING",
        suggestedResponseGoalIds: [
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
        label: "Attest / Bescheinigung erstellt",
        relevantSpecificRoles: ["OUTCOME_INFO"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_MISSING_INFO",
        label: "Angaben / Voraussetzung fehlen",
        relevantSpecificRoles: ["MISSING_INFORMATION", "MISSING_DOCUMENT"],
        relevantActionGuidanceIds: [],
      },
      {
        id: "ISSUE_BLOCKED_COST_COVERAGE",
        label: "Selbstzahlerleistung / Kostenhinweis",
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
        label: "Ablauf / Erstellung / Abholung erklären",
        relevantSpecificRoles: ["PROCESS_INFO"],
        relevantActionGuidanceIds: [],
      },
    ] satisfies ResponseGoal[],
  },
};
