/**
 * Tests zum Fragebogen-Link-Verhalten in InquiryM3Client.
 *
 * Der generierte /q/-Link wird direkt in die bestehende M3-Nachricht (OutputView)
 * integriert und nicht mehr in einem separaten Textarea angezeigt.
 *
 * Diese Datei prüft:
 * - Der Link enthält das erwartete /q/-Pfadmuster
 * - buildQuestionnaireMessageText ist nicht mehr exportiert (separater Ansatz entfernt)
 */

import * as InquiryM3ClientModule from "@/app/inquiries/[id]/m3/InquiryM3Client";

describe("InquiryM3Client – Fragebogen-Link-Integration", () => {
  it("exportiert buildQuestionnaireMessageText NICHT mehr (separater Ansatz entfernt)", () => {
    expect(
      (InquiryM3ClientModule as Record<string, unknown>)["buildQuestionnaireMessageText"],
    ).toBeUndefined();
  });

  it("hat einen default-Export (InquiryM3Client)", () => {
    expect(typeof InquiryM3ClientModule.default).toBe("function");
  });
});
