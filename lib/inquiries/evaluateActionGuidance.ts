import {
  type ActionGuidanceRule,
  type CheckpointStatusValue,
  type GuidanceCondition,
  type GuidanceWhen,
  type UIGuidanceHint,
  DecisionStatus,
} from "@/lib/inquiries/types";

/**
 * Bewertet Guidance-Regeln für eine Action und gibt den UI-Darstellungshinweis zurück.
 *
 * Invarianten:
 * - Setzt keinen DecisionStatus.
 * - Setzt keinen ActionStatus.
 * - Hat keine Seiteneffekte.
 * - Fehlende Einträge in checkpointStatuses gelten als nicht erfüllt (kein Fehler).
 *
 * Spezifitätslogik (3-Bit-Score):
 *   +4 wenn profileId gesetzt
 *   +2 wenn when.decisionStatus gesetzt
 *   +1 wenn mindestens eine when-Klausel (allOf/anyOf/noneOf) nicht leer ist
 * Bei Gleichstand gewinnt die erste Regel in der Array-Reihenfolge.
 *
 * @param rules             – Liste aller zu prüfenden ActionGuidanceRules.
 * @param checkpointId      – Die Action, deren UI-Hinweis bewertet wird.
 * @param profileId         – Profil-ID der aktuellen Section.
 * @param decisionStatus    – DecisionStatus der aktuellen Section.
 * @param checkpointStatuses – Aktuelle Checkpoint-Statuses der Session.
 * @returns UIGuidanceHint der spezifischsten passenden Regel, oder undefined.
 */
export function evaluateActionGuidance(
  rules: ActionGuidanceRule[],
  checkpointId: string,
  profileId: string,
  decisionStatus: DecisionStatus,
  checkpointStatuses: Record<string, CheckpointStatusValue>,
): { hint: UIGuidanceHint; hintText?: string } | undefined {
  // 1. Filtere nach checkpointId
  const candidates = rules.filter((r) => r.checkpointId === checkpointId);

  // 2. Filtere nach profileId
  const profileMatching = candidates.filter(
    (r) => r.profileId === undefined || r.profileId === profileId,
  );

  // 3. Filtere nach when-Bedingung
  const matching = profileMatching.filter((r) =>
    matchesWhen(r.when, decisionStatus, checkpointStatuses),
  );

  if (matching.length === 0) return undefined;

  // 4. Spezifitäts-Score berechnen und höchsten auswählen
  const scored = matching.map((r) => ({ rule: r, score: specificityScore(r) }));
  // Höchster Score zuerst. Array.sort() ist seit ECMAScript 2019 / Node ≥ 10 stabil;
  // bei Gleichstand bleibt die ursprüngliche Array-Reihenfolge erhalten (erste Regel gewinnt).
  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0].rule;
  return { hint: winner.hint, hintText: winner.hintText };
}

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Berechnet den Spezifitäts-Score einer Regel (0–7).
 *
 *   +4 wenn profileId gesetzt
 *   +2 wenn when.decisionStatus gesetzt
 *   +1 wenn mindestens eine when-Klausel nicht leer ist
 */
function specificityScore(rule: ActionGuidanceRule): number {
  let score = 0;
  if (rule.profileId !== undefined) score += 4;
  if (rule.when?.decisionStatus !== undefined) score += 2;
  if (hasNonEmptyClause(rule.when)) score += 1;
  return score;
}

function hasNonEmptyClause(when: GuidanceWhen | undefined): boolean {
  if (!when) return false;
  return (
    (when.allOf !== undefined && when.allOf.length > 0) ||
    (when.anyOf !== undefined && when.anyOf.length > 0) ||
    (when.noneOf !== undefined && when.noneOf.length > 0)
  );
}

/**
 * Prüft, ob eine when-Bedingung erfüllt ist.
 *
 * Alle gesetzten Felder werden per AND verknüpft.
 * Fehlende Einträge in checkpointStatuses gelten als nicht erfüllt.
 * Leere Arrays gelten als erfüllt (vacuous truth).
 */
function matchesWhen(
  when: GuidanceWhen | undefined,
  decisionStatus: DecisionStatus,
  statuses: Record<string, CheckpointStatusValue>,
): boolean {
  if (!when) return true;

  // decisionStatus-Prüfung
  if (when.decisionStatus !== undefined && when.decisionStatus !== decisionStatus) {
    return false;
  }

  // allOf: jede Bedingung muss erfüllt sein
  if (when.allOf !== undefined && when.allOf.length > 0) {
    if (!when.allOf.every((c) => conditionMet(c, statuses))) return false;
  }

  // anyOf: mindestens eine Bedingung muss erfüllt sein
  if (when.anyOf !== undefined && when.anyOf.length > 0) {
    if (!when.anyOf.some((c) => conditionMet(c, statuses))) return false;
  }

  // noneOf: keine Bedingung darf erfüllt sein
  if (when.noneOf !== undefined && when.noneOf.length > 0) {
    if (when.noneOf.some((c) => conditionMet(c, statuses))) return false;
  }

  return true;
}

function conditionMet(
  condition: GuidanceCondition,
  statuses: Record<string, CheckpointStatusValue>,
): boolean {
  return statuses[condition.checkpointId] === condition.status;
}
