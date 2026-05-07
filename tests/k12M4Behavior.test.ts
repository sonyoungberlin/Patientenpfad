import { CHECKPOINT_CATALOGUE } from "@/lib/logic/checkpointCatalog";

describe("K12 – Einschätzungsblock: M4-Verhalten", () => {
  const k12 = CHECKPOINT_CATALOGUE["K12"];

  it("K12 ist im Katalog vorhanden", () => {
    expect(k12).toBeDefined();
  });

  it("K12 hat leeren m4-Text (kein Patienten-Hinweis / keine Empfehlung)", () => {
    expect(k12.m4.text).toBe("");
  });

  it("K12 wird von der M4-Filter-Logik ignoriert (text.length === 0)", () => {
    // Spiegelt die Filter-Bedingung aus M3ChecklistClient wider:
    // .filter((cp) => (cp.m4?.text ?? "").length > 0)
    const produces_m4 = (k12.m4?.text ?? "").length > 0;
    expect(produces_m4).toBe(false);
  });

  it("andere Checkpoints behalten ihren M4-Text", () => {
    for (const [id, cp] of Object.entries(CHECKPOINT_CATALOGUE)) {
      // ASSESSMENT-Checkpoints (K12, K13) erzeugen bewusst keinen M4-Text.
      if (id === "K12" || id === "K13") continue;
      expect((cp.m4?.text ?? "").length).toBeGreaterThan(0);
    }
  });
});
