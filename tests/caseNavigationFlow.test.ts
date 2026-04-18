import { readFileSync } from "node:fs";
import {
  buildCaseM2Path,
  buildCaseM3Path,
  getCreateSuccessRedirectPath,
} from "@/lib/flow/caseNavigation";

describe("M1 Startflow Navigation", () => {
  it("erfolgreicher M1-Fall navigiert direkt nach M2", () => {
    expect(getCreateSuccessRedirectPath({ ok: true, case_id: "case-123" })).toBe(
      "/cases/case-123/m2",
    );
  });

  it("Gatekeeper-Fall navigiert nicht weiter", () => {
    expect(
      getCreateSuccessRedirectPath({
        ok: true,
        gatekeeper: true,
        case_id: "case-123",
      }),
    ).toBeNull();
  });
});

describe("M2 Skip-Option", () => {
  it("M2-Seite enthält die Skip-Option zur ärztlichen Checkliste", () => {
    const content = readFileSync(
      "/home/runner/work/Patientenpfad/Patientenpfad/app/cases/[id]/m2/page.tsx",
      "utf8",
    );
    expect(content).toContain("Ohne M2 direkt zur ärztlichen Checkliste");
  });

  it("Skip führt direkt zu M3", () => {
    expect(buildCaseM3Path("case-123")).toBe("/cases/case-123/m3");
  });

  it("M1-Zielpfad zu M2 bleibt konsistent", () => {
    expect(buildCaseM2Path("case-123")).toBe("/cases/case-123/m2");
  });
});
