import { NextRequest } from "next/server";
import { PracticeRole } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceDocumentationBlock: { findMany: jest.fn() },
    practiceDocumentationTemplate: { findMany: jest.fn() },
  },
}));

import { GET } from "@/app/api/practice/documentation-library/pdf/route";
import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildPracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";

const requireRole = requirePracticeRole as jest.Mock;
const blockFindMany = prisma.practiceDocumentationBlock.findMany as jest.Mock;
const templateFindMany = prisma.practiceDocumentationTemplate.findMany as jest.Mock;
const account = {
  id: "account-1",
  is_approved: true,
  current_practice: { id: "practice-1" },
};

function request() {
  return new NextRequest("http://localhost/api/practice/documentation-library/pdf");
}

function extractText(bytes: Uint8Array): string {
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

describe("GET /api/practice/documentation-library/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireRole.mockResolvedValue({ account, error: null });
    blockFindMany.mockResolvedValue([]);
    templateFindMany.mockResolvedValue([]);
  });

  it("exportiert aktive Vorlagen und alle Praxisbausteine vollständig, aber keine inaktiven Vorlagen", async () => {
    const paragraph = buildPracticeDocumentationBlockDefinition({
      title: "Einwilligung",
      blockType: "paragraph",
      text: "Vollständiger Absatzinhalt der Praxis.",
    });
    const inactive = buildPracticeDocumentationBlockDefinition({
      title: "Inaktiver Baustein",
      blockType: "paragraph",
      text: "Auch inaktive Bausteine werden gedruckt.",
    });
    blockFindMany.mockResolvedValue([
      { id: paragraph.block.id, title: "Einwilligung", is_active: true, definition: paragraph },
      { id: inactive.block.id, title: "Inaktiver Baustein", is_active: false, definition: inactive },
    ]);
    templateFindMany.mockResolvedValue([
      {
        name: "Aufnahme",
        category: "documentation",
        is_active: true,
        block_layout: [{ blockId: paragraph.block.id, section: 1, order: 0 }],
        output_format: "formell",
        document_title_option: "stellungnahme",
        patient_signature_required: true,
      },
      { name: "Deaktiviert", category: "documentation", is_active: false, block_layout: [{ blockId: inactive.block.id, section: 1, order: 0 }] },
    ]);

    const response = await GET(request());
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = extractText(bytes);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(requireRole).toHaveBeenCalledWith(expect.any(NextRequest), [PracticeRole.OWNER, PracticeRole.ADMIN]);
    expect(blockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { practice_id: "practice-1" } }));
    expect(templateFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { practice_id: "practice-1" } }));
    expect(text).toContain("Vorlage: Aufnahme");
    expect(text).not.toContain("Vorlage: Deaktiviert");
    expect(text).toContain("Vollständiger Absatzinhalt der Praxis.");
    expect(text).toContain("Auch inaktive Bausteine werden gedruckt.");
    expect(blockFindMany.mock.calls[0]?.[0].where).not.toHaveProperty("is_active");
  });

  it("liefert für leere Bibliotheken ein gültiges PDF und verwendet keine Patientendokumente", async () => {
    const response = await GET(request());
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBe(1);
    expect(extractText(bytes)).toContain("Seite 1 von 1");
    expect(blockFindMany).toHaveBeenCalledTimes(1);
    expect(templateFindMany).toHaveBeenCalledTimes(1);
  });

  it("bricht lange Bibliotheksinhalte auf A4-Seiten mit vollständiger Nummerierung um", async () => {
    const longDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Langer Inhalt",
      blockType: "paragraph",
      text: "Vollständiger Textabsatz. ".repeat(950),
    });
    blockFindMany.mockResolvedValue([{
      id: longDefinition.block.id,
      title: "Langer Inhalt",
      is_active: true,
      definition: longDefinition,
    }]);
    const response = await GET(request());
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();
    const text = extractText(bytes);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.getSize().width).toBeCloseTo(595.28, 0);
    expect(pages[0]?.getSize().height).toBeCloseTo(841.89, 0);
    expect(text).toContain(`Seite 1 von ${pages.length}`);
    expect(text).toContain(`Seite ${pages.length} von ${pages.length}`);
  });

  it("verweigert unberechtigte und nicht freigeschaltete Konten ohne Datenabfrage", async () => {
    requireRole.mockResolvedValueOnce({ account: null, error: new Response("Forbidden", { status: 403 }) });
    expect((await GET(request())).status).toBe(403);
    requireRole.mockResolvedValueOnce({ account: { ...account, is_approved: false }, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(blockFindMany).not.toHaveBeenCalled();
    expect(templateFindMany).not.toHaveBeenCalled();
  });
});