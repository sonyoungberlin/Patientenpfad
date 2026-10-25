export type WorkflowCasesSessionKind = "clinical" | "internal-protocol" | "practice-workflow";

export type WorkflowCasesExportReference =
  | { type: "session"; id: string; kind: WorkflowCasesSessionKind }
  | { type: "practice-case-session"; id: string; profileId: string }
  | { type: "catalog-entry"; id: string; profileId: string }
  | { type: "practice-profile"; id: string };

export type WorkflowCasesExportRequest = {
  entries: WorkflowCasesExportReference[];
  mode: "summary" | "detail";
};
