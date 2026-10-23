import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

jest.mock("@/lib/authz", () => ({
  requireCasesAccess: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/cases/[id]/m2/pdf/route";
import { requireCasesAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CHECKPOINT_CATALOGUE } from "@/lib/logic/checkpointCatalog";
import { selectM2Questionnaire, type M2QuestionnaireMode } from "@/lib/logic/m2QuestionnaireSelection";
import * as m2PrintPdf from "@/lib/office/m2PrintPdf";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

const requireAccess = requireCasesAccess as jest.Mock;
const findUnique = prisma.caseSession.findUnique as jest.Mock;
const update = prisma.caseSession.update as jest.Mock;
const buildPdfSpy = jest.spyOn(m2PrintPdf, "buildM2PrintPdf");
const ACCOUNT = { id: "account-1", current_practice: { id: "practice-1" } };

function checkpoint(id: keyof typeof CHECKPOINT_CATALOGUE): ActiveCheckpoint {
  return { ...CHECKPOINT_CATALOGUE[id], status: "TO_DO" } as ActiveCheckpoint;
}

const triggerCheckpoint: ActiveCheckpoint = {
  id: "K11",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Formularanliegen",
  options: ["Reha-Antrag", "Pflegegrad / Höherstufung"],
  selections: ["Reha-Antrag", "Pflegegrad / Höherstufung"],
  enabled: true,
};

function makeCase(overrides: Record<string, unknown> = {}) {
  return {
    owner_account_id: "account-1",
    owner_practice_id: "practice-1",
    active_checkpoints: [
      { ...checkpoint("K01"), m2_answers: { "MFA-K01-01": "ja" }, known_note: "PRIVATE-NOTE" },
      triggerCheckpoint,
      { ...checkpoint("K12"), enabled: true },
      { ...checkpoint("K13"), enabled: true },
      { ...checkpoint("K04"), mode: CheckpointMode.ASSESSMENT, enabled: false },
    ],
    doctor_confirmed: false,
    clinical_status: "open",
    ...overrides,
  };
}

function request(mode: string | null = "mfa") {
  const url = new URL("http://localhost/api/cases/case-1/m2/pdf");
  if (mode !== null) url.searchParams.set("mode", mode);
  return new NextRequest(url);
}

function expectedQuestionTexts(checkpoints: ActiveCheckpoint[], mode: M2QuestionnaireMode) {
  const selection = selectM2Questionnaire(checkpoints, mode);
  const texts: string[] = [];
  for (const checkpoint of selection.visibleCheckpoints) {
    if (selection.k13EmbeddedInK12 && checkpoint.id === "K13") continue;
    if (checkpoint.id === "K12" && selection.k12K13Groups.length > 0) {
      texts.push(...selection.k12K13Groups.flatMap((group) =>
        group.items.map(({ question }) => question.text),
      ));
      continue;
    }
    texts.push(...(selection.questionsByCheckpoint[checkpoint.id] ?? []).map(({ text }) => text));
    if (
      mode === "conversation" && checkpoint.id === "K12" &&
      selection.k13EmbeddedInK12 && selection.k12K13Groups.length === 0
    ) {
      texts.push(...(selection.questionsByCheckpoint.K13 ?? []).map(({ text }) => text));
    }
  }
  return texts;
}

async function getPdf(mode: M2QuestionnaireMode) {
  const response = await GET(request(mode), { params: Promise.resolve({ id: "case-1" }) });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes };
}

beforeEach(() => {
  requireAccess.mockReset().mockResolvedValue({ account: ACCOUNT, error: null });
  findUnique.mockReset().mockResolvedValue(makeCase());
  update.mockReset();
  buildPdfSpy.mockClear();
});

describe("Patienten-M2-Druckversion", () => {
  it.each(["mfa", "conversation"] as const)(
    "druckt im Modus %s exakt die ausgewählten Fragen in UI-Reihenfolge und ohne Antworten",
    async (mode) => {
      const checkpoints = makeCase().active_checkpoints as ActiveCheckpoint[];
      const expected = expectedQuestionTexts(checkpoints, mode);
      const { response, bytes } = await getPdf(mode);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("content-disposition")).toContain("inline");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("content-disposition")).not.toContain("case-1");
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      expect(pdf.getPage(0)?.getSize().width).toBeCloseTo(595.28, 0);
      expect(pdf.getPage(0)?.getSize().height).toBeCloseTo(841.89, 0);
      const input = buildPdfSpy.mock.lastCall?.[0];
      expect(input?.title).toBe(mode === "mfa" ? "M2 – MFA-Vorbereitung" : "M2 – Patientengespräch");
      const actual = input?.sections.flatMap((section) => section.checkpoints.flatMap((item) =>
        item.questions.map(({ text }) => text),
      ));
      expect(actual).toEqual(expected);
      expect(update).not.toHaveBeenCalled();
      expect(JSON.stringify(input?.sections)).not.toContain("PRIVATE-NOTE");
      expect(JSON.stringify(input?.sections)).not.toContain("MFA-K01-01");
    },
  );

  it("enthält die durch K11 ausgelösten Reha- und Pflegegradfragen", async () => {
    await getPdf("conversation");
    const selectedIds = selectM2Questionnaire(makeCase().active_checkpoints as ActiveCheckpoint[], "conversation")
      .visibleCheckpoints.map(({ id }) => id);
    const printedQuestions = buildPdfSpy.mock.lastCall?.[0].sections.flatMap((section) =>
      section.checkpoints.flatMap((item) => item.questions.map(({ text }) => text)),
    ) ?? [];

    expect(selectedIds).toEqual(expect.arrayContaining(["K14", "K15", "K16", "K17"]));
    expect(printedQuestions.join(" ")).toContain("Reha");
    expect(printedQuestions.join(" ")).toContain("Pflegegrad");
  });

  it.each(["mfa", "conversation"] as const)(
    "liefert für einen leeren Fragenkatalog im Modus %s ein gültiges A4-PDF",
    async (mode) => {
    findUnique.mockResolvedValueOnce(makeCase({ active_checkpoints: [] }));
    const { response, bytes } = await getPdf(mode);
    const pdf = await PDFDocument.load(bytes);
    const page = pdf.getPage(0)!;

    expect(response.status).toBe(200);
    expect(page.getSize().width).toBeCloseTo(595.28, 0);
    expect(page.getSize().height).toBeCloseTo(841.89, 0);
    expect(buildPdfSpy.mock.lastCall?.[0].sections).toEqual([]);
    expect(buildPdfSpy.mock.lastCall?.[0].title).toBe(
      mode === "mfa" ? "M2 – MFA-Vorbereitung" : "M2 – Patientengespräch",
    );
    },
  );

  it("bricht einen langen Patientenfragebogen auf mehrere A4-Seiten um", async () => {
    const checkpoints = Object.keys(CHECKPOINT_CATALOGUE).map((id) => ({
      ...checkpoint(id as keyof typeof CHECKPOINT_CATALOGUE),
      ...(id === "K12" || id === "K13" ? { enabled: true } : {}),
    }));
    findUnique.mockResolvedValueOnce(makeCase({ active_checkpoints: checkpoints }));
    const { bytes } = await getPdf("conversation");
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBeGreaterThan(1);
    for (const page of pdf.getPages()) {
      expect(page.getSize().width).toBeCloseTo(595.28, 0);
      expect(page.getSize().height).toBeCloseTo(841.89, 0);
    }
  });

  it("verweigert fehlende Berechtigung vor dem Laden des Falls", async () => {
    requireAccess.mockResolvedValueOnce({ account: null, error: new Response("Unauthorized", { status: 401 }) });
    const response = await GET(request("mfa"), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("verweigert fremde Accounts und Praxen mit 404", async () => {
    findUnique.mockResolvedValueOnce(makeCase({ owner_account_id: "other-account", owner_practice_id: null }));
    const foreignAccount = await GET(request("mfa"), { params: Promise.resolve({ id: "case-1" }) });
    expect(foreignAccount.status).toBe(404);

    findUnique.mockResolvedValueOnce(makeCase({ owner_practice_id: "other-practice" }));
    const foreignPractice = await GET(request("conversation"), { params: Promise.resolve({ id: "case-1" }) });
    expect(foreignPractice.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("lehnt ungültige Modi und bestätigte Fälle ab", async () => {
    const invalidMode = await GET(request("other"), { params: Promise.resolve({ id: "case-1" }) });
    expect(invalidMode.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce(makeCase({ doctor_confirmed: true }));
    const confirmed = await GET(request("mfa"), { params: Promise.resolve({ id: "case-1" }) });
    expect(confirmed.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("lädt ausschließlich für den Druck benötigte Falldaten", async () => {
    await getPdf("mfa");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "case-1" },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        active_checkpoints: true,
        doctor_confirmed: true,
        clinical_status: true,
      },
    });
  });
});
