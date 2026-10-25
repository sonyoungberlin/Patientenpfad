import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({ getSessionAccount: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: jest.fn(),
  getCurrentPracticeRole: jest.fn(),
}));
jest.mock("@/lib/pdf/printPdf", () => ({
  buildPrintPdf: jest.fn(async (title: string, blocks: unknown[]) =>
    new TextEncoder().encode(JSON.stringify({ title, blocks }))),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: { findMany: jest.fn() },
    practiceCatalogEntry: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/practiceProcesses/caseProfileLibrary", () => ({ listCaseProfilesFromLib: jest.fn() }));
jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({ getCheckpointFromLib: jest.fn() }));

import { POST } from "@/app/api/workflow-cases/pdf/route";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases, getCurrentPracticeRole } from "@/lib/authz";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { prisma } from "@/lib/prisma";
import { listCaseProfilesFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { buildInitialInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

const getAccount = getSessionAccount as jest.Mock;
const canAccess = canAccessWorkflowCases as jest.Mock;
const getRole = getCurrentPracticeRole as jest.Mock;
const findSessions = prisma.workflowSession.findMany as jest.Mock;
const findCatalog = prisma.practiceCatalogEntry.findMany as jest.Mock;
const buildPdf = buildPrintPdf as jest.Mock;
const listProfiles = listCaseProfilesFromLib as jest.Mock;
const getCheckpoint = getCheckpointFromLib as jest.Mock;
const account = {
  id: "account-1",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: "practice-1" },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/workflow-cases/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responsePayload(response: Response) {
  return JSON.parse(Buffer.from(await response.arrayBuffer()).toString("utf8")) as {
    title: string;
    blocks: Array<{ kind: string; text?: string }>;
  };
}

describe("POST /api/workflow-cases/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccount.mockResolvedValue(account);
    canAccess.mockReturnValue(true);
    getRole.mockReturnValue("OWNER");
    findSessions.mockResolvedValue([]);
    findCatalog.mockResolvedValue([]);
    listProfiles.mockResolvedValue([]);
    getCheckpoint.mockResolvedValue(undefined);
  });

  it("verweigert fehlende oder nicht freigeschaltete Konten ohne Datenbankabfrage", async () => {
    getAccount.mockResolvedValueOnce(null);
    expect((await POST(request({ entries: [{ type: "session", id: "session-1", kind: "clinical" }] }))).status).toBe(403);
    getAccount.mockResolvedValueOnce({ ...account, is_approved: false });
    expect((await POST(request({ entries: [{ type: "session", id: "session-1", kind: "clinical" }] }))).status).toBe(403);
    expect(findSessions).not.toHaveBeenCalled();
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it("exportiert ausschließlich angeforderte gespeicherte Einträge im Praxisscope", async () => {
    const selected = {
      id: "selected-session",
      title: "Protokoll der Praxis",
      createdAt: new Date("2026-10-20T12:00:00Z"),
      updatedAt: new Date("2026-10-20T12:00:00Z"),
      process_snapshot: buildInitialInternalProtocolWorkflowSnapshot(),
      case_profile_id: null,
      owner_practice_id: "practice-1",
    };
    findSessions.mockResolvedValue([selected]);

    const response = await POST(request({
      entries: [{ type: "session", id: selected.id, kind: "internal-protocol" }],
      mode: "summary",
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(findSessions).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        owner_practice_id: "practice-1",
        internal_saved_at: { not: null },
        id: { in: [selected.id] },
      },
    }));
    const payload = await responsePayload(response);
    expect(payload.title).toContain("Kurzübersicht");
    expect(payload.blocks.map((block) => block.text ?? "").join("\n")).toContain("Protokoll der Praxis");
    expect(buildPdf).toHaveBeenCalledTimes(1);
  });

  it("erzeugt keine unvollständige PDF, wenn eine Auswahl nicht mehr verfügbar ist", async () => {
    const response = await POST(request({
      entries: [
        { type: "session", id: "available", kind: "internal-protocol" },
        { type: "session", id: "missing", kind: "clinical" },
      ],
      mode: "summary",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(expect.objectContaining({
      error: expect.stringContaining("keine PDF erstellt"),
    }));
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it("weist Referenzen mit unpassendem Snapshottyp vollständig zurück", async () => {
    findSessions.mockResolvedValue([{
      id: "wrong-kind",
      title: "Interne Sitzung",
      createdAt: new Date(),
      updatedAt: new Date(),
      process_snapshot: buildInitialInternalProtocolWorkflowSnapshot(),
      case_profile_id: null,
      owner_practice_id: "practice-1",
    }]);

    const response = await POST(request({
      entries: [{ type: "session", id: "wrong-kind", kind: "clinical" }],
      mode: "detail",
    }));

    expect(response.status).toBe(409);
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it("verwirft eine sitzungs-ID außerhalb des Praxis-Scopes ohne PDF", async () => {
    const response = await POST(request({
      entries: [{ type: "session", id: "foreign-session", kind: "clinical" }],
      mode: "summary",
    }));

    expect(response.status).toBe(409);
    expect(findSessions).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ owner_practice_id: "practice-1", id: { in: ["foreign-session"] } }),
    }));
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it("löst unbegonnene Profile serverseitig auf und druckt keine technischen Checkpoint-IDs", async () => {
    listProfiles.mockResolvedValue([{
      id: "profile-1",
      title: "Krankenhausbrief",
      description: "Tatsächlich gespeicherte Profilbeschreibung.",
      checkpointRefs: [{ checkpointId: "technical-checkpoint-id" }],
    }]);
    getCheckpoint.mockResolvedValue({ id: "technical-checkpoint-id", title: "Patientenkontakt" });

    const response = await POST(request({
      entries: [{ type: "practice-profile", id: "profile-1" }],
      mode: "detail",
    }));

    expect(response.status).toBe(200);
    const payload = await responsePayload(response);
    const text = payload.blocks.map((block) => block.text ?? "").join("\n");
    expect(text).toContain("Noch nicht begonnen");
    expect(text).toContain("Patientenkontakt");
    expect(text).toContain("Tatsächlich gespeicherte Profilbeschreibung.");
    expect(text).not.toContain("technical-checkpoint-id");
  });

  it("prüft Katalogreferenzen gegen die aktuelle Praxis und verweigert nicht berechtigte Rollen", async () => {
    getRole.mockReturnValue("USER");
    const response = await POST(request({
      entries: [{ type: "catalog-entry", id: "catalog-1", profileId: "profile-1" }],
      mode: "summary",
    }));

    expect(response.status).toBe(409);
    expect(findCatalog).not.toHaveBeenCalled();
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it("fragt Katalogeinträge nur aktiv und aktuell in der aktuellen Praxis ab", async () => {
    const response = await POST(request({
      entries: [{ type: "catalog-entry", id: "catalog-1", profileId: "profile-1" }],
      mode: "summary",
    }));

    expect(response.status).toBe(409);
    expect(findCatalog).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ["catalog-1"] },
        practice_id: "practice-1",
        is_catalog_active: true,
        is_current_version: true,
      },
    }));
    expect(buildPdf).not.toHaveBeenCalled();
  });
});
