import iconv from "iconv-lite";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
  InternalDocumentationVariantError,
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

const letterBlock = {
  id: "letter-block",
  label: "Verlauf",
  displayOrder: 1,
  initiallyVisible: true,
  conditionalRules: [],
  outputSemantics: "documented-content-v1" as const,
  section: 1 as const,
  order: 0,
  questions: [{ id: "letter-answer", text: "Befund", type: "textarea" as const, required: false }],
  documentationOutputVariants: {
    facharztbrief: { outputMode: "text" as const, documentationText: "Facharzttext" },
    patientenbrief: { outputMode: "text" as const, documentationText: "Patiententext" },
  },
};

function letterSession(overrides: Partial<InternalDocumentationArtifactSession> = {}) {
  return session({
    deduplicated_questions: letterBlock.questions,
    answers: { "letter-answer": "Befund" },
    frozen_blocks: {
      schemaVersion: 2,
      metadata: {
        documentTitleOption: "bescheinigung",
        documentTitle: "Bescheinigung",
        outputVariantIds: ["facharztbrief", "patientenbrief"],
      },
      blocks: [letterBlock],
    },
    ...overrides,
  });
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  await PDFDocument.load(bytes);
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1"));
    } catch {
      streams.push(match[1]!);
    }
  }
  return streams.join(" ").replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
    Buffer.from(hex, "hex").toString("latin1"),
  );
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

  it("exportiert die gewählte Briefvariante in PDF, XML und GDT mit Variantendateinamen", async () => {
    const input = letterSession();
    const pdf = await buildInternalDocumentationPdfArtifact(input, undefined, "facharztbrief");
    const xml = buildInternalDocumentationXmlArtifact(input, "facharztbrief");
    const gdt = buildInternalDocumentationGdtArtifact(input, "facharztbrief");

    expect(pdf.filename).toBe("20260912_81426_Bescheinigung-facharztbrief.pdf");
    expect(await extractPdfText(pdf.bytes)).toContain("Facharzttext");
    expect(await extractPdfText(pdf.bytes)).not.toContain("Patiententext");
    const xmlText = new TextDecoder().decode(xml.bytes);
    expect(xml.filename).toBe("20260912_81426_Bescheinigung-facharztbrief.xml");
    expect(xmlText).toContain("Facharzttext");
    expect(xmlText).not.toContain("Patiententext");
    const gdtText = iconv.decode(Buffer.from(gdt!.bytes), "cp850");
    expect(gdt?.filename).toBe("20260912_81426_Bescheinigung-facharztbrief.gdt");
    expect(gdtText).toContain("Facharzttext");
    expect(gdtText).not.toContain("System: Bescheinigung dokumentiert");
  });

  it("lehnt nicht aktivierte oder leere Briefvarianten ab", () => {
    const input = letterSession();
    expect(() => buildInternalDocumentationXmlArtifact(input, "krankenblatt"))
      .toThrow(InternalDocumentationVariantError);

    const emptyInput = letterSession({
      frozen_blocks: {
        schemaVersion: 2,
        metadata: {
          documentTitleOption: "bescheinigung",
          documentTitle: "Bescheinigung",
          outputVariantIds: ["facharztbrief"],
        },
        blocks: [{ ...letterBlock, documentationOutputVariants: { facharztbrief: { outputMode: "none" as const } } }],
      },
    });
    try {
      buildInternalDocumentationXmlArtifact(emptyInput, "facharztbrief");
      throw new Error("Leere Briefvariante wurde exportiert.");
    } catch (error) {
      expect(error).toBeInstanceOf(InternalDocumentationVariantError);
      expect((error as InternalDocumentationVariantError).status).toBe(409);
    }
  });
});
