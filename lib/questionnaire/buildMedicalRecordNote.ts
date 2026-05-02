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
  identity_gate_completed_at?: Date | null;
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
  const hasKurzanamnese = blockIds.has("KURZANAMNESE");
  const hasKontakt = blockIds.has("KONTAKT");
  const hasAdresse = blockIds.has("ADRESSE");

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
    addLine(lines, "Beschwerden", val(answers, "AU_SYMPTOMS"));
    addLine(lines, "Beginn", val(answers, "AU_START_DATE"));
    addLine(lines, "AU bis", val(answers, "AU_END_DATE"));
    const followup = val(answers, "AU_IS_FOLLOWUP");
    if (followup !== "") {
      addLine(
        lines,
        "Folge-AU",
        followup === "yes" ? "Ja" : followup === "no" ? "Nein" : followup,
      );
    }
  }

  // --- Rezept ---
  if (hasRezept) {
    addLine(lines, "Rezeptart", val(answers, "PRESCRIPTION_TYPE"));
    addLine(lines, "Medikament", val(answers, "PRESCRIPTION_MEDICATION"));
  }

  // --- Überweisung ---
  if (hasUeberweisung) {
    addLine(lines, "Fachrichtung", val(answers, "REF_SPECIALTY"));
    addLine(lines, "Facharzt", val(answers, "REF_DOCTOR_NAME"));
    addLine(lines, "Adresse Facharzt", val(answers, "REF_ADDRESS"));
    addLine(lines, "Termin vorhanden", val(answers, "REF_APPOINTMENT_EXISTS"));
    addLine(lines, "Termin", val(answers, "REF_APPOINTMENT_DATE"));
    addLine(lines, "Grund", val(answers, "REF_REASON"));
  }

  // --- Kurzanamnese ---
  if (hasKurzanamnese) {
    const kurzLines: string[] = [];
    addLine(kurzLines, "Hausarzt", val(answers, "ANAMNESE_GP"));
    const height = val(answers, "ANAMNESE_HEIGHT");
    const weight = val(answers, "ANAMNESE_WEIGHT");
    if (height && weight) {
      kurzLines.push(`Größe/Gewicht: ${height} / ${weight}`);
    } else if (height) {
      kurzLines.push(`Größe: ${height}`);
    } else if (weight) {
      kurzLines.push(`Gewicht: ${weight}`);
    }
    addLine(kurzLines, "Chronische Erkrankungen", val(answers, "ANAMNESE_CHRONIC"));
    addLine(kurzLines, "Allergien", val(answers, "ANAMNESE_ALLERGIES"));
    addLine(kurzLines, "Medikamente", val(answers, "ANAMNESE_MEDICATIONS"));
    if (kurzLines.length > 0) {
      lines.push("Kurzanamnese");
      lines.push(...kurzLines);
    }
  }

  // --- Kontakt / Adresse ---
  const contactLines: string[] = [];
  if (hasKontakt) {
    addLine(contactLines, "Tel.", val(answers, "CONTACT_PHONE"));
    addLine(contactLines, "E-Mail", val(answers, "CONTACT_EMAIL"));
    addLine(contactLines, "Doctolib", val(answers, "CONTACT_DOCTOLIB"));
  }
  if (hasAdresse) {
    addLine(contactLines, "Adresse", val(answers, "ADDRESS_POSTAL"));
  }
  if (contactLines.length > 0) {
    lines.push("Kontakt/Adresse");
    lines.push(...contactLines);
  }

  if (input.identity_gate_completed_at) {
    lines.push("Identitätsabfrage erfolgt");
  }

  return lines.join("\n");
}
