import { PDFDocument } from "pdf-lib";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { buildWorkflowCasesPrintBlocks } from "@/lib/workflow/workflowCasesPrintPdf";
import { WORKFLOW_TOPIC_AU } from "@/lib/workflow/processCatalog";

const clinicalEntry = {
  kind: "clinical" as const,
  title: "AU-Prozess",
  createdAt: new Date("2026-10-20T12:00:00Z"),
  snapshot: {
    topicId: WORKFLOW_TOPIC_AU,
    role: "MFA" as const,
    processPoints: [
      { id: "AU-P01", title: "Patientenkontakt", status: "UNKLAR" as const, note: "Rückfrage vorgesehen." },
    ],
    m3Checkpoints: [
      {
        id: "WF-C01",
        title: "AU-Angaben",
        status: "ERKENNBAR" as const,
        m2_answers: { "M2-01": "YES" as const },
      },
    ],
    sessionNote: "Notiz zur Sitzung",
  },
};

describe("Arbeitsprozess-PDF-Inhalte", () => {
  it("zeigt in der Kurzübersicht nur tatsächlich offene klinische Punkte", () => {
    const text = buildWorkflowCasesPrintBlocks([clinicalEntry], "summary")
      .map((block) => block.kind === "separator" ? "" : block.text)
      .join("\n");

    expect(text).toContain("AU-Musterprozess");
    expect(text).toContain("Patientenkontakt: Unklar");
    expect(text).not.toContain("Rückfrage vorgesehen.");
    expect(text).not.toContain("Notiz zur Sitzung");
  });

  it("übersetzt Detailantworten und lässt technische Schlüssel weg", () => {
    const text = buildWorkflowCasesPrintBlocks([clinicalEntry], "detail")
      .map((block) => block.kind === "separator" ? "" : block.text)
      .join("\n");

    expect(text).toContain("Patientenkontakt: Unklar");
    expect(text).toContain("AU-Zeitraum (Von/Bis) eingetragen?: Ja");
    expect(text).toContain("Rückfrage vorgesehen.");
    expect(text).toContain("Notiz zur Sitzung");
    expect(text).not.toContain("M2-01");
    expect(text).not.toContain("WF-C01");
  });

  it("rendert lange ausgewählte Einträge auf mehreren A4-Seiten", async () => {
    const entry = {
      ...clinicalEntry,
      snapshot: {
        ...clinicalEntry.snapshot,
        sessionNote: "Langer gespeicherter Inhalt. ".repeat(1200),
      },
    };
    const blocks = buildWorkflowCasesPrintBlocks([entry], "detail");
    const pdf = await PDFDocument.load(await buildPrintPdf("Arbeitsprozesse", blocks));
    const pages = pdf.getPages();

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.getSize().width).toBeCloseTo(595.28, 0);
    expect(pages[0]?.getSize().height).toBeCloseTo(841.89, 0);
  });
});