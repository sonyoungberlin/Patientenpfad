export type WorkflowRole = "MFA" | "ARZT";

export type ProcessPointStatus = "ERKENNBAR" | "NICHT_ERFASST" | "UNKLAR";

export type WorkflowM2AnswerValue = "YES" | "NO" | "UNCLEAR";

export type ProcessPointSnapshot = {
  id: string;
  title: string;
  status: ProcessPointStatus;
  note?: string;
  m2_answers?: Record<string, WorkflowM2AnswerValue>;
};

export type WorkflowM3CheckpointSnapshot = {
  id: string;
  title: string;
  status: ProcessPointStatus;
  m2_answers?: Record<string, WorkflowM2AnswerValue>;
};

export type WorkflowProcessSnapshot = {
  topicId: string;
  role: WorkflowRole;
  processPoints: ProcessPointSnapshot[];
  m3Checkpoints?: WorkflowM3CheckpointSnapshot[];
  sessionNote?: string;
};

export function isWorkflowRole(value: unknown): value is WorkflowRole {
  return value === "MFA" || value === "ARZT";
}

export function isProcessPointStatus(value: unknown): value is ProcessPointStatus {
  return value === "ERKENNBAR" || value === "NICHT_ERFASST" || value === "UNKLAR";
}

export function isValidProcessSnapshot(value: unknown): value is WorkflowProcessSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.topicId !== "string") return false;
  if (!isWorkflowRole(v.role)) return false;
  if (!Array.isArray(v.processPoints)) return false;
  return true;
}
