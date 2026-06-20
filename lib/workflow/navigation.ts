export function buildWorkflowCaseListPath(): string {
  return "/workflow-cases";
}

export function buildWorkflowCaseNewPath(): string {
  return "/workflow-cases/new";
}

export function buildWorkflowCasePath(id: string): string {
  return `/workflow-cases/${id}`;
}
