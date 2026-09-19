jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceDocumentationTemplate: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    practiceDocumentationBlock: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createPracticeDocumentationTemplate,
  PracticeDocumentationTemplateBlockError,
  resolveActivePracticeDocumentationTemplates,
  validatePracticeDocumentationTemplate,
} from "@/lib/practice/documentationTemplates";

const findTemplates = prisma.practiceDocumentationTemplate.findMany as jest.Mock;
const findBlocks = prisma.practiceDocumentationBlock.findMany as jest.Mock;
const createTemplate = prisma.practiceDocumentationTemplate.create as jest.Mock;
const input = {
  name: " Kardiologische Stellungnahme ",
  outputFormat: "formell",
  documentTitleOption: "stellungnahme",
  blockLayout: [
    { blockId: "practice_block_2", section: 2, order: 1 },
    { blockId: "practice_block_1", section: 2, order: 0 },
  ],
};

describe("praxisbezogene Dokumentationsvorlagen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findBlocks.mockResolvedValue([{ id: "practice_block_1" }, { id: "practice_block_2" }]);
  });

  it("trimmt Metadaten und normalisiert die vorbereitete Abschnittsreihenfolge", () => {
    expect(validatePracticeDocumentationTemplate(input)).toEqual({
      ok: true,
      value: {
        name: "Kardiologische Stellungnahme",
        outputFormat: "formell",
        documentTitleOption: "stellungnahme",
        blockLayout: [
          { blockId: "practice_block_1", section: 2, order: 0 },
          { blockId: "practice_block_2", section: 2, order: 1 },
        ],
      },
    });
  });

  it.each([
    { ...input, name: "" },
    { ...input, outputFormat: "xml" },
    { ...input, documentTitleOption: "andere" },
    { ...input, blockLayout: [] },
    { ...input, blockLayout: [
      { blockId: "practice_block_1", section: 1, order: 0 },
      { blockId: "practice_block_1", section: 1, order: 1 },
    ] },
  ])("weist ungültige Vorlagen ab", (candidate) => {
    expect(validatePracticeDocumentationTemplate(candidate).ok).toBe(false);
  });

  it("lädt nur gültige aktive Praxisvorlagen und erhält deren Layout", async () => {
    findTemplates.mockResolvedValue([{
      id: "template-1",
      name: "Kardiologie",
      is_active: true,
      output_format: "informell",
      document_title_option: "arztbrief",
      block_layout: [{ blockId: "practice_block_1", section: 3, order: 0 }],
    }]);

    await expect(resolveActivePracticeDocumentationTemplates("practice-1")).resolves.toEqual([{
      id: "template-1",
      name: "Kardiologie",
      outputFormat: "informell",
      documentTitleOption: "arztbrief",
      blockLayout: [{ blockId: "practice_block_1", section: 3, order: 0 }],
    }]);
    expect(findTemplates).toHaveBeenCalledWith({
      where: { practice_id: "practice-1", is_active: true },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });
  });

  it("speichert nur Referenzen auf aktive Blöcke derselben Praxis", async () => {
    const validation = validatePracticeDocumentationTemplate(input);
    if (!validation.ok) throw new Error(validation.error);
    createTemplate.mockResolvedValue({ id: "template-1" });
    await createPracticeDocumentationTemplate("practice-1", validation.value);

    expect(findBlocks).toHaveBeenCalledWith({
      where: {
        id: { in: ["practice_block_1", "practice_block_2"] },
        practice_id: "practice-1",
        is_active: true,
      },
      select: { id: true },
    });
    expect(createTemplate).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ block_definitions: expect.anything() }),
    });
  });

  it("weist fehlende oder praxisfremde Blockreferenzen zurück", async () => {
    findBlocks.mockResolvedValue([{ id: "practice_block_1" }]);
    const validation = validatePracticeDocumentationTemplate(input);
    if (!validation.ok) throw new Error(validation.error);

    await expect(createPracticeDocumentationTemplate("practice-1", validation.value))
      .rejects.toBeInstanceOf(PracticeDocumentationTemplateBlockError);
    expect(createTemplate).not.toHaveBeenCalled();
  });
});