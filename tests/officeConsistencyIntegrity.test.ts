import {
  listOfficeTopics,
  getOfficeCheckpointCatalog,
  isOfficeTopicId,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
} from "@/lib/office/checkpointCatalog";
import {
  getM2QuestionsForTopic,
  getM2QuestionsForCheckpoint,
} from "@/lib/office/m2Questions";
import { OFFICE_WRITE_TEMPLATES } from "@/lib/office/writeModules";
import { OfficeCheckpointKind } from "@/lib/office/types";

// ---------------------------------------------------------------------------
// Vorab berechnete Lookups (einmalig für alle Tests)
// ---------------------------------------------------------------------------

const ALL_TOPICS = listOfficeTopics();
const ALL_TOPIC_ID_SET = new Set<string>(ALL_TOPICS.map((t) => t.id));

// Enthält alle Checkpoint-IDs aus allen Topics (Set-Semantik: DS-Duplikate
// zwischen DATA_PROTECTION_INCIDENT und DIGITAL_SYSTEM_CHANGE werden
// zusammengeführt – globale Eindeutigkeit wird hier bewusst nicht geprüft).
const ALL_CHECKPOINT_ID_SET = new Set<string>();
for (const topic of ALL_TOPICS) {
  for (const cp of getOfficeCheckpointCatalog(topic.id)) {
    ALL_CHECKPOINT_ID_SET.add(cp.id);
  }
}

// ===========================================================================
// 1. Topic-Konsistenz
// ===========================================================================

describe("Office-Konsistenz: Topics", () => {
  it("alle Topic-IDs sind eindeutig", () => {
    const ids = ALL_TOPICS.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("kein Topic hat leeres id oder title", () => {
    for (const topic of ALL_TOPICS) {
      if (!topic.id.trim()) {
        throw new Error("Topic mit leerer ID gefunden");
      }
      if (!topic.title.trim()) {
        throw new Error(`Topic ${topic.id}: leerer title`);
      }
    }
  });

  it("jedes Topic hat mindestens einen Checkpoint", () => {
    for (const topic of ALL_TOPICS) {
      const checkpoints = getOfficeCheckpointCatalog(topic.id);
      if (checkpoints.length === 0) {
        throw new Error(`Topic ${topic.id}: keine Checkpoints im Katalog`);
      }
    }
  });

  it("alle Topic-IDs sind im Union-Type OfficeTopicId registriert", () => {
    for (const topic of ALL_TOPICS) {
      if (!isOfficeTopicId(topic.id)) {
        throw new Error(
          `Topic-ID "${topic.id}" ist nicht im Union-Type OfficeTopicId registriert`,
        );
      }
    }
  });
});

// ===========================================================================
// 2. Checkpoint-Konsistenz
// ===========================================================================

describe("Office-Konsistenz: Checkpoints", () => {
  // Globale Eindeutigkeit wird bewusst NICHT geprüft:
  // DS-01..DS-0x existiert in beiden Topics DATA_PROTECTION_INCIDENT und
  // DIGITAL_SYSTEM_CHANGE (bekannte, tolerierte Kollision).
  it("kein Topic hat doppelte Checkpoint-IDs", () => {
    for (const topic of ALL_TOPICS) {
      const ids = getOfficeCheckpointCatalog(topic.id).map((cp) => cp.id);
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
        throw new Error(
          `Topic ${topic.id}: doppelte Checkpoint-IDs: ${[...new Set(duplicates)].join(", ")}`,
        );
      }
    }
  });

  it("kein Checkpoint hat leeres id oder title", () => {
    for (const topic of ALL_TOPICS) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        if (!cp.id.trim()) {
          throw new Error(`Topic ${topic.id}: Checkpoint mit leerer ID`);
        }
        if (!cp.title.trim()) {
          throw new Error(
            `Topic ${topic.id} / Checkpoint ${cp.id}: leerer title`,
          );
        }
      }
    }
  });

  it("alle kind-Werte sind gueltige OfficeCheckpointKind-Werte", () => {
    const validKinds = new Set<string>(Object.values(OfficeCheckpointKind));
    for (const topic of ALL_TOPICS) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        if (!validKinds.has(cp.kind)) {
          throw new Error(
            `Topic ${topic.id} / Checkpoint ${cp.id}: ungueltiger kind-Wert "${cp.kind}"`,
          );
        }
      }
    }
  });
});

// ===========================================================================
// 3. M2-Konsistenz
// ===========================================================================

describe("Office-Konsistenz: M2-Fragen", () => {
  it("jedes Topic hat mindestens einen Checkpoint mit M2-Fragen", () => {
    for (const topic of ALL_TOPICS) {
      const m2ByCheckpoint = getM2QuestionsForTopic(topic.id);
      const totalQuestions = Object.values(m2ByCheckpoint).reduce(
        (sum, qs) => sum + qs.length,
        0,
      );
      if (totalQuestions === 0) {
        throw new Error(`Topic ${topic.id}: keine M2-Fragen vorhanden`);
      }
    }
  });

  it("alle M2-Schluessel haben einen entsprechenden Katalog-Checkpoint", () => {
    // HR-GOV-A/B/C/D sind synthetische Governance-Gruppierungsschlüssel aus
    // lib/office/hrGovernance.ts (HrGovernanceId-Typ). Sie existieren bewusst
    // NICHT als Katalog-Checkpoints: Das Topic arzt-anstellen-nachbesetzung
    // nutzt sie intern als M2-Aggregationsebene über dem Legacy-Mapping
    // HR-01..HR-05 → HR-GOV-A..HR-GOV-D. Katalog enthält nur NC-* Checkpoints.
    const HR_GOV_VIRTUAL_KEYS = new Set(["HR-GOV-A", "HR-GOV-B", "HR-GOV-C", "HR-GOV-D"]);

    for (const topic of ALL_TOPICS) {
      const catalogIds = new Set(
        getOfficeCheckpointCatalog(topic.id).map((cp) => cp.id),
      );
      const m2ByCheckpoint = getM2QuestionsForTopic(topic.id);
      for (const m2Key of Object.keys(m2ByCheckpoint)) {
        // Virtuelle HR-GOV-Schlüssel für HIRING_REPLACEMENT sind kein Fehler.
        if (
          topic.id === OFFICE_TOPIC_HIRING_REPLACEMENT &&
          HR_GOV_VIRTUAL_KEYS.has(m2Key)
        ) {
          continue;
        }
        if (!catalogIds.has(m2Key)) {
          throw new Error(
            `Topic ${topic.id}: M2-Schluessel "${m2Key}" hat keinen entsprechenden Katalog-Checkpoint`,
          );
        }
      }
    }
  });

  it("jeder Katalog-Checkpoint hat mindestens eine M2-Frage", () => {
    for (const topic of ALL_TOPICS) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        const qs = getM2QuestionsForCheckpoint(topic.id, cp.id);
        if (qs.length === 0) {
          throw new Error(
            `Topic ${topic.id} / Checkpoint ${cp.id}: keine M2-Fragen vorhanden`,
          );
        }
      }
    }
  });

  it("keine M2-Frage hat leeres id oder text", () => {
    for (const topic of ALL_TOPICS) {
      const m2ByCheckpoint = getM2QuestionsForTopic(topic.id);
      for (const [checkpointId, questions] of Object.entries(m2ByCheckpoint)) {
        for (const q of questions) {
          if (!q.id.trim()) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${checkpointId}: M2-Frage mit leerer ID`,
            );
          }
          if (!q.text.trim()) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${checkpointId} / ${q.id}: leerer text`,
            );
          }
        }
      }
    }
  });

  it("keine doppelten M2-IDs innerhalb eines Checkpoints", () => {
    for (const topic of ALL_TOPICS) {
      const m2ByCheckpoint = getM2QuestionsForTopic(topic.id);
      for (const [checkpointId, questions] of Object.entries(m2ByCheckpoint)) {
        const ids = questions.map((q) => q.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
          const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
          throw new Error(
            `Topic ${topic.id} / Checkpoint ${checkpointId}: doppelte M2-IDs: ${[...new Set(duplicates)].join(", ")}`,
          );
        }
      }
    }
  });
});

// ===========================================================================
// 4. WRITE-Modul-Konsistenz
// ===========================================================================

describe("Office-Konsistenz: WRITE-Module", () => {
  it("alle Pflichtfelder id, label, bodyTemplate, outputKind, writeKind sind gesetzt und nicht leer", () => {
    for (const tmpl of OFFICE_WRITE_TEMPLATES) {
      if (!tmpl.id.trim()) {
        throw new Error("Template mit leerer ID gefunden");
      }
      if (!tmpl.label.trim()) {
        throw new Error(`Template ${tmpl.id}: leeres label`);
      }
      if (!tmpl.bodyTemplate.trim()) {
        throw new Error(`Template ${tmpl.id}: leeres bodyTemplate`);
      }
      if (!tmpl.outputKind) {
        throw new Error(`Template ${tmpl.id}: fehlendes outputKind`);
      }
      if (!tmpl.writeKind) {
        throw new Error(`Template ${tmpl.id}: fehlendes writeKind`);
      }
    }
  });

  it("trigger.topicIds verweisen auf existente Topic-IDs", () => {
    for (const tmpl of OFFICE_WRITE_TEMPLATES) {
      for (const topicId of tmpl.trigger.topicIds) {
        if (!ALL_TOPIC_ID_SET.has(topicId)) {
          throw new Error(
            `Template ${tmpl.id}: trigger.topicIds enthaelt unbekannte Topic-ID "${topicId}"`,
          );
        }
      }
    }
  });

  it("trigger.blockedWhenAnyOpen verweist auf existente Checkpoint-IDs", () => {
    for (const tmpl of OFFICE_WRITE_TEMPLATES) {
      for (const cpId of tmpl.trigger.blockedWhenAnyOpen ?? []) {
        if (!ALL_CHECKPOINT_ID_SET.has(cpId)) {
          throw new Error(
            `Template ${tmpl.id}: trigger.blockedWhenAnyOpen enthaelt unbekannte Checkpoint-ID "${cpId}"`,
          );
        }
      }
    }
  });

  it("trigger.allOf/anyOf/noneOf verweisen auf existente Checkpoint-IDs", () => {
    for (const tmpl of OFFICE_WRITE_TEMPLATES) {
      for (const group of ["allOf", "anyOf", "noneOf"] as const) {
        for (const item of tmpl.trigger[group] ?? []) {
          if (!ALL_CHECKPOINT_ID_SET.has(item.checkpointId)) {
            throw new Error(
              `Template ${tmpl.id}: trigger.${group} enthaelt unbekannte Checkpoint-ID "${item.checkpointId}"`,
            );
          }
        }
      }
    }
  });

  it("trigger.anyOf und allOf sind nicht leer wenn deklariert", () => {
    for (const tmpl of OFFICE_WRITE_TEMPLATES) {
      if (tmpl.trigger.anyOf !== undefined && tmpl.trigger.anyOf.length === 0) {
        throw new Error(
          `Template ${tmpl.id}: trigger.anyOf ist deklariert aber leer`,
        );
      }
      if (tmpl.trigger.allOf !== undefined && tmpl.trigger.allOf.length === 0) {
        throw new Error(
          `Template ${tmpl.id}: trigger.allOf ist deklariert aber leer`,
        );
      }
    }
  });
});

// ===========================================================================
// 5. Kompositions-Checks
// ===========================================================================

describe("Office-Konsistenz: Komposition", () => {
  it("kein Topic besteht ausschliesslich aus DECISION-Checkpoints", () => {
    for (const topic of ALL_TOPICS) {
      const checkpoints = getOfficeCheckpointCatalog(topic.id);
      if (
        checkpoints.length > 0 &&
        checkpoints.every((cp) => cp.kind === OfficeCheckpointKind.DECISION)
      ) {
        throw new Error(
          `Topic ${topic.id}: alle ${checkpoints.length} Checkpoints sind DECISION-Kind (kein FACT/RULE/ASSESSMENT)`,
        );
      }
    }
  });
});
