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

function cleanEntry(
  raw: unknown,
  items: Map<string, VaccinationItem>,
): VaccinationEntry | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const vaccinationId = typeof source.vaccination_id === "string" ? source.vaccination_id : "";
  const item = items.get(vaccinationId);
  if (!item) return null;

  const status = typeof source.documented_status === "string" ? source.documented_status : "";
  if (!VACCINATION_STATUS_OPTIONS.includes(status as (typeof VACCINATION_STATUS_OPTIONS)[number])) return null;

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
    const rawDoses = typeof source.documented_doses === "string" ? source.documented_doses : "";
    const doses = parseMultiSelectValue(rawDoses, [...(item.doseOptions ?? VACCINATION_DOSE_OPTIONS)]);
    const uniqueDoses = [...new Set(doses)];
    if (uniqueDoses.includes("unklar")) {
      entry.documented_doses = "unklar";
    } else if (uniqueDoses.length > 0) {
      entry.documented_doses = uniqueDoses.join(", ");
    }
  }

  const rawAction = typeof source.further_action === "string" ? source.further_action : "";
  if (status !== "Vollständig vorhanden" && rawAction) {
    if (!VACCINATION_ACTION_OPTIONS.includes(rawAction as (typeof VACCINATION_ACTION_OPTIONS)[number])) return null;
    entry.further_action = rawAction;
  }

  if (entry.further_action && PLANNING_ACTIONS.has(entry.further_action)) {
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
      if (!/^[1-9]\d{0,4}$/.test(intervalValue) || !UNITS.has(intervalUnit)) return null;
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
  if (!Array.isArray(parsed)) return { ok: false, error: "Die Impfungsdaten sind ungültig." };

  const items = allowedItemMap(question);
  const seen = new Set<string>();
  const cleaned: VaccinationEntry[] = [];
  for (const rawEntry of parsed) {
    const entry = cleanEntry(rawEntry, items);
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
