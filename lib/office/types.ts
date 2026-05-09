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

export type OfficeCheckpointSnapshot = {
  id: string;
  title: string;
  kind: OfficeCheckpointKind;
  state: OfficeCheckpointState;
  known_note?: string;
  missing_note?: string;
  answer_source?: string;
};
