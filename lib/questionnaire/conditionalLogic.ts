/**
 * Serialisierbare Conditional-Logic-Engine für Patientenfragebögen.
 *
 * Phase 1: question-target + equals-Operator + showQuestion-Action.
 * Die Typen sind so gewählt, dass Phase 5 (derived values) und Phase 4
 * (showBlock) ergänzt werden können, ohne die bestehende API umzubauen.
 */

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "isAnswered"
  | "isEmpty";

export type ConditionTarget =
  | { kind: "question"; questionId: string }
  | { kind: "derived"; derivedId: string }; // Phase 5

export type Condition = {
  target: ConditionTarget;
  operator: ConditionOperator;
  value?: string | number; // nicht benötigt für isAnswered / isEmpty
};

export type ConditionGroup =
  | { mode: "AND"; conditions: Condition[] }
  | { mode: "OR"; conditions: Condition[] }
  | Condition;

export type ConditionalRule = {
  action: "showQuestion" | "showBlock" | "requireQuestion"; // showBlock Phase 4
  targetId: string;
  condition: ConditionGroup;
};

/** Wertet eine einzelne Bedingung oder Gruppe aus. */
export function evaluateCondition(
  condition: ConditionGroup,
  answers: Record<string, string>,
  derivedValues?: Record<string, number>,
): boolean {
  if ("mode" in condition) {
    const results = condition.conditions.map((c) =>
      evaluateCondition(c, answers, derivedValues),
    );
    return condition.mode === "AND"
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  const { target, operator, value } = condition;

  let actual: string | number | undefined;
  if (target.kind === "question") {
    actual = answers[target.questionId] ?? "";
  } else {
    // derived – Phase 5; bis dahin immer false
    actual = derivedValues?.[target.derivedId];
  }

  switch (operator) {
    case "equals":
      return actual === value;
    case "notEquals":
      return actual !== value;
    case "contains":
      return typeof actual === "string" && typeof value === "string"
        ? actual
            .split(",")
            .map((s) => s.trim())
            .includes(value)
        : false;
    case "isAnswered":
      return actual !== "" && actual !== undefined;
    case "isEmpty":
      return actual === "" || actual === undefined;
    case "greaterThan":
      return typeof actual === "number" && typeof value === "number"
        ? actual > value
        : false;
    case "greaterThanOrEqual":
      return typeof actual === "number" && typeof value === "number"
        ? actual >= value
        : false;
    case "lessThan":
      return typeof actual === "number" && typeof value === "number"
        ? actual < value
        : false;
    case "lessThanOrEqual":
      return typeof actual === "number" && typeof value === "number"
        ? actual <= value
        : false;
    default:
      return false;
  }
}

/**
 * Berechnet die Menge der sichtbaren Fragen-IDs.
 *
 * Logik:
 *   - Fragen ohne passende showQuestion-Regel sind immer sichtbar.
 *   - Fragen, die durch mindestens eine showQuestion-Regel kontrolliert werden,
 *     sind nur sichtbar, wenn die Bedingung der Regel erfüllt ist.
 */
export function computeVisibleQuestionIds(
  rules: ConditionalRule[],
  allQuestionIds: string[],
  answers: Record<string, string>,
  derivedValues?: Record<string, number>,
): Set<string> {
  // Alle Fragen-IDs, die durch mindestens eine showQuestion-Regel gesteuert werden
  const controlled = new Set<string>(
    rules
      .filter((r) => r.action === "showQuestion")
      .map((r) => r.targetId),
  );

  // Nicht-kontrollierte Fragen sind immer sichtbar
  const visible = new Set<string>(
    allQuestionIds.filter((id) => !controlled.has(id)),
  );

  // Kontrollierte Fragen hinzufügen, wenn ihre Bedingung erfüllt ist
  for (const rule of rules) {
    if (rule.action !== "showQuestion") continue;
    if (evaluateCondition(rule.condition, answers, derivedValues)) {
      visible.add(rule.targetId);
    }
  }

  return visible;
}

/** Wandelt einen rohen DB-Wert sicher in ConditionalRule[] um. */
export function parseConditionalRules(raw: unknown): ConditionalRule[] {
  if (!Array.isArray(raw)) return [];
  return raw as ConditionalRule[];
}

/**
 * Berechnet die Menge der sichtbaren Block-IDs (Phase 4).
 *
 * Logik:
 *   - Blöcke mit initiallyVisible = true sind immer sichtbar.
 *   - Blöcke mit initiallyVisible = false (Folgeblöcke) sind nur sichtbar,
 *     wenn mindestens eine showBlock-Regel für sie wahr ist.
 *   - Nur Blöcke, die in frozenBlocks enthalten sind, können sichtbar werden.
 */
export function computeVisibleBlockIds(
  rules: ConditionalRule[],
  frozenBlocks: ReadonlyArray<{ id: string; initiallyVisible: boolean }>,
  answers: Record<string, string>,
  derivedValues?: Record<string, number>,
): Set<string> {
  const frozenBlockIds = new Set(frozenBlocks.map((b) => b.id));
  const visible = new Set<string>();

  for (const block of frozenBlocks) {
    if (block.initiallyVisible) visible.add(block.id);
  }

  for (const rule of rules) {
    if (rule.action !== "showBlock") continue;
    if (!frozenBlockIds.has(rule.targetId)) continue;
    if (evaluateCondition(rule.condition, answers, derivedValues)) {
      visible.add(rule.targetId);
    }
  }

  return visible;
}
