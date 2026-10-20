import {
  buildMfaDocumentationText,
  getMfaDocumentationOptions,
} from "@/lib/logic/mfaDocumentation";

const m1Blocks = {
  kommunikation: "unklar",
  medizinische_lage: "klar",
  versorgung_im_alltag: "klar",
  pflegebeobachtung: "klar",
};

describe("MFA-Kurzdokumentation – M1-gefilterte Optionen", () => {
  it("zeigt bei ausschließlich unklarer Kommunikation keine medizinischen Optionen", () => {
    const options = getMfaDocumentationOptions(
      { blocks: m1Blocks },
      [
        { id: "K01", block_id: "kommunikation" },
        { id: "K08", block_id: "kommunikation" },
        { id: "K09", block_id: "kommunikation" },
        { id: "K10", block_id: "medizinische_lage", mode: "MULTI_SELECT" },
        { id: "K11", block_id: "medizinische_lage", mode: "MULTI_SELECT", selections: [] },
        { id: "K12", block_id: "pflegebeobachtung", enabled: false },
        { id: "K13", block_id: "pflegebeobachtung", enabled: false },
      ],
    );

    expect(options.activities.map((option) => option.label)).toContain("Kontaktdaten geprüft");
    expect(options.activities.map((option) => option.label)).not.toContain("Medikationsangaben abgeglichen");
    expect(options.nextSteps.map((option) => option.label)).not.toContain("Fehlende Unterlagen anfordern");
  });

  it("berücksichtigt aktivierte M1-Ergänzungen, aber keine immer vorhandenen Checkpoints", () => {
    const options = getMfaDocumentationOptions(
      { blocks: m1Blocks },
      [
        { id: "K01", block_id: "kommunikation" },
        { id: "K03", block_id: "medizinische_lage" },
        { id: "K10", block_id: "medizinische_lage", mode: "MULTI_SELECT" },
        { id: "K11", block_id: "medizinische_lage", mode: "MULTI_SELECT", selections: [] },
      ],
    );

    expect(options.activities.map((option) => option.label)).toContain("Vorliegende Unterlagen gesichtet");
    expect(options.activities.map((option) => option.label)).not.toContain("MD-Unterlagen gesichtet");
  });

  it("schaltet Anlassoptionen nur mit K11-Auswahl und den bedingten Checkpoints frei", () => {
    const options = getMfaDocumentationOptions(
      { blocks: m1Blocks },
      [
        { id: "K01", block_id: "kommunikation" },
        { id: "K11", selections: ["Reha-Antrag"] },
        { id: "K03", block_id: "medizinische_lage" },
        { id: "K04", block_id: "medizinische_lage" },
        { id: "K05", block_id: "medizinische_lage" },
        { id: "K06", block_id: "versorgung_im_alltag" },
        { id: "K07", block_id: "versorgung_im_alltag" },
        { id: "K14", block_id: "medizinische_lage" },
        { id: "K15", block_id: "medizinische_lage" },
      ],
    );

    expect(options.activities.map((option) => option.label)).toContain("Reha-Unterlagen gesichtet");
    expect(options.activities.map((option) => option.label)).not.toContain("MD-Unterlagen gesichtet");
  });

  it("wertet durch K11 bedingt aktive medizinische und Versorgungs-Checkpoints nicht als M1-Freigabe", () => {
    const options = getMfaDocumentationOptions(
      { blocks: m1Blocks },
      [
        { id: "K11", selections: ["Reha-Antrag"] },
        { id: "K03" },
        { id: "K04" },
        { id: "K05" },
        { id: "K06" },
        { id: "K07" },
        { id: "K14" },
        { id: "K15" },
      ],
    );

    expect(options.activities.map((option) => option.label)).toContain("Reha-Unterlagen gesichtet");
    expect(options.activities.map((option) => option.id)).not.toContain("medical-record-reviewed");
    expect(options.activities.map((option) => option.id)).not.toContain("daily-support-recorded");
  });
});

describe("MFA-Kurzdokumentation – Textbildung", () => {
  it("trennt erledigte Tätigkeit und geplanten Schritt in der richtigen Zeitform", () => {
    const options = getMfaDocumentationOptions({ blocks: m1Blocks }, [{ id: "K01" }]);
    const activity = options.activities.find((option) => option.label === "Krankenblatt gesichtet")!;
    const nextStep = options.nextSteps.find((option) => option.label === "Kontaktperson ermitteln")!;

    expect(buildMfaDocumentationText(options, activity.id, nextStep.id)).toBe(
      "MFA: Krankenblatt gesichtet. Kontaktperson wird ermittelt.",
    );
  });

  it("begrenzt optionale Ergänzungen und verwirft ungültige Optionen", () => {
    const options = getMfaDocumentationOptions({ blocks: m1Blocks }, [{ id: "K01" }]);
    const activity = options.activities[0];
    const nextStep = options.nextSteps[0];
    const text = buildMfaDocumentationText(options, activity.id, nextStep.id, "x".repeat(200));

    expect(text).toContain("x".repeat(160));
    expect(text).not.toContain("x".repeat(161));
    expect(buildMfaDocumentationText(options, "invalid", nextStep.id)).toBe("");
  });
});