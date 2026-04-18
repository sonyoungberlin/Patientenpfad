import { renderToStaticMarkup } from "react-dom/server";
import {
  buildCaseM2Path,
  buildCaseM3Path,
  getCreateSuccessRedirectPath,
  isGatekeeperResponse,
} from "@/lib/flow/caseNavigation";
import M2Page from "@/app/cases/[id]/m2/page";

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
});

describe("M2 Skip-Option", () => {
  it("M2-Seite enthält die Skip-Option zur ärztlichen Checkliste", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-123" }) }),
    );
    expect(markup).toContain("Ohne M2 direkt zur ärztlichen Checkliste");
  });

  it("Skip führt direkt zu M3", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-123" }) }),
    );
    expect(markup).toContain('href="/cases/case-123/m3"');
    expect(buildCaseM3Path("case-123")).toBe("/cases/case-123/m3");
  });

  it("M1-Zielpfad zu M2 bleibt konsistent", () => {
    expect(buildCaseM2Path("case-123")).toBe("/cases/case-123/m2");
  });
});
