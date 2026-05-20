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
 *   - Nur Felder mit Wert werden ausgegeben.
 *   - Newlines in Textarea-Werten (insbesondere ADDRESS_POSTAL) bleiben
 *     erhalten und werden als Folgezeilen unterhalb des Labels emittiert.
 *   - Pro Zeile werden Inhalte > {@link MAX_LINE_LENGTH} Zeichen mit „…"
 *     abgeschnitten – Mehrzeiligkeit wird dabei nicht zerstört.
 *   - Keine medizinische Bewertung, keine Empfehlung.
 *   - Keine HTML-Ausgabe, nur Plaintext.
 */

import { BLOCK_CATALOG, QUESTION_CATALOG } from "./blockCatalog";

/** Eingabe-Subset einer PatientQuestionnaireSession. */
export type MedicalRecordNoteInput = {
  answers: Record<string, string> | null | undefined;
  selected_block_ids: string[];
  identity_gate_completed_at?: Date | null;
};

const MAX_LINE_LENGTH = 80;

/**
 * Kurz-Labels für die Krankenblatt-Ausgabe. Diese sind bewusst von
 * `QUESTION_CATALOG[id].text` (Patientenformulierung) entkoppelt, damit
 * der Krankenblatt-Text knapp lesbar bleibt. Für IDs ohne Eintrag wird
 * auf die lange Patientenfrage zurückgefallen.
 */
const SHORT_LABELS: Record<string, string> = {
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

  // Adresse
  ADDRESS_POSTAL: "Adresse",

  // Kurzanamnese
  ANAMNESE_GP: "Hausarzt",
  ANAMNESE_GP_NAME: "Name Hausarzt",
  ANAMNESE_HEIGHT: "Größe",
  ANAMNESE_WEIGHT: "Gewicht",
  ANAMNESE_CHRONIC: "Chronische Erkrankungen",
  ANAMNESE_HEREDITARY: "Erbkrankheiten",
  ANAMNESE_ALLERGIES: "Allergien",
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
};

/**
 * Werte-Transformationen pro questionId. Wird aktuell nur für die
 * historisch erwartete Title-Case-Ausgabe von `AU_IS_FOLLOWUP`
 * verwendet ("ja" → "Ja"). Andere Felder werden 1:1 ausgegeben –
 * die Patientenangabe ist die Wahrheit.
 */
const VALUE_TRANSFORMS: Record<string, Record<string, string>> = {
  AU_IS_FOLLOWUP: { ja: "Ja", nein: "Nein" },
};

function truncateLine(value: string): string {
  if (value.length <= MAX_LINE_LENGTH) return value;
  return value.slice(0, MAX_LINE_LENGTH - 1) + "…";
}

function getLabel(questionId: string): string {
  return SHORT_LABELS[questionId] ?? QUESTION_CATALOG[questionId]?.text ?? questionId;
}

function transformValue(questionId: string, raw: string): string {
  const transform = VALUE_TRANSFORMS[questionId];
  if (transform && raw in transform) return transform[raw];
  return raw;
}

/**
 * Zerlegt einen Antwort-Wert in eine erste „Label: …"-Zeile plus
 * optionale Folgezeilen (für Mehrzeilen-Textarea-Felder wie
 * ADDRESS_POSTAL). Liefert ein leeres Array, wenn nach dem Trim
 * nichts übrigbleibt.
 */
function renderQuestionLines(questionId: string, rawValue: string): string[] {
  const transformed = transformValue(questionId, rawValue);
  const parts = transformed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (parts.length === 0) return [];

  const label = getLabel(questionId);
  const lines: string[] = [`${label}: ${truncateLine(parts[0])}`];
  for (let i = 1; i < parts.length; i++) {
    lines.push(truncateLine(parts[i]));
  }
  return lines;
}

/**
 * Erzeugt einen blockbasierten Krankenblatt-Notiz-Text.
 *
 * @param input - answers + selected_block_ids einer PatientQuestionnaireSession
 * @returns Ein String, Zeilen getrennt mit \n
 */
export function buildMedicalRecordNote(input: MedicalRecordNoteInput): string {
  const answers: Record<string, string> = input.answers ?? {};
  const blockIds = new Set(input.selected_block_ids);

  const hasAU = blockIds.has("ARBEITSUNFAEHIGKEIT");
  const hasRezept = blockIds.has("REZEPT");
  const hasUeberweisung = blockIds.has("UEBERWEISUNG");
  const hasIdentitaet = blockIds.has("IDENTITAET");

  // --- Titel (unverändert zur bisherigen Logik) ---
  let title: string;
  if (hasAU && !hasRezept && !hasUeberweisung) {
    title = "AU-Anfrage (digital)";
  } else if (hasRezept && !hasAU && !hasUeberweisung) {
    title = "Rezeptanfrage (digital)";
  } else {
    title = "Digitale Anfrage";
  }

  const lines: string[] = [title];

  // --- Blöcke nach displayOrder iterieren ---
  const sortedBlocks = input.selected_block_ids
    .filter((id, idx, arr) => arr.indexOf(id) === idx) // Block-IDs eindeutig
    .filter((id) => id in BLOCK_CATALOG)
    .map((id) => BLOCK_CATALOG[id])
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const seenQuestionIds = new Set<string>();

  for (const block of sortedBlocks) {
    const blockLines: string[] = [];
    for (const questionId of block.questionIds) {
      if (seenQuestionIds.has(questionId)) continue;
      seenQuestionIds.add(questionId);
      if (!(questionId in QUESTION_CATALOG)) continue;
      const raw = (answers[questionId] ?? "").trim();
      if (raw === "") continue;
      blockLines.push(...renderQuestionLines(questionId, raw));
    }
    if (blockLines.length === 0) continue;
    // Leerzeile als optischer Block-Trenner.
    lines.push("");
    lines.push(block.label);
    lines.push(...blockLines);
  }

  // Fallback-Sonderzeile: nur ausgeben, wenn der IDENTITAET-Block nicht
  // Teil des Fragebogens war (sonst würde die Sonderzeile mit den
  // tatsächlichen Identitätsfeldern konkurrieren).
  if (!hasIdentitaet && input.identity_gate_completed_at) {
    lines.push("");
    lines.push("Identitätsabfrage erfolgt");
  }

  return lines.join("\n");
}
