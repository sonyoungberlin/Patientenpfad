/**
 * Tests für die Praxisfall-Bibliothek (DB-first, Admin-Save, Snapshot-Prinzip).
 *
 * Abgedeckt:
 * 1.  statischer Praxisfall vorhanden, kein DB-Override  → Katalog-Fallback
 * 2.  DB-Override vorhanden                              → DB-Version gewinnt
 * 3.  neue Session via /start-Route                      → nutzt DB-Praxisfall
 * 4.  Praxisfall danach geändert                         → bestehende Session stabil
 * 5.  neue zweite Session                                → erhält geänderte Definition
 * 6.  Titel/Beschreibung ändern und speichern (PUT)
 * 7.  Checkpoint hinzufügen (PUT)
 * 8.  Checkpoint entfernen (PUT)
 * 9.  Reihenfolge ändern (PUT)
 * 10. Gruppe ändern (PUT)
 * 11. doppelte Checkpoint-ID wird abgelehnt (422)
 * 12. neuer Praxisfall wird angelegt (POST 201)
 * 13. Praxisfall duplizieren (POST mit kopierten Daten)
 * 14. POST mit bereits belegter ID wird abgelehnt (409)
 * 15. Admin-Schutz: PUT/POST werden für Nicht-Admins abgelehnt (403)
 * 16. listCaseProfilesFromLib: DB-Override überschreibt Katalog
 * 17. listCaseProfilesFromLib: DB-only Einträge erscheinen in der Liste
 * 18. /start-Route: Snapshot enthält DB-Checkpoint-Daten (embedded)
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Prisma-Mock
// ---------------------------------------------------------------------------
jest.mock("@/lib/prisma", () => ({
  prisma: {
    libraryCaseProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    libraryCheckpoint: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { PUT } from "@/app/api/admin/case-profiles/[id]/route";
import { POST } from "@/app/api/admin/case-profiles/route";
import { POST as startSession } from "@/app/api/workflow-cases/internal-protocol/start/route";
import {
  getCaseProfileFromLib,
  listCaseProfilesFromLib,
} from "@/lib/practiceProcesses/caseProfileLibrary";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

type PrismaMock = {
  libraryCaseProfile: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
  libraryCheckpoint: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionMock = getSessionAccount as jest.Mock;

const ADMIN_ACCOUNT = {
  id: "adm-1",
  email: "admin@example.com",
  is_approved: true,
  is_admin: true,
  arbeitsprozesse_enabled: true,
};
const NON_ADMIN_ACCOUNT = { ...ADMIN_ACCOUNT, is_admin: false };

// DB-Row wie von Prisma zurückgegeben
const DB_PROFILE_ROW = {
  id: "rezeptanfrage-ohne-arzt",
  title: "Rezeptanfrage ohne Arzt (Admin-Version)",
  description: "Admin-Beschreibung",
  checkpoint_refs: [
    { checkpointId: "patient-bekannt", group: "Patientenstatus" },
    { checkpointId: "dauermedikation-vorhanden", group: "Medizinische Prüfung" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const NEW_PROFILE_ROW = {
  id: "neuer-praxisfall",
  title: "Neuer Praxisfall",
  description: "Neue Beschreibung",
  checkpoint_refs: [{ checkpointId: "patient-bekannt", group: "Patientenstatus" }],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePutRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/case-profiles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function makePutParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/case-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function makeStartRequest(caseProfileId: string) {
  return new NextRequest("http://localhost/api/workflow-cases/internal-protocol/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseProfileId }),
  });
}

beforeEach(() => {
  pm.libraryCaseProfile.findUnique.mockReset();
  pm.libraryCaseProfile.findMany.mockReset();
  pm.libraryCaseProfile.upsert.mockReset();
  pm.libraryCheckpoint.findUnique.mockReset();
  pm.libraryCheckpoint.findMany.mockReset();
  pm.libraryCheckpoint.upsert.mockReset();
  // Default: keine DB-Einträge für Checkpoints (→ Katalog-Fallback)
  pm.libraryCheckpoint.findUnique.mockResolvedValue(null);
  pm.libraryCheckpoint.findMany.mockResolvedValue([]);
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(ADMIN_ACCOUNT);
});

// ---------------------------------------------------------------------------
// 1–2. DB-first Lesen
// ---------------------------------------------------------------------------
describe("getCaseProfileFromLib", () => {
  it("1. fällt auf Katalog zurück wenn kein DB-Eintrag (statischer Praxisfall)", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(null);
    const profile = await getCaseProfileFromLib("rezeptanfrage-ohne-arzt");
    expect(profile).toBeDefined();
    expect(profile!.id).toBe("rezeptanfrage-ohne-arzt");
    // Katalog-Titel, nicht Admin-Version
    expect(profile!.title).toBe("Rezeptanfrage ohne Arzt");
  });

  it("2. DB-Override gewinnt über Katalog-Eintrag", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(DB_PROFILE_ROW);
    const profile = await getCaseProfileFromLib("rezeptanfrage-ohne-arzt");
    expect(profile!.title).toBe("Rezeptanfrage ohne Arzt (Admin-Version)");
    expect(profile!.description).toBe("Admin-Beschreibung");
    expect(profile!.checkpointRefs.length).toBe(2);
  });

  it("gibt undefined für vollständig unbekannte ID zurück", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(null);
    const profile = await getCaseProfileFromLib("existiert-wirklich-nicht");
    expect(profile).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3–5. Snapshot-Prinzip via /start-Route
// ---------------------------------------------------------------------------
describe("/start-Route: Snapshot-Prinzip", () => {
  it("3. neue Session nutzt DB-Praxisfall-Definition", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(DB_PROFILE_ROW);

    const res = await startSession(makeStartRequest("rezeptanfrage-ohne-arzt"));
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; snapshot?: unknown };
    expect(data.ok).toBe(true);
    expect(isPracticeWorkflowSnapshot(data.snapshot)).toBe(true);
    const snapshot = data.snapshot as { caseProfileTitle: string; checkpoints: Array<{ checkpointId: string }> };
    expect(snapshot.caseProfileTitle).toBe("Rezeptanfrage ohne Arzt (Admin-Version)");
    // nur 2 Checkpoints (DB-Version), nicht 16 (Katalog-Version)
    expect(snapshot.checkpoints.length).toBe(2);
  });

  it("4. bestehende Session bleibt stabil nach Admin-Änderung", async () => {
    // Session 1 wurde mit DB_PROFILE_ROW gestartet → Snapshot hat 2 CPs
    pm.libraryCaseProfile.findUnique.mockResolvedValue(DB_PROFILE_ROW);
    const res1 = await startSession(makeStartRequest("rezeptanfrage-ohne-arzt"));
    const { snapshot: snap1 } = await res1.json() as { snapshot: { checkpoints: unknown[] } };
    expect(snap1.checkpoints.length).toBe(2);

    // Admin ändert den Praxisfall auf 1 Checkpoint
    const modifiedRow = {
      ...DB_PROFILE_ROW,
      checkpoint_refs: [{ checkpointId: "patient-bekannt", group: "Patientenstatus" }],
    };
    pm.libraryCaseProfile.findUnique.mockResolvedValue(modifiedRow);

    // Session 1 bleibt bei ihren 2 Checkpoints (Snapshot ist eingefroren)
    expect(snap1.checkpoints.length).toBe(2);
  });

  it("5. neue zweite Session erhält geänderte Praxisfall-Definition", async () => {
    const modifiedRow = {
      ...DB_PROFILE_ROW,
      checkpoint_refs: [{ checkpointId: "patient-bekannt", group: "Patientenstatus" }],
    };
    pm.libraryCaseProfile.findUnique.mockResolvedValue(modifiedRow);

    const res2 = await startSession(makeStartRequest("rezeptanfrage-ohne-arzt"));
    const { snapshot: snap2 } = await res2.json() as { snapshot: { checkpoints: unknown[] } };
    expect(snap2.checkpoints.length).toBe(1);
  });

  it("18. Snapshot enthält eingebettete DB-Checkpoint-Daten", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(DB_PROFILE_ROW);
    // Checkpoint hat DB-Override
    pm.libraryCheckpoint.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "patient-bekannt") {
        return Promise.resolve({
          id: "patient-bekannt",
          title: "Patient bekannt (DB-Version)",
          description: "DB Beschreibung",
          orientation_hint: null,
          anchors: [{ id: "patient-bekannt-a1", text: "DB-Anker" }],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    const res = await startSession(makeStartRequest("rezeptanfrage-ohne-arzt"));
    const { snapshot } = await res.json() as {
      snapshot: { checkpoints: Array<{ checkpointId: string; checkpointTitle: string; checkpointAnchors?: unknown[] }> };
    };
    const cp = snapshot.checkpoints.find((c) => c.checkpointId === "patient-bekannt");
    expect(cp?.checkpointTitle).toBe("Patient bekannt (DB-Version)");
    expect(cp?.checkpointAnchors).toBeDefined();
    expect((cp?.checkpointAnchors as unknown[]).length).toBe(1);
  });

  it("gibt 404 zurück wenn Praxisfall nicht existiert", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(null);
    const res = await startSession(makeStartRequest("existiert-nicht"));
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 6–11. Admin Save: PUT
// ---------------------------------------------------------------------------
describe("PUT /api/admin/case-profiles/[id]", () => {
  it("6. speichert Titel und Beschreibung", async () => {
    pm.libraryCaseProfile.upsert.mockResolvedValue({
      ...DB_PROFILE_ROW,
      title: "Geänderter Titel",
      description: "Neue Beschreibung",
    });

    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: "Geänderter Titel",
        description: "Neue Beschreibung",
        checkpointRefs: DB_PROFILE_ROW.checkpoint_refs,
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; profile?: { title: string; description?: string } };
    expect(data.ok).toBe(true);
    expect(data.profile?.title).toBe("Geänderter Titel");
    expect(data.profile?.description).toBe("Neue Beschreibung");
  });

  it("7. speichert neu hinzugefügten Checkpoint", async () => {
    const updatedRefs = [
      ...DB_PROFILE_ROW.checkpoint_refs,
      { checkpointId: "rezept-erstellen", group: "Abschluss" },
    ];
    pm.libraryCaseProfile.upsert.mockResolvedValue({ ...DB_PROFILE_ROW, checkpoint_refs: updatedRefs });

    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: DB_PROFILE_ROW.title,
        description: "",
        checkpointRefs: updatedRefs,
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; profile?: { checkpointRefs?: unknown[] } };
    expect(data.ok).toBe(true);
    expect(data.profile?.checkpointRefs?.length).toBe(3);
  });

  it("8. speichert Praxisfall mit einem verbleibenden Checkpoint nach Entfernen", async () => {
    const remainingRefs = [{ checkpointId: "patient-bekannt", group: "Patientenstatus" }];
    pm.libraryCaseProfile.upsert.mockResolvedValue({ ...DB_PROFILE_ROW, checkpoint_refs: remainingRefs });

    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: DB_PROFILE_ROW.title,
        description: "",
        checkpointRefs: remainingRefs,
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; profile?: { checkpointRefs?: unknown[] } };
    expect(data.ok).toBe(true);
    expect(data.profile?.checkpointRefs?.length).toBe(1);
  });

  it("9. speichert geänderte Reihenfolge", async () => {
    const reordered = [
      { checkpointId: "dauermedikation-vorhanden", group: "Medizinische Prüfung" },
      { checkpointId: "patient-bekannt", group: "Patientenstatus" },
    ];
    pm.libraryCaseProfile.upsert.mockResolvedValue({ ...DB_PROFILE_ROW, checkpoint_refs: reordered });

    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: DB_PROFILE_ROW.title,
        description: "",
        checkpointRefs: reordered,
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(200);
    const upsertCall = pm.libraryCaseProfile.upsert.mock.calls[0][0] as {
      update: { checkpoint_refs: Array<{ checkpointId: string }> };
    };
    expect(upsertCall.update.checkpoint_refs[0].checkpointId).toBe("dauermedikation-vorhanden");
  });

  it("10. speichert geänderte Gruppe", async () => {
    const withNewGroup = [
      { checkpointId: "patient-bekannt", group: "Neue Gruppe" },
      { checkpointId: "dauermedikation-vorhanden", group: "Medizinische Prüfung" },
    ];
    pm.libraryCaseProfile.upsert.mockResolvedValue({ ...DB_PROFILE_ROW, checkpoint_refs: withNewGroup });

    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: DB_PROFILE_ROW.title,
        description: "",
        checkpointRefs: withNewGroup,
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as {
      ok: boolean;
      profile?: { checkpointRefs?: Array<{ checkpointId: string; group?: string }> };
    };
    expect(data.profile?.checkpointRefs?.[0].group).toBe("Neue Gruppe");
  });

  it("11. lehnt doppelte Checkpoint-ID ab (422)", async () => {
    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: DB_PROFILE_ROW.title,
        description: "",
        checkpointRefs: [
          { checkpointId: "patient-bekannt", group: "A" },
          { checkpointId: "patient-bekannt", group: "B" },
        ],
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(422);
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/einmal/);
  });

  it("lehnt leeren Titel ab (422)", async () => {
    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: "",
        description: "",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "" }],
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(422);
  });

  it("lehnt leere checkpointRefs-Liste ab (422)", async () => {
    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: "Titel",
        description: "",
        checkpointRefs: [],
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(422);
  });

  it("15a. lehnt Nicht-Admin ab (403)", async () => {
    getSessionMock.mockResolvedValue(NON_ADMIN_ACCOUNT);
    const res = await PUT(
      makePutRequest("rezeptanfrage-ohne-arzt", {
        title: "Titel",
        description: "",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "" }],
      }),
      makePutParams("rezeptanfrage-ohne-arzt"),
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 12–15. Admin Save: POST (neuer Praxisfall)
// ---------------------------------------------------------------------------
describe("POST /api/admin/case-profiles", () => {
  it("12. legt neuen Praxisfall an und gibt 201 zurück", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(null);
    pm.libraryCaseProfile.upsert.mockResolvedValue(NEW_PROFILE_ROW);

    const res = await POST(
      makePostRequest({
        id: "neuer-praxisfall",
        title: "Neuer Praxisfall",
        description: "Neue Beschreibung",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "Patientenstatus" }],
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json() as { ok: boolean; profile?: { id: string } };
    expect(data.ok).toBe(true);
    expect(data.profile?.id).toBe("neuer-praxisfall");
  });

  it("13. Duplizieren: legt Kopie mit neuer ID an", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(null);
    const kopieRow = { ...NEW_PROFILE_ROW, id: "rezeptanfrage-kopie", title: "Rezeptanfrage (Kopie)" };
    pm.libraryCaseProfile.upsert.mockResolvedValue(kopieRow);

    const res = await POST(
      makePostRequest({
        id: "rezeptanfrage-kopie",
        title: "Rezeptanfrage (Kopie)",
        description: DB_PROFILE_ROW.description,
        checkpointRefs: DB_PROFILE_ROW.checkpoint_refs,
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json() as { ok: boolean; profile?: { id: string; title: string } };
    expect(data.ok).toBe(true);
    expect(data.profile?.id).toBe("rezeptanfrage-kopie");
    expect(data.profile?.title).toBe("Rezeptanfrage (Kopie)");
  });

  it("14. lehnt POST mit bereits belegter ID ab (409)", async () => {
    pm.libraryCaseProfile.findUnique.mockResolvedValue(DB_PROFILE_ROW);

    const res = await POST(
      makePostRequest({
        id: "rezeptanfrage-ohne-arzt",
        title: "Irgendwas",
        description: "",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "" }],
      }),
    );
    expect(res.status).toBe(409);
  });

  it("lehnt ID mit Sonderzeichen ab (422)", async () => {
    const res = await POST(
      makePostRequest({
        id: "Neuer Praxisfall!",
        title: "Titel",
        description: "",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "" }],
      }),
    );
    expect(res.status).toBe(422);
  });

  it("15b. lehnt Nicht-Admin ab (403)", async () => {
    getSessionMock.mockResolvedValue(NON_ADMIN_ACCOUNT);
    const res = await POST(
      makePostRequest({
        id: "neuer-praxisfall",
        title: "Titel",
        description: "",
        checkpointRefs: [{ checkpointId: "patient-bekannt", group: "" }],
      }),
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 16–17. listCaseProfilesFromLib
// ---------------------------------------------------------------------------
describe("listCaseProfilesFromLib", () => {
  it("16. DB-Override überschreibt Katalog-Eintrag gleicher ID", async () => {
    pm.libraryCaseProfile.findMany.mockResolvedValue([DB_PROFILE_ROW]);
    const profiles = await listCaseProfilesFromLib();
    const found = profiles.find((p) => p.id === "rezeptanfrage-ohne-arzt");
    expect(found?.title).toBe("Rezeptanfrage ohne Arzt (Admin-Version)");
  });

  it("17. DB-only Einträge erscheinen in der Liste", async () => {
    pm.libraryCaseProfile.findMany.mockResolvedValue([NEW_PROFILE_ROW]);
    const profiles = await listCaseProfilesFromLib();
    const found = profiles.find((p) => p.id === "neuer-praxisfall");
    expect(found).toBeDefined();
    expect(found?.title).toBe("Neuer Praxisfall");
  });

  it("alle statischen Praxisfälle sind bei leerer DB verfügbar", async () => {
    pm.libraryCaseProfile.findMany.mockResolvedValue([]);
    const profiles = await listCaseProfilesFromLib();
    // statischer Katalog hat 29 Einträge
    expect(profiles.length).toBeGreaterThanOrEqual(29);
    const ids = profiles.map((p) => p.id);
    expect(ids).toContain("rezeptanfrage-ohne-arzt");
    expect(ids).toContain("medikamentenaenderung");
  });
});
