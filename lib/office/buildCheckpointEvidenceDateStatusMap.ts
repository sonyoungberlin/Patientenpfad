import { getOfficeCheckpointCatalog, type OfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getEvidence, isEvidenceId } from "@/lib/office/evidenceCatalog";
import { resolveEvidenceDateStatus, type EvidenceDateStatus } from "@/lib/office/evidenceDateHints";
import type { OfficeCheckpointSnapshot } from "@/lib/office/types";

/**
 * Liefert pro Checkpoint-ID eine Map von Evidence-ID zu EvidenceDateStatus.
 * - Nutzt evidenceDateHints aus dem Snapshot (optional)
 * - Nutzt Katalog für validityMonths/recurrenceMonths
 * - Fallback für deadlineAt: checkpoint.deadline
 */
export function buildCheckpointEvidenceDateStatusMap(
  topicId: OfficeTopicId,
  snapshot: { checkpoints: OfficeCheckpointSnapshot[]; evidenceDateHints?: Record<string, any> }
): Record<string, Record<string, EvidenceDateStatus>> {
  const catalog = getOfficeCheckpointCatalog(topicId);
  const hints = snapshot.evidenceDateHints || {};
  const result: Record<string, Record<string, EvidenceDateStatus>> = {};
  for (const checkpoint of snapshot.checkpoints) {
    const map: Record<string, EvidenceDateStatus> = {};
    const allEvidenceIds = [
      ...(checkpoint.required_documents || []),
      ...(checkpoint.optional_documents || []),
    ];
    for (const evidenceId of allEvidenceIds) {
      if (!isEvidenceId(evidenceId)) continue;
      const catalogEntry = getEvidence(evidenceId);
      const hint = hints[evidenceId] || {};
      map[evidenceId] = resolveEvidenceDateStatus(
        evidenceId,
        hint,
        {
          validityMonths: catalogEntry.validityMonths,
          recurrenceMonths: catalogEntry.recurrenceMonths,
        },
        checkpoint.deadline
      );
    }
    result[checkpoint.id] = map;
  }
  return result;
}
