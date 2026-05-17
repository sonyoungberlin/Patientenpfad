/**
 * Tests für inferOfficeTopicIdFromCheckpoints.
 *
 * Die Funktion leitet eine Topic-ID aus Checkpoint-IDs ab, ohne dass
 * topicId im Snapshot explizit gesetzt ist.
 */

import {
  inferOfficeTopicIdFromCheckpoints,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_REGRESS,
} from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";

// ---------------------------------------------------------------------------
// Kernfälle
// ---------------------------------------------------------------------------

describe("inferOfficeTopicIdFromCheckpoints", () => {
  it("erkennt KV-Topic aus allen KV-01..KV-05 Checkpoint-IDs", () => {
    const checkpoints = [
      { id: "KV-01" },
      { id: "KV-02" },
      { id: "KV-03" },
      { id: "KV-04" },
      { id: "KV-05" },
    ];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBe(OFFICE_TOPIC_KV_BILLING);
  });

  it("erkennt Regress-Topic aus allen RG-01..RG-07 Checkpoint-IDs", () => {
    const checkpoints = [
      { id: "RG-01" },
      { id: "RG-02" },
      { id: "RG-03" },
      { id: "RG-04" },
      { id: "RG-05" },
      { id: "RG-06" },
      { id: "RG-07" },
    ];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBe(OFFICE_TOPIC_REGRESS);
  });

  it("gibt null zurück bei leeren Checkpoints", () => {
    expect(inferOfficeTopicIdFromCheckpoints([])).toBeNull();
  });

  it("gibt null zurück wenn keine Checkpoint-IDs einem bekannten Topic zugeordnet werden können", () => {
    const checkpoints = [{ id: "UNBEKANNT-01" }, { id: "UNBEKANNT-02" }];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Partielle Snapshots (nur Teilmenge der Checkpoints gesetzt)
  // ---------------------------------------------------------------------------

  it("erkennt KV-Topic aus Teilmenge (z. B. nur KV-01 und KV-02)", () => {
    const checkpoints = [{ id: "KV-01" }, { id: "KV-02" }];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBe(OFFICE_TOPIC_KV_BILLING);
  });

  it("erkennt Regress-Topic aus Teilmenge (z. B. nur RG-01)", () => {
    const checkpoints = [{ id: "RG-01" }];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBe(OFFICE_TOPIC_REGRESS);
  });

  // ---------------------------------------------------------------------------
  // Typkompatibilität: OfficeCheckpointSnapshot-Objekte mit allen Feldern
  // ---------------------------------------------------------------------------

  it("akzeptiert vollständige OfficeCheckpointSnapshot-Objekte", () => {
    const checkpoints = [
      {
        id: "KV-01",
        title: "Beanstandeter Sachverhalt erfasst",
        kind: OfficeCheckpointKind.FACT,
        state: OfficeCheckpointState.YES,
      },
      {
        id: "KV-03",
        title: "Fachliche Einschätzung eingeholt",
        kind: OfficeCheckpointKind.ASSESSMENT,
        state: OfficeCheckpointState.OPEN,
      },
    ];
    expect(inferOfficeTopicIdFromCheckpoints(checkpoints)).toBe(OFFICE_TOPIC_KV_BILLING);
  });
});
