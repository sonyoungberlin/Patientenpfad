/**
 * Erzeugt einen kompakten, kopierbaren Krankenblatt-Text für eine
 * PatientQuestionnaireSession.
 *
 * Aufbau analog zur PDF-Struktur:
 *   - Iteriert über `selected_block_ids` und sortiert die Blöcke nach
 *     `BLOCK_CATALOG[id].displayOrder` (gleiche Reihenfolge wie das PDF).
 *   - Pro Block wird `block.label` als Überschrift ausgegeben und über
 *     `block.questionIds` iteriert.
 *   - Doppelte questionIds werden blockübergreifend mit einem `seen`-Set
 *     übersprungen (gleiche Regel wie `buildQuestionnaireQuestions`).
 *   - Werte werden mit kurzen Labels aus `SHORT_LABELS` ausgegeben; für
 *     nicht gemappte IDs wird auf `QUESTION_CATALOG[id].text` zurück­
 *     gefallen.
 *
 * Regeln:
 *   - Nur Felder mit Wert werden ausgegeben; interne Workflows können
 *     leere Blocküberschriften ausdrücklich beibehalten.
 *   - Newlines in Textarea-Werten (insbesondere ADDRESS_POSTAL) bleiben
 *     erhalten und werden als Folgezeilen unterhalb des Labels emittiert.
 *   - Gespeicherte Inhalte werden vollständig ausgegeben.
 *   - Keine medizinische Bewertung, keine Empfehlung.
 *   - Keine HTML-Ausgabe, nur Plaintext.
 */

import { BLOCK_CATALOG, QUESTION_CATALOG } from "./blockCatalog";
import type { DocumentationItemType, QuestionDefinition } from "./blockCatalog";
import type { SemanticDocument, SemanticDocumentItem } from "./appTextXml";
import { buildFrozenBlocks, type FrozenBlock } from "./frozenBlocks";
import { computeAllDerivedValues } from "./derivedValues";
import { sortFrozenBlocksByLayout } from "./internalBlockLayout";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "./conditionalLogic";
import { buildOptionsByQuestionId } from "./multiSelect";
import { buildDerivedValueLines } from "./formatAnswer";
import {
  buildAttentionHintLines,
  buildClinicalStatusSummary,
  joinMedicalStatementSentences,
  resolveQuestionDocumentation,
} from "./formatAnswer";
import { getQuestionOptionValues } from "./questionOptions";
import { computeQuestionnaireAttentionHints } from "./attentionHints";
import { normalizeSmokingPair } from "./smokingInput";
import { normalizeTextForPvs } from "./normalizeTextForPvs";
import {
  formatStructuredVaccinationEntry,
  getVaccinationLabel,
  parseStructuredVaccinationAnswer,
} from "./vaccinationReview";
import { getInternalWorkflow } from "./internalWorkflowRegistry";
import { resolveInlineDocumentation } from "./inlineDocumentation";
import {
  hasDocumentedBlockContent,
  isDocumentedContentSnapshot,
  isNewBlockBasedInternalSession,
} from "./documentedContent";

/** Eingabe-Subset einer PatientQuestionnaireSession. */
export type MedicalRecordNoteInput = {
  answers: Record<string, string> | null | undefined;
  selected_block_ids: string[];
  /** Phase 4: eingefrorene Block-Struktur. NULL = Legacy-Pfad. */
  frozenBlocks?: FrozenBlock[] | null;
  internalWorkflowId?: string | null;
};

export type MedicalRecordOutput = {
  noteText: string;
  semanticDocument: SemanticDocument;
};

type RenderedDocumentationItem = SemanticDocumentItem & {
  legacyText: string;
};

const LEGACY_MEASUREMENT_BLOCK_IDS = new Set([
  "EKG",
  "HEALTH_CHECK_MEASUREMENTS",
  "HEALTH_CHECK_LAB",
  "HEALTH_CHECK_URINE",
]);
const LEGACY_BODY_TEXT_BLOCK_IDS = new Set([
  "MEDICAL_STATEMENT",
]);
const LEGACY_LEVEL_2_HEADING_BLOCK_IDS = new Set([
  "EKG",
  "HEALTH_CHECK_MEASUREMENTS",
  "HEALTH_CHECK_LAB",
  "HEALTH_CHECK_URINE",
]);
const LEGACY_UNLABELED_FREE_TEXT_IDS = new Set([
  "CARE_PLAN_SUPPORT_NOTES",
  "HEALTH_CHECK_CLINICAL_NOTE",
  "HEALTH_CHECK_LAB_NOTE",
  "HEALTH_CHECK_URINE_NOTE",
  "HEALTH_CHECK_OTHER_NOTE",
  "HEALTH_CHECK_NEXT_STEPS_NOTE",
]);

function resolveDocumentationItemType(
  block: FrozenBlock,
  question?: QuestionDefinition,
): Exclude<DocumentationItemType, "heading"> {
  if (question?.documentationItemType) return question.documentationItemType;
  if (block.documentationItemType) return block.documentationItemType;
  if (LEGACY_BODY_TEXT_BLOCK_IDS.has(block.id)) return "bodyText";
  if (question?.type === "textarea") return "freeText";
  if (LEGACY_MEASUREMENT_BLOCK_IDS.has(block.id)) return "measurement";
  if (question?.type === "number") return "measurement";
  if (question?.type === "multi_select" || question?.type === "repeatable_group") {
    return "listItem";
  }
  if (question?.type === "select" || question?.type === "yes_no" || question?.type === "confirmation") {
    return "status";
  }
  return "bodyText";
}

function resolveDocumentSection(block: FrozenBlock): 1 | 2 | 3 {
  return block.section === 2 || block.section === 3 ? block.section : 1;
}

function resolveHeadingLevel(block: FrozenBlock): 1 | 2 {
  if (block.structuredHeadingLevel) return block.structuredHeadingLevel;
  return LEGACY_LEVEL_2_HEADING_BLOCK_IDS.has(block.id) ? 2 : 1;
}

function resolveHeadingVisibility(block: FrozenBlock): "visible" | "spacingOnly" {
  if (block.structuredHeadingVisibility) return block.structuredHeadingVisibility;
  return block.id === "HEALTH_CHECK_NEXT_STEPS" ? "spacingOnly" : "visible";
}

/**
 * Kurz-Labels für die Krankenblatt-Ausgabe. Diese sind bewusst von
 * `QUESTION_CATALOG[id].text` (Patientenformulierung) entkoppelt, damit
 * der Krankenblatt-Text knapp lesbar bleibt. Für IDs ohne Eintrag wird
 * auf die lange Patientenfrage zurückgefallen.
 */
const SHORT_LABELS: Record<string, string> = {
  VACCINATION_REVIEW_ITEMS: "Impfungen",
  // Identität
  IDENTITY_FIRST_NAME: "Vorname",
  IDENTITY_LAST_NAME: "Nachname",
  IDENTITY_BIRTHDATE: "Geburtsdatum",
  IDENTITY_INSURANCE_TYPE: "Versicherungsart",
  INSURANCE_PROVIDER_NAME: "Krankenkasse / Versicherung",
  INSURANCE_MEMBER_NUMBER: "Versicherungsnummer",
  INSURANCE_CARD_IDENTIFIER: "IK-Nummer Krankenkasse",
  INSURANCE_CARD_VALID_UNTIL: "Karte gültig bis",

  // Kontakt
  CONTACT_PHONE: "Tel.",
  CONTACT_EMAIL: "E-Mail",
  CONTACT_DOCTOLIB: "Doctolib",

  // Kontaktperson
  KONTAKTPERSON_NAME: "Kontaktperson",
  KONTAKTPERSON_BIRTHDATE: "Geburtsdatum Kontaktperson",
  KONTAKTPERSON_RELATIONSHIP: "Beziehung",
  KONTAKTPERSON_CONFIRMATION: "Organisatorische Anliegen erlaubt",

  // Adresse
  ADDRESS_POSTAL: "Adresse",

  // Kurzanamnese
  ANAMNESE_GP: "Hausarzt",
  ANAMNESE_GP_NAME: "Name Hausarzt",
  ANAMNESE_HEIGHT: "Größe",
  ANAMNESE_WEIGHT: "Gewicht",
  ANAMNESE_CHRONIC_GATE: "Chronische Erkrankungen vorhanden",
  ANAMNESE_CHRONIC: "Chronische Erkrankungen",
  ANAMNESE_HEREDITARY: "Erbkrankheiten",
  ANAMNESE_ALLERGIES_GATE: "Allergien oder Unverträglichkeiten vorhanden",
  ANAMNESE_ALLERGIES: "Allergien",
  ANAMNESE_MEDICATIONS_GATE: "Regelmäßige Medikamente",
  ANAMNESE_MEDICATIONS: "Medikamente",
  ANAMNESE_SMOKING: "Rauchen",
  ANAMNESE_ALCOHOL: "Alkohol",
  ANAMNESE_SUBSTANCES: "Sonstige Substanzen",
  ANAMNESE_VACCINATION: "Impfstatus bekannt",
  ANAMNESE_OCCUPATION: "Beruf",

  // Arbeitsunfähigkeit
  AU_SYMPTOMS: "Beschwerden",
  AU_SYMPTOMS_OTHER_TEXT: "Beschwerden (Freitext)",
  AU_START_DATE: "Beginn",
  AU_END_DATE: "AU bis",
  AU_IS_FOLLOWUP: "Folge-AU",

  // Rezept
  PRESCRIPTION_TYPE: "Rezeptart",
  PRESCRIPTION_MEDICATION: "Medikament",
  PRESCRIPTION_REPEAT_KNOWN: "Bekannte Dauermedikation",

  // Überweisung
  REF_SPECIALTY: "Fachrichtung",
  REF_DOCTOR_NAME: "Facharzt",
  REF_ADDRESS: "Adresse Facharzt",
  REF_APPOINTMENT_EXISTS: "Termin vorhanden",
  REF_APPOINTMENT_DATE: "Termin",
  REF_REASON: "Grund",

  // Krankenhauseinweisung
  HOSP_ADMISSION_REASON: "Anlass",
  HOSP_ADMISSION_IS_CONTROL: "Kontrolltermin",
  HOSP_ADMISSION_DATE: "Termin",
  HOSP_TRANSPORT_NEEDED: "Krankentransport benötigt",
  HOSP_TRANSPORT_REASON: "Grund Transport",

  // Krankenbeförderung
  TRANSPORT_NEEDED: "Beförderung benötigt",
  TRANSPORT_DESTINATION: "Ziel",
  TRANSPORT_REASON: "Grund",
  TRANSPORT_MOBILITY: "Einschränkung",
  TRANSPORT_DATE: "Datum",

  // Fachärzte
  FACHAERZTE: "Behandelnde Fachärzte",

  // Vollständige Anamnese: Erkrankungen & Medikamente
  VOLLST_ERKR_GATE: "Chronische / psychische Erkrankung oder Dauermedikation",
  VOLLST_ERKR_EINTRAEGE: "Erkrankungen und Medikamente",

  // Vollständige Anamnese: Allergien & Unverträglichkeiten
  VOLLST_ALLERG_GATE: "Allergien / Unverträglichkeiten bekannt",
  VOLLST_ALLERG_EINTRAEGE: "Allergien und Unverträglichkeiten",

  // Vollständige Anamnese: Infektionskrankheiten
  VOLLST_INFEKT_GATE: "Infektionskrankheit bekannt",
  VOLLST_INFEKT_EINTRAEGE: "Infektionskrankheiten",

  // Vollständige Anamnese: Familienanamnese
  VOLLST_FAMIL_GATE: "Erkrankungen in der Familie",
  VOLLST_FAMIL_EINTRAEGE: "Familienanamnese",

  // Vollständige Anamnese: Impfstatus
  VOLLST_IMPF_BEKANNT: "Impfstatus bekannt",
  VOLLST_IMPF_NACHWEIS: "Impfnachweis vorhanden",
  VOLLST_IMPF_ABLEHNUNG: "Impfungen grundsätzlich abgelehnt",
  VOLLST_IMPF_BERATUNG: "Impfberatung gewünscht",

  // Vollständige Anamnese: Versorgungsstatus
  VOLLST_VERS_PFLEGEGRAD: "Pflegegrad",
  VOLLST_VERS_PFLEGEGRAD_STUFE: "Pflegegrad (Stufe)",
  VOLLST_VERS_GDB: "Grad der Behinderung (GdB)",
  VOLLST_VERS_GDB_WERT: "GdB (Wert)",
  VOLLST_VERS_PROTHESEN: "Prothesen / Implantate",
  VOLLST_VERS_PROTHESEN_TEXT: "Prothesen / Implantate (Art)",

  // Vollständige Anamnese: Nikotin / Tabak
  NIKOTIN_GATE: "Rauchstatus",
  NIKOTIN_PRODUKT: "Produkt",
  NIKOTIN_PRODUKT_ANDERE: "Produkt (Freitext)",
  NIKOTIN_BEGINN_JAHR: "Rauchbeginn (Jahr)",
  NIKOTIN_BEGINN_VOR: "Rauchbeginn (vor Jahren)",
  NIKOTIN_DAUER_JAHRE: "Rauchdauer (ca. Jahre)",
  NIKOTIN_ZIG_PRO_TAG: "Zigaretten/Tag",
  NIKOTIN_AUFGEHOERT_VOR: "Aufgehört vor (ca. Jahren)",
  NIKOTIN_AUFGEHOERT_JAHR: "Rauchstopp (Jahr)",
  NIKOTIN_AUFHOERVERSUCH: "Aufhörversuch(e)",
  NIKOTIN_RAUCHFREI_DAUER: "Längste Rauchfreiheit",
  NIKOTIN_MOTIVATION: "Aufhörwunsch",
  NIKOTIN_UNTERSTUETZUNG: "Unterstützung gewünscht (Nikotin)",

  // Vollständige Anamnese: Alkohol
  ALKOHOL_GATE: "Alkohol",
  ALKOHOL_FRUEHER_MEHR: "Früher deutlich mehr Alkohol",
  ALKOHOL_HAEUFIGKEIT: "Trinkhäufigkeit",
  ALKOHOL_MENGE: "Menge pro Trinktag",
  ALKOHOL_VERSUCH: "Reduktionsversuch(e)",
  ALKOHOL_BEHANDLUNG: "Behandlung wegen Alkohol",
  ALKOHOL_BEHANDLUNG_ART: "Art der Behandlung",
  ALKOHOL_BEHANDLUNG_NAME: "Praxis / Einrichtung",
  ALKOHOL_BEHANDLUNG_ORT: "Ort",
  ALKOHOL_MOTIVATION: "Reduktions-/Abstinenzmotivation",
  ALKOHOL_UNTERSTUETZUNG: "Unterstützung gewünscht (Alkohol)",

  // Vollständige Anamnese: Substanzen
  SUBST_GATE: "Andere Substanzen / Drogen",
  SUBST_EINTRAEGE: "Substanzen / Drogen (Details)",

  // Vollständige Anamnese: Basisdaten
  VOLLST_SEX: "Geschlecht bei Geburt",
  VOLLST_GENDER: "Geschlechtsidentität",
  VOLLST_GENDER_FREITEXT: "Eigene Angabe zur Geschlechtsidentität",
  VOLLST_PRONOMEN: "Gewünschte Ansprache",
  VOLLST_AGE: "Alter",
  VOLLST_HEIGHT: "Körpergröße (cm)",
  VOLLST_WEIGHT: "Körpergewicht (kg)",

  // Vollständige Anamnese: Prävention und Beratungswünsche
  VOLLST_CHECKUP_STATUS: "Letzter Check-up",
  VOLLST_CHECKUP_BERATUNG: "Check-up-Beratung gewünscht",
  VOLLST_LUNGENSCREENING_BERATUNG: "Beratung Lungenkrebs-Screening gewünscht",
  VOLLST_GEWICHT_VERAENDERN: "Gewicht verändern",
  VOLLST_GEWICHT_UNTERSTUETZUNG: "Unterstützung Gewicht gewünscht",
};

/**
 * Werte-Transformationen pro questionId. Historischer Eintrag für AU_IS_FOLLOWUP;
 * yes_no-Felder werden allgemein über QUESTION_CATALOG.type normalisiert.
 */
const VALUE_TRANSFORMS: Record<string, Record<string, string>> = {
  AU_IS_FOLLOWUP: { ja: "Ja", nein: "Nein" },
};

/**
 * Formatiert eine repeatable_group-Antwort für die Krankenblatt-Ausgabe.
 * Verwendet die übergebene QuestionDefinition (eingefroren oder aus Catalog).
 */
function formatRepeatableGroupEntries(
  questionId: string,
  jsonValue: string,
  questionDef?: QuestionDefinition,
  omitEntryHeadingColon = false,
): string[] {
  const def = questionDef ?? QUESTION_CATALOG[questionId];
  if (!def?.groupSchema) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  const lines: string[] = [];

  parsed.forEach((entry, idx) => {
    if (typeof entry !== "object" || entry === null) return;
    const e = entry as Record<string, unknown>;

    lines.push(def.presentation === "vaccination_matrix"
      ? `  ${getVaccinationLabel(e as Record<string, string>, def)}:`
      : `  ${idx + 1}. Eintrag${omitEntryHeadingColon ? "" : ":"}`);

    for (const field of def.groupSchema!) {
      if (def.presentation === "vaccination_matrix" && (field.key === "vaccination_id" || field.key === "custom_label")) {
        continue;
      }
      // Bedingte Felder ausblenden, wenn Gate-Feld nicht zutrifft
      if (field.conditionalOn) {
        const cv = (e[field.conditionalOn] as string) ?? "";
        const hidden = field.conditionalValues
          ? !field.conditionalValues.includes(cv)
          : cv !== field.conditionalValue;
        if (hidden) continue;
      }

      const val = e[field.key];
      if (typeof val !== "string" || val.trim() === "") continue;

      const trimmed = val.trim();
      if (field.type === "textarea") {
        const parts = trimmed
          .split(/\r?\n/)
          .filter((l) => l.trim() !== "");
        lines.push(`     ${field.label}:`);
        for (const p of parts) lines.push(`       ${p.trim()}`);
      } else {
        lines.push(`     ${field.label}: ${trimmed}`);
      }
    }
  });

  return lines;
}

function formatStructuredVaccinationEntries(
  raw: string,
  question: QuestionDefinition,
): string[] {
  const answer = parseStructuredVaccinationAnswer(raw);
  if (!answer || question.presentation !== "vaccination_matrix") return [];
  return answer.entries.map((entry) => formatStructuredVaccinationEntry(
    entry,
    getVaccinationLabel(entry as unknown as Record<string, string>, question),
  ));
}

/**
 * Formatiert das FACHAERZTE-Feld (repeatable group) für die Krankenblatt-Ausgabe.
 */
function formatFacharztEntries(jsonValue: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  const lines: string[] = [];

  parsed.forEach((entry, idx) => {
    if (typeof entry !== "object" || entry === null) return;

    lines.push(`  ${idx + 1}. Eintrag:`);

    const erkrankung = (entry as Record<string, unknown>).erkrankung;
    if (typeof erkrankung === "string" && erkrankung.trim() !== "") {
      const parts = erkrankung
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      lines.push("     Erkrankung / Grund:");
      parts.forEach((line) => {
        lines.push(`       ${line.trim()}`);
      });
    }

    const bereich = (entry as Record<string, unknown>).bereich;
    if (typeof bereich === "string" && bereich.trim() !== "") {
      lines.push(`     Facharztbereich: ${bereich.trim()}`);
    }

    const name = (entry as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim() !== "") {
      lines.push(`     Name: ${name.trim()}`);
    }

    const adresse = (entry as Record<string, unknown>).adresse;
    if (typeof adresse === "string" && adresse.trim() !== "") {
      const parts = adresse
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      lines.push("     Adresse:");
      parts.forEach((line) => {
        lines.push(`       ${line.trim()}`);
      });
    }
  });

  return lines;
}

function getLabel(questionId: string, questionDef?: QuestionDefinition): string {
  return SHORT_LABELS[questionId] ?? questionDef?.text ?? QUESTION_CATALOG[questionId]?.text ?? questionId;
}

function transformValue(questionId: string, raw: string, questionDef?: QuestionDefinition): string {
  const transform = VALUE_TRANSFORMS[questionId];
  if (transform && raw in transform) return transform[raw];
  // yes_no-Felder geben "ja"/"nein" zurück – für die Praxis groß schreiben
  if ((questionDef ?? QUESTION_CATALOG[questionId])?.type === "yes_no" && raw.length > 0) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return raw;
}

/**
 * Zerlegt einen Antwort-Wert in eine erste „Label: …"-Zeile plus
 * optionale Folgezeilen (für Mehrzeilen-Textarea-Felder wie
 * ADDRESS_POSTAL). Liefert ein leeres Array, wenn nach dem Trim
 * nichts übrigbleibt.
 */
function renderQuestionLines(
  questionId: string,
  rawValue: string,
  questionDef?: QuestionDefinition,
  omitLabel = false,
): string[] {
  const transformed = transformValue(questionId, rawValue, questionDef);
  const parts = transformed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (parts.length === 0) return [];

  const label = getLabel(questionId, questionDef);
  const lines: string[] = [omitLabel ? parts[0] : `${label}: ${parts[0]}`];
  for (let i = 1; i < parts.length; i++) {
    lines.push(parts[i]);
  }
  return lines;
}

const SMOKING_PAIR_IDS = new Set([
  "NIKOTIN_BEGINN_JAHR",
  "NIKOTIN_BEGINN_VOR",
  "NIKOTIN_AUFGEHOERT_JAHR",
  "NIKOTIN_AUFGEHOERT_VOR",
]);

function renderSmokingSummary(answers: Record<string, string>): string[] {
  const start = normalizeSmokingPair(
    answers.NIKOTIN_BEGINN_JAHR ?? "",
    answers.NIKOTIN_BEGINN_VOR ?? "",
  );
  if (!start) return [];

  const lines = [`Rauchbeginn: ${start.year} (vor ${start.yearsAgo} Jahren)`];
  if (answers.NIKOTIN_GATE === "Früher, inzwischen aufgehört") {
    const stop = normalizeSmokingPair(
      answers.NIKOTIN_AUFGEHOERT_JAHR ?? "",
      answers.NIKOTIN_AUFGEHOERT_VOR ?? "",
    );
    if (stop) lines.push(`Rauchstopp: ${stop.year} (vor ${stop.yearsAgo} Jahren)`);
  }
  return lines;
}

function hasNewSmokingStructure(answers: Record<string, string>): boolean {
  return [
    "NIKOTIN_BEGINN_JAHR",
    "NIKOTIN_BEGINN_VOR",
    "NIKOTIN_AUFGEHOERT_JAHR",
  ].some((id) => (answers[id] ?? "").trim() !== "");
}

/**
 * Erzeugt einen blockbasierten Krankenblatt-Notiz-Text.
 *
 * @param input - answers + selected_block_ids einer PatientQuestionnaireSession
 * @returns Ein String, Zeilen getrennt mit \n
 */
export function buildMedicalRecordOutput(input: MedicalRecordNoteInput): MedicalRecordOutput {
  const answers: Record<string, string> = input.answers ?? {};
  const blockIds = new Set(input.selected_block_ids);
  const internalWorkflow = getInternalWorkflow(input.internalWorkflowId);
  const useDocumentedContent = isDocumentedContentSnapshot(input.frozenBlocks);
  const isNewBlockBased = isNewBlockBasedInternalSession({
    sessionKind: "internal_documentation",
    internalWorkflowId: input.internalWorkflowId,
    frozenBlocks: input.frozenBlocks,
  });
  const legacyOutputPolicy = internalWorkflow?.legacyOutputPolicy;
  const omitMatchingBlockQuestionLabels = useDocumentedContent
    ? true
    : legacyOutputPolicy?.omitMatchingBlockQuestionLabels ?? false;
  const includeEmptyBlocks = useDocumentedContent
    ? false
    : legacyOutputPolicy?.includeEmptyBlocksInCopyText ?? false;

  const hasAU = blockIds.has("ARBEITSUNFAEHIGKEIT");
  const hasRezept = blockIds.has("REZEPT");
  const hasUeberweisung = blockIds.has("UEBERWEISUNG");
  const hasIdentitaet = blockIds.has("IDENTITAET");

  let title: string;
  if (useDocumentedContent && input.internalWorkflowId == null) {
    title = "Interne Dokumentation";
  } else if (input.internalWorkflowId === "vaccination_review_v1") {
    title = "Impfpassprüfung und Beratung";
  } else if (input.internalWorkflowId === "care_plan_v1") {
    title = "Persönlicher Versorgungsplan";
  } else if (input.internalWorkflowId === "health_check_v1") {
    title = "Gesundheitsuntersuchung";
  } else if (hasAU && !hasRezept && !hasUeberweisung) {
    title = "AU-Anfrage (digital)";
  } else if (hasRezept && !hasAU && !hasUeberweisung) {
    title = "Rezeptanfrage (digital)";
  } else {
    title = "Digitale Anfrage";
  }

  const derivedValues = computeAllDerivedValues(answers);

  const lines: string[] = isNewBlockBased ? [] : [title];
  const semanticDocument: SemanticDocument = {
    sections: [
      { slot: 1, items: [] },
      { slot: 2, items: [] },
      { slot: 3, items: [] },
    ],
  };

  // --- Berechnete Werte (AGE, BMI, Pack-Years) ---
  const derivedValueLines = buildDerivedValueLines(derivedValues);
  const visibleQuestionIds = new Set<string>();
  if (input.frozenBlocks && input.frozenBlocks.length > 0) {
    const frozenByOrder = sortFrozenBlocksByLayout(input.frozenBlocks);
    const visibleBlockIds = computeVisibleBlockIds(
      frozenByOrder.flatMap((block) => block.conditionalRules),
      frozenByOrder,
      answers,
      derivedValues as Record<string, number>,
    );
    for (const block of frozenByOrder) {
      if (!visibleBlockIds.has(block.id)) continue;
      computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((question) => question.id),
        answers,
        derivedValues as Record<string, number>,
        buildOptionsByQuestionId(block.questions),
      ).forEach((id) => visibleQuestionIds.add(id));
    }
  } else {
    const legacyBlocks = buildFrozenBlocks(input.selected_block_ids);
    const visibleBlockIds = computeVisibleBlockIds(
      legacyBlocks.flatMap((block) => block.conditionalRules),
      legacyBlocks,
      answers,
      derivedValues as Record<string, number>,
    );
    for (const block of legacyBlocks) {
      if (!visibleBlockIds.has(block.id)) continue;
      computeVisibleQuestionIds(
        block.conditionalRules ?? [],
        block.questions.map((question) => question.id),
        answers,
        derivedValues as Record<string, number>,
        buildOptionsByQuestionId(block.questions),
      ).forEach((id) => visibleQuestionIds.add(id));
    }
  }
  const attentionHintLines = buildAttentionHintLines(
    computeQuestionnaireAttentionHints(answers, visibleQuestionIds),
  );
  if (!isNewBlockBased && (derivedValueLines.length > 0 || attentionHintLines.length > 0)) {
    lines.push("");
    lines.push("Berechnete Werte");
    lines.push(...derivedValueLines);
    lines.push(...attentionHintLines);
  }

  const seenQuestionIds = new Set<string>();

  if (input.frozenBlocks && input.frozenBlocks.length > 0) {
    // --- Phase 4: eingefrorene Blockstruktur verwenden ---
    // Nur Blöcke ausgeben, die von der Praxis ausgewählt wurden (initiallyVisible)
    // ODER tatsächlich Antworten haben (Folgeblocks, die sichtbar waren).
    const frozenByOrder = sortFrozenBlocksByLayout(input.frozenBlocks);
    const visibleBlockIds = computeVisibleBlockIds(
      frozenByOrder.flatMap((block) => block.conditionalRules),
      frozenByOrder,
      answers,
      derivedValues as Record<string, number>,
    );

    for (const block of frozenByOrder) {
      if (!visibleBlockIds.has(block.id)) continue;
      const blockItems: RenderedDocumentationItem[] = [];
      const medicalStatementSentences: string[] = [];
      const clinicalStatusSummary = isNewBlockBased && block.id === "HEALTH_CHECK_CLINICAL_STATUS"
        ? buildClinicalStatusSummary(block.questions, answers)
        : null;
      const condensedClinicalStatusIds = new Set(clinicalStatusSummary?.questionIds ?? []);

      const frozenVisibleIds = computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((q) => q.id),
        answers,
        derivedValues as Record<string, number>,
        buildOptionsByQuestionId(block.questions),
      );

      const useInlineDocumentation = isNewBlockBased &&
        block.documentationPresentation?.layout === "inline";
      if (useInlineDocumentation) {
        const inlineDocumentation = resolveInlineDocumentation(
          block,
          answers,
          frozenVisibleIds,
        );
        if (inlineDocumentation) {
          blockItems.push({
            type: resolveDocumentationItemType(block),
            text: inlineDocumentation,
            legacyText: inlineDocumentation,
          });
        }
        for (const question of block.questions) {
          if (frozenVisibleIds.has(question.id)) seenQuestionIds.add(question.id);
        }
      } else for (const question of block.questions) {
        if (!frozenVisibleIds.has(question.id)) continue;
        if (seenQuestionIds.has(question.id)) continue;
        if (condensedClinicalStatusIds.has(question.id)) continue;
        seenQuestionIds.add(question.id);
        if (block.id === "VOLLST_NIKOTIN" && hasNewSmokingStructure(answers) && SMOKING_PAIR_IDS.has(question.id)) continue;
        const raw = (answers[question.id] ?? "").trim();
        if (raw === "") continue;
        const omitQuestionLabel = omitMatchingBlockQuestionLabels
          && getLabel(question.id, question) === block.label;
        const useLegacyHealthCheckOutput = !useDocumentedContent
          && input.internalWorkflowId === "health_check_v1";

        if (question.id === "FACHAERZTE") {
          const formatted = formatFacharztEntries(raw);
          blockItems.push(...formatted.map((text) => ({
            type: resolveDocumentationItemType(block, question),
            text,
            legacyText: text,
          })));
          continue;
        }

        if (question.type === "repeatable_group") {
          const structuredVaccinations = formatStructuredVaccinationEntries(raw, question);
          if (structuredVaccinations.length > 0) {
            if (!omitQuestionLabel) {
              const heading = `${getLabel(question.id, question)}:`;
              blockItems.push({ type: "heading", text: heading, legacyText: heading });
            }
            blockItems.push(...structuredVaccinations.map((text) => ({
              type: resolveDocumentationItemType(block, question),
              text,
              legacyText: text,
            })));
            continue;
          }
          const formatted = formatRepeatableGroupEntries(question.id, raw, question, omitQuestionLabel);
          if (formatted.length > 0) {
            if (!omitQuestionLabel) {
              const heading = `${getLabel(question.id, question)}:`;
              blockItems.push({ type: "heading", text: heading, legacyText: heading });
            }
            blockItems.push(...formatted.map((text) => ({
              type: resolveDocumentationItemType(block, question),
              text,
              legacyText: text,
            })));
          }
          continue;
        }

        if (question.type === "confirmation") {
          if (raw === "true") {
            const text = `Bestätigt: ${question.text}`;
            blockItems.push({
              type: resolveDocumentationItemType(block, question),
              text,
              legacyText: text,
            });
          }
          continue;
        }

        if (
          question.presentation === "health_check_follow_up" ||
          (useLegacyHealthCheckOutput && question.id === "HEALTH_CHECK_FOLLOW_UP_REQUIRED")
        ) {
          const text = raw === "nein"
            ? "Keine weitere Abklärung oder Kontrolle erforderlich."
            : "Weiteres Vorgehen erforderlich";
          blockItems.push({
            type: resolveDocumentationItemType(block, question),
            text,
            legacyText: text,
          });
          continue;
        }

        if (
          useLegacyHealthCheckOutput &&
          question.type === "yes_no" &&
          getQuestionOptionValues(question).includes(raw)
        ) {
          const text = `${getLabel(question.id, question)}: ${raw}`;
          blockItems.push({
            type: resolveDocumentationItemType(block, question),
            text,
            legacyText: text,
          });
          continue;
        }

        const resolved = resolveQuestionDocumentation(question, raw, {
          includeUnit: isNewBlockBased,
        });
        if (block.id === "MEDICAL_STATEMENT") {
          medicalStatementSentences.push(...resolved.documentationTexts);
        } else {
          blockItems.push(...resolved.documentationTexts.map((text) => ({
            type: resolveDocumentationItemType(block, question),
            text,
            legacyText: text,
          })));
        }
        if (resolved.fallbackValue !== undefined) {
          const renderedLines = renderQuestionLines(
            question.id,
            resolved.fallbackValue,
            question,
            omitQuestionLabel,
          );
          if (renderedLines.length > 0) {
            blockItems.push({
              type: resolveDocumentationItemType(block, question),
              text: question.omitDocumentationLabel || LEGACY_UNLABELED_FREE_TEXT_IDS.has(question.id)
                ? resolved.fallbackValue
                : renderedLines.join("\n"),
              legacyText: renderedLines.join("\n"),
            });
          }
        }
      }

      if (block.id === "VOLLST_NIKOTIN") {
        blockItems.push(...renderSmokingSummary(answers).map((text) => ({
          type: "status" as const,
          text,
          legacyText: text,
        })));
      }
      if (clinicalStatusSummary) {
        blockItems.unshift({
          type: "status",
          text: clinicalStatusSummary.text,
          legacyText: clinicalStatusSummary.text,
        });
      }

      if (
        useDocumentedContent
          ? useInlineDocumentation
            ? blockItems.length === 0
            : !hasDocumentedBlockContent(block, answers, frozenVisibleIds)
          : blockItems.length === 0 && !includeEmptyBlocks
      ) continue;
      if (lines.length > 0) lines.push("");
      lines.push(block.label);
      const semanticSection = semanticDocument.sections[resolveDocumentSection(block) - 1];
      semanticSection.items.push({
        type: "heading",
        text: block.label,
        headingLevel: resolveHeadingLevel(block),
        headingVisibility: resolveHeadingVisibility(block),
        ...(block.omitStructuredHeading || block.id === "DOCUMENT_HANDLING"
          ? { includeInStructuredExport: false }
          : {}),
      });
      if (medicalStatementSentences.length > 0) {
        const statementText = joinMedicalStatementSentences(medicalStatementSentences);
        lines.push(statementText);
        semanticSection.items.push({
          type: resolveDocumentationItemType(block),
          text: statementText,
          legacyText: statementText,
        });
      }
      lines.push(...blockItems.map((item) => item.legacyText));
      semanticSection.items.push(...blockItems);
    }
  } else {
    // --- Legacy-Pfad: BLOCK_CATALOG / QUESTION_CATALOG ---
    const sortedBlocks = input.selected_block_ids
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .filter((id) => id in BLOCK_CATALOG)
      .map((id) => BLOCK_CATALOG[id])
      .sort((a, b) => a.displayOrder - b.displayOrder);

    for (const block of sortedBlocks) {
      const blockLines: string[] = [];
      for (const questionId of block.questionIds) {
        if (seenQuestionIds.has(questionId)) continue;
        seenQuestionIds.add(questionId);
        if (block.id === "VOLLST_NIKOTIN" && hasNewSmokingStructure(answers) && SMOKING_PAIR_IDS.has(questionId)) continue;
        if (!(questionId in QUESTION_CATALOG)) continue;
        const raw = (answers[questionId] ?? "").trim();
        if (raw === "") continue;

        if (questionId === "FACHAERZTE") {
          const formatted = formatFacharztEntries(raw);
          if (formatted.length > 0) blockLines.push(...formatted);
          continue;
        }

        if (QUESTION_CATALOG[questionId]?.type === "repeatable_group") {
          const question = QUESTION_CATALOG[questionId];
          const structuredVaccinations = question
            ? formatStructuredVaccinationEntries(raw, question)
            : [];
          if (structuredVaccinations.length > 0) {
            blockLines.push(`${getLabel(questionId)}:`);
            blockLines.push(...structuredVaccinations.map((text) => `  ${text}`));
            continue;
          }
          const formatted = formatRepeatableGroupEntries(questionId, raw);
          if (formatted.length > 0) {
            blockLines.push(`${getLabel(questionId)}:`);
            blockLines.push(...formatted);
          }
          continue;
        }

        blockLines.push(...renderQuestionLines(questionId, raw));
      }
      if (block.id === "VOLLST_NIKOTIN") {
        blockLines.push(...renderSmokingSummary(answers));
      }
      if (blockLines.length === 0) continue;
      lines.push("");
      lines.push(block.label);
      lines.push(...blockLines);
    }
  }

  const noteText = normalizeTextForPvs(lines.join("\n"));
  if (
    input.internalWorkflowId != null &&
    semanticDocument.sections.every((section) => section.items.length === 0) &&
    noteText !== ""
  ) {
    semanticDocument.sections[0].items.push({ type: "bodyText", text: noteText });
  }

  return {
    noteText,
    semanticDocument,
  };
}

export function buildMedicalRecordNote(input: MedicalRecordNoteInput): string {
  return buildMedicalRecordOutput(input).noteText;
}

export function buildSemanticMedicalRecordDocument(
  input: MedicalRecordNoteInput,
): SemanticDocument {
  return buildMedicalRecordOutput(input).semanticDocument;
}
