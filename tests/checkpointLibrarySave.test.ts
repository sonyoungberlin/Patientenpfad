/**
 * Tests für die Checkpoint-Bibliothek Speicherfunktion.
 *
 * Abgedeckt:
 * 1. Bestehenden Checkpoint laden (DB-first, Katalog-Fallback)
 * 2. Titel/Beschreibung/Hinweis ändern und speichern (PUT)
 * 3. Bestehenden Ankertext ändern, ID erhalten (PUT)
 * 4. Neuen Anker hinzufügen und speichern (PUT)
 * 5. Anker löschen und speichern (PUT)
 * 6. Reload liefert gespeicherten Stand (getCheckpointFromLib nach upsert)
 * 7. Ungültiger PUT-Request wird abgelehnt
 * 8. Fehlgeschlagener Save führt nicht zu Erfolgszustand (error-response)
 * 9. Neuer Checkpoint anlegen (POST)
 * 10. POST mit bereits existierender ID wird abgelehnt
 * 11. Löschschutz: referenzierter Anker kann nicht gelöscht werden
 * 12. Nicht-referenzierter Anker kann gelöscht werden
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Prisma-Mock
// ---------------------------------------------------------------------------
jest.mock("@/lib/prisma", () => ({
  prisma: {
    libraryCheckpoint: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { PUT } from "@/app/api/admin/checkpoints/[id]/route";
import { POST } from "@/app/api/admin/checkpoints/route";
import { getCheckpointFromLib, listCheckpointsFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type LibMock = {
  libraryCheckpoint: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  $queryRaw: jest.Mock;
};
const pm = prisma as unknown as LibMock;
const getSessionMock = getSessionAccount as jest.Mock;

const ADMIN_ACCOUNT = {
  id: "adm-1",
  email: "admin@example.com",
  is_approved: true,
  is_admin: true,
};

const NON_ADMIN_ACCOUNT = {
  id: "usr-1",
  email: "user@example.com",
  is_approved: true,
  is_admin: false,
};

// DB-Row wie von Prisma zurückgegeben
const DB_ROW = {
  id: "mein-checkpoint",
  title: "Mein Checkpoint",
  description: "Beschreibung",
  orientation_hint: "Hinweis",
  anchors: [{ id: "mein-checkpoint-a1", text: "Erster Anker" }],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePutRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/checkpoints/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/checkpoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pm.libraryCheckpoint.findUnique.mockReset();
  pm.libraryCheckpoint.findMany.mockReset();
  pm.libraryCheckpoint.upsert.mockReset();
  pm.$queryRaw.mockReset();
  // Default: kein Anker referenziert
  pm.$queryRaw.mockResolvedValue([{ exists: false }]);
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(ADMIN_ACCOUNT);
});

// ---------------------------------------------------------------------------
// 1. Bestehenden Checkpoint laden
// ---------------------------------------------------------------------------
describe("getCheckpointFromLib", () => {
  it("liefert DB-Eintrag wenn vorhanden", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);
    const cp = await getCheckpointFromLib("mein-checkpoint");
    expect(cp).toBeDefined();
    expect(cp!.title).toBe("Mein Checkpoint");
    expect(cp!.orientationAnchors?.[0].id).toBe("mein-checkpoint-a1");
  });

  it("fällt auf Katalog zurück wenn kein DB-Eintrag", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(null);
    const cp = await getCheckpointFromLib("patient-bekannt");
    expect(cp).toBeDefined();
    expect(cp!.id).toBe("patient-bekannt");
  });

  it("gibt undefined für unbekannte ID zurück", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(null);
    const cp = await getCheckpointFromLib("existiert-nicht");
    expect(cp).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Titel/Beschreibung/Hinweis ändern und speichern (PUT)
// ---------------------------------------------------------------------------
describe("PUT /api/admin/checkpoints/[id]", () => {
  it("speichert geänderten Titel und gibt ok:true zurück", async () => {
    pm.libraryCheckpoint.upsert.mockResolvedValue({
      ...DB_ROW,
      title: "Geänderter Titel",
    });

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Geänderter Titel",
        description: "Beschreibung",
        orientationHint: "Hinweis",
        orientationAnchors: [{ id: "mein-checkpoint-a1", text: "Erster Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; checkpoint?: { title: string } };
    expect(data.ok).toBe(true);
    expect(data.checkpoint?.title).toBe("Geänderter Titel");
  });

  // ---------------------------------------------------------------------------
  // 3. Bestehenden Ankertext ändern, ID erhalten
  // ---------------------------------------------------------------------------
  it("erhält Anchor-ID bei Textänderung", async () => {
    const updatedRow = {
      ...DB_ROW,
      anchors: [{ id: "mein-checkpoint-a1", text: "Geänderter Ankertext" }],
    };
    pm.libraryCheckpoint.upsert.mockResolvedValue(updatedRow);

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "mein-checkpoint-a1", text: "Geänderter Ankertext" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; checkpoint?: { orientationAnchors?: Array<{ id: string; text: string }> } };
    expect(data.ok).toBe(true);
    expect(data.checkpoint?.orientationAnchors?.[0].id).toBe("mein-checkpoint-a1");
    expect(data.checkpoint?.orientationAnchors?.[0].text).toBe("Geänderter Ankertext");

    const upsertCall = pm.libraryCheckpoint.upsert.mock.calls[0][0] as {
      update: { anchors: Array<{ id: string }> };
    };
    expect(upsertCall.update.anchors[0].id).toBe("mein-checkpoint-a1");
  });

  // ---------------------------------------------------------------------------
  // 4. Neuen Anker hinzufügen und speichern
  // ---------------------------------------------------------------------------
  it("speichert neu hinzugefügten Anker", async () => {
    const updatedAnchors = [
      { id: "mein-checkpoint-a1", text: "Erster Anker" },
      { id: "a1", text: "Neuer Anker" },
    ];
    pm.libraryCheckpoint.upsert.mockResolvedValue({
      ...DB_ROW,
      anchors: updatedAnchors,
    });

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: updatedAnchors,
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; checkpoint?: { orientationAnchors?: Array<{ id: string }> } };
    expect(data.ok).toBe(true);
    expect(data.checkpoint?.orientationAnchors?.length).toBe(2);
    expect(data.checkpoint?.orientationAnchors?.[1].id).toBe("a1");
  });

  // ---------------------------------------------------------------------------
  // 5. Anker löschen und speichern
  // ---------------------------------------------------------------------------
  it("persistiert gelöschten Anker korrekt", async () => {
    // Nach dem Löschen sind keine Anker mehr vorhanden — aber PUT erfordert mind. einen
    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(422);
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Orientierungsfrage/);
  });

  it("speichert Checkpoint mit einem verbleibenden Anker nach Löschen", async () => {
    const remaining = [{ id: "mein-checkpoint-a1", text: "Erster Anker" }];
    pm.libraryCheckpoint.upsert.mockResolvedValue({ ...DB_ROW, anchors: remaining });

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: remaining,
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; checkpoint?: { orientationAnchors?: unknown[] } };
    expect(data.ok).toBe(true);
    expect(data.checkpoint?.orientationAnchors?.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 6. Reload liefert gespeicherten Stand
  // ---------------------------------------------------------------------------
  it("getCheckpointFromLib gibt nach upsert den DB-Stand zurück", async () => {
    const savedRow = {
      ...DB_ROW,
      title: "Geänderter Titel",
      anchors: [{ id: "mein-checkpoint-a1", text: "Neuer Ankertext" }],
    };
    pm.libraryCheckpoint.findUnique.mockResolvedValue(savedRow);

    const cp = await getCheckpointFromLib("mein-checkpoint");
    expect(cp!.title).toBe("Geänderter Titel");
    expect(cp!.orientationAnchors?.[0].text).toBe("Neuer Ankertext");
  });

  // ---------------------------------------------------------------------------
  // 7. Ungültiger Request wird abgelehnt
  // ---------------------------------------------------------------------------
  it("lehnt fehlenden Titel ab (422)", async () => {
    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(422);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(false);
  });

  it("lehnt Anker mit fehlender ID ab (422)", async () => {
    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Titel",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "", text: "Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(422);
  });

  // ---------------------------------------------------------------------------
  // 8. Fehlgeschlagener Save führt nicht zu Erfolgszustand
  // ---------------------------------------------------------------------------
  it("gibt 500-ähnlichen Fehler wenn DB wirft", async () => {
    pm.libraryCheckpoint.upsert.mockRejectedValue(new Error("DB-Fehler"));

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Titel",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).not.toBe(200);
  });

  it("lehnt nicht-Admin-Zugriff ab (403)", async () => {
    getSessionMock.mockResolvedValue(NON_ADMIN_ACCOUNT);
    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Titel",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 9. Neuen Checkpoint anlegen (POST)
// ---------------------------------------------------------------------------
describe("POST /api/admin/checkpoints", () => {
  it("legt neuen Checkpoint an und gibt 201 zurück", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(null);
    pm.libraryCheckpoint.upsert.mockResolvedValue({
      id: "neuer-checkpoint",
      title: "Neuer Checkpoint",
      description: null,
      orientation_hint: null,
      anchors: [{ id: "a1", text: "Erster Anker" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      makePostRequest({
        id: "neuer-checkpoint",
        title: "Neuer Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Erster Anker" }],
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json() as { ok: boolean; checkpoint?: { id: string } };
    expect(data.ok).toBe(true);
    expect(data.checkpoint?.id).toBe("neuer-checkpoint");
  });

  // ---------------------------------------------------------------------------
  // 10. POST mit bereits existierender ID wird abgelehnt
  // ---------------------------------------------------------------------------
  it("lehnt POST mit bereits belegter ID ab (409)", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);

    const res = await POST(
      makePostRequest({
        id: "mein-checkpoint",
        title: "Anderer Titel",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Anker" }],
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(false);
  });

  it("lehnt ungültige ID mit Sonderzeichen ab (422)", async () => {
    const res = await POST(
      makePostRequest({
        id: "Ungültige ID!",
        title: "Titel",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "a1", text: "Anker" }],
      }),
    );
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// listCheckpointsFromLib: DB überschreibt Katalog
// ---------------------------------------------------------------------------
describe("listCheckpointsFromLib", () => {
  it("DB-Eintrag überschreibt Katalog-Eintrag gleicher ID", async () => {
    const overrideRow = {
      id: "patient-bekannt",
      title: "Patient bekannt (Admin-Version)",
      description: null,
      orientation_hint: null,
      anchors: [{ id: "patient-bekannt-a1", text: "Überschrieben" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pm.libraryCheckpoint.findMany.mockResolvedValue([overrideRow]);

    const list = await listCheckpointsFromLib();
    const cp = list.find((c) => c.id === "patient-bekannt");
    expect(cp?.title).toBe("Patient bekannt (Admin-Version)");
  });

  it("neue DB-Einträge erscheinen in der Liste", async () => {
    const newRow = {
      id: "brandneuer-checkpoint",
      title: "Brandneu",
      description: null,
      orientation_hint: null,
      anchors: [{ id: "a1", text: "Anker" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pm.libraryCheckpoint.findMany.mockResolvedValue([newRow]);

    const list = await listCheckpointsFromLib();
    const found = list.find((c) => c.id === "brandneuer-checkpoint");
    expect(found).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 11. Löschschutz: referenzierter Anker kann nicht gelöscht werden
// ---------------------------------------------------------------------------
describe("PUT Löschschutz – referenzierter Anker", () => {
  it("gibt 409 zurück wenn Anker in gespeichertem Praxisprozess verwendet wird", async () => {
    // Aktueller Stand hat einen Anker
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);
    // isAnchorReferenced gibt true zurück
    pm.$queryRaw.mockResolvedValue([{ exists: true }]);

    // Incoming request entfernt den Anker komplett (nur noch ein anderer)
    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "mein-checkpoint-a2", text: "Zweiter Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );

    expect(res.status).toBe(409);
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/gespeicherten Praxisprozessen verwendet/);
  });

  it("Fehlermeldung enthält Ankertext des referenzierten Ankers", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);
    pm.$queryRaw.mockResolvedValue([{ exists: true }]);

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "mein-checkpoint-a2", text: "Zweiter Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );

    const data = await res.json() as { error: string };
    // Fehlermeldung enthält den Ankertext "Erster Anker"
    expect(data.error).toContain("Erster Anker");
  });
});

// ---------------------------------------------------------------------------
// 12. Nicht-referenzierter Anker kann gelöscht werden
// ---------------------------------------------------------------------------
describe("PUT Löschschutz – nicht referenzierter Anker", () => {
  it("gibt 200 zurück wenn Anker in keinem Praxisprozess verwendet wird", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);
    // Default aus beforeEach: exists: false
    pm.libraryCheckpoint.upsert.mockResolvedValue({
      ...DB_ROW,
      anchors: [{ id: "mein-checkpoint-a2", text: "Zweiter Anker" }],
    });

    const res = await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        orientationAnchors: [{ id: "mein-checkpoint-a2", text: "Zweiter Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );

    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });

  it("ruft $queryRaw nicht auf wenn kein Anker entfernt wird", async () => {
    pm.libraryCheckpoint.findUnique.mockResolvedValue(DB_ROW);
    pm.libraryCheckpoint.upsert.mockResolvedValue(DB_ROW);

    await PUT(
      makePutRequest("mein-checkpoint", {
        title: "Mein Checkpoint",
        description: "",
        orientationHint: "",
        // Gleiche Anchor-IDs wie im DB_ROW → nichts gelöscht
        orientationAnchors: [{ id: "mein-checkpoint-a1", text: "Erster Anker" }],
      }),
      makePutParams("mein-checkpoint"),
    );

    // $queryRaw soll nicht aufgerufen worden sein
    expect(pm.$queryRaw).not.toHaveBeenCalled();
  });
});
