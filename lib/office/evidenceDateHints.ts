// EvidenceDateHint & EvidenceDateStatus Typen und Resolver

export type EvidenceDateHint = {
  issuedAt?: string;      // ISO YYYY-MM-DD
  receivedAt?: string;    // ISO YYYY-MM-DD
  performedAt?: string;   // ISO YYYY-MM-DD
  detectedAt?: string;    // ISO YYYY-MM-DD
  validUntil?: string;    // ISO YYYY-MM-DD (manuelles Override)
  nextDueAt?: string;     // ISO YYYY-MM-DD (manuelles Override)
  deadlineAt?: string;    // ISO YYYY-MM-DD (manuelles Override)
};

export type EvidenceDateStatus = {
  evidenceId: string;
  issuedAt?: string;
  receivedAt?: string;
  performedAt?: string;
  detectedAt?: string;
  validUntil?: string;    // berechnet oder Override
  nextDueAt?: string;     // berechnet oder Override
  deadlineAt?: string;    // manuell oder Fallback
  isExpired?: boolean;
  isDueSoon?: boolean;
  isOverdue?: boolean;
};

export type EvidenceDateResolverOptions = {
  today?: string; // ISO YYYY-MM-DD, für Tests
  dueSoonDays?: number; // Schwelle für isDueSoon, Default 30
};

function parseISO(date: string | undefined): Date | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const d = new Date(date);
  return isNaN(d.getTime()) ? undefined : d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function dateToISO(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString().slice(0, 10);
}

export function resolveEvidenceDateStatus(
  evidenceId: string,
  hint: EvidenceDateHint = {},
  catalog: { validityMonths?: number; recurrenceMonths?: number },
  checkpointDeadline?: string,
  options?: EvidenceDateResolverOptions
): EvidenceDateStatus {
  const todayStr = options?.today || new Date().toISOString().slice(0, 10);
  const today = parseISO(todayStr) || new Date();
  const dueSoonDays = options?.dueSoonDays ?? 30;

  // validUntil
  let validUntil = hint.validUntil;
  if (validUntil && !parseISO(validUntil)) validUntil = undefined;
  if (!validUntil && catalog.validityMonths) {
    const base = parseISO(hint.issuedAt) || parseISO(hint.performedAt);
    if (base) validUntil = dateToISO(addMonths(base, catalog.validityMonths));
  }

  // nextDueAt
  let nextDueAt = hint.nextDueAt;
  if (nextDueAt && !parseISO(nextDueAt)) nextDueAt = undefined;
  if (!nextDueAt && catalog.recurrenceMonths) {
    const base = parseISO(hint.performedAt);
    if (base) nextDueAt = dateToISO(addMonths(base, catalog.recurrenceMonths));
  }

  // deadlineAt
  let deadlineAt = hint.deadlineAt || checkpointDeadline;
  if (deadlineAt && !parseISO(deadlineAt)) deadlineAt = undefined;

  // Status
  const validUntilDate = parseISO(validUntil);
  const nextDueAtDate = parseISO(nextDueAt);
  const deadlineAtDate = parseISO(deadlineAt);

  const isExpired = validUntilDate ? validUntilDate < today : undefined;
  const isDueSoon = nextDueAtDate
    ? nextDueAtDate >= today && (nextDueAtDate.getTime() - today.getTime()) / 86400000 <= dueSoonDays
    : undefined;
  const isOverdue = deadlineAtDate ? deadlineAtDate < today : undefined;

  return {
    evidenceId,
    issuedAt: hint.issuedAt,
    receivedAt: hint.receivedAt,
    performedAt: hint.performedAt,
    detectedAt: hint.detectedAt,
    validUntil,
    nextDueAt,
    deadlineAt,
    isExpired,
    isDueSoon,
    isOverdue,
  };
}
