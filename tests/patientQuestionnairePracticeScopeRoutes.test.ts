/**
 * Phase P3b: Integrations-Tests für die Practice-Skopierung von
 * `PatientQuestionnaireSession` in den vier betroffenen Pfaden.
 *
 * Sicherungen:
 *   - Liste: Account mit current_practice filtert auf owner_practice_id
 *     UND kombiniert mit PRACTICE_VISIBLE_SESSION_FILTER.
 *   - DELETE: Account A2 darf Session löschen, die Account A1 in
 *     derselben Practice angelegt hat (Cross-Account/Same-Practice).
 *   - DELETE: Cross-Practice-Zugriff → 404, kein delete().
 *   - DELETE: Bestand mit owner_practice_id=null im Practice-Modus → 404
 *     (kein stilles Backfill).
 *   - DELETE: kein Update von owner_practice_id (nur delete()).
 *   - DELETE: Plattform-Admin ohne Practice-Membership ist KEIN Bypass.
 *   - PDF: Cross-Practice-Zugriff → 403 (Status-Quo erhalten), kein PDF.
 *   - PDF: Cross-Account/Same-Practice darf PDF abrufen.
 *   - Create: Doppelschreiben owner_account_id + owner_practice_id mit
 *     current_practice; ohne Practice nur owner_account_id (kein null).
 */

import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount, getSessionAccountFromCookies } from "@/lib/auth";

import QuestionnairesPage from "@/app/questionnaires/page";
import { POST as CreateRoute } from "@/app/api/questionnaire/route";
import { DELETE as DeleteRoute } from "@/app/api/questionnaire/[id]/route";
import { GET as PdfRoute } from "@/app/api/questionnaire/[id]/pdf/route";

type PrismaMock = {
  patientQuestionnaireSession: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;
const getAcc = getSessionAccount as jest.Mock;

const PRACTICE_A = {
  id: "p-A",
  name: "Praxis A",
  slug: "praxis-a",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

const PRACTICE_B = {
  ...PRACTICE_A,
  id: "p-B",
  slug: "praxis-b",
  name: "Praxis B",
};

const ACCOUNT_A1_IN_PRACTICE_A = {
  id: "acc-A1",
  email: "a1@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  current_practice: PRACTICE_A,
};

const ACCOUNT_A2_IN_PRACTICE_A = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-A2",
  email: "a2@example.com",
};

const ACCOUNT_B_IN_PRACTICE_B = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-B",
  email: "b@example.com",
  current_practice: PRACTICE_B,
};

const ADMIN_NO_PRACTICE = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-ADMIN",
  email: "admin@example.com",
  is_admin: true,
  current_practice: null,
};

beforeEach(() => {
  redirectMock.mockClear();
  getCookies.mockReset();
  getAcc.mockReset();
  pm.patientQuestionnaireSession.findMany.mockReset();
  pm.patientQuestionnaireSession.findUnique.mockReset();
  pm.patientQuestionnaireSession.create.mockReset();
  pm.patientQuestionnaireSession.delete.mockReset();
  pm.patientQuestionnaireSession.update.mockReset();
});

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

describe("/questionnaires list — Practice-Scope", () => {
  it("filtert auf owner_practice_id wenn current_practice gesetzt und kombiniert mit PRACTICE_VISIBLE_SESSION_FILTER", async () => {
    getCookies.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);
    const node = await QuestionnairesPage();
    renderToStaticMarkup(node);
    const args = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(args.where.AND).toBeDefined();
    expect(args.where.AND[0]).toEqual({ owner_practice_id: "p-A" });
    // Sichtbarkeitsfilter bleibt unangetastet.
    expect(args.where.AND[1]).toBeDefined();
    expect(args.where.AND[1].OR).toBeDefined();
    // Soft-Delete-Filter: archivierte Sessions tauchen in der Liste nicht auf.
    expect(args.where.AND).toEqual(
      expect.arrayContaining([{ deleted_at: null }]),
    );
  });

  it("Account A2 sieht dieselbe Liste wie A1 (gleiche Practice → gleicher Where-Filter)", async () => {
    getCookies.mockResolvedValue(ACCOUNT_A2_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);
    const node = await QuestionnairesPage();
    renderToStaticMarkup(node);
    const args = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(args.where.AND[0]).toEqual({ owner_practice_id: "p-A" });
  });

  it("Fallback auf owner_account_id ohne current_practice", async () => {
    getCookies.mockResolvedValue(ADMIN_NO_PRACTICE);
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);
    const node = await QuestionnairesPage();
    renderToStaticMarkup(node);
    const args = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(args.where.AND[0]).toEqual({ owner_account_id: "acc-ADMIN" });
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

function deleteReq(id = "sess-1") {
  return new NextRequest(`http://localhost/api/questionnaire/${id}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/questionnaire/[id] — Practice-Scope", () => {
  it("Cross-Practice-Zugriff → 404, kein Update", async () => {
    getAcc.mockResolvedValue(ACCOUNT_B_IN_PRACTICE_B);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      source: "internal",
      status: "completed",
      confirmed_at: null,
      deleted_at: null,
    });
    const res = await DeleteRoute(deleteReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Account A2 darf Session soft-löschen, die A1 in derselben Practice angelegt hat", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A2_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      source: "internal",
      status: "completed",
      confirmed_at: null,
      deleted_at: null,
    });
    pm.patientQuestionnaireSession.update.mockResolvedValue({});
    const res = await DeleteRoute(deleteReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(200);
    // Hard-Delete passiert nicht mehr; stattdessen Soft Delete via update().
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    const call = pm.patientQuestionnaireSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "sess-1" });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
    expect(Object.keys(call.data)).toEqual(["deleted_at"]);
  });

  it("Bestand mit owner_practice_id=null im Practice-Modus → 404 (kein Backfill)", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-A1",
      owner_practice_id: null,
      source: "internal",
      status: "completed",
      confirmed_at: null,
      deleted_at: null,
    });
    const res = await DeleteRoute(deleteReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Plattform-Admin ohne Practice-Membership ist KEIN Bypass", async () => {
    getAcc.mockResolvedValue(ADMIN_NO_PRACTICE);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      source: "internal",
      status: "completed",
      confirmed_at: null,
      deleted_at: null,
    });
    const res = await DeleteRoute(deleteReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Bereits soft-gelöschte Session → 404, kein erneuter Update", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      source: "internal",
      status: "completed",
      confirmed_at: null,
      deleted_at: new Date("2026-05-01T08:00:00Z"),
    });
    const res = await DeleteRoute(deleteReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

function pdfReq(id = "sess-1") {
  return new NextRequest(`http://localhost/api/questionnaire/${id}/pdf`, {
    method: "GET",
  });
}

describe("GET /api/questionnaire/[id]/pdf — Practice-Scope", () => {
  it("Cross-Practice-Zugriff → 403 (Status-Quo der PDF-Route)", async () => {
    getAcc.mockResolvedValue(ACCOUNT_B_IN_PRACTICE_B);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      id: "sess-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      status: "completed",
      patient_reference: null,
      submitted_at: new Date(),
      submitted_by: "patient",
      selected_block_ids: ["KONTAKT"],
      deduplicated_questions: [],
      answers: {},
      identity_gate_completed_at: new Date(),
      identity_gate_method: "dob",
    });
    const res = await PdfRoute(pdfReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(403);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Account A2 darf PDF von A1 in derselben Practice abrufen", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A2_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      id: "sess-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      status: "completed",
      patient_reference: null,
      submitted_at: new Date(),
      submitted_by: "patient",
      selected_block_ids: ["KONTAKT"],
      deduplicated_questions: [],
      answers: {},
      identity_gate_completed_at: new Date(),
      identity_gate_method: "dob",
    });
    const res = await PdfRoute(pdfReq(), {
      params: Promise.resolve({ id: "sess-1" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    // Kein stilles Update von owner_practice_id beim Lesen.
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Create — Doppelschreiben
// ---------------------------------------------------------------------------

function createReq(body: unknown) {
  return new NextRequest("http://localhost/api/questionnaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/questionnaire — Doppelschreiben", () => {
  it("setzt owner_account_id UND owner_practice_id wenn current_practice da ist", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.patientQuestionnaireSession.create.mockResolvedValue({ id: "sess-1" });
    const res = await CreateRoute(
      createReq({ selected_block_ids: ["KONTAKT"], patient_reference: "PAT-DS-1" }),
    );
    expect(res.status).toBe(200);
    const data = pm.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data.owner_account_id).toBe("acc-A1");
    expect(data.owner_practice_id).toBe("p-A");
  });

  it("setzt owner_practice_id NICHT ohne current_practice (kein null)", async () => {
    getAcc.mockResolvedValue(ADMIN_NO_PRACTICE);
    pm.patientQuestionnaireSession.create.mockResolvedValue({ id: "sess-1" });
    const res = await CreateRoute(
      createReq({ selected_block_ids: ["KONTAKT"], patient_reference: "PAT-DS-2" }),
    );
    expect(res.status).toBe(200);
    const data = pm.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data.owner_account_id).toBe("acc-ADMIN");
    expect(
      Object.prototype.hasOwnProperty.call(data, "owner_practice_id"),
    ).toBe(false);
  });
});
