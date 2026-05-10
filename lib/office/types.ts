export enum OfficeCheckpointKind {
  FACT = "FACT",
  RULE = "RULE",
  ASSESSMENT = "ASSESSMENT",
  DECISION = "DECISION",
  SOURCE = "SOURCE",
  DEPENDENCY = "DEPENDENCY",
}

export enum OfficeCheckpointType {
  NACHWEIS_PFLICHT = "NACHWEIS_PFLICHT",
  EXTERNE_BESTAETIGUNG = "EXTERNE_BESTAETIGUNG",
  REGEL_PARAMETER = "REGEL_PARAMETER",
  VERFAHRENSWEG = "VERFAHRENSWEG",
  INTERNE_ENTSCHEIDUNG = "INTERNE_ENTSCHEIDUNG",
  KONTEXT_INFORMATION = "KONTEXT_INFORMATION",
}

export enum OfficeFailureEffect {
  NONE = "NONE",
  RISK = "RISK",
  BLOCKER = "BLOCKER",
  GATEKEEPER = "GATEKEEPER",
}

export enum OfficeOutcomeAudience {
  CHEF = "CHEF",
  BACKOFFICE = "BACKOFFICE",
  ARZT = "ARZT",
  EXTERNE_STELLE = "EXTERNE_STELLE",
}

export enum OfficeCheckpointState {
  YES = "YES",
  NO = "NO",
  OPEN = "OPEN",
}

export type M2AnswerValue = "YES" | "NO" | "UNCLEAR";

export type OfficeCheckpointSnapshot = {
  id: string;
  title: string;
  // Additive transitional field; final fachliche mapping is done explicitly in catalog migration.
  checkpointType?: OfficeCheckpointType;
  // Additive transitional field; no semantic inference from legacy fields.
  failureEffect?: OfficeFailureEffect;
  // Additive transitional field; defaults may be technical placeholders.
  outcomeAudience?: OfficeOutcomeAudience[];
  // Legacy field kept for compatibility with existing snapshots and runtime behavior.
  kind: OfficeCheckpointKind;
  // Legacy snapshot field (from officeKind) kept for compatibility.
  office_kind?: string;
  state: OfficeCheckpointState;
  m2_answers?: Record<string, M2AnswerValue>;
  known_note?: string;
  missing_note?: string;
  answer_source?: string;
  deadline?: string;
  responsible_role?: string;
  authority?: string;
  required_documents?: string[];
  escalation_needed?: boolean;
};
