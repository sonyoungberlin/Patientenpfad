import type { PracticeCheckpoint } from "./types";

export const PRACTICE_DEFINITION_SCHEMA_VERSION = 1 as const;

export type DefinitionDimensionDecision = "UNDECIDED" | "INCLUDED" | "EXCLUDED";

export type CriterionOperator =
  | "PRESENT"
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "IN";

export type CriterionValue = string | number | boolean | string[];

export interface PracticeDefinitionCriterion {
  id: string;
  label: string;
  sourceDimensionId?: string;
  dataKey: string;
  operator: CriterionOperator;
  expectedValue?: CriterionValue;
  unit?: string;
  note?: string;
}

export type PracticeDefinitionExpression =
  | { kind: "CRITERION"; criterionId: string }
  | { kind: "ALL" | "ANY"; operands: PracticeDefinitionExpression[] }
  | { kind: "NOT"; operand: PracticeDefinitionExpression };

export interface PracticeDefinitionDataRequirement {
  key: string;
  label: string;
  source?: string;
}

export interface PracticeDefinitionResponsibility {
  collectedBy: string[];
  assessedBy: string[];
  assessmentLocation: string;
  documentationLocation: string;
}

export interface PracticeDefinitionDimension {
  dimensionId: string;
  decision: DefinitionDimensionDecision;
  rationale?: string;
}

export interface PracticeCheckpointDefinitionContent {
  schemaVersion: typeof PRACTICE_DEFINITION_SCHEMA_VERSION;
  statement: string;
  dimensions: PracticeDefinitionDimension[];
  criteria: PracticeDefinitionCriterion[];
  expression: PracticeDefinitionExpression;
  requiredData: PracticeDefinitionDataRequirement[];
  responsibility: PracticeDefinitionResponsibility;
  notes?: string;
}

export interface PracticeCheckpointTemplateSnapshot {
  checkpointId: string;
  title: string;
  description?: string;
  orientationHint?: string;
  dimensions: { id: string; prompt: string }[];
}

export interface PracticeCheckpointDefinitionVersionSnapshot {
  definitionId: string;
  versionId: string;
  version: number;
  checkpointId: string;
  template: PracticeCheckpointTemplateSnapshot;
  content: PracticeCheckpointDefinitionContent;
  releasedAt: string;
}

export function createEmptyPracticeDefinition(
  template: PracticeCheckpointTemplateSnapshot,
): PracticeCheckpointDefinitionContent {
  return {
    schemaVersion: PRACTICE_DEFINITION_SCHEMA_VERSION,
    statement: "",
    dimensions: template.dimensions.map((dimension) => ({
      dimensionId: dimension.id,
      decision: "UNDECIDED",
    })),
    criteria: [],
    expression: { kind: "ALL", operands: [] },
    requiredData: [],
    responsibility: {
      collectedBy: [],
      assessedBy: [],
      assessmentLocation: "",
      documentationLocation: "",
    },
  };
}

export function parsePracticeDefinitionContent(
  value: unknown,
): PracticeCheckpointDefinitionContent | null {
  if (!isRecord(value)) return null;
  const candidate = value as Record<string, unknown>;
  const responsibility = candidate.responsibility;
  if (
    candidate.schemaVersion !== PRACTICE_DEFINITION_SCHEMA_VERSION ||
    typeof candidate.statement !== "string" ||
    !Array.isArray(candidate.dimensions) || !candidate.dimensions.every(isDimension) ||
    !Array.isArray(candidate.criteria) || !candidate.criteria.every(isCriterion) ||
    !isExpression(candidate.expression) ||
    !Array.isArray(candidate.requiredData) || !candidate.requiredData.every(isDataRequirement) ||
    !isRecord(responsibility) ||
    !isStringArray(responsibility.collectedBy) ||
    !isStringArray(responsibility.assessedBy) ||
    typeof responsibility.assessmentLocation !== "string" ||
    typeof responsibility.documentationLocation !== "string" ||
    (candidate.notes !== undefined && typeof candidate.notes !== "string")
  ) return null;
  return value as unknown as PracticeCheckpointDefinitionContent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDimension(value: unknown): value is PracticeDefinitionDimension {
  return isRecord(value) &&
    typeof value.dimensionId === "string" &&
    (value.decision === "UNDECIDED" || value.decision === "INCLUDED" || value.decision === "EXCLUDED") &&
    (value.rationale === undefined || typeof value.rationale === "string");
}

function isCriterionValue(value: unknown): value is CriterionValue {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) || isStringArray(value);
}

function isCriterion(value: unknown): value is PracticeDefinitionCriterion {
  if (!isRecord(value)) return false;
  const operators: CriterionOperator[] = [
    "PRESENT", "EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_OR_EQUAL",
    "LESS_THAN", "LESS_THAN_OR_EQUAL", "IN",
  ];
  return typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.dataKey === "string" &&
    operators.includes(value.operator as CriterionOperator) &&
    (value.sourceDimensionId === undefined || typeof value.sourceDimensionId === "string") &&
    (value.expectedValue === undefined || isCriterionValue(value.expectedValue)) &&
    (value.unit === undefined || typeof value.unit === "string") &&
    (value.note === undefined || typeof value.note === "string");
}

function isExpression(value: unknown): value is PracticeDefinitionExpression {
  if (!isRecord(value)) return false;
  if (value.kind === "CRITERION") return typeof value.criterionId === "string";
  if (value.kind === "NOT") return isExpression(value.operand);
  if (value.kind === "ALL" || value.kind === "ANY") {
    return Array.isArray(value.operands) && value.operands.every(isExpression);
  }
  return false;
}

function isDataRequirement(value: unknown): value is PracticeDefinitionDataRequirement {
  return isRecord(value) && typeof value.key === "string" && typeof value.label === "string" &&
    (value.source === undefined || typeof value.source === "string");
}

export function checkpointTemplateSnapshot(
  checkpoint: PracticeCheckpoint,
): PracticeCheckpointTemplateSnapshot {
  return {
    checkpointId: checkpoint.id,
    title: checkpoint.title,
    ...(checkpoint.description ? { description: checkpoint.description } : {}),
    ...(checkpoint.orientationHint ? { orientationHint: checkpoint.orientationHint } : {}),
    dimensions: (checkpoint.orientationAnchors ?? []).map((anchor) => ({
      id: anchor.id,
      prompt: anchor.text,
    })),
  };
}

function collectExpressionCriterionIds(
  expression: PracticeDefinitionExpression,
): string[] {
  switch (expression.kind) {
    case "CRITERION":
      return [expression.criterionId];
    case "NOT":
      return collectExpressionCriterionIds(expression.operand);
    case "ALL":
    case "ANY":
      return expression.operands.flatMap(collectExpressionCriterionIds);
  }
}

function hasExpectedValue(criterion: PracticeDefinitionCriterion): boolean {
  if (criterion.operator === "PRESENT") return true;
  if (criterion.operator === "IN") {
    return Array.isArray(criterion.expectedValue) && criterion.expectedValue.length > 0 &&
      criterion.expectedValue.every((item) => item.trim().length > 0);
  }
  return criterion.expectedValue !== undefined &&
    (typeof criterion.expectedValue !== "string" || criterion.expectedValue.trim().length > 0);
}

export function validatePracticeDefinitionForRelease(
  content: PracticeCheckpointDefinitionContent,
  template: PracticeCheckpointTemplateSnapshot,
): string[] {
  const issues: string[] = [];
  if (content.schemaVersion !== PRACTICE_DEFINITION_SCHEMA_VERSION) {
    issues.push("Unbekannte Definitionsschema-Version.");
  }
  if (!content.statement.trim()) {
    issues.push("Die prüfbare Aussage fehlt.");
  }

  const templateDimensionIds = new Set(template.dimensions.map((item) => item.id));
  const dimensionIds = content.dimensions.map((item) => item.dimensionId);
  if (new Set(dimensionIds).size !== dimensionIds.length) {
    issues.push("Eine Vorlagendimension wurde mehrfach entschieden.");
  }
  for (const dimensionId of templateDimensionIds) {
    if (!dimensionIds.includes(dimensionId)) {
      issues.push(`Die Vorlagendimension ${dimensionId} wurde nicht ein- oder ausgeschlossen.`);
    }
  }
  for (const dimensionId of dimensionIds) {
    if (!templateDimensionIds.has(dimensionId)) {
      issues.push(`Die Vorlagendimension ${dimensionId} existiert nicht.`);
    }
  }
  if (content.dimensions.some((item) => item.decision === "UNDECIDED")) {
    issues.push("Alle Vorlagendimensionen müssen ausdrücklich ein- oder ausgeschlossen sein.");
  }

  const criterionIds = content.criteria.map((criterion) => criterion.id);
  if (criterionIds.length === 0) issues.push("Mindestens ein konkretes Kriterium ist erforderlich.");
  if (new Set(criterionIds).size !== criterionIds.length) {
    issues.push("Kriteriums-IDs müssen eindeutig sein.");
  }
  const dataKeys = content.requiredData.map((item) => item.key);
  if (new Set(dataKeys).size !== dataKeys.length) {
    issues.push("Daten-IDs müssen eindeutig sein.");
  }
  for (const criterion of content.criteria) {
    if (!criterion.id.trim() || !criterion.label.trim() || !criterion.dataKey.trim()) {
      issues.push("Jedes Kriterium benötigt ID, Bezeichnung und Datenbezug.");
    }
    if (!hasExpectedValue(criterion)) {
      issues.push(`Für ${criterion.id} fehlt ein strukturierter Vergleichswert.`);
    }
    if (!dataKeys.includes(criterion.dataKey)) {
      issues.push(`Das Kriterium ${criterion.id} verweist auf unbekannte Daten.`);
    }
    if (criterion.sourceDimensionId) {
      const dimension = content.dimensions.find(
        (item) => item.dimensionId === criterion.sourceDimensionId,
      );
      if (!dimension || dimension.decision !== "INCLUDED") {
        issues.push(`Das Kriterium ${criterion.id} gehört nicht zu einer einbezogenen Dimension.`);
      }
    }
  }
  for (const dimension of content.dimensions) {
    const linked = content.criteria.some(
      (criterion) => criterion.sourceDimensionId === dimension.dimensionId,
    );
    if (dimension.decision === "INCLUDED" && !linked) {
      issues.push(`Die einbezogene Dimension ${dimension.dimensionId} hat kein konkretes Kriterium.`);
    }
    if (dimension.decision === "EXCLUDED" && linked) {
      issues.push(`Die ausgeschlossene Dimension ${dimension.dimensionId} darf kein Kriterium steuern.`);
    }
  }

  const expressionIds = collectExpressionCriterionIds(content.expression);
  if (new Set(expressionIds).size !== expressionIds.length) {
    issues.push("Jedes Kriterium darf in der Verknüpfung nur einmal vorkommen.");
  }
  const knownCriterionIds = new Set(criterionIds);
  if (expressionIds.some((id) => !knownCriterionIds.has(id))) {
    issues.push("Die Verknüpfung verweist auf ein unbekanntes Kriterium.");
  }
  if (criterionIds.some((id) => !expressionIds.includes(id))) {
    issues.push("Alle Kriterien müssen ausdrücklich verknüpft werden.");
  }
  if (
    (content.expression.kind === "ALL" || content.expression.kind === "ANY") &&
    content.expression.operands.length === 0
  ) {
    issues.push("Eine Kriteriengruppe darf nicht leer sein.");
  }

  if (content.requiredData.some((item) => !item.key.trim() || !item.label.trim())) {
    issues.push("Benötigte Daten brauchen ID und Bezeichnung.");
  }
  const responsibility = content.responsibility;
  if (
    responsibility.collectedBy.length === 0 ||
    responsibility.assessedBy.length === 0 ||
    !responsibility.assessmentLocation.trim() ||
    !responsibility.documentationLocation.trim()
  ) {
    issues.push("Erhebung, Einschätzung und Dokumentationsort müssen festgelegt sein.");
  }
  return issues;
}