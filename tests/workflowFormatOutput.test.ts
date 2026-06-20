/**
 * Tests für lib/workflow/formatOutput.ts
 */

import { formatProcessOutput } from "@/lib/workflow/formatOutput";
import type { WorkflowProcessSnapshot } from "@/lib/workflow/types";
import { WORKFLOW_TOPIC_AU } from "@/lib/workflow/processCatalog";

function makeSnapshot(
  overrides: Partial<WorkflowProcessSnapshot> = {},
): WorkflowProcessSnapshot {
  return {
    topicId: WORKFLOW_TOPIC_AU,
    role: "MFA",
    processPoints: [
      { id: "AU-P01", title: "Patientenkontakt", status: "ERKENNBAR" },
      { id: "AU-P02", title: "ICD-10-Code", status: "NICHT_ERFASST" },
      { id: "AU-P03", title: "Zeitraum AU", status: "UNKLAR" },
    ],
    ...overrides,
  };
}

describe("formatProcessOutput", () => {
  it("enthält Topic-Titel und Rolle in der ersten Zeile", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).toContain("AU-Musterprozess");
    expect(output).toContain("MFA");
    expect(output.split("\n")[0]).toContain("AU-Musterprozess");
    expect(output.split("\n")[0]).toContain("MFA");
  });

  it("ARZT-Rolle wird als 'Arzt' ausgegeben", () => {
    const output = formatProcessOutput(makeSnapshot({ role: "ARZT" }));
    expect(output.split("\n")[0]).toContain("Arzt");
  });

  it("Status-Labels: ERKENNBAR → 'erkennbar'", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).toContain(": erkennbar");
  });

  it("Status-Labels: NICHT_ERFASST → 'nicht erfasst'", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).toContain(": nicht erfasst");
  });

  it("Status-Labels: UNKLAR → 'unklar'", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).toContain(": unklar");
  });

  it("enthält Prozesspunkt-Titel", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).toContain("Patientenkontakt");
    expect(output).toContain("ICD-10-Code");
    expect(output).toContain("Zeitraum AU");
  });

  it("gibt Punkt-Notiz aus wenn vorhanden", () => {
    const snapshot = makeSnapshot({
      processPoints: [
        {
          id: "AU-P01",
          title: "Patientenkontakt",
          status: "ERKENNBAR",
          note: "Einzel-Notiz zum Punkt",
        },
      ],
    });
    const output = formatProcessOutput(snapshot);
    expect(output).toContain("Einzel-Notiz zum Punkt");
  });

  it("gibt keine Notiz-Zeile aus wenn note fehlt", () => {
    const output = formatProcessOutput(makeSnapshot());
    const lines = output.split("\n");
    const noteLines = lines.filter((l) => l.trimStart().startsWith("Notiz:"));
    expect(noteLines).toHaveLength(0);
  });

  it("gibt Session-Notiz aus wenn vorhanden", () => {
    const output = formatProcessOutput(
      makeSnapshot({ sessionNote: "Gesamtnotiz der Sitzung" }),
    );
    expect(output).toContain("Notizen:");
    expect(output).toContain("Gesamtnotiz der Sitzung");
  });

  it("gibt keinen Notizen-Abschnitt aus wenn sessionNote fehlt", () => {
    const output = formatProcessOutput(makeSnapshot());
    expect(output).not.toContain("Notizen:");
  });
});
