import { parseMultiSelectValue } from "./multiSelect";
import {
  VACCINATION_ACTION_OPTIONS,
  VACCINATION_DOSE_OPTIONS,
  VACCINATION_STATUS_OPTIONS,
} from "./vaccinationReviewCatalog";
import type { QuestionDefinition } from "./blockCatalog";

const PLANNING_ACTIONS = new Set<string>([
  "Impfung ärztlich empfohlen",
  "Durchführung geplant / vereinbart",
]);
const UNITS = new Set(["Tage", "Wochen", "Monate"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type VaccinationItem = NonNullable<QuestionDefinition["vaccinationItems"]>[number];

type VaccinationEntry = Record<string, string>;

export const STRUCTURED_VACCINATION_SCHEMA_VERSION = 1 as const;

export type VaccinationAssessment =
  | "recommended"
  | "possible"
  | "clarify_first"
  | "not_recommended";

export type VaccinationStatus = "complete" | "open" | "planned";
/** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
export type VaccinationImplementationStatus = "open" | "planned";
export type VaccinationDoseStatus = "done" | "open" | "planned";

export type StructuredVaccinationDose = {
  number: number;
  status: VaccinationDoseStatus;
  note?: string;
  recommended_interval_value?: number;
  recommended_interval_unit?: "weeks" | "months";
  /** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
  date?: string;
  /** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
  recommendedInterval?: string;
};

export type StructuredVaccinationEntry = {
  vaccination_id: string;
  custom_label?: string;
  status?: VaccinationStatus;
  note?: string;
  /** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
  medical_assessment?: VaccinationAssessment;
  /** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
  clarification_note?: string;
  /** @deprecated Nur zum konservativen Lesen bereits gespeicherter Antworten. */
  implementation_status?: VaccinationImplementationStatus;
  doses?: StructuredVaccinationDose[];
  legacy?: {
    documented_status?: string;
    documented_doses?: string;
    further_action?: string;
    note?: string;
  };
};

export type StructuredVaccinationAnswer = {
  schema_version: typeof STRUCTURED_VACCINATION_SCHEMA_VERSION;
  entries: StructuredVaccinationEntry[];
  supplemental_note?: string;
};

const ASSESSMENT_LABELS: Record<VaccinationAssessment, string> = {
  recommended: "empfohlen",
  possible: "kann erfolgen",
  clarify_first: "vorher klären",
  not_recommended: "derzeit nicht empfohlen",
};

const DOSE_STATUS_LABELS: Record<VaccinationDoseStatus, string> = {
  done: "erfolgt",
  open: "offen",
  planned: "geplant",
};

const ASSESSMENTS = new Set<VaccinationAssessment>(Object.keys(ASSESSMENT_LABELS) as VaccinationAssessment[]);
const DOSE_STATUSES = new Set<VaccinationDoseStatus>(Object.keys(DOSE_STATUS_LABELS) as VaccinationDoseStatus[]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

export function adaptLegacyVaccinationEntry(
  raw: Record<string, unknown>,
): StructuredVaccinationEntry | null {
  const vaccinationId = cleanOptionalText(raw.vaccination_id, 100);
  if (!vaccinationId) return null;

  const entry: StructuredVaccinationEntry = {
    vaccination_id: vaccinationId,
  };
  const customLabel = cleanOptionalText(raw.custom_label, 120);
  if (customLabel) entry.custom_label = customLabel;

  const legacy: NonNullable<StructuredVaccinationEntry["legacy"]> = {};
  const documentedStatus = cleanOptionalText(raw.documented_status, 80);
  const documentedDoses = cleanOptionalText(raw.documented_doses, 200);
  const furtherAction = cleanOptionalText(raw.further_action, 100);
  const note = cleanOptionalText(raw.note, 2000);
  if (documentedStatus) legacy.documented_status = documentedStatus;
  if (documentedDoses) legacy.documented_doses = documentedDoses;
  if (furtherAction) legacy.further_action = furtherAction;
  if (note) legacy.note = note;
  if (Object.keys(legacy).length > 0) entry.legacy = legacy;

  return entry;
}

function normalizeStructuredDose(raw: unknown): StructuredVaccinationDose | null {
  if (!isRecord(raw) || typeof raw.number !== "number" || !Number.isInteger(raw.number) || raw.number < 1) {
    return null;
  }
  if (typeof raw.status !== "string" || !DOSE_STATUSES.has(raw.status as VaccinationDoseStatus)) return null;
  const dose: StructuredVaccinationDose = {
    number: raw.number,
    status: raw.status as VaccinationDoseStatus,
  };
  const note = cleanOptionalText(raw.note, 2000);
  if (note) dose.note = note;
  if (raw.recommended_interval_value !== undefined) {
    if (typeof raw.recommended_interval_value !== "number"
      || !Number.isInteger(raw.recommended_interval_value)
      || raw.recommended_interval_value < 1
      || raw.recommended_interval_value > 9999) return null;
    dose.recommended_interval_value = raw.recommended_interval_value;
  }
  if (raw.recommended_interval_unit !== undefined) {
    if (raw.recommended_interval_unit !== "weeks" && raw.recommended_interval_unit !== "months") return null;
    dose.recommended_interval_unit = raw.recommended_interval_unit;
  }
  if ((dose.recommended_interval_value === undefined) !== (dose.recommended_interval_unit === undefined)) return null;
  const date = cleanOptionalText(raw.date, 10);
  const interval = cleanOptionalText(raw.recommendedInterval, 100);
  if (date) dose.date = date;
  if (interval) dose.recommendedInterval = interval;
  return dose;
}

export function normalizeStructuredVaccinationAnswer(raw: unknown): StructuredVaccinationAnswer | null {
  if (!isRecord(raw) || raw.schema_version !== STRUCTURED_VACCINATION_SCHEMA_VERSION || !Array.isArray(raw.entries)) {
    return null;
  }

  const entries: StructuredVaccinationEntry[] = [];
  const seen = new Set<string>();
  for (const value of raw.entries) {
    if (!isRecord(value)) return null;
    const vaccinationId = cleanOptionalText(value.vaccination_id, 100);
    if (!vaccinationId || seen.has(vaccinationId)) return null;
    seen.add(vaccinationId);
    const entry: StructuredVaccinationEntry = { vaccination_id: vaccinationId };
    const customLabel = cleanOptionalText(value.custom_label, 120);
    const status = value.status;
    const note = cleanOptionalText(value.note, 2000);
    const assessment = value.medical_assessment;
    const clarificationNote = cleanOptionalText(value.clarification_note, 2000);
    const implementationStatus = value.implementation_status;
    if (customLabel) entry.custom_label = customLabel;
    if (status !== undefined) {
      if (status !== "complete" && status !== "open" && status !== "planned") return null;
      entry.status = status;
    }
    if (note) entry.note = note;
    if (assessment !== undefined) {
      if (typeof assessment !== "string" || !ASSESSMENTS.has(assessment as VaccinationAssessment)) return null;
      entry.medical_assessment = assessment as VaccinationAssessment;
    }
    if (clarificationNote) entry.clarification_note = clarificationNote;
    if (implementationStatus !== undefined) {
      if (implementationStatus !== "open" && implementationStatus !== "planned") return null;
      entry.implementation_status = implementationStatus;
    }
    if (value.doses !== undefined) {
      if (!Array.isArray(value.doses)) return null;
      const doses = value.doses.map(normalizeStructuredDose);
      if (doses.some((dose) => dose === null)) return null;
      const normalizedDoses = doses as StructuredVaccinationDose[];
      if (new Set(normalizedDoses.map((dose) => dose.number)).size !== normalizedDoses.length) return null;
      entry.doses = normalizedDoses.sort((left, right) => left.number - right.number);
    }
    entries.push(entry);
  }
  const supplementalNote = cleanOptionalText(raw.supplemental_note, 2000);
  return {
    schema_version: STRUCTURED_VACCINATION_SCHEMA_VERSION,
    entries,
    ...(supplementalNote ? { supplemental_note: supplementalNote } : {}),
  };
}

export function structuredVaccinationAnswerHasContent(answer: StructuredVaccinationAnswer): boolean {
  return Boolean(answer.supplemental_note) || answer.entries.some((entry) =>
    Object.entries(entry).some(([key, value]) => {
      if (key === "vaccination_id") return false;
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    }),
  );
}

export function parseStructuredVaccinationAnswer(value: string): StructuredVaccinationAnswer | null {
  try {
    return normalizeStructuredVaccinationAnswer(JSON.parse(value));
  } catch {
    return null;
  }
}

export function countEditedVaccinations(answer: StructuredVaccinationAnswer): number {
  return answer.entries.filter((entry) => Object.keys(entry).some((key) => key !== "vaccination_id")).length;
}

export function countExplicitlyOpenVaccinations(answer: StructuredVaccinationAnswer): number {
  return answer.entries.filter((entry) => entry.status === "open"
    || entry.implementation_status === "open"
    || entry.doses?.some((dose) => dose.status === "open")).length;
}

export function formatStructuredVaccinationEntry(
  entry: StructuredVaccinationEntry,
  label: string,
): string {
  const parts: string[] = [];
  if (entry.status) {
    const statusLabel = entry.status === "complete" ? "vollständig" : entry.status === "open" ? "offen" : "geplant";
    parts.push(`${statusLabel}${entry.note ? ` – ${entry.note}` : ""}`);
  } else if (entry.implementation_status) {
    parts.push(entry.implementation_status === "planned" ? "Durchführung geplant" : "Durchführung offen");
  } else if (entry.medical_assessment) {
    parts.push(ASSESSMENT_LABELS[entry.medical_assessment]);
    if (entry.clarification_note) parts.push(`- ${entry.clarification_note}`);
  }
  if (entry.doses?.length) {
    parts.push(entry.doses.map((dose) => {
      let interval = "";
      if (dose.recommended_interval_value && dose.recommended_interval_unit) {
        interval = `, empfohlen in ${dose.recommended_interval_value} ${dose.recommended_interval_unit === "weeks" ? "Wochen" : "Monaten"}`;
      } else if (dose.recommendedInterval) {
        interval = dose.recommendedInterval.startsWith("in ") ? ` ${dose.recommendedInterval}` : ` in ${dose.recommendedInterval}`;
      }
      const date = dose.date ? `am ${formatVaccinationDate(dose.date)}` : "";
      return `${dose.number}. Dosis ${DOSE_STATUS_LABELS[dose.status]}${interval}${date ? ` ${date}` : ""}${dose.note ? ` – ${dose.note}` : ""}`;
    }).join(", "));
  }
  return `${label}: ${parts.join("; ")}`;
}

export function calculateNextVaccinationDate(
  referenceDate: string,
  intervalValue: string,
  intervalUnit: string,
): string | null {
  if (!DATE_PATTERN.test(referenceDate)) return null;
  if (!/^[1-9]\d{0,4}$/.test(intervalValue)) return null;
  if (!UNITS.has(intervalUnit)) return null;

  const [year, month, day] = referenceDate.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  if (
    base.getUTCFullYear() !== year ||
    base.getUTCMonth() !== month - 1 ||
    base.getUTCDate() !== day
  ) return null;

  const amount = Number(intervalValue);
  if (intervalUnit === "Tage" || intervalUnit === "Wochen") {
    base.setUTCDate(base.getUTCDate() + amount * (intervalUnit === "Wochen" ? 7 : 1));
  } else {
    const targetMonth = base.getUTCMonth() + amount;
    const targetYear = base.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    base.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
  }

  return [
    base.getUTCFullYear().toString().padStart(4, "0"),
    (base.getUTCMonth() + 1).toString().padStart(2, "0"),
    base.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

export function formatVaccinationDate(value: string): string {
  if (!DATE_PATTERN.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function isValidDate(value: string): boolean {
  return calculateNextVaccinationDate(value, "1", "Tage") !== null;
}

function allowedItemMap(question: QuestionDefinition): Map<string, VaccinationItem> {
  return new Map((question.vaccinationItems ?? []).map((item) => [item.id, item as VaccinationItem]));
}

function schemaOptions(question: QuestionDefinition, key: string, fallback: readonly string[]): string[] {
  if (question.vaccinationSchemaVersion !== 2) return [...fallback];
  return question.groupSchema?.find((field) => field.key === key)?.options ?? [];
}

function normalizeSelection(raw: unknown, options: string[], unclearValue = "unklar"): string | null {
  const value = typeof raw === "string" ? raw : "";
  const allowed = new Set(options);
  const selected = [...new Set(parseMultiSelectValue(value, options).filter((option) => allowed.has(option)))];
  if (selected.includes(unclearValue)) return unclearValue;
  return selected.length > 0 ? selected.join(", ") : null;
}

function copyV2Documentation(
  source: Record<string, unknown>,
  entry: VaccinationEntry,
  item: VaccinationItem,
): boolean {
  if (item.documentationMode === "component_group") {
    for (const component of item.componentFields ?? []) {
      const value = normalizeSelection(source[component.key], component.options);
      if (value) entry[component.key] = value;
    }
    return true;
  }
  if (item.documentationMode === "season") {
    const season = typeof source.documented_season === "string"
      ? source.documented_season.trim().slice(0, 30)
      : "";
    const date = typeof source.documented_date === "string" ? source.documented_date : "";
    if (season) entry.documented_season = season;
    if (date) {
      if (!isValidDate(date)) return false;
      entry.documented_date = date;
    }
    return true;
  }
  if (item.documentationMode === "subtype") {
    const subtypes = normalizeSelection(source.documented_subtypes, item.subtypeOptions ?? [], "Serogruppe unklar");
    if (subtypes) entry.documented_subtypes = subtypes;
    return true;
  }
  if (item.documentationMode === "free_text") return true;

  const doses = normalizeSelection(source.documented_doses, item.doseOptions ?? []);
  if (doses) entry.documented_doses = doses;
  return true;
}

function cleanEntry(
  raw: unknown,
  items: Map<string, VaccinationItem>,
  question: QuestionDefinition,
): VaccinationEntry | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const vaccinationId = typeof source.vaccination_id === "string" ? source.vaccination_id : "";
  const item = items.get(vaccinationId);
  if (!item) return null;

  const status = typeof source.documented_status === "string" ? source.documented_status : "";
  const statusOptions = schemaOptions(question, "documented_status", VACCINATION_STATUS_OPTIONS);
  if (!statusOptions.includes(status)) return null;

  const entry: VaccinationEntry = {
    vaccination_id: vaccinationId,
    documented_status: status,
  };
  if (vaccinationId === "other") {
    const customLabel = typeof source.custom_label === "string" ? source.custom_label.trim().slice(0, 120) : "";
    if (!customLabel) return null;
    entry.custom_label = customLabel;
  }

  if (status === "Teilweise vorhanden") {
    if (question.vaccinationSchemaVersion === 2) {
      if (!copyV2Documentation(source, entry, item)) return null;
    } else {
      const doses = normalizeSelection(
        source.documented_doses,
        item.doseOptions ?? [...VACCINATION_DOSE_OPTIONS],
      );
      if (doses) entry.documented_doses = doses;
    }
  }

  const rawAction = typeof source.further_action === "string" ? source.further_action : "";
  if (status !== "Vollständig vorhanden" && rawAction) {
    const actionOptions = schemaOptions(question, "further_action", VACCINATION_ACTION_OPTIONS);
    if (!actionOptions.includes(rawAction)) return null;
    entry.further_action = rawAction;
  }

  const planningActions = question.vaccinationSchemaVersion === 2
    ? new Set(question.groupSchema?.find((field) => field.key === "note")?.conditionalValues ?? [])
    : PLANNING_ACTIONS;
  if (entry.further_action && planningActions.has(entry.further_action)) {
    const note = typeof source.note === "string" ? source.note.trim().slice(0, 2000) : "";
    const referenceDate = typeof source.reference_date === "string" ? source.reference_date : "";
    const intervalValue = typeof source.interval_value === "string" ? source.interval_value : "";
    const intervalUnit = typeof source.interval_unit === "string" ? source.interval_unit : "";
    if (note) entry.note = note;
    if (referenceDate) {
      if (!isValidDate(referenceDate)) return null;
      entry.reference_date = referenceDate;
    }
    if (intervalValue || intervalUnit) {
      const units = question.vaccinationSchemaVersion === 2
        ? new Set(schemaOptions(question, "interval_unit", []))
        : UNITS;
      if (!/^[1-9]\d{0,4}$/.test(intervalValue) || !units.has(intervalUnit)) return null;
      entry.interval_value = intervalValue;
      entry.interval_unit = intervalUnit;
      if (!referenceDate) return null;
      const nextDate = calculateNextVaccinationDate(referenceDate, intervalValue, intervalUnit);
      if (!nextDate) return null;
      entry.next_date = nextDate;
    }
  }

  return entry;
}

export function normalizeVaccinationReviewAnswers(
  answers: Record<string, string>,
  question: QuestionDefinition,
): { ok: true; answers: Record<string, string> } | { ok: false; error: string } {
  const raw = answers[question.id];
  if (!raw || raw === "[]") return { ok: true, answers: { ...answers, [question.id]: "" } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Die Impfungsdaten sind ungültig." };
  }
  if (isRecord(parsed) && parsed.schema_version === STRUCTURED_VACCINATION_SCHEMA_VERSION) {
    const normalized = normalizeStructuredVaccinationAnswer(parsed);
    if (!normalized) return { ok: false, error: "Die Impfungsdaten enthalten ungültige Werte." };
    return {
      ok: true,
      answers: { ...answers, [question.id]: JSON.stringify(normalized) },
    };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "Die Impfungsdaten sind ungültig." };

  const items = allowedItemMap(question);
  const seen = new Set<string>();
  const cleaned: VaccinationEntry[] = [];
  for (const rawEntry of parsed) {
    const entry = cleanEntry(rawEntry, items, question);
    if (!entry) return { ok: false, error: "Die Impfungsdaten enthalten ungültige Werte." };
    if (seen.has(entry.vaccination_id)) return { ok: false, error: "Eine Impfung wurde mehrfach angegeben." };
    seen.add(entry.vaccination_id);
    cleaned.push(entry);
  }

  return {
    ok: true,
    answers: { ...answers, [question.id]: cleaned.length > 0 ? JSON.stringify(cleaned) : "" },
  };
}

export function getVaccinationLabel(
  entry: Record<string, string>,
  question: QuestionDefinition,
): string {
  if (entry.vaccination_id === "other") return entry.custom_label ?? "Weitere Impfung";
  return question.vaccinationItems?.find((item) => item.id === entry.vaccination_id)?.label
    ?? entry.vaccination_id;
}

export const VACCINATION_PLANNING_ACTIONS = PLANNING_ACTIONS;
