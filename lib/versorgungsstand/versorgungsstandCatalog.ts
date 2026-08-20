import type { CarePlanField, CarePlanFieldKind, CarePlanSection } from "@/lib/carePlan/carePlanCatalog";

export type { CarePlanField as VersorgungsstandField, CarePlanFieldKind as VersorgungsstandFieldKind, CarePlanSection as VersorgungsstandSection };

const KLAERUNGSSTAND_OPTIONS = [
  "ausreichend geklärt",
  "teilweise geklärt",
  "nicht ausreichend geklärt",
] as const;

const BEFUND_OPTIONS = ["ja", "nein", "unklar"] as const;

// ---------------------------------------------------------------------------
// Wiederholbare Gruppe: Medizinisches Thema (1–6)
// ---------------------------------------------------------------------------

function makeThemaGroup(n: number): readonly CarePlanField[] {
  const g = `thema_${n}`;
  return [
    { id: `thema_${n}_name`, label: "Thema / Diagnose", kind: "text" as CarePlanFieldKind, rowGroup: g, rowGroupLabel: `Medizinisches Thema ${n}` },
    { id: `thema_${n}_klaerungsstand`, label: "Klärungsstand", kind: "select" as CarePlanFieldKind, rowGroup: g, options: KLAERUNGSSTAND_OPTIONS },
    { id: `thema_${n}_datum`, label: "Letzte relevante Abklärung", kind: "date" as CarePlanFieldKind, rowGroup: g },
    { id: `thema_${n}_wer`, label: "Durch / bei", kind: "text" as CarePlanFieldKind, rowGroup: g },
    { id: `thema_${n}_befund`, label: "Informationsgrundlage / relevanter Befund", kind: "text" as CarePlanFieldKind, rowGroup: g },
    { id: `thema_${n}_offen`, label: "Offen / zu klären", kind: "textarea" as CarePlanFieldKind, rowGroup: g },
  ];
}

// ---------------------------------------------------------------------------
// Wiederholbare Gruppe: Fachärztliche Mitbehandlung (1–6)
// ---------------------------------------------------------------------------

function makeFacharztGroup(n: number): readonly CarePlanField[] {
  const g = `fa_${n}`;
  return [
    { id: `fa_${n}_fach`, label: "Fachrichtung / Praxis", kind: "text" as CarePlanFieldKind, rowGroup: g, rowGroupLabel: `Facharzt ${n}` },
    { id: `fa_${n}_kontakt`, label: "Letzter Kontakt", kind: "date" as CarePlanFieldKind, rowGroup: g },
    { id: `fa_${n}_befund`, label: "Befund vorhanden", kind: "select" as CarePlanFieldKind, rowGroup: g, options: BEFUND_OPTIONS },
    { id: `fa_${n}_befund_datum`, label: "Letzter Befund / Stand vom", kind: "date" as CarePlanFieldKind, rowGroup: g },
    { id: `fa_${n}_bedarf`, label: "Weiterer Bedarf / offene Frage", kind: "textarea" as CarePlanFieldKind, rowGroup: g },
  ];
}

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

export const VERSORGUNGSSTAND_SECTIONS: readonly CarePlanSection[] = [
  // ── 1. Allgemeiner Stand ────────────────────────────────────────────────
  {
    id: "section_allgemein",
    title: "Allgemeiner Stand",
    fields: [
      { id: "allg_stichtag", label: "Versorgungsstand vom", kind: "date" },
      { id: "allg_anlass", label: "Anlass / Kontext", kind: "textarea" },
      { id: "allg_info_gespraech", label: "Patientengespräch", kind: "checkbox" },
      { id: "allg_info_mfa", label: "MFA-Erhebung", kind: "checkbox" },
      { id: "allg_info_praxis", label: "Praxisdokumentation", kind: "checkbox" },
      { id: "allg_info_fremdbefunde", label: "Fremdbefunde", kind: "checkbox" },
      { id: "allg_info_medplan", label: "Medikationsplan", kind: "checkbox" },
      { id: "allg_info_epa", label: "ePA", kind: "checkbox" },
      { id: "allg_info_angehoerige", label: "Angehörige / Betreuung", kind: "checkbox" },
      { id: "allg_info_sonstiges", label: "Sonstiges", kind: "checkbox" },
      { id: "allg_info_sonstiges_text", label: "Sonstige Informationsgrundlage / Hinweis", kind: "text" },
    ],
  },

  // ── 2. Kommunikation ────────────────────────────────────────────────────
  {
    id: "section_kommunikation",
    title: "Kommunikation",
    fields: [
      {
        id: "komm_status",
        label: "Gesamtstatus Kommunikation",
        kind: "select",
        options: ["ausreichend geklärt", "teilweise geklärt", "ungeklärt"],
      },
      {
        id: "komm_erreichbarkeit",
        label: "Erreichbarkeit",
        kind: "select",
        options: ["sichergestellt", "eingeschränkt", "ungeklärt"],
      },
      {
        id: "komm_digital",
        label: "Digitale Kommunikation",
        kind: "select",
        options: ["genutzt", "nicht genutzt", "ungeklärt", "nicht relevant"],
      },
      {
        id: "komm_epa",
        label: "ePA",
        kind: "select",
        options: ["genutzt", "nicht genutzt", "ungeklärt", "nicht relevant"],
      },
      { id: "komm_stand", label: "Relevanter aktueller Stand", kind: "textarea" },
      { id: "komm_offen", label: "Offen / zu klären", kind: "textarea" },
    ],
  },

  // ── 3. Medizinische Lage ────────────────────────────────────────────────
  {
    id: "section_medizin",
    title: "Medizinische Lage",
    fields: [
      // Medizinische Themen 1–6
      ...makeThemaGroup(1),
      ...makeThemaGroup(2),
      ...makeThemaGroup(3),
      ...makeThemaGroup(4),
      ...makeThemaGroup(5),
      ...makeThemaGroup(6),

      // Medikation
      {
        id: "med_status",
        label: "Status Medikation",
        kind: "select",
        options: ["abgeglichen", "teilweise abgeglichen", "ungeklärt"],
      },
      {
        id: "med_plan",
        label: "Aktueller Medikationsplan",
        kind: "select",
        options: ["liegt vor", "liegt nicht vor", "unklar"],
      },
      { id: "med_plan_datum", label: "Stand des Medikationsplans", kind: "date" },
      { id: "med_quelle", label: "Quelle / Grundlage", kind: "text" },
      { id: "med_stand", label: "Relevanter aktueller Stand", kind: "textarea" },
      { id: "med_offen", label: "Offen / zu klären", kind: "textarea" },

      // Fachärztliche Mitbehandlung 1–6
      ...makeFacharztGroup(1),
      ...makeFacharztGroup(2),
      ...makeFacharztGroup(3),
      ...makeFacharztGroup(4),
      ...makeFacharztGroup(5),
      ...makeFacharztGroup(6),

      // Relevante Befunde
      {
        id: "bef_lage",
        label: "Informationslage",
        kind: "select",
        options: ["ausreichend", "teilweise ausreichend", "nicht ausreichend"],
      },
      { id: "bef_datum", label: "Letzte relevante Aktualisierung / Untersuchung", kind: "date" },
      { id: "bef_vorhanden", label: "Vorhandene relevante Unterlagen / Befunde", kind: "textarea" },
      { id: "bef_fehlend", label: "Fehlende oder veraltete Unterlagen / Untersuchungen", kind: "textarea" },
      { id: "bef_klaerung", label: "Weitere Klärung erforderlich", kind: "textarea" },
    ],
  },

  // ── 4. Versorgungssituation ─────────────────────────────────────────────
  {
    id: "section_versorgung",
    title: "Versorgungssituation",
    fields: [
      {
        id: "vers_status",
        label: "Gesamtstatus Versorgungssituation",
        kind: "select",
        options: ["ausreichend geklärt", "teilweise geklärt", "ungeklärt"],
      },
      {
        id: "vers_hausarzt",
        label: "Hausärztliche Versorgung",
        kind: "select",
        options: ["geklärt", "teilweise geklärt", "ungeklärt"],
      },
      {
        id: "vers_pflege",
        label: "Pflege- / Unterstützungssituation",
        kind: "select",
        options: ["geklärt", "teilweise geklärt", "ungeklärt", "nicht relevant"],
      },
      { id: "vers_pflegegrad", label: "Pflegegrad", kind: "text" },
      { id: "vers_alltag", label: "Unterstützung im Alltag", kind: "textarea" },
      { id: "vers_beteiligte", label: "Beteiligte Personen / Dienste / Einrichtungen", kind: "textarea" },
      { id: "vers_zustaendig", label: "Zuständigkeiten", kind: "textarea" },
      { id: "vers_offen", label: "Offene organisatorische Punkte", kind: "textarea" },
    ],
  },

  // ── 5. Gesamtbewertung ──────────────────────────────────────────────────
  {
    id: "section_gesamtbewertung",
    title: "Gesamtbewertung",
    fields: [
      {
        id: "ges_status",
        label: "Gesamtstatus",
        kind: "select",
        options: [
          "Versorgungsstand ausreichend geklärt",
          "Versorgungsstand überwiegend geklärt – einzelne offene Punkte",
          "wesentlicher weiterer Klärungsbedarf",
          "aktuell keine ausreichende Einschätzung möglich",
        ],
      },
      {
        id: "ges_versorgung_moeglich",
        label: "Weitere hausärztliche Versorgung möglich",
        kind: "select",
        options: [
          "ja",
          "ja, mit offenen Klärungspunkten",
          "nur vorläufig",
          "derzeit nicht ausreichend beurteilbar",
        ],
      },
      { id: "ges_offen", label: "Wesentliche offene Punkte", kind: "textarea" },
      { id: "ges_naechste", label: "Nächste Aktualisierung empfohlen", kind: "date" },
      { id: "ges_anlass_vorzeitig", label: "Anlass für frühere Aktualisierung", kind: "text" },
      { id: "ges_erstellt_am", label: "Ärztlich erstellt / bestätigt am", kind: "date" },
    ],
  },
] as const;

export function getAllVersorgungsstandFields(): readonly CarePlanField[] {
  return VERSORGUNGSSTAND_SECTIONS.flatMap((s) => s.fields);
}

// IDs aller Informationsgrundlage-Checkboxen (für Renderer-Sonderbehandlung)
export const ALLG_INFO_CHECKBOX_IDS = [
  "allg_info_gespraech",
  "allg_info_mfa",
  "allg_info_praxis",
  "allg_info_fremdbefunde",
  "allg_info_medplan",
  "allg_info_epa",
  "allg_info_angehoerige",
  "allg_info_sonstiges",
] as const;

export const ALLG_INFO_CHECKBOX_LABELS: Record<string, string> = {
  allg_info_gespraech: "Patientengespräch",
  allg_info_mfa: "MFA-Erhebung",
  allg_info_praxis: "Praxisdokumentation",
  allg_info_fremdbefunde: "Fremdbefunde",
  allg_info_medplan: "Medikationsplan",
  allg_info_epa: "ePA",
  allg_info_angehoerige: "Angehörige / Betreuung",
  allg_info_sonstiges: "Sonstiges",
};
