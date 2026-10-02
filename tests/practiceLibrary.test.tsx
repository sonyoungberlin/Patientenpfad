import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockAccess = jest.fn();
const mockRole = { value: "USER" as "OWNER" | "ADMIN" | "USER" };

jest.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

jest.mock("@/lib/authz", () => ({
  getCurrentPracticeRole: jest.fn(() => mockRole.value),
  requirePracticeChainRunnerAccessFromCookies: (...args: unknown[]) => mockAccess(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceCatalogEntry: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { listActivePublishedCatalogEntries } from "@/lib/practiceCatalog/query";
import PracticeLibraryPage from "@/app/practice/library/page";
import PracticeLibraryEntryPage from "@/app/practice/library/[id]/page";

const userAccount = {
  current_practice: { id: "practice-1" },
  memberships: [{ practice_id: "practice-1", role: "USER" }],
};

function publishedSnapshot(caseProfileTitle = "Veröffentlichter Praxisfall") {
  return {
    processKind: "practice-workflow",
    snapshotVersion: 2,
    caseProfileId: "profile-1",
    caseProfileTitle,
    completedAt: "2026-09-30T12:00:00.000Z",
    checkpoints: [{
      checkpointId: "checkpoint-1",
      checkpointTitle: "Veröffentlichter Checkpoint",
      decision: "PFLICHT",
      definition: {
        checkpointId: "checkpoint-1",
        checkpointTitle: "Veröffentlichter Checkpoint",
        checkpointDescription: "Beschreibung aus dem Snapshot",
        checkpointAnchors: [{ id: "anchor-1", text: "Eingefrorener Ankertext" }],
        selectedAnchorIds: ["anchor-1"],
        implementation: "Eingefrorene Umsetzung",
      },
    }],
  };
}

function catalogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    catalog_case_id: "catalog-case-1",
    practice_id: "practice-1",
    source_session_id: "session-1",
    source_case_profile_id: "profile-1",
    title: "Nicht aus Live-Daten lesen",
    description: "Nicht aus Live-Daten lesen",
    version: 2,
    is_current_version: true,
    is_catalog_active: true,
    published_at: new Date("2026-09-30T12:00:00.000Z"),
    createdAt: new Date("2026-09-30T12:00:00.000Z"),
    updatedAt: new Date("2026-09-30T12:00:00.000Z"),
    snapshot: publishedSnapshot(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.value = "USER";
  mockAccess.mockResolvedValue(userAccount);
  mockFindMany.mockResolvedValue([catalogEntry()]);
  mockFindFirst.mockResolvedValue(catalogEntry());
});

describe("Praxisbibliothek", () => {
  it("fragt nur aktive aktuelle Versionen der aktiven Praxis ab und verwirft Nicht-Published-Snapshots", async () => {
    const active = catalogEntry();
    const unpublished = catalogEntry({
      id: "unpublished-entry",
      snapshot: { processKind: "practice-workflow", snapshotVersion: 2, caseProfileId: "profile-2", caseProfileTitle: "Unveröffentlicht", checkpoints: [] },
    });
    mockFindMany.mockResolvedValue([active, unpublished]);

    const entries = await listActivePublishedCatalogEntries("practice-1");

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id: "practice-1", is_catalog_active: true, is_current_version: true },
    }));
    expect(entries.map((entry) => entry.id)).toEqual(["entry-1"]);
  });

  it("sortiert veröffentlichte Einträge nach dem eingefrorenen Snapshot-Titel", async () => {
    mockFindMany.mockResolvedValue([
      catalogEntry({
        id: "snapshot-zulu",
        title: "A Live-Titel",
        snapshot: publishedSnapshot("Zulu"),
      }),
      catalogEntry({
        id: "snapshot-alpha",
        title: "Z Live-Titel",
        snapshot: publishedSnapshot("Alpha"),
      }),
    ]);

    const entries = await listActivePublishedCatalogEntries("practice-1");

    expect(entries.map((entry) => entry.snapshot.caseProfileTitle)).toEqual(["Alpha", "Zulu"]);
  });

  it("zeigt USERn die freigegebenen Snapshotfälle, aber keine historischen, inaktiven oder ungültigen Einträge", async () => {
    const entries = [
      catalogEntry(),
      catalogEntry({ id: "historic-entry", is_current_version: false, snapshot: publishedSnapshot("Historischer Fall") }),
      catalogEntry({ id: "inactive-entry", is_catalog_active: false, snapshot: publishedSnapshot("Inaktiver Fall") }),
      catalogEntry({ id: "unpublished-entry", snapshot: { processKind: "practice-workflow" } }),
      catalogEntry({ id: "other-practice", practice_id: "practice-2", snapshot: publishedSnapshot("Fremde Praxis") }),
    ];
    mockFindMany.mockImplementation(async ({ where }: { where: { practice_id: string; is_catalog_active: boolean; is_current_version: boolean } }) =>
      entries.filter((entry) => entry.practice_id === where.practice_id && entry.is_catalog_active === where.is_catalog_active && entry.is_current_version === where.is_current_version),
    );

    const html = renderToStaticMarkup(await PracticeLibraryPage());

    expect(html).toContain("Praxisbibliothek");
    expect(html).toContain("Veröffentlichter Praxisfall");
    expect(html).toContain('href="/practice/library/entry-1"');
    expect(html).not.toContain("Historischer Fall");
    expect(html).not.toContain("Inaktiver Fall");
    expect(html).not.toContain("Unveröffentlicht");
    expect(html).not.toContain("Fremde Praxis");
    expect(html).not.toContain("Nicht aus Live-Daten lesen");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<input");
  });

  it("verweigert direkten Zugriff auf historische, inaktive und nicht veröffentlichte Einträge", async () => {
    for (const invalidEntry of [
      catalogEntry({ is_current_version: false }),
      catalogEntry({ is_catalog_active: false }),
      catalogEntry({ snapshot: { processKind: "practice-workflow" } }),
    ]) {
      mockFindFirst.mockResolvedValueOnce(invalidEntry);
      await expect(PracticeLibraryEntryPage({ params: Promise.resolve({ id: invalidEntry.id as string }) }))
        .rejects.toThrow("NOT_FOUND");
    }
  });

  it("rendert ausschließlich fachliche Inhalte aus dem Published Snapshot und bleibt read-only", async () => {
    mockFindFirst.mockResolvedValue(catalogEntry({
      title: "Live-Titel darf nicht erscheinen",
      description: "Live-Beschreibung darf nicht erscheinen",
    }));

    const html = renderToStaticMarkup(await PracticeLibraryEntryPage({ params: Promise.resolve({ id: "entry-1" }) }));

    expect(html).toContain("Veröffentlichter Praxisfall");
    expect(html).toContain("Veröffentlichter Checkpoint");
    expect(html).toContain("Beschreibung aus dem Snapshot");
    expect(html).toContain("Eingefrorener Ankertext");
    expect(html).toContain("Eingefrorene Umsetzung");
    expect(html).not.toContain("Live-Titel");
    expect(html).not.toContain("Live-Beschreibung");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("Versionshistorie");
  });

  it("beschränkt die Bibliothek auf USER und verwendet Praxis-Scope beim Direktaufruf", async () => {
    mockRole.value = "OWNER";
    await expect(PracticeLibraryPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockFindMany).not.toHaveBeenCalled();

    mockRole.value = "USER";
    mockFindFirst.mockResolvedValue(null);
    await expect(PracticeLibraryEntryPage({ params: Promise.resolve({ id: "foreign-entry" }) }))
      .rejects.toThrow("NOT_FOUND");
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "foreign-entry", practice_id: "practice-1" },
    }));
  });
});