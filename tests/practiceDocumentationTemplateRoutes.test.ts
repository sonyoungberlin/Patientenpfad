import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  requireUnlockedQuestionnaireKioskDevice: jest.fn(),
  hasQuestionnaireKioskCapability: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceDocumentationTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    practiceDocumentationBlock: { findMany: jest.fn() },
  },
}));

import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  hasQuestionnaireKioskCapability,
  requireUnlockedQuestionnaireKioskDevice,
} from "@/lib/questionnaireKiosk/auth";
import { POST } from "@/app/api/practice/documentation-templates/route";
import { POST as DuplicatePOST } from "@/app/api/practice/documentation-templates/[id]/route";
import { PATCH } from "@/app/api/practice/documentation-templates/[id]/route";
import { GET } from "@/app/api/questionnaire-kiosk/internal/templates/route";

const requireRole = requirePracticeRole as jest.Mock;
const kioskGuard = requireUnlockedQuestionnaireKioskDevice as jest.Mock;
const hasCapability = hasQuestionnaireKioskCapability as jest.Mock;
const templateDb = prisma.practiceDocumentationTemplate as unknown as {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
};
const blockDb = prisma.practiceDocumentationBlock as unknown as { findMany: jest.Mock };
const layout = [{ blockId: "practice_block_1", section: 2, order: 0 }];
const templateInput = {
  name: " Kardiologie ",
  outputFormat: "formell",
  documentTitleOption: "stellungnahme",
  blockLayout: layout,
};

function request(path: string, method: "GET" | "POST" | "PATCH", body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

describe("Dokumentationsvorlagen-Routen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireRole.mockResolvedValue({ account: { current_practice: { id: "practice-1" } }, error: null });
    kioskGuard.mockResolvedValue({ device: { deviceId: "device-1", practiceId: "practice-1" }, error: null });
    hasCapability.mockReturnValue(true);
    templateDb.create.mockResolvedValue({ id: "template-1" });
    templateDb.findFirst.mockResolvedValue({ id: "template-1", name: "Kardiologie", output_format: "formell", document_title_option: "stellungnahme", block_layout: layout });
    templateDb.updateMany.mockResolvedValue({ count: 1 });
    templateDb.findMany.mockResolvedValue([]);
    blockDb.findMany.mockResolvedValue([{ id: "practice_block_1", title: "Anamnese", block_type: "text" }]);
  });

  it("erstellt ausschließlich Referenzen auf aktive Bausteine der authentifizierten Praxis", async () => {
    const response = await POST(request("/api/practice/documentation-templates", "POST", {
      ...templateInput,
      practiceId: "foreign-practice",
    }));

    expect(response.status).toBe(201);
    expect(requireRole).toHaveBeenCalledWith(expect.any(NextRequest), [PracticeRole.OWNER, PracticeRole.ADMIN]);
    expect(blockDb.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["practice_block_1"] }, practice_id: "practice-1", is_active: true },
      select: { id: true },
    });
    expect(templateDb.create).toHaveBeenCalledWith({
      data: {
        practice_id: "practice-1",
        name: "Kardiologie",
        output_format: "formell",
        document_title_option: "stellungnahme",
        block_layout: layout,
        patient_signature_required: false,
      },
    });
  });

  it("weist praxisfremde oder inaktive Bausteinreferenzen ab", async () => {
    blockDb.findMany.mockResolvedValue([]);
    const response = await POST(request("/api/practice/documentation-templates", "POST", templateInput));
    expect(response.status).toBe(400);
    expect(templateDb.create).not.toHaveBeenCalled();
  });

  it("gibt Rollenfehler unverändert zurück", async () => {
    requireRole.mockResolvedValue({ account: null, error: NextResponse.json({ ok: false }, { status: 403 }) });
    const response = await POST(request("/api/practice/documentation-templates", "POST", templateInput));
    expect(response.status).toBe(403);
    expect(templateDb.create).not.toHaveBeenCalled();
  });

  it("bearbeitet und deaktiviert nur innerhalb der aktuellen Praxis", async () => {
    const edit = await PATCH(
      request("/api/practice/documentation-templates/template-1", "PATCH", templateInput),
      { params: Promise.resolve({ id: "template-1" }) },
    );
    expect(edit.status).toBe(200);
    expect(templateDb.updateMany).toHaveBeenLastCalledWith({
      where: { id: "template-1", practice_id: "practice-1" },
      data: {
        name: "Kardiologie",
        output_format: "formell",
        document_title_option: "stellungnahme",
        block_layout: layout,
        patient_signature_required: false,
      },
    });

    await PATCH(
      request("/api/practice/documentation-templates/template-1", "PATCH", { isActive: false }),
      { params: Promise.resolve({ id: "template-1" }) },
    );
    expect(templateDb.updateMany).toHaveBeenLastCalledWith({
      where: { id: "template-1", practice_id: "practice-1" },
      data: { is_active: false },
    });
  });

  it("dupliziert eine Vorlage über die bestehende Praxisroute", async () => {
    templateDb.findMany.mockResolvedValue([{ name: "Kardiologie" }]);
    templateDb.create.mockResolvedValue({ id: "template-2" });
    const response = await DuplicatePOST(
      request("/api/practice/documentation-templates/template-1", "POST"),
      { params: Promise.resolve({ id: "template-1" }) },
    );

    expect(response.status).toBe(201);
    expect(templateDb.findFirst).toHaveBeenCalledWith({
      where: { id: "template-1", practice_id: "practice-1" },
    });
    expect(templateDb.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: "Kopie von Kardiologie",
        practice_id: "practice-1",
        block_layout: layout,
      }),
    }));
  });

  it("liefert im Kiosk Praxisvorlagen und aktive Bibliotheksblöcke der Geräte-Praxis", async () => {
    templateDb.findMany.mockResolvedValue([{
      id: "template-1",
      name: "Kardiologie",
      is_active: true,
      output_format: "formell",
      document_title_option: "stellungnahme",
      block_layout: layout,
      patient_signature_required: false,
    }]);
    const response = await GET(request("/api/questionnaire-kiosk/internal/templates?practiceId=foreign", "GET"));

    expect(response.status).toBe(200);
    expect(templateDb.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id: "practice-1", is_active: true },
    }));
    expect(blockDb.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id: "practice-1", is_active: true },
    }));
    expect(await response.json()).toEqual({
      ok: true,
      templates: [{
        id: "template-1",
        name: "Kardiologie",
        outputFormat: "formell",
        documentTitleOption: "stellungnahme",
        blockLayout: layout,
        patientSignatureRequired: false,
      }],
      blocks: [{ id: "practice_block_1", title: "Anamnese", blockType: "text" }],
    });
  });

  it("verweigert Kiosk-Lesen ohne interne Capability", async () => {
    hasCapability.mockReturnValue(false);
    const response = await GET(request("/api/questionnaire-kiosk/internal/templates", "GET"));
    expect(response.status).toBe(403);
    expect(templateDb.findMany).not.toHaveBeenCalled();
  });
});