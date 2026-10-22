import { OfficeCheckpointState, type OfficeCheckpointSnapshot } from "@/lib/office/types";

export type OfficeDueStatus = "overdue" | "due_soon" | "upcoming" | "none";

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function subtractCalendarMonths(dateOnly: string, months: number): string | null {
  const date = parseDateOnly(dateOnly);
  if (!date) return null;
  const targetMonth = date.getUTCMonth() - months;
  const target = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return formatDateOnly(target);
}

export function subtractDays(dateOnly: string, days: number): string | null {
  const date = parseDateOnly(dateOnly);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() - days);
  return formatDateOnly(date);
}

export function getCheckpointDueStatus(
  checkpoint: OfficeCheckpointSnapshot,
  today = (() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  })(),
): OfficeDueStatus {
  if (
    checkpoint.state === OfficeCheckpointState.YES ||
    checkpoint.state === OfficeCheckpointState.NOT_REQUIRED ||
    !checkpoint.deadline
  ) {
    return "none";
  }
  const deadline = parseDateOnly(checkpoint.deadline);
  const todayDate = parseDateOnly(today);
  if (!deadline || !todayDate) return "none";
  if (deadline < todayDate) return "overdue";
  const threshold = new Date(todayDate);
  threshold.setUTCDate(threshold.getUTCDate() + 30);
  return deadline <= threshold ? "due_soon" : "upcoming";
}
