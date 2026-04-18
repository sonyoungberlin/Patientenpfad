import { renderToStaticMarkup } from "react-dom/server";
import {
  buildCaseM2Path,
  buildCaseM3Path,
  getCreateSuccessRedirectPath,
} from "@/lib/flow/caseNavigation";
import M2Page from "@/app/cases/[id]/m2/page";

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
  it("M2-Seite enthält die Skip-Option zur ärztlichen Checkliste", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-123" }) }),
    );
    expect(markup).toContain("Ohne M2 direkt zur ärztlichen Checkliste");
    expect(markup).toContain("<a");
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
