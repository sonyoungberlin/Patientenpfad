import { NextRequest } from "next/server";

const mockPrisma = {
  checkpointLabel: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  checkpointLabelAssignment: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  libraryCheckpoint: { upsert: jest.fn() },
  practiceCheckpointDefinition: { updateMany: jest.fn() },
  $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({
  getCheckpointFromLib: jest.fn(async (id: string) => id === "static-fallback"
    ? { id, title: "Statischer Checkpoint", orientationAnchors: [{ id: "stable-anchor", text: "Anker" }] }
    : undefined),
}));
jest.mock("@/lib/authz", () => ({ requireAdmin: jest.fn() }));

import {
  createCheckpointLabel,
  deleteCheckpointLabel,
  getCheckpointLabelIds,
  listCheckpointLabels,
  normalizeCheckpointLabelName,
  renameCheckpointLabel,
  setCheckpointLabels,
} from "@/lib/checkpointLabels";
import { POST as createLabelRoute, GET as listLabelsRoute } from "@/app/api/admin/checkpoint-labels/route";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sanitizeCheckpointLibraryReturnTo } from "@/lib/checkpointLibraryNavigation";

const db = prisma as unknown as typeof mockPrisma;
const requireAdminMock = requireAdmin as jest.Mock;

function makeRequest(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((operations) => Promise.all(operations));
  requireAdminMock.mockResolvedValue({ account: { is_admin: true, is_approved: true }, error: null });
});

describe("Checkpoint-Labelspeicher", () => {
  it("normalisiert Namen vor dem eindeutigen Speichern", async () => {
    db.checkpointLabel.create.mockResolvedValue({ id: "label-stable-id", name: "Fachbereich" });
    await createCheckpointLabel("  Fachbereich  ");

    expect(normalizeCheckpointLabelName(" Fachbereich ")).toBe("fachbereich");
    expect(db.checkpointLabel.create).toHaveBeenCalledWith({
      data: { name: "Fachbereich", normalized_name: "fachbereich" },
      select: { id: true, name: true },
    });
  });

  it("ordnet einem statischen Fallback mehrere Labels zu, ohne Checkpoint-Upsert oder Inhaltsänderung", async () => {
    db.checkpointLabel.findMany.mockResolvedValue([{ id: "label-a" }, { id: "label-b" }]);
    db.checkpointLabelAssignment.deleteMany.mockResolvedValue({ count: 0 });
    db.checkpointLabelAssignment.createMany.mockResolvedValue({ count: 2 });

    const savedIds = await setCheckpointLabels("static-fallback", ["label-a", "label-b", "label-a"]);

    expect(savedIds).toEqual(["label-a", "label-b"]);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.checkpointLabelAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { checkpoint_id: "static-fallback", label_id: "label-a" },
        { checkpoint_id: "static-fallback", label_id: "label-b" },
      ],
    });
    expect(db.libraryCheckpoint.upsert).not.toHaveBeenCalled();
    expect(db.practiceCheckpointDefinition.updateMany).not.toHaveBeenCalled();
  });

  it("entfernt alle Labels für einen Checkpoint ohne dessen Datensatz anzulegen", async () => {
    db.checkpointLabelAssignment.deleteMany.mockResolvedValue({ count: 2 });

    expect(await setCheckpointLabels("static-fallback", [])).toEqual([]);
    expect(db.checkpointLabelAssignment.createMany).not.toHaveBeenCalled();
    expect(db.libraryCheckpoint.upsert).not.toHaveBeenCalled();
  });

  it("weist unbekannte Checkpoints und Labels zurück", async () => {
    await expect(setCheckpointLabels("missing", ["label-a"])).rejects.toMatchObject({ statusCode: 404 });
    db.checkpointLabel.findMany.mockResolvedValue([]);
    await expect(setCheckpointLabels("static-fallback", ["missing-label"])).rejects.toMatchObject({ statusCode: 422 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("behält beim Umbenennen die Label-ID und verändert keine Zuordnungen", async () => {
    db.checkpointLabel.updateMany.mockResolvedValue({ count: 1 });
    await expect(renameCheckpointLabel("label-a", "Neuer Name")).resolves.toEqual({ id: "label-a", name: "Neuer Name" });
    expect(db.checkpointLabel.updateMany).toHaveBeenCalledWith({
      where: { id: "label-a" },
      data: { name: "Neuer Name", normalized_name: "neuer name" },
    });
    expect(db.checkpointLabelAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it("löscht nur das Label und liest Zuordnungen über Label-IDs aus", async () => {
    db.checkpointLabel.deleteMany.mockResolvedValue({ count: 1 });
    await deleteCheckpointLabel("label-a");
    expect(db.checkpointLabel.deleteMany).toHaveBeenCalledWith({ where: { id: "label-a" } });

    db.checkpointLabelAssignment.findMany.mockResolvedValue([{ label_id: "label-b" }]);
    await expect(getCheckpointLabelIds("static-fallback")).resolves.toEqual(["label-b"]);
  });

  it("listet Labels alphabetisch mit Checkpoint-Anzahlen/IDs und erzeugt keine Zuordnungen", async () => {
    db.checkpointLabel.findMany.mockResolvedValue([
      { id: "a", name: "A", assignments: [{ checkpoint_id: "cp-1" }] },
      { id: "b", name: "B", assignments: [] },
    ]);
    await expect(listCheckpointLabels()).resolves.toEqual([
      { id: "a", name: "A", checkpointIds: ["cp-1"] },
      { id: "b", name: "B", checkpointIds: [] },
    ]);
    expect(db.checkpointLabelAssignment.createMany).not.toHaveBeenCalled();
  });
});

describe("Label-API-Berechtigungen", () => {
  it("verweigert nicht freigegebenen Admins den Labelzugriff", async () => {
    requireAdminMock.mockResolvedValue({ account: { is_admin: true, is_approved: false }, error: null });
    const response = await listLabelsRoute(makeRequest("/api/admin/checkpoint-labels"));
    expect(response.status).toBe(403);
    expect(db.checkpointLabel.findMany).not.toHaveBeenCalled();
  });

  it("verweigert Nicht-Admins den Labelzugriff", async () => {
    const denied = new Response(JSON.stringify({ ok: false, error: "Kein Admin-Zugriff." }), { status: 403 });
    requireAdminMock.mockResolvedValue({ account: null, error: denied });
    const response = await listLabelsRoute(makeRequest("/api/admin/checkpoint-labels"));
    expect(response.status).toBe(403);
    expect(db.checkpointLabel.findMany).not.toHaveBeenCalled();
  });

  it("verhindert doppelte normalisierte Labelnamen mit 409", async () => {
    db.checkpointLabel.create.mockRejectedValue({ code: "P2002" });
    const response = await createLabelRoute(makeRequest("/api/admin/checkpoint-labels", "POST", { name: "Vorhanden" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/existiert bereits/);
  });
});

describe("Checkpoint-Bibliotheksrücksprung", () => {
  it("behält interne Bibliotheksfilter und verwirft externe Rücksprungziele", () => {
    expect(sanitizeCheckpointLibraryReturnTo("/admin/practice-processes/checkpoints?view=labels&open=x&q=pflege"))
      .toBe("/admin/practice-processes/checkpoints?view=labels&open=x&q=pflege");
    expect(sanitizeCheckpointLibraryReturnTo("https://example.com/"))
      .toBe("/admin/practice-processes/checkpoints");
  });
});