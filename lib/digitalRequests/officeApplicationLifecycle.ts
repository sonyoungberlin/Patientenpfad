import type { Prisma } from "@prisma/client";

export const OFFICE_APPLICATION_RETENTION_MS = 48 * 60 * 60 * 1000;
export const OFFICE_APPLICATION_ACTIVE_STATUSES = ["new", "in_review"] as const;

export function officeApplicationCutoff(now: Date): Date {
  return new Date(now.getTime() - OFFICE_APPLICATION_RETENTION_MS);
}

export function activeOfficeApplicationFilter(
  now: Date,
): Prisma.DigitalRequestWhereInput {
  return {
    request_type: "office",
    deleted_at: null,
    createdAt: { gte: officeApplicationCutoff(now) },
    status: { in: [...OFFICE_APPLICATION_ACTIVE_STATUSES] },
  };
}

export function expiredOfficeApplicationFilter(
  now: Date,
): Prisma.DigitalRequestWhereInput {
  return {
    request_type: "office",
    createdAt: { lt: officeApplicationCutoff(now) },
  };
}