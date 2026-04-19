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
    title: "Erreichbarkeit des Patienten",
    description: "Prüfen, ob der Patient zuverlässig erreichbar ist.",
    m4: {
      type: "ACTION",
      text: "Bitte stellen Sie sicher, dass Ihre Kontaktdaten aktuell in unserem System hinterlegt sind. Geben Sie, falls erforderlich, auch die Kontaktdaten einer Vertrauensperson an.",
    },
  },
  K02: {
    id: "K02",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Wahrnehmung von Terminen",
    description: "Prüfen, ob eine ausreichende Versorgung im Alltag besteht.",
    m4: {
      type: "NOTICE",
      text: "Bitte beachten Sie, dass persönliche Termine für Untersuchungen erforderlich sind, da andernfalls keine angemessene medizinische Betreuung gewährleistet werden kann.",
    },
  },
  K03: {
    id: "K03",
    block_id: "medizinische_lage",
    type: CheckpointType.NACHWEIS,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Diagnosenlage",
    description: "Prüfen, ob alle relevanten Diagnosen dokumentiert sind.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie relevante Befunde zu Ihren Diagnosen zum nächsten Termin mit.",
    },
  },
  K04: {
    id: "K04",
    block_id: "medizinische_lage",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.P,
    title: "Medikation",
    description: "Aktuelle Medikation ist bekannt und geprüft.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie Ihren Medikamentenplan oder eine Übersicht zum nächsten Termin mit.",
    },
  },
  K05: {
    id: "K05",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.A,
    title: "Medizinische Mitbehandlung",
    description: "Relevante externe Fachärzte sind bekannt und einbezogen.",
    m4: {
      type: "NOTICE",
      text: "Bitte geben Sie relevante Befunde in der Praxis ab (Kopie) oder reichen Sie die Dokumente digital ein.",
    },
  },
  K06: {
    id: "K06",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Unterstützung im Alltag",
    description: "Pflegebedarf ist dokumentiert und bewertet.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie uns mit, welche Hilfe Sie im Alltag benötigen und wer Sie dabei unterstützt.",
    },
  },
  K07: {
    id: "K07",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.ZIEL,
    category: CheckpointCategory.M,
    relevance: CheckpointRelevance.A,
    title: "Vorübergehender Unterstützungsbedarf",
    description: "Ein klares Rehabilitationsziel ist gemeinsam vereinbart.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie uns mit, ob Ihre Versorgung für die nächste Zeit sichergestellt ist.",
    },
  },
  K08: {
    id: "K08",
    block_id: "kommunikation",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Digitale Kommunikation",
    description: "Der bevorzugte Kommunikationsweg des Patienten ist bekannt.",
    m4: {
      type: "ACTION",
      text: "Bitte beachten Sie, dass einige Leistungen nur über digitale Kommunikationswege angeboten werden können.",
    },
  },
  K09: {
    id: "K09",
    block_id: "kommunikation",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.A,
    title: "Mitwirkung",
    description: "Prüfen, ob die Mitwirkung des Patienten ausreichend gegeben ist.",
    m4: {
      type: "ACTION",
      text: "Bitte vereinbaren Sie Termine, damit wir uns ausreichend Zeit für Sie nehmen können. Falls Sie verhindert sind, sagen Sie Termine bitte rechtzeitig ab und beachten Sie getroffene Absprachen. Nur so können wir eine gute Versorgung gewährleisten.",
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
