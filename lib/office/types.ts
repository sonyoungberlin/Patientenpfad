export enum OfficeCheckpointKind {
  FACT = "FACT",
  RULE = "RULE",
  ASSESSMENT = "ASSESSMENT",
  DECISION = "DECISION",
  SOURCE = "SOURCE",
  DEPENDENCY = "DEPENDENCY",
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
  kind: OfficeCheckpointKind;
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
