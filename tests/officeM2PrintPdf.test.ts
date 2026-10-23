import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

jest.mock("@/lib/authz", () => ({
  requireOfficeCasesManagementAccess: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    officeCaseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/office-cases/[id]/m2/pdf/route";
import { requireOfficeCasesManagementAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  getCurrentOfficeTopicVersion,
  getOfficeCheckpointCatalog,
  listOfficeTopics,
} from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint } from "@/lib/office/m2Questions";
import {
  buildOfficeM2PrintPdf,
  buildOfficeM2PrintSections,
} from "@/lib/office/m2PrintPdf";

const requireAccess = requireOfficeCasesManagementAccess as jest.Mock;
const findUnique = prisma.officeCaseSession.findUnique as jest.Mock;
const update = prisma.officeCaseSession.update as jest.Mock;

const ACCOUNT = {
  id: "account-1",
  current_practice: { id: "practice-1" },
};

function makeCase(overrides: Record<string, unknown> = {}) {
  return {
    title: "Praxisfall",
    owner_account_id: "account-1",
    owner_practice_id: "practice-1",
    checkpoint_snapshot: {
      topicId: OFFICE_TOPIC_MFA_HIRING,
      topicTitle: "MFA einstellen",
      templateVersion: 1,
      checkpoints: [
        {
          id: "MF-01",
          title: "Berufsabschluss geprüft",
          section: "Personal",
          m2_answers: { "M2-01": "YES" },
          known_note: "PRIVATE-NOTE-MUST-NOT-PRINT",
        },
      ],
    },
    ...overrides,
  };
}

function extractPdfText(bytes: Uint8Array): string {
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

function request() {
  return new NextRequest("http://localhost/api/office-cases/case-1/m2/pdf");
}

describe("Office-M2-Druckversion", () => {
  beforeEach(() => {
    requireAccess.mockReset().mockResolvedValue({ account: ACCOUNT, error: null });
    findUnique.mockReset().mockResolvedValue(makeCase());
    update.mockReset();
  });

  it("liefert eine gültige A4-PDF mit Inline-Ausgabe und Druckkopf", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const [page] = pdf.getPages();
    expect(page?.getSize().width).toBeCloseTo(595.28, 0);
    expect(page?.getSize().height).toBeCloseTo(841.89, 0);

    const text = extractPdfText(bytes);
    expect(text).toContain("Praxisfall");
    expect(text).toContain("MFA einstellen");
    expect(text).toContain("Druckdatum");
    expect(text).toContain("Seite 1 von 1");
  });

  it("druckt alle Fragen in Checkpoint- und Katalogreihenfolge mit leeren Antwortoptionen", async () => {
    const topicId = OFFICE_TOPIC_MFA_HIRING;
    const checkpoints = getOfficeCheckpointCatalog(topicId, 1).slice(0, 2).map((checkpoint) => ({
      id: checkpoint.id,
      title: checkpoint.title,
    }));
    const sections = buildOfficeM2PrintSections(topicId, 1, checkpoints);
    const bytes = await buildOfficeM2PrintPdf({
      caseTitle: "Praxisfall",
      topicTitle: "MFA einstellen",
      sections,
      printedAt: new Date("2026-10-23T12:00:00.000Z"),
    });
    const text = extractPdfText(bytes);
    const expectedQuestions = checkpoints.flatMap((checkpoint) =>
      getM2QuestionsForCheckpoint(topicId, checkpoint.id, 1).map((question) => question.text),
    );

    expect(expectedQuestions.length).toBeGreaterThan(0);
    let previousIndex = -1;
    for (const question of expectedQuestions) {
      const index = text.indexOf(question);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
    expect(text).toContain("Ja");
    expect(text).toContain("Nein");
    expect(text).toContain("Unklar");
  });

  it("übernimmt für alle Office-Themen und verfügbaren Versionen die vollständige M2-Struktur und rendert sie", async () => {
    for (const topic of listOfficeTopics()) {
      const currentVersion = getCurrentOfficeTopicVersion(topic.id);
      const versions = Array.from(new Set([1, currentVersion]));

      for (const version of versions) {
        const catalog = getOfficeCheckpointCatalog(topic.id, version);
        const checkpoints = catalog.map((checkpoint) => ({
          id: checkpoint.id,
          title: checkpoint.title,
          section: checkpoint.section,
        }));
        const actual = buildOfficeM2PrintSections(topic.id, version, checkpoints);
        const expectedGroups = new Map<string | null, Array<{
          title: string;
          questions: Array<{ text: string }>;
        }>>();
        const versionedM2 = version === 2 && [
          OFFICE_TOPIC_HIRING_REPLACEMENT,
          OFFICE_TOPIC_MFA_HIRING,
          OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
          OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
        ].includes(topic.id);

        for (const checkpoint of catalog) {
          const title = versionedM2
            ? checkpoint.section ?? "Weitere Prüfpunkte"
            : null;
          const group = expectedGroups.get(title) ?? [];
          group.push({
            title: checkpoint.title,
            questions: getM2QuestionsForCheckpoint(topic.id, checkpoint.id, version)
              .map((question) => ({ text: question.text })),
          });
          expectedGroups.set(title, group);
        }

        expect(actual).toEqual(Array.from(expectedGroups, ([title, items]) => ({
          title,
          checkpoints: items,
        })));

        const bytes = await buildOfficeM2PrintPdf({
          caseTitle: "Testfall",
          topicTitle: topic.title,
          sections: actual,
          printedAt: new Date("2026-10-23T12:00:00.000Z"),
        });
        const pdf = await PDFDocument.load(bytes);
        expect(pdf.getPageCount()).toBeGreaterThan(0);
      }
    }
  });

  it("respektiert die gespeicherte V1- bzw. V2-Version des Falls", async () => {
    const checkpointId = "MF-01";
    const v1Question = getM2QuestionsForCheckpoint(OFFICE_TOPIC_MFA_HIRING, checkpointId, 1)[0]?.text;
    const v2Question = getM2QuestionsForCheckpoint(OFFICE_TOPIC_MFA_HIRING, checkpointId, 2)[0]?.text;
    expect(v1Question).toBeDefined();
    expect(v2Question).toBeDefined();

    const v1Sections = buildOfficeM2PrintSections(OFFICE_TOPIC_MFA_HIRING, 1, [
      { id: checkpointId, title: "Berufsabschluss geprüft" },
    ]);
    const v2Sections = buildOfficeM2PrintSections(OFFICE_TOPIC_MFA_HIRING, 2, [
      { id: checkpointId, title: "Berufsabschluss geprüft", section: "Einstieg" },
    ]);
    const v1Text = extractPdfText(await buildOfficeM2PrintPdf({
      caseTitle: "Fall",
      topicTitle: "Thema",
      sections: v1Sections,
      printedAt: new Date("2026-10-23T12:00:00.000Z"),
    }));
    const v2Text = extractPdfText(await buildOfficeM2PrintPdf({
      caseTitle: "Fall",
      topicTitle: "Thema",
      sections: v2Sections,
      printedAt: new Date("2026-10-23T12:00:00.000Z"),
    }));

    expect(v1Text).toContain(v1Question!);
    expect(v2Text).toContain(v2Question!);
    expect(v1Text).not.toContain(v2Question!);
    expect(v2Text).toContain("Einstieg");
  });

  it("behandelt gespeicherte Antworten und Notizen stets als leere Druckfelder", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });
    const text = extractPdfText(new Uint8Array(await response.arrayBuffer()));
    const withAnswers = buildOfficeM2PrintSections(
      OFFICE_TOPIC_MFA_HIRING,
      1,
      [{
        id: "MF-01",
        title: "Berufsabschluss geprüft",
        m2_answers: { "M2-01": "YES" },
        known_note: "PRIVATE-NOTE-MUST-NOT-PRINT",
      }],
    );
    const withoutAnswers = buildOfficeM2PrintSections(
      OFFICE_TOPIC_MFA_HIRING,
      1,
      [{ id: "MF-01", title: "Berufsabschluss geprüft" }],
    );

    expect(text).not.toContain("PRIVATE-NOTE-MUST-NOT-PRINT");
    expect(text).not.toContain("M2-01");
    expect(text).not.toContain("case-1");
    expect(withAnswers).toEqual(withoutAnswers);
    expect(update).not.toHaveBeenCalled();
  });

  it("verweigert fremde Praxisfälle und führt keine Schreiboperation aus", async () => {
    findUnique.mockResolvedValueOnce(makeCase({ owner_practice_id: "other-practice" }));
    const response = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(404);
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("prüft bei Accounts ohne Praxis die Fallzugehörigkeit über die Account-ID", async () => {
    requireAccess.mockResolvedValueOnce({
      account: { id: "account-1", current_practice: null },
      error: null,
    });
    findUnique.mockResolvedValueOnce(makeCase({ owner_practice_id: null }));

    const response = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });
    expect(response.status).toBe(200);

    requireAccess.mockResolvedValueOnce({
      account: { id: "other-account", current_practice: null },
      error: null,
    });
    const denied = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });
    expect(denied.status).toBe(404);
  });

  it("verwendet für bestehende HR-V1-Fälle die Legacy-Fragen statt V2-Fragen", () => {
    const v1Checkpoint = getOfficeCheckpointCatalog(OFFICE_TOPIC_HIRING_REPLACEMENT, 1)[0];
    const v1Question = getM2QuestionsForCheckpoint(
      OFFICE_TOPIC_HIRING_REPLACEMENT,
      v1Checkpoint!.id,
      1,
    )[0]?.text;
    const v2OnlyQuestion = getM2QuestionsForCheckpoint(
      OFFICE_TOPIC_HIRING_REPLACEMENT,
      "NC-EHBA",
      2,
    )[0]?.text;
    const sections = buildOfficeM2PrintSections(OFFICE_TOPIC_HIRING_REPLACEMENT, 1, [
      { id: v1Checkpoint!.id, title: v1Checkpoint!.title, m2_answers: { "M2-01": "NO" } },
    ]);

    expect(sections[0]?.checkpoints[0]?.questions[0]?.text).toBe(v1Question);
    expect(sections.flatMap((section) => section.checkpoints)
      .flatMap((checkpoint) => checkpoint.questions)
      .map((question) => question.text)).not.toContain(v2OnlyQuestion);
  });

  it("verhindert die Verarbeitung ohne Office-Berechtigung", async () => {
    const error = new Response("Forbidden", { status: 403 });
    requireAccess.mockResolvedValueOnce({ account: null, error });
    const response = await GET(request(), { params: Promise.resolve({ id: "case-1" }) });

    expect(response.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("bricht lange Bögen sauber auf A4-Seiten um und nummeriert sie", async () => {
    const sections = [{
      title: null,
      checkpoints: Array.from({ length: 20 }, (_, index) => ({
        title: `Prüfpunkt ${index + 1}`,
        questions: [{ text: `Frage ${index + 1}: ${"Ausreichend Platz für handschriftliche Notizen. ".repeat(4)}` }],
      })),
    }];
    const bytes = await buildOfficeM2PrintPdf({
      caseTitle: "Fall",
      topicTitle: "Thema",
      sections,
      printedAt: new Date("2026-10-23T12:00:00.000Z"),
    });
    const pdf = await PDFDocument.load(bytes);
    const text = extractPdfText(bytes);

    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(text).toContain(`Seite 1 von ${pdf.getPageCount()}`);
    expect(text).toContain(`Seite ${pdf.getPageCount()} von ${pdf.getPageCount()}`);
    for (let index = 1; index <= 20; index += 1) {
      expect(text).toContain(`Frage ${index}:`);
    }
  });
});