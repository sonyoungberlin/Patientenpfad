import { QUESTION_CATALOG, type QuestionnaireBlock, type QuestionDefinition } from "./blockCatalog";

export const INTERNAL_CONSENT_DOCUMENTATION_TEXT = "Ich willige ein, dass meine Hausarztpraxis MVZ Kreuzberg, Skalitzer Str. 33, 10999 Berlin erforderliche Befunde und medizinische Unterlagen bei den von mir genannten Ärzten/Praxen/Einrichtungen anfordert und diese meine Gesundheitsdaten und Unterlagen an meine Hausarztpraxis übermitteln dürfen.";

const INTERVAL_OPTIONS = ["1x im Quartal", "halbjährlich", "jährlich", "individuell"];

const QUESTIONS: Record<string, QuestionDefinition> = {
  FACHAERZTE: QUESTION_CATALOG.FACHAERZTE,
  CARE_PLAN_HA_DATE: { id: "CARE_PLAN_HA_DATE", text: "Datum des Gesprächs", type: "date", required: false },
  CARE_PLAN_HA_REASON: { id: "CARE_PLAN_HA_REASON", text: "Anlass / Diagnose", type: "textarea", required: false, maxLength: 120 },
  CARE_PLAN_HA_MEDICAL_INTERVAL: { id: "CARE_PLAN_HA_MEDICAL_INTERVAL", text: "Ärztliche Kontrolle", type: "select", required: false, options: INTERVAL_OPTIONS },
  CARE_PLAN_HA_LAB_INTERVAL: { id: "CARE_PLAN_HA_LAB_INTERVAL", text: "Laborkontrolle", type: "select", required: false, options: INTERVAL_OPTIONS },
  CARE_PLAN_HA_NOTES: { id: "CARE_PLAN_HA_NOTES", text: "Notizen / Vereinbarungen", type: "textarea", required: false, maxLength: 120, documentationItemType: "freeText" },
  CARE_PLAN_SPECIALISTS: {
    id: "CARE_PLAN_SPECIALISTS", text: "Fachärztliche Betreuung", type: "repeatable_group", required: false,
    maxEntries: 3, addEntryLabel: "+ Facharzt hinzufügen",
    groupSchema: [
      { key: "specialty", label: "Fachrichtung", type: "text", required: false, maxLength: 120 },
      { key: "practice", label: "Praxis / Arzt", type: "text", required: false, maxLength: 120 },
      { key: "interval", label: "Kontrollintervall", type: "select", required: false, options: INTERVAL_OPTIONS },
      { key: "note", label: "Hinweis", type: "text", required: false, maxLength: 120 },
    ],
  },
  CARE_PLAN_SPECIALIST_REPORTS: { id: "CARE_PLAN_SPECIALIST_REPORTS", text: "Facharztberichte – Anforderung", type: "select", required: false, options: [
    {
      value: "Patientin / Patient",
      label: "Patientin / Patient",
      documentationText: "Die erforderlichen Facharztberichte werden durch die Patientin bzw. den Patienten angefordert.",
    },
    {
      value: "Praxis",
      label: "Praxis",
      documentationText: "Die erforderlichen Facharztberichte werden durch die Praxis angefordert.",
    },
    {
      value: "Patientin / Patient und Praxis",
      label: "Patientin / Patient und Praxis",
      documentationText: "Die erforderlichen Facharztberichte werden durch die Patientin bzw. den Patienten und die Praxis angefordert.",
    },
    {
      value: "Keine Anforderung erforderlich",
      label: "Keine Anforderung erforderlich",
      documentationText: "Eine Anforderung von Facharztberichten ist nicht erforderlich.",
    },
  ] },
  CARE_PLAN_PRESCRIPTION_RENEWAL: { id: "CARE_PLAN_PRESCRIPTION_RENEWAL", text: "Rezepte für Dauermedikation", type: "select", required: false, options: [
    {
      value: "Ohne vorherige ärztliche Rücksprache",
      label: "Ohne vorherige ärztliche Rücksprache",
      documentationText: "Rezepte für Dauermedikation werden ohne vorherige ärztliche Rücksprache ausgestellt.",
    },
    {
      value: "Nach vorheriger ärztlicher Rücksprache",
      label: "Nach vorheriger ärztlicher Rücksprache",
      documentationText: "Rezepte für Dauermedikation werden nach vorheriger ärztlicher Rücksprache ausgestellt.",
    },
  ] },
  CARE_PLAN_REFERRAL: { id: "CARE_PLAN_REFERRAL", text: "Überweisungen", type: "select", required: false, options: [
    {
      value: "Ohne vorherige ärztliche Rücksprache",
      label: "Ohne vorherige ärztliche Rücksprache",
      documentationText: "Überweisungen werden ohne vorherige ärztliche Rücksprache ausgestellt.",
    },
    {
      value: "Nach vorheriger ärztlicher Rücksprache",
      label: "Nach vorheriger ärztlicher Rücksprache",
      documentationText: "Überweisungen werden nach vorheriger ärztlicher Rücksprache ausgestellt.",
    },
  ] },
  CARE_PLAN_SUPPLY_NOTES: { id: "CARE_PLAN_SUPPLY_NOTES", text: "Notizen / Offene Punkte", type: "textarea", required: false, maxLength: 120, documentationItemType: "freeText" },
  CARE_PLAN_SUPPORT: { id: "CARE_PLAN_SUPPORT", text: "Unterstützende Personen", type: "multi_select", required: false, options: [
    "Angehörige / Bezugsperson informiert", "Sozialberatung empfohlen", "Selbsthilfegruppe empfohlen",
  ] },
  CARE_PLAN_SUPPORT_NOTES: { id: "CARE_PLAN_SUPPORT_NOTES", text: "Notizen", type: "textarea", required: false, maxLength: 120, documentationItemType: "freeText", omitDocumentationLabel: true },
  CARE_PLAN_AGREEMENT: { id: "CARE_PLAN_AGREEMENT", text: "Gemeinsame Vereinbarung", type: "multi_select", required: false, options: [
    "Warnsymptome erklärt", "Notfallplan besprochen", "Eigenverantwortung und Mitwirkung besprochen",
  ] },
  CARE_PLAN_AGREEMENT_TEXT: { id: "CARE_PLAN_AGREEMENT_TEXT", text: "Individuelle Vereinbarung", type: "textarea", required: false, maxLength: 120, documentationItemType: "freeText" },
  CARE_PLAN_AGREEMENT_DATE: { id: "CARE_PLAN_AGREEMENT_DATE", text: "Datum der Vereinbarung", type: "date", required: false },
  DOCUMENT_HANDLING_ACTIONS: {
    id: "DOCUMENT_HANDLING_ACTIONS",
    text: "Dokumente / Befunde",
    type: "multi_select",
    required: false,
    documentationItemType: "status",
    options: [
      { value: "attached", label: "sind beigefügt", documentationText: "Dokumente / Befunde sind beigefügt." },
      { value: "handed_out", label: "wurden mitgegeben", documentationText: "Dokumente / Befunde wurden mitgegeben." },
      { value: "requested", label: "wurden angefordert", documentationText: "Dokumente / Befunde wurden angefordert." },
      { value: "pending_submission", label: "werden nachgereicht", documentationText: "Dokumente / Befunde werden nachgereicht." },
    ],
  },
  EKG_RHYTHM: { id: "EKG_RHYTHM", text: "Rhythmus", type: "text", required: false, maxLength: 120 },
  EKG_HEART_RATE: { id: "EKG_HEART_RATE", text: "Herzfrequenz", type: "number", required: false, unit: "/min", unitSeparator: "", step: 1 },
  EKG_AXIS: { id: "EKG_AXIS", text: "Lagetyp", type: "text", required: false, maxLength: 120 },
  EKG_QTC: { id: "EKG_QTC", text: "QTc", type: "number", required: false, unit: "ms", step: 1 },
  EKG_BLOCK_PATTERNS: { id: "EKG_BLOCK_PATTERNS", text: "Blockbilder", type: "text", required: false, maxLength: 120 },
  EKG_ERBS: { id: "EKG_ERBS", text: "ERBS", type: "text", required: false, maxLength: 120 },
  MEDICAL_STATEMENT_IMPAIRMENT_TYPE: {
    id: "MEDICAL_STATEMENT_IMPAIRMENT_TYPE",
    text: "Art der Beeinträchtigung",
    type: "select",
    required: false,
    options: [
      { value: "physical", label: "Körperlich", documentationText: "Es liegen körperliche Beschwerden vor, die die berufliche Belastbarkeit derzeit einschränken." },
      { value: "psychological", label: "Psychisch", documentationText: "Es bestehen psychische Belastungen bzw. eine psychische Erkrankung, die aktuell mit einer eingeschränkten Belastbarkeit, Konzentrationsfähigkeit und Stresstoleranz einhergeht." },
      { value: "combined", label: "Kombiniert", documentationText: "Es bestehen sowohl körperliche als auch psychische gesundheitliche Einschränkungen, die sich gegenseitig verstärken und die berufliche Belastbarkeit derzeit deutlich reduzieren." },
    ],
  },
  MEDICAL_STATEMENT_TIME_ASSESSMENT: {
    id: "MEDICAL_STATEMENT_TIME_ASSESSMENT",
    text: "Zeitliche Einschätzung",
    type: "select",
    required: false,
    options: [
      { value: "short_medium_term", label: "Kurz-/mittelfristig", documentationText: "Diese Einschätzung gilt vorerst und sollte im Verlauf erneut überprüft werden." },
      { value: "uncertain_course", label: "Verlauf unklar", documentationText: "Die weitere gesundheitliche Entwicklung bleibt abzuwarten; eine erneute ärztliche Beurteilung ist erforderlich." },
      { value: "longer_term", label: "Längerfristig", documentationText: "Aus aktueller medizinischer Sicht ist eine Rückkehr in die bisherige Tätigkeit absehbar nicht möglich." },
    ],
  },
  MEDICAL_STATEMENT_RECOMMENDATIONS: {
    id: "MEDICAL_STATEMENT_RECOMMENDATIONS",
    text: "Weitere Einschätzung / Empfehlung",
    type: "multi_select",
    required: false,
    options: [
      { value: "current_activity_not_recommended", label: "Aktuelle Tätigkeit nicht empfehlenswert", documentationText: "Die Fortführung der aktuellen Tätigkeit erscheint aus ärztlicher Sicht derzeit nicht empfehlenswert, da eine Verschlechterung des Gesundheitszustands zu erwarten ist." },
      { value: "medical_reassessment", label: "Erneute ärztliche Beurteilung", documentationText: "Eine erneute ärztliche Beurteilung im weiteren Verlauf wird empfohlen." },
      { value: "alternative_measures", label: "Alternative Maßnahmen prüfen", documentationText: "Aus hausärztlicher Sicht wird empfohlen, alternative Maßnahmen (z. B. berufliche Neuorientierung, Rehabilitationsmaßnahmen oder sozialmedizinische Abklärung) zu prüfen." },
      { value: "social_medical_assessment", label: "Sozialmedizinische Begutachtung", documentationText: "Eine weiterführende sozialmedizinische Begutachtung kann sinnvoll sein." },
    ],
  },
  INTERNAL_CONSENT_INCLUDE: {
    id: "INTERNAL_CONSENT_INCLUDE",
    text: "Einwilligungserklärung",
    type: "multi_select",
    required: false,
    options: [{
      value: "include_in_print",
      label: "Einwilligungserklärung aufnehmen",
      documentationText: INTERNAL_CONSENT_DOCUMENTATION_TEXT,
    }],
  },
};

export const INTERNAL_DOCUMENTATION_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  CARE_PLAN_HA: { id: "CARE_PLAN_HA", label: "Hausärztliche Betreuung", displayOrder: 10, questionIds: ["CARE_PLAN_HA_DATE", "CARE_PLAN_HA_REASON", "CARE_PLAN_HA_MEDICAL_INTERVAL", "CARE_PLAN_HA_LAB_INTERVAL", "CARE_PLAN_HA_NOTES"] },
  CARE_PLAN_SPECIALIST: { id: "CARE_PLAN_SPECIALIST", label: "Fachärztliche Betreuung", displayOrder: 20, questionIds: ["CARE_PLAN_SPECIALISTS"] },
  CARE_PLAN_SUPPLY_BLOCK: { id: "CARE_PLAN_SUPPLY_BLOCK", label: "Versorgung und Organisation", displayOrder: 30, questionIds: ["CARE_PLAN_SPECIALIST_REPORTS", "CARE_PLAN_PRESCRIPTION_RENEWAL", "CARE_PLAN_REFERRAL", "CARE_PLAN_SUPPLY_NOTES"] },
  CARE_PLAN_SUPPORT_BLOCK: { id: "CARE_PLAN_SUPPORT_BLOCK", label: "Unterstützende Personen", displayOrder: 40, questionIds: ["CARE_PLAN_SUPPORT", "CARE_PLAN_SUPPORT_NOTES"] },
  CARE_PLAN_AGREEMENT_BLOCK: { id: "CARE_PLAN_AGREEMENT_BLOCK", label: "Gemeinsame Vereinbarung", displayOrder: 50, questionIds: ["CARE_PLAN_AGREEMENT", "CARE_PLAN_AGREEMENT_TEXT", "CARE_PLAN_AGREEMENT_DATE"] },
  DOCUMENT_HANDLING: { id: "DOCUMENT_HANDLING", label: "Dokumente / Befunde", displayOrder: 60, questionIds: ["DOCUMENT_HANDLING_ACTIONS"], omitStructuredHeading: true },
  EKG: {
    id: "EKG",
    label: "EKG",
    displayOrder: 70,
    questionIds: ["EKG_RHYTHM", "EKG_HEART_RATE", "EKG_AXIS", "EKG_QTC", "EKG_BLOCK_PATTERNS", "EKG_ERBS"],
    documentationPresentation: {
      layout: "inline",
      separator: " – ",
      items: [
        { questionIds: ["EKG_RHYTHM"], label: "Rhythmus" },
        { questionIds: ["EKG_HEART_RATE"], label: "HF" },
        { questionIds: ["EKG_AXIS"], label: "Lagetyp" },
        { questionIds: ["EKG_QTC"], label: "QTc" },
        { questionIds: ["EKG_BLOCK_PATTERNS"], label: "Blockbilder" },
        { questionIds: ["EKG_ERBS"], label: "ERBS" },
      ],
    },
    documentationItemType: "measurement",
  },
  MEDICAL_STATEMENT: {
    id: "MEDICAL_STATEMENT",
    label: "Stellungnahme",
    displayOrder: 80,
    questionIds: ["MEDICAL_STATEMENT_IMPAIRMENT_TYPE", "MEDICAL_STATEMENT_TIME_ASSESSMENT", "MEDICAL_STATEMENT_RECOMMENDATIONS"],
    documentationItemType: "bodyText",
  },
  SPECIALISTS: {
    id: "SPECIALISTS",
    label: "Fachärzte",
    displayOrder: 90,
    questionIds: ["FACHAERZTE"],
  },
  INTERNAL_CONSENT: {
    id: "INTERNAL_CONSENT",
    label: "Einwilligungserklärung",
    displayOrder: 100,
    questionIds: ["INTERNAL_CONSENT_INCLUDE"],
    paperSignature: { label: "Datum / Unterschrift Patient/in" },
  },
};

export const INTERNAL_DOCUMENTATION_QUESTION_CATALOG = QUESTIONS;
