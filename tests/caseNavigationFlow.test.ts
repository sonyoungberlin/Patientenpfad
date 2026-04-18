import {
  buildCaseM2Path,
  buildCaseM3Path,
  getCreateSuccessRedirectPath,
  isGatekeeperResponse,
} from "@/lib/flow/caseNavigation";

describe("M1 Startflow Navigation", () => {
  it("erfolgreicher M1-Fall navigiert direkt nach M2", () => {
    expect(getCreateSuccessRedirectPath({ case_id: "case-123" })).toBe(
      "/cases/case-123/m2",
    );
  });

  it("Gatekeeper-Fall navigiert nicht weiter", () => {
    expect(isGatekeeperResponse({ gatekeeper: true })).toBe(true);
    expect(getCreateSuccessRedirectPath({ case_id: undefined })).toBeNull();
  });

  it("ohne case_id erfolgt keine Navigation", () => {
    expect(getCreateSuccessRedirectPath({})).toBeNull();
  });

  it("M2- und M3-Pfade stimmen", () => {
    expect(buildCaseM2Path("case-123")).toBe("/cases/case-123/m2");
    expect(buildCaseM3Path("case-123")).toBe("/cases/case-123/m3");
  });
});
