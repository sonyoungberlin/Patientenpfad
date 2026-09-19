import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceDocumentationBlock: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    practiceDocumentationTemplate: { findMany: jest.fn() },
  },
}));

import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/practice/documentation-library/route";
import { PATCH } from "@/app/api/practice/documentation-library/[id]/route";

const requireRole = requirePracticeRole as jest.Mock;
const blockDb = prisma.practiceDocumentationBlock as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  updateMany: jest.Mock;
};
const templateDb = prisma.practiceDocumentationTemplate as unknown as { findMany: jest.Mock };

function request(path: string, method: "POST" | "PATCH", body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const textBlock = { title: " Anamnese ", blockType: "text", text: " Freitext " };

describe("Praxis-Dokumentationsbibliothek API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireRole.mockResolvedValue({
      account: { current_practice: { id: "practice-1" } },
      error: null,
    });
    blockDb.create.mockResolvedValue({ id: "practice_block_1" });
    blockDb.findFirst.mockResolvedValue({
      id: "practice_block_1",
      practice_id: "practice-1",
      definition: {
        schemaVersion: 1,
        visibleType: "text",
        block: { id: "practice_block_1", label: "Anamnese", displayOrder: 0, questionIds: ["practice_question_1"] },
        questions: [{ id: "practice_question_1", text: "Freitext", type: "textarea", required: false }],
      },
    });
    blockDb.updateMany.mockResolvedValue({ count: 1 });
    templateDb.findMany.mockResolvedValue([]);
  });

  it("legt einen validierten Baustein ausschließlich in der authentifizierten Praxis an", async () => {
    const response = await POST(request("/api/practice/documentation-library", "POST", {
      ...textBlock,
      practiceId: "foreign-practice",
    }));

    expect(response.status).toBe(201);
    expect(blockDb.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        practice_id: "practice-1",
        title: "Anamnese",
        block_type: "text",
        definition: expect.objectContaining({ visibleType: "text" }),
      }),
    });
  });

  it("gibt Rollenfehler unverändert zurück", async () => {
    requireRole.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false }, { status: 403 }),
    });
    const response = await POST(request("/api/practice/documentation-library", "POST", textBlock));
    expect(response.status).toBe(403);
    expect(blockDb.create).not.toHaveBeenCalled();
  });

  it("bearbeitet nur innerhalb der aktuellen Praxis und bewahrt technische IDs", async () => {
    const response = await PATCH(
      request("/api/practice/documentation-library/practice_block_1", "PATCH", {
        title: "Anamnese neu",
        blockType: "text",
        text: "Freitext neu",
      }),
      { params: Promise.resolve({ id: "practice_block_1" }) },
    );

    expect(response.status).toBe(200);
    expect(blockDb.findFirst).toHaveBeenCalledWith({
      where: { id: "practice_block_1", practice_id: "practice-1" },
    });
    expect(blockDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "practice_block_1", practice_id: "practice-1" },
      data: expect.objectContaining({
        definition: expect.objectContaining({
          block: expect.objectContaining({ id: "practice_block_1" }),
          questions: [expect.objectContaining({ id: "practice_question_1" })],
        }),
      }),
    }));
  });

  it("verhindert die Deaktivierung eines von einer aktiven Vorlage verwendeten Bausteins", async () => {
    templateDb.findMany.mockResolvedValue([{
      block_layout: [{ blockId: "practice_block_1", section: 1, order: 0 }],
    }]);
    const response = await PATCH(
      request("/api/practice/documentation-library/practice_block_1", "PATCH", { isActive: false }),
      { params: Promise.resolve({ id: "practice_block_1" }) },
    );

    expect(response.status).toBe(409);
    expect(blockDb.updateMany).not.toHaveBeenCalled();
  });
});