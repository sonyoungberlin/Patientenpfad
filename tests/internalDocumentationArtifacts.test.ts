import iconv from "iconv-lite";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
  type InternalDocumentationArtifactSession,
} from "@/lib/questionnaire/internalDocumentationArtifacts";
import { buildInternalDocumentationFrozenBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";

const blocks = buildInternalDocumentationFrozenBlocks(["CARE_PLAN_HA"]);
const questions = blocks.flatMap((block) => block.questions);

function session(overrides: Partial<InternalDocumentationArtifactSession> = {}): InternalDocumentationArtifactSession {
  return {
    patient_reference: "81426",
    submitted_at: new Date("2026-09-11T22:30:00.000Z"),
    submitted_by: "practice",
    selected_block_ids: ["CARE_PLAN_HA"],
    deduplicated_questions: questions,
    answers: { CARE_PLAN_HA_REASON: "Versorgung abstimmen" },
    frozen_blocks: {
      schemaVersion: 2,
      metadata: {
        documentTitleOption: "bescheinigung",
        documentTitle: "Bescheinigung",
      },
      blocks,
    },
    source: "practice_direct",
    session_kind: "internal_documentation",
    internal_workflow_id: null,
    practice_form: null,
    ...overrides,
  };
}

describe("interne Dokumentationsartefakte", () => {
  it("erzeugt PDF, XML v2 und GDT mit demselben zentralen Dateistamm", async () => {
    const input = session();
    const pdf = await buildInternalDocumentationPdfArtifact(input);
    const xml = buildInternalDocumentationXmlArtifact(input);
    const gdt = buildInternalDocumentationGdtArtifact(input);

    expect(pdf.filename).toBe("20260912_81426_Bescheinigung.pdf");
    expect(xml.filename).toBe("20260912_81426_Bescheinigung.xml");
    expect(gdt?.filename).toBe("20260912_81426_Bescheinigung.gdt");
    expect(pdf.mimeType).toBe("application/pdf");
    expect(xml.mimeType).toBe("application/xml; charset=utf-8");
    expect(gdt?.mimeType).toBe("application/octet-stream");
    expect(pdf.bytes.length).toBeGreaterThan(0);

    const xmlContent = new TextDecoder().decode(xml.bytes);
    expect(xmlContent).toContain('<appExport version="2.0">');
    expect(xmlContent).toContain("<documentTitle>Bescheinigung</documentTitle>");
    expect(xmlContent.match(/<section slot="[123]"/g)).toHaveLength(3);

    const gdtContent = iconv.decode(Buffer.from(gdt!.bytes), "cp850");
    expect(gdtContent).toContain("6227System: Bescheinigung dokumentiert\r\n");
    expect(gdtContent).not.toContain("Versorgung abstimmen");
  });

  it("verwendet einen individuellen Titel ausschließlich über die zentralen Metadaten", async () => {
    const input = session({
      frozen_blocks: {
        schemaVersion: 2,
        metadata: {
          documentTitleOption: "andere",
          documentTitle: "Ärztliche Stellungnahme & Bericht",
        },
        blocks,
      },
    });

    const pdf = await buildInternalDocumentationPdfArtifact(input);
    const xml = buildInternalDocumentationXmlArtifact(input);
    const gdt = buildInternalDocumentationGdtArtifact(input);

    const baseFilename = "20260912_81426_Aerztliche_Stellungnahme_Bericht";
    expect(pdf.filename).toBe(`${baseFilename}.pdf`);
    expect(xml.filename).toBe(`${baseFilename}.xml`);
    expect(gdt?.filename).toBe(`${baseFilename}.gdt`);
    expect(new TextDecoder().decode(xml.bytes)).toContain(
      "<documentTitle>Ärztliche Stellungnahme &amp; Bericht</documentTitle>",
    );
  });

  it("erzeugt für eine ungültige Legacy-Referenz PDF und XML, aber kein GDT", async () => {
    const input = session({
      patient_reference: "PAT-ALT",
      frozen_blocks: blocks,
    });

    const pdf = await buildInternalDocumentationPdfArtifact(input);
    const xml = buildInternalDocumentationXmlArtifact(input);

    expect(pdf.filename).toBe("20260912_Interne_Dokumentation.pdf");
    expect(xml.filename).toBe("20260912_Interne_Dokumentation.xml");
    expect(new TextDecoder().decode(xml.bytes)).toContain(
      "<documentTitle>Interne Dokumentation</documentTitle>",
    );
    expect(buildInternalDocumentationGdtArtifact(input)).toBeNull();
  });
});
