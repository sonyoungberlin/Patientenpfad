export type CreateCaseResponse = {
  ok?: boolean;
  gatekeeper?: boolean;
  case_id?: string;
};

export function buildCaseM2Path(caseId: string) {
  return `/cases/${caseId}/m2`;
}

export function buildCaseM3Path(caseId: string) {
  return `/cases/${caseId}/m3`;
}

export function getCreateSuccessRedirectPath(data: CreateCaseResponse) {
  if (!data.ok || data.gatekeeper || !data.case_id) return null;
  return buildCaseM2Path(data.case_id);
}
