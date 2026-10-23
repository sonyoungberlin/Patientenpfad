import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({ getSessionAccount: jest.fn() }));
jest.mock("@/lib/authz", () => ({ canAccessWorkflowCases: jest.fn() }));
jest.mock("@/lib/pdf/printPdf", () => ({
  buildPrintPdf: jest.fn(async (title: string, blocks: unknown[]) =>
    new TextEncoder().encode(JSON.stringify({ title, blocks })),
  ),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { workflowSession: { findMany: jest.fn() } },
}));

import { GET } from "@/app/api/workflow-cases/internal-protocol/pdf/route";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { prisma } from "@/lib/prisma";
import { buildInitialInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

const getAccount = getSessionAccount as jest.Mock;
const canAccess = canAccessWorkflowCases as jest.Mock;
const buildPdf = buildPrintPdf as jest.Mock;
const findMany = prisma.workflowSession.findMany as jest.Mock;
const account = {
  id: "account-1",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: "practice-1" },
};

function request() {
  return new NextRequest("http://localhost/api/workflow-cases/internal-protocol/pdf");
}

describe("GET /api/workflow-cases/internal-protocol/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccount.mockResolvedValue(account);
    canAccess.mockReturnValue(true);
    findMany.mockResolvedValue([]);
    buildPdf.mockClear();
  });

  it("filtert in der Praxisabfrage und exportiert nur erkannte Internal-Protocol-Snapshots", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    findMany.mockResolvedValue([
      { title: "Protokoll der Praxis", createdAt: new Date("2026-10-20T12:00:00Z"), process_snapshot: snapshot },
      { title: "Klinische Sitzung nicht exportieren", createdAt: new Date(), process_snapshot: { topicId: "hauskrankenpflege" } },
      { title: "Praxisworkflow nicht exportieren", createdAt: new Date(), process_snapshot: { processKind: "practice-workflow" } },
    ]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { owner_practice_id: "practice-1", internal_saved_at: { not: null } },
    }));
    const bytes = new Uint8Array(await response.arrayBuffer());
    const { title, blocks } = JSON.parse(Buffer.from(bytes).toString("utf8")) as {
      title: string;
      blocks: Array<{ text?: string; kind: string }>;
    };
    const text = blocks.map((block) => block.text ?? "").join("\n");
    expect(title).toBe("Interne Protokolle");
    expect(text).toContain("Protokoll der Praxis");
    expect(text).not.toContain("Klinische Sitzung nicht exportieren");
    expect(text).not.toContain("Praxisworkflow nicht exportieren");
    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty("take");
    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty("skip");
    expect(findMany.mock.calls[0]?.[0].where).not.toHaveProperty("id");
  });

  it("liefert ein nummeriertes PDF bei leerem Ergebnis und verändert keine Daten", async () => {
    const response = await GET(request());
    const bytes = new Uint8Array(await response.arrayBuffer());
    const { blocks } = JSON.parse(Buffer.from(bytes).toString("utf8")) as { blocks: unknown[] };

    expect(blocks).toEqual([]);
    expect(buildPdf).toHaveBeenCalledWith("Interne Protokolle", []);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("übergibt lange Protokollantworten vollständig an den PDF-Renderer", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const firstQuestionId = Object.keys(snapshot.checkpoints[0]!.answers)[0]!;
    snapshot.checkpoints[0]!.answers[firstQuestionId] = "Sehr langer Antworttext. ".repeat(1100);
    findMany.mockResolvedValue([{
      title: "Langes Protokoll",
      createdAt: new Date("2026-10-20T12:00:00Z"),
      process_snapshot: snapshot,
    }]);

    const response = await GET(request());
    const output = JSON.parse(Buffer.from(await response.arrayBuffer()).toString("utf8")) as {
      blocks: Array<{ text?: string }>;
    };
    const text = output.blocks.map((block) => block.text ?? "").join("\n");

    expect(text).toContain("Sehr langer Antworttext.");
    expect(text.length).toBeGreaterThan(20_000);
  });

  it("verweigert fehlende oder nicht berechtigte Konten ohne Datenbankabfrage", async () => {
    getAccount.mockResolvedValueOnce(null);
    expect((await GET(request())).status).toBe(403);
    getAccount.mockResolvedValueOnce(account);
    canAccess.mockReturnValueOnce(false);
    expect((await GET(request())).status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});