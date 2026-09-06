import {
  appendSelfCheckInQrFlag,
  buildSelfCheckInQrPayload,
} from "@/lib/selfCheckInQr";

describe("buildSelfCheckInQrPayload", () => {
  it("returns only the trimmed patient number", () => {
    expect(buildSelfCheckInQrPayload("  471182  ")).toBe("471182");
    expect(buildSelfCheckInQrPayload(" 001234 ")).toBe("001234");
  });

  it("does not add a URL, prefix, JSON, or metadata", () => {
    const payload = buildSelfCheckInQrPayload("471182");
    expect(payload).toBe("471182");
    expect(payload).not.toMatch(/https?:\/\/|PATIENT:|\{|\}/);
  });

  it("is independent of workflow and selected content", () => {
    const reference = "001234";
    expect(buildSelfCheckInQrPayload(reference)).toBe(reference);
    expect(buildSelfCheckInQrPayload(reference)).toBe(reference);
  });

  it("adds only the display flag when enabled with a reference", () => {
    const link = "https://example.test/q/token";
    expect(appendSelfCheckInQrFlag(link, "001234", false)).toBe(link);
    expect(appendSelfCheckInQrFlag(link, null, true)).toBe(link);
    expect(appendSelfCheckInQrFlag(link, "001234", true)).toBe(
      "https://example.test/q/token?selfCheckInQr=1",
    );
  });
});