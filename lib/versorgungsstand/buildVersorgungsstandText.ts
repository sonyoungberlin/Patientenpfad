import type { CarePlanField } from "@/lib/carePlan/carePlanCatalog";
import {
  VERSORGUNGSSTAND_SECTIONS,
  ALLG_INFO_CHECKBOX_IDS,
  ALLG_INFO_CHECKBOX_LABELS,
} from "./versorgungsstandCatalog";

export type VersorgungsstandAnswers = Record<string, string | boolean>;

// ---------------------------------------------------------------------------
// Datum formatieren: ISO "YYYY-MM-DD" → "TT.MM.JJJJ"
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ---------------------------------------------------------------------------
// Prüft ob ein Feld einen sichtbaren Wert hat
// ---------------------------------------------------------------------------

function hasValue(field: CarePlanField, answers: VersorgungsstandAnswers): boolean {
  const raw = answers[field.id];
  if (field.kind === "checkbox") return raw === true;
  if (typeof raw === "string") return raw.trim() !== "";
  return false;
}

// ---------------------------------------------------------------------------
// Rendert ein einzelnes Nicht-rowGroup-Feld als Textzeilen
// ---------------------------------------------------------------------------

function renderField(field: CarePlanField, answers: VersorgungsstandAnswers): string[] {
  const raw = answers[field.id];

  if (field.kind === "checkbox") {
    return raw === true ? [`✓ ${field.label}`] : [];
  }

  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (trimmed === "") return [];

  if (field.kind === "date") {
    return [`${field.label}: ${formatDate(trimmed)}`];
  }

  if (field.kind === "textarea") {
    const lines = trimmed.split(/\r?\n/);
    if (lines.length === 1) return [`${field.label}: ${lines[0]}`];
    return [`${field.label}:`, ...lines.map((l) => `  ${l}`)];
  }

  return [`${field.label}: ${trimmed}`];
}

// ---------------------------------------------------------------------------
// Rendert eine rowGroup als beschrifteten Block (nicht als Zeilen-Join)
// ---------------------------------------------------------------------------

function renderRowGroup(
  groupFields: CarePlanField[],
  groupLabel: string,
  answers: VersorgungsstandAnswers,
): string[] {
  const lines: string[] = [];

  for (const field of groupFields) {
    const raw = answers[field.id];
    if (field.kind === "checkbox") {
      if (raw === true) lines.push(`✓ ${field.label}`);
      continue;
    }
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const trimmed = raw.trim();

    if (field.kind === "date") {
      lines.push(`${field.label}: ${formatDate(trimmed)}`);
    } else if (field.kind === "textarea") {
      const parts = trimmed.split(/\r?\n/);
      if (parts.length === 1) {
        lines.push(`${field.label}: ${parts[0]}`);
      } else {
        lines.push(`${field.label}:`);
        parts.forEach((l) => lines.push(`  ${l}`));
      }
    } else {
      lines.push(`${field.label}: ${trimmed}`);
    }
  }

  if (lines.length === 0) return [];
  return [groupLabel, ...lines];
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export function buildVersorgungsstandText(answers: VersorgungsstandAnswers): string {
  // Header
  const stichtag = typeof answers["allg_stichtag"] === "string" ? answers["allg_stichtag"].trim() : "";
  const header = stichtag ? `Versorgungsstand vom ${formatDate(stichtag)}` : "Versorgungsstand";

  const outputLines: string[] = [header];

  for (const section of VERSORGUNGSSTAND_SECTIONS) {
    const sectionLines: string[] = [];
    const processedGroups = new Set<string>();

    for (const field of section.fields) {
      // Informationsgrundlage-Checkboxen: am Ende der Sektion gebündelt ausgeben
      if ((ALLG_INFO_CHECKBOX_IDS as readonly string[]).includes(field.id)) continue;

      // Stichtag wird bereits im Header ausgegeben
      if (field.id === "allg_stichtag") continue;

      if (field.rowGroup) {
        if (processedGroups.has(field.rowGroup)) continue;
        processedGroups.add(field.rowGroup);

        const groupFields = section.fields.filter((f) => f.rowGroup === field.rowGroup);
        const groupLabel = field.rowGroupLabel ?? field.rowGroup;
        const groupLines = renderRowGroup(groupFields, groupLabel, answers);
        if (groupLines.length > 0) {
          if (sectionLines.length > 0) sectionLines.push("");
          sectionLines.push(...groupLines);
        }
      } else {
        sectionLines.push(...renderField(field, answers));
      }
    }

    // Informationsgrundlage bündeln (nur für section_allgemein)
    if (section.id === "section_allgemein") {
      const activeLabels = ALLG_INFO_CHECKBOX_IDS
        .filter((id) => answers[id] === true)
        .map((id) => ALLG_INFO_CHECKBOX_LABELS[id]);
      if (activeLabels.length > 0) {
        sectionLines.push(`Informationsgrundlage: ${activeLabels.join(", ")}`);
      }
      const sonstigesText = typeof answers["allg_info_sonstiges_text"] === "string"
        ? answers["allg_info_sonstiges_text"].trim()
        : "";
      if (sonstigesText) {
        sectionLines.push(`Sonstige Informationsgrundlage / Hinweis: ${sonstigesText}`);
      }
    }

    if (sectionLines.length === 0) continue;

    outputLines.push("");
    outputLines.push(section.title);
    outputLines.push(...sectionLines);
  }

  return outputLines.join("\n");
}
