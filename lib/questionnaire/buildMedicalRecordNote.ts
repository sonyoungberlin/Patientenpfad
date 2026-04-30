/**
 * Erzeugt einen kompakten, kopierbaren Krankenblatt-Text für eine
 * PatientQuestionnaireSession.
 *
 * Regeln:
 * - Maximal 5–10 Zeilen
 * - Nur Felder mit Wert werden ausgegeben
 * - Keine medizinische Bewertung, keine Empfehlung
 * - Lange Freitexte werden auf eine Zeile (max. 80 Zeichen) gekürzt
 */

/** Eingabe-Subset einer PatientQuestionnaireSession. */
export type MedicalRecordNoteInput = {
  answers: Record<string, string> | null | undefined;
  selected_block_ids: string[];
};

const MAX_FREETEXT_LENGTH = 80;

function truncate(value: string): string {
  const singleLine = value.replace(/\s*\n\s*/g, " ").trim();
  if (singleLine.length <= MAX_FREETEXT_LENGTH) return singleLine;
  return singleLine.slice(0, MAX_FREETEXT_LENGTH - 1) + "…";
}

function val(answers: Record<string, string>, id: string): string {
  return (answers[id] ?? "").trim();
}

function present(answers: Record<string, string>, id: string): boolean {
  return val(answers, id) !== "";
}

function addLine(lines: string[], label: string, value: string): void {
  const trimmed = truncate(value);
  if (trimmed !== "") {
    lines.push(`${label}: ${trimmed}`);
  }
}

/**
 * Erzeugt einen kompakten Krankenblatt-Notiz-Text.
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
  const hasKontakt = blockIds.has("KONTAKT");

  // --- Titel ---
  let title: string;
  if (hasAU && !hasRezept && !hasUeberweisung) {
    title = "AU-Anfrage (digital)";
  } else if (hasRezept && !hasAU && !hasUeberweisung) {
    title = "Rezeptanfrage (digital)";
  } else {
    title = "Digitale Anfrage";
  }

  const lines: string[] = [title];

  // --- AU ---
  if (hasAU) {
    const symptoms = val(answers, "AU_SYMPTOMS");
    if (symptoms !== "") {
      lines.push(`Beschwerden: ${truncate(symptoms)}`);
    }
    if (present(answers, "AU_START_DATE")) {
      lines.push(`Beginn: ${val(answers, "AU_START_DATE")}`);
    }
  }

  // --- Rezept ---
  if (hasRezept) {
    if (present(answers, "PRESCRIPTION_TYPE")) {
      lines.push(`Rezeptart: ${val(answers, "PRESCRIPTION_TYPE")}`);
    }
    const med = val(answers, "PRESCRIPTION_MEDICATION");
    if (med !== "") {
      addLine(lines, "Medikament", med);
    }
  }

  // --- Überweisung ---
  if (hasUeberweisung) {
    if (present(answers, "REF_SPECIALTY")) {
      lines.push(`Fachrichtung: ${val(answers, "REF_SPECIALTY")}`);
    }
    const appt = val(answers, "REF_APPOINTMENT_EXISTS");
    if (appt !== "") {
      lines.push(`Termin vereinbart: ${appt}`);
    }
  }

  // --- Kontakt ---
  if (hasKontakt && present(answers, "CONTACT_PHONE")) {
    lines.push(`Tel.: ${val(answers, "CONTACT_PHONE")}`);
  }

  return lines.join("\n");
}
