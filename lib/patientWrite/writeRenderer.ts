import {
  isMultiSelectCheckpoint,
  isAssessmentCheckpoint,
  type ActiveCheckpoint,
} from "@/lib/types";
import {
  type PatientWriteConditionItem,
  type PatientWriteTrigger,
  type PatientWriteTemplate,
  type PatientWriteModule,
} from "@/lib/patientWrite/types";
import { PATIENT_WRITE_TEMPLATES } from "@/lib/patientWrite/writeModules";

// Re-export so consumers only need one import path.
export type { PatientWriteModule };

// ---------------------------------------------------------------------------
// Selections-Adapter (für MULTI_SELECT-Checkpoints)
// ---------------------------------------------------------------------------

/**
 * Baut eine Map von MULTI_SELECT-Checkpoint-IDs auf ihre aktuellen Selektionen.
 *
 * Nur MULTI_SELECT-Checkpoints werden erfasst (z. B. K10, K11).
 * Fehlende oder leere Selektionen erscheinen als leere Arrays.
 *
 * Wird von `evaluateTrigger` für `selectionsInclude`-Prüfungen verwendet.
 */
export function buildSelectionsMap(
  checkpoints: ActiveCheckpoint[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const cp of checkpoints) {
    if (isMultiSelectCheckpoint(cp)) {
      map[cp.id] = cp.selections;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Status-Adapter
// ---------------------------------------------------------------------------

/**
 * Wandelt eine Liste von Patient-Checkpoints in eine schnelle
 * State-Lookup-Map um (identisches Interface zu buildStateMap in
 * lib/office/writeRenderer.ts, aber andere Eingabe).
 *
 * Mapping-Regeln (Reihenfolge relevant):
 *   - MULTI_SELECT-Checkpoint (K10/K11) → "OPEN"  (kein Bewertungsstatus)
 *   - ASSESSMENT-Checkpoint mit enabled !== true → "OPEN"  (nicht aktiviert)
 *   - status "OK"            → "YES"
 *   - status "TO_DO"         → "NO"
 *   - status "ZURÜCKSTELLEN" → "OPEN"  (konservativ: noch nicht geklärt)
 *
 * Checkpoints, die in der Liste fehlen, gelten als OPEN (defensiver Default).
 */
export function buildPatientStateMap(
  checkpoints: ActiveCheckpoint[],
): Record<string, "YES" | "NO" | "OPEN"> {
  const map: Record<string, "YES" | "NO" | "OPEN"> = {};
  for (const cp of checkpoints) {
    if (isMultiSelectCheckpoint(cp)) {
      map[cp.id] = "OPEN";
    } else if (isAssessmentCheckpoint(cp) && cp.enabled !== true) {
      map[cp.id] = "OPEN";
    } else if (cp.status === "OK") {
      map[cp.id] = "YES";
    } else if (cp.status === "TO_DO") {
      map[cp.id] = "NO";
    } else {
      // "ZURÜCKSTELLEN" und unbekannte Werte → defensiv OPEN
      map[cp.id] = "OPEN";
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Interne Trigger-Logik (kopiert aus lib/office/writeRenderer.ts)
// ---------------------------------------------------------------------------

function conditionMet(
  item: PatientWriteConditionItem,
  stateMap: Record<string, "YES" | "NO" | "OPEN">,
): boolean {
  const actual = stateMap[item.checkpointId] ?? "OPEN";
  return actual === item.state;
}

/**
 * Wertet einen einzelnen Trigger aus.
 *
 * Auswertungsreihenfolge:
 *   0. selectionsInclude – MULTI_SELECT-Selektion matcht nicht → nicht verfügbar.
 *   1. blockedWhenAnyOpen – mindestens ein Checkpoint OPEN → gesperrt.
 *   2. allOf  – alle Bedingungen müssen erfüllt sein.
 *   3. anyOf  – mindestens eine Bedingung muss erfüllt sein.
 *   4. noneOf – keine Bedingung darf erfüllt sein.
 */
function evaluateTrigger(
  trigger: PatientWriteTrigger,
  stateMap: Record<string, "YES" | "NO" | "OPEN">,
  selectionsMap: Record<string, string[]>,
): { available: boolean; reason?: string } {
  // 0. selectionsInclude (Kontext-Filter)
  if (trigger.selectionsInclude && trigger.selectionsInclude.length > 0) {
    for (const item of trigger.selectionsInclude) {
      const selections = selectionsMap[item.checkpointId] ?? [];
      const matched = item.values.some((v) => selections.includes(v));
      if (!matched) {
        return {
          available: false,
          reason: `Anliegen nicht gesetzt (${item.checkpointId}: ${item.values.join(" / ")}).`,
        };
      }
    }
  }

  // 1. blockedWhenAnyOpen
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

  // 2. allOf
  if (trigger.allOf && trigger.allOf.length > 0) {
    const failed = trigger.allOf.find((item) => !conditionMet(item, stateMap));
    if (failed) {
      return {
        available: false,
        reason: `Voraussetzung nicht erfüllt: ${failed.checkpointId} muss ${failed.state} sein.`,
      };
    }
  }

  // 3. anyOf
  if (trigger.anyOf && trigger.anyOf.length > 0) {
    const anyMet = trigger.anyOf.some((item) => conditionMet(item, stateMap));
    if (!anyMet) {
      return {
        available: false,
        reason: "Keine der erforderlichen Bedingungen ist erfüllt.",
      };
    }
  }

  // 4. noneOf
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
  checkpoints: ActiveCheckpoint[];
  /**
   * Injectable für Tests. Default: PATIENT_WRITE_TEMPLATES aus dem Katalog.
   */
  templates?: readonly PatientWriteTemplate[];
};

/**
 * Wertet alle Patient-WRITE-Templates gegen den aktuellen Checkpoint-Zustand
 * aus.
 *
 * Invarianten:
 * - Keine Seiteneffekte, kein I/O, kein LLM.
 * - Fehlende Checkpoints gelten als OPEN.
 * - Gibt für jedes Template ein PatientWriteModule zurück (auch unavailable).
 */
export function evaluatePatientWriteModules(
  params: EvaluateParams,
): PatientWriteModule[] {
  const { checkpoints, templates = PATIENT_WRITE_TEMPLATES } = params;
  const stateMap = buildPatientStateMap(checkpoints);
  const selectionsMap = buildSelectionsMap(checkpoints);

  return templates.map((template) => {
    const { available, reason } = evaluateTrigger(template.trigger, stateMap, selectionsMap);
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
 * Verarbeitet `{{#if key}}...{{/if}}`- und `{{#unless key}}...{{/unless}}`-
 * Blöcke im Template-Text.
 *
 * - `{{#if key}}`: Blockinhalt bleibt erhalten wenn key gesetzt und nicht leer.
 * - `{{#unless key}}`: Blockinhalt bleibt erhalten wenn key FEHLT oder leer.
 * - Verschachtelung wird nicht unterstützt.
 *
 * Kopiert aus lib/office/writeRenderer.ts.
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
 * Rendert ein Patient-WRITE-Template durch Ersetzen der `{{key}}`-Platzhalter.
 *
 * Invarianten:
 * - Reine Funktion – kein I/O, kein LLM, keine Seiteneffekte.
 * - Optionale Blöcke `{{#if key}}...{{/if}}` werden nur gerendert wenn key
 *   befüllt ist.
 * - Fehlende oder leere required Keys erscheinen als `[{{key}}]` im Ergebnis.
 * - Mehrfache Vorkommen desselben Platzhalters werden alle ersetzt.
 *
 * Kopiert und für PatientWriteTemplate adaptiert aus lib/office/writeRenderer.ts.
 */
export function renderPatientWriteTemplate(
  template: PatientWriteTemplate,
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
