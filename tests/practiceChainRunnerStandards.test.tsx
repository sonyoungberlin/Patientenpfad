import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Runner from "@/app/practice/chains/Runner";
import type { RunnerChain } from "@/lib/practiceChains/runner";

function renderStandards(standards: RunnerChain["steps"][number]["standards"]) {
  const runner: RunnerChain = {
    id: "chain-1",
    name: "Testkette",
    version: 1,
    startStepId: "step-1",
    steps: [{
      id: "step-1",
      catalogEntryId: "entry-1",
      title: "Patient bekannt",
      description: null,
      standards,
    }],
    transitions: [{ id: "end", kind: "DIRECT", fromStepId: "step-1", targetStepId: null }],
    connections: [],
  };

  return renderToStaticMarkup(<Runner runner={runner} />);
}

describe("Chain Runner Praxisstandards", () => {
  it("zeigt eingefrorene Anchor-Texte ohne technische IDs oder editierbare Controls", () => {
    const html = renderStandards([{
      title: "Patient bekannt",
      selectedAnchors: ["Patient ist im Praxissystem angelegt", "Name ist erfasst", "Geburtsdatum ist erfasst"],
      implementation: null,
      missingAnchorCount: 0,
    }]);

    expect(html).toContain("Patient ist im Praxissystem angelegt");
    expect(html).toContain("Name ist erfasst");
    expect(html).toContain("Geburtsdatum ist erfasst");
    expect(html).not.toContain("patient-bekannt-a1");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<textarea");
  });

  it("zeigt eine reine zusätzliche Umsetzung ohne Anchors an", () => {
    const html = renderStandards([{
      title: "Patient telefonisch identifizieren",
      selectedAnchors: [],
      implementation: "Patient telefonisch identifizieren.",
      missingAnchorCount: 0,
    }]);

    expect(html).toContain("Zusätzliche Umsetzung:");
    expect(html).toContain("Patient telefonisch identifizieren.");
  });

  it("zeigt Anchors und zusätzliche Umsetzung für mehrere Checkpoints getrennt und geordnet", () => {
    const html = renderStandards([
      {
        title: "Patient bekannt",
        selectedAnchors: ["Patient ist angelegt", "Name ist erfasst"],
        implementation: "Zusätzlich Rückrufnummer abgleichen.",
        missingAnchorCount: 0,
      },
      {
        title: "Rückruf",
        selectedAnchors: ["Rückrufnummer prüfen"],
        implementation: null,
        missingAnchorCount: 0,
      },
    ]);

    const patientSection = html.indexOf("<strong>Patient bekannt</strong>");
    const secondCheckpoint = html.indexOf("<strong>Rückruf</strong>");
    expect(patientSection).toBeGreaterThanOrEqual(0);
    expect(secondCheckpoint).toBeGreaterThan(patientSection);
    expect(html.indexOf("Patient ist angelegt")).toBeLessThan(secondCheckpoint);
    expect(html.indexOf("Name ist erfasst")).toBeLessThan(secondCheckpoint);
    expect(html.indexOf("Zusätzlich Rückrufnummer abgleichen.")).toBeLessThan(secondCheckpoint);
    expect(html.indexOf("Rückrufnummer prüfen")).toBeGreaterThan(secondCheckpoint);
  });
});