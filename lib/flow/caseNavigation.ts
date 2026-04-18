export type CreateCaseResponse = {
  case_id?: string;
  gatekeeper?: boolean;
};

export function buildCaseM2Path(caseId: string) {
  return `/cases/${caseId}/m2`;
}

export function buildCaseM3Path(caseId: string) {
  return `/cases/${caseId}/m3`;
}

export function isGatekeeperResponse(data: CreateCaseResponse) {
  return data.gatekeeper === true;
}

export function getCreateSuccessRedirectPath(data: CreateCaseResponse) {
  if (!data.case_id) return null;
  return buildCaseM2Path(data.case_id);
}
