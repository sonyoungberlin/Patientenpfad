export function isFinalReviewOutdated(
  review: unknown,
  currentRevision: number,
): boolean {
  if (!review || typeof review !== "object" || Array.isArray(review)) return false;
  const candidate = review as { decision?: unknown; reviewed_revision?: unknown };
  return candidate.decision === "APPROVED" && candidate.reviewed_revision !== currentRevision;
}
