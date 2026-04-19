import type { M1BlockId, M1Selection, M1SnapshotInitial } from "@/lib/types";

/**
 * Verbindliches, statisches Mapping: M1-Aktivierungsblock → Checkpoint-IDs.
 *
 * Regeln:
 * - Hart kodiert, keine dynamische Berechnung
 * - Erweiterungen erfolgen innerhalb dieser Blöcke
 * - Aktivierungsblöcke sind keine Checkpoints
 */
export const M1_CHECKPOINT_MAP: Record<M1BlockId, readonly string[]> = {
  kommunikation: ["K01", "K08", "K09"],
  medizinische_lage: ["K03", "K04", "K05", "K10"],
  versorgung_im_alltag: ["K02", "K06", "K07"],
};

/**
 * Leitet aus einer M1-Auswahl die zu aktivierenden Checkpoint-IDs ab.
 *
 * - Nur Blöcke mit Status `unklar` aktivieren ihre Checkpoints.
 * - Blöcke mit Status `klar` liefern keine Checkpoints.
 * - Ergebnis: flache, deduplizierte Liste von Checkpoint-IDs.
 */
export function deriveActiveCheckpointIdsFromM1(
  blocks: M1Selection,
): string[] {
  const ids: string[] = [];
  for (const [blockId, status] of Object.entries(blocks) as [
    M1BlockId,
    M1Selection[M1BlockId],
  ][]) {
    if (status === "unklar") {
      ids.push(...M1_CHECKPOINT_MAP[blockId]);
    }
  }
  return ids;
}

/**
 * Prüft, ob eine M1-Auswahl einen Gatekeeper-Fall darstellt.
 *
 * Gatekeeper-Fall: alle drei Blöcke sind `klar`.
 * In diesem Fall wird kein Strukturfall gestartet und keine CaseSession angelegt.
 */
export function isGatekeeperCase(blocks: M1Selection): boolean {
  return (
    blocks.kommunikation === "klar" &&
    blocks.medizinische_lage === "klar" &&
    blocks.versorgung_im_alltag === "klar"
  );
}

/**
 * Erstellt einen eingefrorenen M1-Snapshot für die Fallanlage.
 *
 * Der Snapshot enthält die Blockauswahl sowie die daraus deterministisch
 * abgeleiteten Checkpoint-IDs. Nach der Fallanlage darf dieser Snapshot
 * nie neu berechnet oder überschrieben werden.
 */
export function buildM1SnapshotInitial(blocks: M1Selection): M1SnapshotInitial {
  return {
    blocks,
    activated_checkpoint_ids: deriveActiveCheckpointIdsFromM1(blocks),
  };
}
