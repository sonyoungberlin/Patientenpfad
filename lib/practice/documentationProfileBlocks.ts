import type { PracticeDocumentationBlockInput } from "./documentationBlocks";

export const PRACTICE_DOCUMENTATION_PROFILE_BLOCKS: PracticeDocumentationBlockInput[] = [
  {
    title: "STAMMDATEN",
    blockType: "text",
    text: "Name und Art der Stelle",
    required: true,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "address", label: "Adresse", type: "textarea", required: false, showForOptionValues: [] },
      { id: "specialty", label: "Fachgebiet / Schwerpunkt", type: "text", required: false, showForOptionValues: [] },
      { id: "website", label: "Website", type: "text", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "FÜR WEN / WOFÜR GEEIGNET",
    blockType: "text",
    text: "Zielgruppe, Anliegen und geeignete Situationen",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "target_group", label: "Zielgruppe", type: "textarea", required: false, showForOptionValues: [] },
      { id: "indications", label: "Geeignet für", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "KONTAKTMÖGLICHKEITEN",
    blockType: "text",
    text: "Kontaktwege und Erreichbarkeit",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "phone", label: "Telefon", type: "text", required: false, showForOptionValues: [] },
      { id: "email", label: "E-Mail", type: "text", required: false, showForOptionValues: [] },
      { id: "contact_notes", label: "Erreichbarkeit / Hinweise", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "ZUGANG / SO KOMMT DER PATIENT HIN",
    blockType: "text",
    text: "Zugang, Anmeldung und erster Schritt",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "appointment", label: "Terminvereinbarung", type: "text", required: false, showForOptionValues: [] },
      { id: "referral", label: "Überweisung / Einweisung", type: "text", required: false, showForOptionValues: [] },
      { id: "access_notes", label: "Weitere Zugangshinweise", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "VORAUSSETZUNGEN / UNTERLAGEN",
    blockType: "text",
    text: "Voraussetzungen und mitzubringende Unterlagen",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "requirements", label: "Voraussetzungen", type: "textarea", required: false, showForOptionValues: [] },
      { id: "documents", label: "Unterlagen", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "VERSORGUNGSART / LEISTUNGEN",
    blockType: "text",
    text: "Versorgungsform und angebotene Leistungen",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "care_type", label: "Versorgungsart", type: "select", required: false, showForOptionValues: [], options: [
        { value: "ambulant", label: "Ambulant" },
        { value: "stationaer", label: "Stationär" },
        { value: "beides", label: "Ambulant und stationär" },
        { value: "sonstige", label: "Sonstige" },
      ] },
      { id: "services", label: "Leistungen", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "ROLLE DER STELLE / WAS PASSIERT DANACH",
    blockType: "text",
    text: "Rolle im Versorgungspfad und nächste Schritte",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "role", label: "Rolle der Stelle", type: "textarea", required: false, showForOptionValues: [] },
      { id: "next_steps", label: "Was passiert danach?", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "NICHT GEEIGNET / ALTERNATIVE",
    blockType: "text",
    text: "Ausschlusskriterien und Alternativen",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "not_suitable", label: "Nicht geeignet bei", type: "textarea", required: false, showForOptionValues: [] },
      { id: "alternative", label: "Alternative Stelle / Vorgehen", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
  {
    title: "VERIFIKATION / BESONDERHEITEN",
    blockType: "text",
    text: "Prüfung, Aktualität und besondere Hinweise",
    required: false,
    allowedTemplateCategories: ["profile"],
    additionalFields: [
      { id: "verified_at", label: "Zuletzt geprüft am", type: "date", required: false, showForOptionValues: [] },
      { id: "verified_by", label: "Geprüft durch", type: "text", required: false, showForOptionValues: [] },
      { id: "special_notes", label: "Besonderheiten", type: "textarea", required: false, showForOptionValues: [] },
    ],
  },
];
