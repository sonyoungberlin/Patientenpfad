import { OfficeCheckpointState, type OfficeCheckpointSnapshot } from "@/lib/office/types";
import {
  OFFICE_WRITE_TEMPLATES,
  type OfficeWriteOutputKind,
  type OfficeWriteTemplate,
  type OfficeWriteConditionItem,
  type OfficeWriteTrigger,
} from "@/lib/office/writeModules";

// ---------------------------------------------------------------------------
// Laufzeit-Typ: evaluiertes WRITE-Modul
// ---------------------------------------------------------------------------

/**
 * Ergebnis der Trigger-Auswertung für ein einzelnes WRITE-Template.
 *
 * `isAvailable` gibt an, ob das Modul im aktuellen Checkpoint-Zustand
 * angeboten werden darf.
 * `unavailableReason` ist gesetzt, wenn `isAvailable = false`.
 */
export type OfficeWriteModule = {
  templateId: string;
  label: string;
  outputKind: OfficeWriteOutputKind;
  isAvailable: boolean;
  unavailableReason?: string;
};

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Wandelt eine Liste von Checkpoint-Snapshots in eine schnelle
 * State-Lookup-Map um.
 * Checkpoints, die im Snapshot fehlen, gelten als OPEN (defensiver Default).
 */
function buildStateMap(
  checkpoints: OfficeCheckpointSnapshot[],
): Record<string, "YES" | "NO" | "OPEN"> {
  const map: Record<string, "YES" | "NO" | "OPEN"> = {};
  for (const cp of checkpoints) {
    if (cp.state === OfficeCheckpointState.YES) {
      map[cp.id] = "YES";
    } else if (cp.state === OfficeCheckpointState.NO) {
      map[cp.id] = "NO";
    } else {
      map[cp.id] = "OPEN";
    }
  }
  return map;
}

function conditionMet(
  item: OfficeWriteConditionItem,
  stateMap: Record<string, "YES" | "NO" | "OPEN">,
): boolean {
  const actual = stateMap[item.checkpointId] ?? "OPEN";
  return actual === item.state;
}

/**
 * Wertet einen einzelnen Trigger aus und gibt zurück, ob das Modul
 * verfügbar ist, und warum nicht (falls nicht).
 *
 * Auswertungsreihenfolge:
 *   1. topicIds  – falsches Topic → sofort nicht verfügbar.
 *   2. blockedWhenAnyOpen – mindestens ein Checkpoint OPEN → gesperrt.
 *   3. allOf     – alle Bedingungen müssen erfüllt sein.
 *   4. anyOf     – mindestens eine Bedingung muss erfüllt sein.
 *   5. noneOf    – keine Bedingung darf erfüllt sein.
 */
function evaluateTrigger(
  trigger: OfficeWriteTrigger,
  topicId: string,
  stateMap: Record<string, "YES" | "NO" | "OPEN">,
): { available: boolean; reason?: string } {
  // 1. Topic-Filter
  if (trigger.topicIds.length > 0 && !trigger.topicIds.includes(topicId)) {
    return { available: false, reason: "Nicht verfügbar für dieses Topic." };
  }

  // 2. blockedWhenAnyOpen (Hard-Block vor allOf/anyOf)
  if (trigger.blockedWhenAnyOpen && trigger.blockedWhenAnyOpen.length > 0) {
    const blockedBy = trigger.blockedWhenAnyOpen.find(
      (id) => (stateMap[id] ?? "OPEN") === "OPEN",
    );
    if (blockedBy) {
      return {
        available: false,
        reason: `Klärpunkt ${blockedBy} ist noch offen.`,
      };
    }
  }

  // 3. allOf
  if (trigger.allOf && trigger.allOf.length > 0) {
    const failed = trigger.allOf.find((item) => !conditionMet(item, stateMap));
    if (failed) {
      return {
        available: false,
        reason: `Voraussetzung nicht erfüllt: ${failed.checkpointId} muss ${failed.state} sein.`,
      };
    }
  }

  // 4. anyOf
  if (trigger.anyOf && trigger.anyOf.length > 0) {
    const anyMet = trigger.anyOf.some((item) => conditionMet(item, stateMap));
    if (!anyMet) {
      return {
        available: false,
        reason: "Keine der erforderlichen Bedingungen ist erfüllt.",
      };
    }
  }

  // 5. noneOf
  if (trigger.noneOf && trigger.noneOf.length > 0) {
    const violated = trigger.noneOf.find((item) => conditionMet(item, stateMap));
    if (violated) {
      return {
        available: false,
        reason: `Bedingung verhindert Freigabe: ${violated.checkpointId} = ${violated.state}.`,
      };
    }
  }

  return { available: true };
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

type EvaluateParams = {
  topicId: string;
  checkpoints: OfficeCheckpointSnapshot[];
  /**
   * Injectable für Tests. Default: OFFICE_WRITE_TEMPLATES aus dem Katalog.
   */
  templates?: readonly OfficeWriteTemplate[];
};

/**
 * Wertet alle WRITE-Templates gegen den aktuellen Topic-/Checkpoint-Zustand aus.
 *
 * Invarianten:
 * - Keine Seiteneffekte, kein I/O, kein LLM.
 * - Fehlende Checkpoints im Snapshot gelten als OPEN.
 * - Gibt für jedes Template ein OfficeWriteModule zurück (auch nicht verfügbare).
 *
 * @param params.topicId     – aktuelles Office-Topic des Falls.
 * @param params.checkpoints – Checkpoint-Snapshot aus dem Fall.
 * @param params.templates   – Optional: alternative Templateliste für Tests.
 */
export function evaluateOfficeWriteModules(params: EvaluateParams): OfficeWriteModule[] {
  const { topicId, checkpoints, templates = OFFICE_WRITE_TEMPLATES } = params;
  const stateMap = buildStateMap(checkpoints);

  return templates.map((template) => {
    const { available, reason } = evaluateTrigger(template.trigger, topicId, stateMap);
    return {
      templateId: template.id,
      label: template.label,
      outputKind: template.outputKind,
      isAvailable: available,
      ...(available ? {} : { unavailableReason: reason }),
    };
  });
}

/**
 * Verarbeitet `{{#if key}}...{{/if}}`-Blöcke im Template-Text.
 *
 * - Key vorhanden und nicht leer → Blockinhalt bleibt erhalten (Tags werden entfernt).
 * - Key fehlt oder ist leer/whitespace → gesamter Block wird ohne Rückstand entfernt.
 * - Verschachtelung wird nicht unterstützt.
 */
function processConditionalBlocks(
  text: string,
  inputs: Record<string, string>,
): string {
  // {{#unless key}}...{{/unless}} – Block bleibt nur wenn key FEHLT oder leer
  const withUnless = text.replace(
    /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_match, key: string, content: string) => {
      const value = inputs[key];
      if (value === undefined || value.trim() === "") {
        return content;
      }
      return "";
    },
  );
  // {{#if key}}...{{/if}} – Block bleibt nur wenn key gesetzt und nicht leer
  return withUnless.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, content: string) => {
      const value = inputs[key];
      if (value !== undefined && value.trim() !== "") {
        return content;
      }
      return "";
    },
  );
}

/**
 * Rendert ein WRITE-Template durch Ersetzen der `{{key}}`-Platzhalter.
 *
 * Invarianten:
 * - Reine Funktion – kein I/O, kein LLM, keine Seiteneffekte.
 * - Optionale Blöcke `{{#if key}}...{{/if}}` werden nur gerendert, wenn key befüllt ist.
 * - Fehlende oder leere required Keys erscheinen als `[{{key}}]` im Ergebnis.
 * - Mehrfache Vorkommen desselben Platzhalters werden alle ersetzt.
 *
 * @param template – WRITE-Template aus dem Katalog.
 * @param inputs   – Record<key, value> der ausgefüllten Eingabefelder.
 */
export function renderOfficeWriteTemplate(
  template: OfficeWriteTemplate,
  inputs: Record<string, string>,
): string {
  const withConditionals = processConditionalBlocks(template.bodyTemplate, inputs);
  return withConditionals.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = inputs[key];
    if (value === undefined || value.trim() === "") {
      return `[{{${key}}}]`;
    }
    return value;
  });
}
