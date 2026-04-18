import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
  type M1SnapshotInitial,
} from "@/lib/types";

/**
 * Statischer Checkpoint-Katalog für alle M1-Checkpoints K01–K08.
 *
 * Jeder Eintrag ist ein vollständiges `ActiveCheckpoint`-Template ohne Status.
 * Der Status wird bei der Hydration auf `TO_DO` gesetzt.
 *
 * block_id entspricht dem M1-Aktivierungsblock-Schlüssel.
 */
type CheckpointTemplate = Omit<ActiveCheckpoint, "status">;

export const CHECKPOINT_CATALOGUE: Record<string, CheckpointTemplate> = {
  K01: {
    id: "K01",
    block_id: "kommunikation",
    type: CheckpointType.PRESENCE_CHECK,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Erreichbarkeit Patient sichergestellt",
    description: "Prüfen, ob der Patient zuverlässig erreichbar ist.",
    m4: {
      type: "ACTION",
      text: "Bitte stellen Sie sicher, dass Ihre Kontaktdaten aktuell hinterlegt sind.",
    },
  },
  K02: {
    id: "K02",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Alltagsversorgung geklärt",
    description: "Prüfen, ob eine ausreichende Versorgung im Alltag besteht.",
    m4: {
      type: "NOTICE",
      text: "Die Alltagsversorgung des Patienten soll im Gespräch bewertet werden.",
    },
  },
  K03: {
    id: "K03",
    block_id: "medizinische_lage",
    type: CheckpointType.NACHWEIS,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Diagnosenlage vollständig",
    description: "Prüfen, ob alle relevanten Diagnosen dokumentiert sind.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie alle aktuellen Befunde und Diagnosen zum nächsten Termin mit.",
    },
  },
  K04: {
    id: "K04",
    block_id: "medizinische_lage",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Medikation geprüft",
    description: "Aktuelle Medikation ist bekannt und geprüft.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie Ihren Medikamentenplan zum nächsten Termin mit.",
    },
  },
  K05: {
    id: "K05",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.A,
    title: "Fachärztliche Mitbehandlung koordiniert",
    description: "Relevante externe Fachärzte sind bekannt und einbezogen.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie mit, welche Fachärzte Sie aktuell behandeln.",
    },
  },
  K06: {
    id: "K06",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Pflegebedarf erfasst",
    description: "Pflegebedarf ist dokumentiert und bewertet.",
    m4: {
      type: "NOTICE",
      text: "Der Pflegebedarf des Patienten soll im Gespräch ermittelt werden.",
    },
  },
  K07: {
    id: "K07",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.ZIEL,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.A,
    title: "Rehabilitationsziel definiert",
    description: "Ein klares Rehabilitationsziel ist gemeinsam vereinbart.",
    m4: {
      type: "NOTICE",
      text: "Das Rehabilitationsziel soll im nächsten Gespräch besprochen werden.",
    },
  },
  K08: {
    id: "K08",
    block_id: "kommunikation",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Kommunikationsweg bestätigt",
    description: "Der bevorzugte Kommunikationsweg des Patienten ist bekannt.",
    m4: {
      type: "ACTION",
      text: "Bitte teilen Sie mit, wie Sie bevorzugt kontaktiert werden möchten.",
    },
  },
};

/**
 * Hydratisiert vollständige `ActiveCheckpoint`-Objekte aus einem M1-Snapshot.
 *
 * Einzige erlaubte Quelle für `active_checkpoints` eines Falls.
 * Der initiale Status aller aktivierten Checkpoints ist `TO_DO`.
 *
 * Checkpoints, deren ID nicht im Katalog vorhanden ist, werden übersprungen
 * (defensiv gegen zukünftige Katalogerweiterungen).
 */
export function hydrateActiveCheckpointsFromSnapshot(
  snapshot: M1SnapshotInitial,
): ActiveCheckpoint[] {
  return snapshot.activated_checkpoint_ids.flatMap((id) => {
    const template = CHECKPOINT_CATALOGUE[id];
    if (!template) return [];
    // Assign TO_DO as initial status, respecting the category union
    return [{ ...template, status: "TO_DO" } as ActiveCheckpoint];
  });
}
