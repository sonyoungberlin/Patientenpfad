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
import type { QuestionDefinition } from "./blockCatalog";
import type { FrozenBlock } from "./frozenBlocks";
import { computeAllDerivedValues } from "./derivedValues";
import { computeVisibleQuestionIds } from "./conditionalLogic";
import { buildDerivedValueLines } from "./formatAnswer";

/** Eingabe-Subset einer PatientQuestionnaireSession. */
export type MedicalRecordNoteInput = {
  answers: Record<string, string> | null | undefined;
  selected_block_ids: string[];
  /** Phase 4: eingefrorene Block-Struktur. NULL = Legacy-Pfad. */
  frozenBlocks?: FrozenBlock[] | null;
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
  NIKOTIN_DAUER_JAHRE: "Rauchdauer (ca. Jahre)",
  NIKOTIN_ZIG_PRO_TAG: "Zigaretten/Tag",
  NIKOTIN_AUFGEHOERT_VOR: "Aufgehört vor (ca. Jahren)",
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

function truncateLine(value: string): string {
  if (value.length <= MAX_LINE_LENGTH) return value;
  return value.slice(0, MAX_LINE_LENGTH - 1) + "…";
}

/**
 * Formatiert eine repeatable_group-Antwort für die Krankenblatt-Ausgabe.
 * Verwendet die übergebene QuestionDefinition (eingefroren oder aus Catalog).
 */
function formatRepeatableGroupEntries(
  questionId: string,
  jsonValue: string,
  questionDef?: QuestionDefinition,
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

    lines.push(`  ${idx + 1}. Eintrag:`);

    for (const field of def.groupSchema!) {
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
        for (const p of parts) lines.push(`       ${truncateLine(p.trim())}`);
      } else {
        lines.push(`     ${field.label}: ${truncateLine(trimmed)}`);
      }
    }
  });

  return lines;
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
        lines.push(`       ${truncateLine(line.trim())}`);
      });
    }

    const bereich = (entry as Record<string, unknown>).bereich;
    if (typeof bereich === "string" && bereich.trim() !== "") {
      lines.push(`     Facharztbereich: ${truncateLine(bereich.trim())}`);
    }

    const name = (entry as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim() !== "") {
      lines.push(`     Name: ${truncateLine(name.trim())}`);
    }

    const adresse = (entry as Record<string, unknown>).adresse;
    if (typeof adresse === "string" && adresse.trim() !== "") {
      const parts = adresse
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      lines.push("     Adresse:");
      parts.forEach((line) => {
        lines.push(`       ${truncateLine(line.trim())}`);
      });
    }
  });

  return lines;
}

function getLabel(questionId: string): string {
  return SHORT_LABELS[questionId] ?? QUESTION_CATALOG[questionId]?.text ?? questionId;
}

function transformValue(questionId: string, raw: string): string {
  const transform = VALUE_TRANSFORMS[questionId];
  if (transform && raw in transform) return transform[raw];
  // yes_no-Felder geben "ja"/"nein" zurück – für die Praxis groß schreiben
  if (QUESTION_CATALOG[questionId]?.type === "yes_no" && raw.length > 0) {
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

  let title: string;
  if (hasAU && !hasRezept && !hasUeberweisung) {
    title = "AU-Anfrage (digital)";
  } else if (hasRezept && !hasAU && !hasUeberweisung) {
    title = "Rezeptanfrage (digital)";
  } else {
    title = "Digitale Anfrage";
  }

  const derivedValues = computeAllDerivedValues(answers);

  const lines: string[] = [title];

  // --- Berechnete Werte (AGE, BMI, Pack-Years) ---
  const derivedValueLines = buildDerivedValueLines(derivedValues);
  if (derivedValueLines.length > 0) {
    lines.push("");
    lines.push("Berechnete Werte");
    lines.push(...derivedValueLines);
  }

  const seenQuestionIds = new Set<string>();

  if (input.frozenBlocks && input.frozenBlocks.length > 0) {
    // --- Phase 4: eingefrorene Blockstruktur verwenden ---
    // Nur Blöcke ausgeben, die von der Praxis ausgewählt wurden (initiallyVisible)
    // ODER tatsächlich Antworten haben (Folgeblocks, die sichtbar waren).
    const frozenByOrder = [...input.frozenBlocks].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

    for (const block of frozenByOrder) {
      const blockLines: string[] = [];

      const frozenVisibleIds = computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((q) => q.id),
        answers,
        derivedValues as Record<string, number>,
      );

      for (const question of block.questions) {
        if (!frozenVisibleIds.has(question.id)) continue;
        if (seenQuestionIds.has(question.id)) continue;
        seenQuestionIds.add(question.id);
        const raw = (answers[question.id] ?? "").trim();
        if (raw === "") continue;

        if (question.id === "FACHAERZTE") {
          const formatted = formatFacharztEntries(raw);
          if (formatted.length > 0) blockLines.push(...formatted);
          continue;
        }

        if (question.type === "repeatable_group") {
          const formatted = formatRepeatableGroupEntries(question.id, raw, question);
          if (formatted.length > 0) {
            blockLines.push(`${getLabel(question.id)}:`);
            blockLines.push(...formatted);
          }
          continue;
        }

        if (question.type === "confirmation") {
          if (raw === "true") {
            blockLines.push(`Bestätigt: ${truncateLine(question.text)}`);
          }
          continue;
        }

        blockLines.push(...renderQuestionLines(question.id, raw));
      }

      if (blockLines.length === 0) continue;
      lines.push("");
      lines.push(block.label);
      lines.push(...blockLines);
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
        if (!(questionId in QUESTION_CATALOG)) continue;
        const raw = (answers[questionId] ?? "").trim();
        if (raw === "") continue;

        if (questionId === "FACHAERZTE") {
          const formatted = formatFacharztEntries(raw);
          if (formatted.length > 0) blockLines.push(...formatted);
          continue;
        }

        if (QUESTION_CATALOG[questionId]?.type === "repeatable_group") {
          const formatted = formatRepeatableGroupEntries(questionId, raw);
          if (formatted.length > 0) {
            blockLines.push(`${getLabel(questionId)}:`);
            blockLines.push(...formatted);
          }
          continue;
        }

        blockLines.push(...renderQuestionLines(questionId, raw));
      }
      if (blockLines.length === 0) continue;
      lines.push("");
      lines.push(block.label);
      lines.push(...blockLines);
    }
  }

  return lines.join("\n");
}
