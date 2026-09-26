import type { PracticeCaseChainDefinition } from "@/lib/practiceChains/types";

const mockPracticeCaseChain = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockPracticeCatalogEntry = { findMany: jest.fn() };

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceCaseChain: mockPracticeCaseChain,
    practiceCatalogEntry: mockPracticeCatalogEntry,
  },
}));

jest.mock("@/lib/auth", () => ({ getSessionAccount: jest.fn() }));

import { createPracticeChain, createPracticeChainRevision, getPracticeChain, getReadyPracticeChainRunner, updatePracticeChain } from "@/lib/practiceChains/service";
import { validateChainDefinition } from "@/lib/practiceChains/validate";
import { createRunnerState, followRunnerTarget, goBackRunner } from "@/lib/practiceChains/runner";
import { GET as getChains } from "@/app/api/practice-chains/route";
import { PATCH as patchChain } from "@/app/api/practice-chains/[id]/route";
import { POST as reviseChain } from "@/app/api/practice-chains/[id]/revision/route";
import { GET as getRunner } from "@/app/api/practice-chains/[id]/runner/route";
import { getSessionAccount } from "@/lib/auth";
import { NextRequest } from "next/server";

const PRACTICE_ID = "practice-1";
const OTHER_PRACTICE_ID = "practice-2";
const ENTRY_V1 = "entry-v1";
const ENTRY_V2 = "entry-v2";
const account = {
  id: "account-1",
  email: "owner@example.com",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: PRACTICE_ID, name: "Praxis" },
  memberships: [{ practice_id: PRACTICE_ID, role: "OWNER" }],
};

const emptyDefinition: PracticeCaseChainDefinition = { startStepId: null, steps: [], transitions: [] };
const completeDefinition: PracticeCaseChainDefinition = {
  startStepId: "step-1",
  steps: [
    { id: "step-1", catalogEntryId: ENTRY_V1 },
    { id: "step-2", catalogEntryId: ENTRY_V2 },
  ],
  transitions: [
    { id: "transition-1", fromStepId: "step-1", kind: "QUESTION", question: {
      prompt: "Welche Antwort gilt in dieser Praxis?",
      answers: [
        { id: "answer-1", label: "Weiter", targetStepId: "step-2" },
        { id: "answer-2", label: "Ende", targetStepId: null },
      ],
    }},
    { id: "transition-2", fromStepId: "step-2", kind: "QUESTION", question: {
      prompt: "Soll die Kette hier enden?",
      answers: [{ id: "answer-3", label: "Kette endet", targetStepId: null }],
    }},
  ],
};

function row(overrides?: Record<string, unknown>) {
  return {
    id: "chain-1",
    practice_id: PRACTICE_ID,
    name: "Meine Kette",
    status: "DRAFT",
    version: 1,
    source_chain_id: null,
    definition: emptyDefinition,
    created_at: new Date("2026-09-01"),
    updated_at: new Date("2026-09-01"),
    ...overrides,
  };
}

function request(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getSessionAccount as jest.Mock).mockResolvedValue(account);
  mockPracticeCatalogEntry.findMany.mockResolvedValue([{ id: ENTRY_V1 }, { id: ENTRY_V2 }]);
  mockPracticeCaseChain.findFirst.mockResolvedValue(row());
  mockPracticeCaseChain.create.mockResolvedValue(row());
  mockPracticeCaseChain.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row(data));
});

describe("PracticeCaseChain service", () => {
  it("legt einen leeren Draft an, ohne Reihenfolge oder Antworten vorzugeben", async () => {
    const result = await createPracticeChain({ practiceId: PRACTICE_ID, name: "Neue Kette" });
    expect(result.status).toBe("DRAFT");
    expect(result.definition).toEqual(emptyDefinition);
    expect(mockPracticeCaseChain.create.mock.calls[0][0].data.definition).toEqual(emptyDefinition);
  });

  it("speichert einen unvollständigen Draft und kann ihn wieder öffnen", async () => {
    const result = await updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Offene Kette", status: "DRAFT", definition: emptyDefinition });
    expect(result.status).toBe("DRAFT");
    expect(await getPracticeChain("chain-1", PRACTICE_ID)).not.toBeNull();
  });

  it("verweigert Katalogversionen einer anderen Praxis", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([]);
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Fremd", status: "DRAFT", definition: {
      ...emptyDefinition,
      steps: [{ id: "step-1", catalogEntryId: "foreign-entry" }],
    }})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("hält konkrete Katalogversionen in der Definition fest", async () => {
    await updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Versionierte Kette", status: "DRAFT", definition: completeDefinition });
    const data = mockPracticeCaseChain.update.mock.calls[0][0].data;
    expect(data.definition.steps.map((step: { catalogEntryId: string }) => step.catalogEntryId)).toEqual([ENTRY_V1, ENTRY_V2]);
  });

  it("verweigert READY bei offenen Stellen und erlaubt READY mit expliziten Zielen", async () => {
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Noch offen", status: "READY", definition: emptyDefinition })).rejects.toMatchObject({ statusCode: 400 });
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Bereit", status: "READY", definition: completeDefinition })).resolves.toMatchObject({ status: "READY" });
  });

  it("schützt READY vor direkter Änderung", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ status: "READY" }))
      .mockResolvedValueOnce(row({ status: "READY" }));
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Änderung", status: "READY", definition: completeDefinition })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChain.update).not.toHaveBeenCalled();
  });

  it("erstellt aus READY eine nachvollziehbare Draft-Version", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", version: 3, definition: completeDefinition }));
    mockPracticeCaseChain.create.mockResolvedValue(row({ status: "DRAFT", version: 4, source_chain_id: "chain-1", definition: completeDefinition }));
    const result = await createPracticeChainRevision("chain-1", PRACTICE_ID);
    expect(result.status).toBe("DRAFT");
    expect(result.version).toBe(4);
    expect(result.source_chain_id).toBe("chain-1");
    expect(mockPracticeCaseChain.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ version: 4, source_chain_id: "chain-1" }));
  });
});

describe("PracticeCaseChain authorization", () => {
  it("liest nur die aktuelle Praxis", async () => {
    mockPracticeCaseChain.findMany.mockResolvedValue([]);
    const { status } = await getChains(request("/api/practice-chains"));
    expect(status).toBe(200);
    expect(mockPracticeCaseChain.findMany.mock.calls[0][0].where).toEqual({ practice_id: PRACTICE_ID });
  });

  it("verweigert USER den direkten Zugriff", async () => {
    (getSessionAccount as jest.Mock).mockResolvedValue({ ...account, memberships: [{ practice_id: PRACTICE_ID, role: "USER" }] });
    const response = await getChains(request("/api/practice-chains"));
    expect(response.status).toBe(403);
  });

  it("verweigert das Schreiben einer fremden Kette", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const response = await patchChain(request("/api/practice-chains/foreign", "PATCH", { name: "X", status: "DRAFT", definition: emptyDefinition }), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(404);
  });

  it("schützt auch den Revisionspfad per Praxis-Scope", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const response = await reviseChain(request("/api/practice-chains/foreign/revision", "POST"), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(404);
  });

  it("erlaubt USER den READY-Runner, aber keine Entwürfe oder fremde Ketten", async () => {
    (getSessionAccount as jest.Mock).mockResolvedValue({ ...account, memberships: [{ practice_id: PRACTICE_ID, role: "USER" }] });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: completeDefinition }));
    const readyResponse = await getRunner(request("/api/practice-chains/chain-1/runner"), { params: Promise.resolve({ id: "chain-1" }) });
    expect(readyResponse.status).toBe(200);

    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DRAFT" }));
    const draftResponse = await getRunner(request("/api/practice-chains/chain-1/runner"), { params: Promise.resolve({ id: "chain-1" }) });
    expect(draftResponse.status).toBe(404);

    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const foreignResponse = await getRunner(request("/api/practice-chains/foreign/runner"), { params: Promise.resolve({ id: "foreign" }) });
    expect(foreignResponse.status).toBe(404);
  });
});

describe("PracticeCaseChain validation", () => {
  it("fordert keine Standardantworten an, aber prüft READY-Ziele", () => {
    const issues = validateChainDefinition(completeDefinition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues).toEqual([]);
    const invalid = validateChainDefinition({ ...completeDefinition, startStepId: "missing" }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(invalid.some((issue) => issue.path === "startStepId")).toBe(true);
  });

  it("verhindert mehrere oder gemischte Übergänge pro Ausgangsschritt", () => {
    const definition = { ...completeDefinition, transitions: [
      ...completeDefinition.transitions,
      { id: "transition-duplicate", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
    ] };
    expect(validateChainDefinition(definition, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.2.fromStepId" && issue.message.includes("nur ein Übergang"))).toBe(true);
  });

  it("verlangt eindeutige Antwortbezeichnungen und zeigt offene Antworten als Fehler", () => {
    const definition = { ...completeDefinition, transitions: [{
      id: "transition-1", fromStepId: "step-1", kind: "QUESTION" as const, question: {
        prompt: "Praxisfrage", answers: [
          { id: "answer-1", label: "Gleich", targetStepId: "step-2" },
          { id: "answer-2", label: " gleich ", targetStepId: null },
        ],
      },
    }, completeDefinition.transitions[1]] };
    const issues = validateChainDefinition(definition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues.some((issue) => issue.message.includes("eindeutig"))).toBe(true);
  });

  it("meldet offene Antwortziele gezielt und erlaubt Fall oder bewusstes Ende", () => {
    const openAnswer = {
      ...completeDefinition,
      transitions: [{
        id: "transition-1", fromStepId: "step-1", kind: "QUESTION" as const, question: {
          prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Weiter" }],
        },
      }],
    };
    const openIssues = validateChainDefinition(openAnswer, new Set([ENTRY_V1, ENTRY_V2]));
    expect(openIssues).toContainEqual({
      path: "transitions.0.question.answers.0.targetStepId",
      message: "Wählen Sie für diese Antwort einen Zielfall oder das Ende der Kette",
    });

    const caseTarget = { ...openAnswer, transitions: [{ ...openAnswer.transitions[0], question: { prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Weiter", targetStepId: "step-2" }] } }] };
    const chainEnd = { ...openAnswer, transitions: [{ ...openAnswer.transitions[0], question: { prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Ende", targetStepId: null }] } }] };
    expect(validateChainDefinition(caseTarget, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path.endsWith("targetStepId"))).toBe(false);
    expect(validateChainDefinition(chainEnd, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path.endsWith("targetStepId"))).toBe(false);
  });

  it("weist unerreichbare Schritte und Zyklen ohne Abschluss zurück, erlaubt aber einen explizit endenden Rücksprung", () => {
    const unreachable = validateChainDefinition({ ...completeDefinition, steps: [...completeDefinition.steps, { id: "step-3", catalogEntryId: ENTRY_V1 }] }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(unreachable.some((issue) => issue.message.includes("nicht erreichbar"))).toBe(true);

    const endlessCycle = validateChainDefinition({
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT", targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "DIRECT", targetStepId: "step-1" },
      ],
    }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(endlessCycle.some((issue) => issue.message.includes("kein vollständig definierter Weg"))).toBe(true);

    const explicitReturn = validateChainDefinition({
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT", targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "QUESTION", question: { prompt: "Praxisfrage", answers: [
          { id: "back", label: "Zurück", targetStepId: "step-1" },
          { id: "end", label: "Kette endet", targetStepId: null },
        ] } },
      ],
    }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(explicitReturn.filter((issue) => issue.message.includes("kein vollständig definierter Weg"))).toHaveLength(0);
  });

  it("erlaubt ein direktes Ende ohne künstliche Praxisfrage", () => {
    const directEnd = {
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "DIRECT" as const, targetStepId: null },
      ],
    };
    expect(validateChainDefinition(directEnd, new Set([ENTRY_V1, ENTRY_V2]))).toEqual([]);
  });

  it("verlangt Ausgang und Ziel bei einem neuen direkten Übergang", () => {
    const incompleteTransition = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "", kind: "DIRECT" as const }],
    };
    const issues = validateChainDefinition(incompleteTransition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues.some((issue) => issue.path === "transitions.0.fromStepId")).toBe(true);
    expect(issues.some((issue) => issue.path === "transitions.0.targetStepId")).toBe(true);
  });

  it("unterscheidet bewusstes Fallziel und bewusstes Kettenende", () => {
    const caseTarget = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" }],
    };
    const chainEnd = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: null }],
    };
    expect(validateChainDefinition(caseTarget, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.0.targetStepId")).toBe(false);
    expect(validateChainDefinition(chainEnd, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.0.targetStepId")).toBe(false);
  });

  it("führt zwei konkrete Katalogversionen über direkten Abschluss und Praxisantwort in den Runner", async () => {
    const directThenQuestion = {
      ...completeDefinition,
      steps: [
        { id: "step-1", catalogEntryId: ENTRY_V1 },
        { id: "step-2", catalogEntryId: ENTRY_V2 },
      ],
      transitions: [
        { id: "direct", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
        { id: "question", fromStepId: "step-2", kind: "QUESTION" as const, question: {
          prompt: "Wie entscheidet diese Praxis?",
          answers: [{ id: "end", label: "Praxis beendet den Lauf", targetStepId: null }],
        } },
      ],
    };
    mockPracticeCaseChain.update.mockResolvedValue(row({ status: "READY", definition: directThenQuestion }));
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Pilotkette", status: "READY", definition: directThenQuestion })).resolves.toMatchObject({ status: "READY" });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: directThenQuestion }));
    mockPracticeCatalogEntry.findMany.mockResolvedValue([
      { id: ENTRY_V1, title: "Praxisfall Version 1", description: null, snapshot: { checkpoints: [] } },
      { id: ENTRY_V2, title: "Praxisfall Version 2", description: null, snapshot: { checkpoints: [] } },
    ]);
    const runner = await getReadyPracticeChainRunner("chain-1", PRACTICE_ID);
    expect(runner?.steps.map((step) => step.title)).toEqual(["Praxisfall Version 1", "Praxisfall Version 2"]);
    expect(runner?.transitions).toEqual(directThenQuestion.transitions);
    expect(runner?.transitions[1].question?.answers[0].targetStepId).toBeNull();
  });
});

describe("PracticeCaseChain runner", () => {
  it("navigiert direkte Übergänge, zwei Antwortzweige, Ende und erlaubten Rücksprung ohne Vorauswahl", () => {
    const artificialChain = {
      direct: { fromStepId: "step-1", targetStepId: "step-2" },
      answers: [
        { label: "Weiter", targetStepId: "step-3" },
        { label: "Ende", targetStepId: null },
      ],
      returnTarget: "step-1",
    };
    const state = createRunnerState("step-1");
    expect(artificialChain.answers).toHaveLength(2);
    const afterDirect = followRunnerTarget(state, artificialChain.direct.targetStepId);
    expect(afterDirect.currentStepId).toBe("step-2");
    expect(afterDirect.history).toEqual(["step-1"]);
    const afterBack = goBackRunner(afterDirect);
    expect(afterBack.currentStepId).toBe("step-1");
    expect(afterBack.history).toEqual([]);
    expect(followRunnerTarget(afterBack, artificialChain.answers[1].targetStepId).finished).toBe(true);
    expect(followRunnerTarget(afterBack, artificialChain.returnTarget).currentStepId).toBe("step-1");
  });

  it("stoppt verständlich bei einem fehlenden Ziel statt den Lauf zu beenden", () => {
    const state = createRunnerState("step-1");
    const blocked = followRunnerTarget(state, undefined);
    expect(blocked).toEqual({
      currentStepId: "step-1",
      history: [],
      finished: false,
      error: "Dieser Übergang ist unvollständig und kann im Lauf nicht fortgesetzt werden.",
    });
    expect(followRunnerTarget(blocked, null)).toEqual(blocked);
  });

  it("setzt beim Start keine Antwort und speichert keinen Lauf", () => {
    const state = createRunnerState("step-1");
    expect(state).toEqual({ currentStepId: "step-1", history: [], finished: false, error: null });
  });
});