import { PDFDocument } from "pdf-lib";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { buildInternalProtocolPrintBlocks } from "@/lib/workflow/internalProtocol/printPdf";
import { buildInitialInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

describe("Internal-Protocol-Gesamtexport-Inhalte", () => {
  it("enthält alle Checkpoints, Leitplanken, Antworten und klare Protokolltrennung", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    const first = snapshot.checkpoints[0]!;
    const firstQuestionId = Object.keys(first.answers)[0]!;
    first.answers[firstQuestionId] = "YES";
    const blocks = buildInternalProtocolPrintBlocks([
      { title: "Protokoll Alpha", createdAt: new Date("2026-10-20T12:00:00Z"), snapshot },
      { title: "Protokoll Beta", createdAt: new Date("2026-10-21T12:00:00Z"), snapshot },
    ]);
    const text = blocks.map((block) => block.kind === "separator" ? "---" : block.text).join("\n");

    expect(text).toContain("Protokoll Alpha");
    expect(text).toContain("Protokoll Beta");
    expect(text.match(/Geltungsbereich/g)).toHaveLength(2);
    expect(text).toContain("Fachliche Leitplanken");
    expect(text).toContain("Antwort: Ja");
    expect(text).toContain("Quelle:");
    expect(blocks.filter((block) => block.kind === "separator")).toHaveLength(1);
  });

  it("weist zusätzliche gespeicherte Antworten aus", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    snapshot.checkpoints[0]!.answers.unbekannteFrage = "Gespeicherter Freitext";

    const text = buildInternalProtocolPrintBlocks([
      { title: "Altprotokoll", createdAt: new Date("2026-10-20T12:00:00Z"), snapshot },
    ]).map((block) => block.kind === "separator" ? "---" : block.text).join("\n");

    expect(text).toContain("Weitere gespeicherte Antwort: Gespeicherter Freitext");
    expect(text).not.toContain("unbekannteFrage");
  });

  it("rendert lange Protokollinhalte mehrseitig im A4-Hochformat", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const firstQuestionId = Object.keys(snapshot.checkpoints[0]!.answers)[0]!;
    snapshot.checkpoints[0]!.answers[firstQuestionId] = "Langer gespeicherter Antworttext. ".repeat(1100);
    const blocks = buildInternalProtocolPrintBlocks([
      { title: "Langes Protokoll", createdAt: new Date("2026-10-20T12:00:00Z"), snapshot },
    ]);
    const bytes = await buildPrintPdf("Interne Protokolle", blocks);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.getSize().width).toBeCloseTo(595.28, 0);
    expect(pages[0]?.getSize().height).toBeCloseTo(841.89, 0);
  });
});