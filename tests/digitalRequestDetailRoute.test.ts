/**
 * Tests für PATCH /api/digital-requests/[id]
 *
 * Prüft:
 * - patient_reference wird gespeichert
 * - selected_block_ids werden gespeichert
 * - ungültige Block-IDs werden abgelehnt (400)
 * - fremde Practice → 404
 * - INBOX_ONLY → 403
 * - nicht angemeldet → 401
 * - status=in_review wird gesetzt wenn aktueller Status "new"
 * - status=in_review wird NICHT gesetzt wenn Terminal-Status ("sent")
 * - status=sent wird abgelehnt (400)
 * - leeres Body ohne Felder → 200 / kein update
 */

import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/digital-requests/[id]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  digitalRequest: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Fixture-Accounts
// ---------------------------------------------------------------------------

const APPROVED_ACCOUNT = {
  id: "account-1",
  email: "test@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
};

const ACCOUNT_WITH_PRACTICE = {
  ...APPROVED_ACCOUNT,
  current_practice: {
    id: "p-1",
    slug: "praxis-1",
    name: "Praxis 1",
    is_approved: true,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: false,
  },
  memberships: [{ practice_id: "p-1", role: "OWNER" }],
};

/** Account einer anderen Praxis */
const ACCOUNT_OTHER_PRACTICE = {
  ...APPROVED_ACCOUNT,
  id: "account-2",
  current_practice: {
    id: "p-2",
    slug: "praxis-2",
    name: "Praxis 2",
    is_approved: true,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: false,
  },
  memberships: [{ practice_id: "p-2", role: "OWNER" }],
};

const INBOX_ONLY_ACCOUNT = {
  ...APPROVED_ACCOUNT,
  current_practice: {
    id: "p-1",
    slug: "praxis-1",
    name: "Praxis 1",
    is_approved: true,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: false,
  },
  memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" }],
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/digital-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CTX = (id: string) => ({ params: Promise.resolve({ id }) });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/digital-requests/[id]", () => {
  beforeEach(() => {
    pm.digitalRequest.findFirst.mockReset();
    pm.digitalRequest.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  // --- Auth ---

  it("gibt 401 zurück wenn nicht angemeldet", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest("dr-1", { patient_reference: "P-1" }), CTX("dr-1"));
    expect(res.status).toBe(401);
  });

  it("gibt 403 zurück für INBOX_ONLY", async () => {
    getSessionAccountMock.mockResolvedValue(INBOX_ONLY_ACCOUNT);
    const res = await PATCH(makeRequest("dr-1", { patient_reference: "P-1" }), CTX("dr-1"));
    expect(res.status).toBe(403);
  });

  // --- Eigentum ---

  it("gibt 404 zurück bei fremder Practice", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_OTHER_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(null); // anderer Scope → nichts gefunden
    const res = await PATCH(makeRequest("dr-1", { patient_reference: "P-1" }), CTX("dr-1"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 404 zurück bei unbekannter ID", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue(null);
    const res = await PATCH(makeRequest("nonexistent", { patient_reference: "P-1" }), CTX("nonexistent"));
    expect(res.status).toBe(404);
  });

  // --- Speichern: patient_reference ---

  it("speichert patient_reference", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await PATCH(makeRequest("dr-1", { patient_reference: "PAT-001" }), CTX("dr-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.digitalRequest.update.mock.calls[0][0].data.patient_reference).toBe("PAT-001");
  });

  it("trimmt patient_reference", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    await PATCH(makeRequest("dr-1", { patient_reference: "  PAT-001  " }), CTX("dr-1"));
    expect(pm.digitalRequest.update.mock.calls[0][0].data.patient_reference).toBe("PAT-001");
  });

  it("löscht patient_reference wenn null übergeben", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    await PATCH(makeRequest("dr-1", { patient_reference: null }), CTX("dr-1"));
    expect(pm.digitalRequest.update.mock.calls[0][0].data.patient_reference).toBeNull();
  });

  // --- Speichern: selected_block_ids ---

  it("speichert selected_block_ids", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await PATCH(
      makeRequest("dr-1", { selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "REZEPT"] }),
      CTX("dr-1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.digitalRequest.update.mock.calls[0][0].data.selected_block_ids).toEqual(
      ["ARBEITSUNFAEHIGKEIT", "REZEPT"],
    );
  });

  it("lehnt ungültige Block-IDs ab (400)", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const res = await PATCH(
      makeRequest("dr-1", { selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "GIBTS_NICHT"] }),
      CTX("dr-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.invalid_ids).toContain("GIBTS_NICHT");
    // update darf NICHT aufgerufen worden sein
    expect(pm.digitalRequest.update).not.toHaveBeenCalled();
  });

  it("lehnt selected_block_ids ab wenn kein Array", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    const res = await PATCH(makeRequest("dr-1", { selected_block_ids: "ARBEITSUNFAEHIGKEIT" }), CTX("dr-1"));
    expect(res.status).toBe(400);
  });

  // --- Status ---

  it("setzt status=in_review wenn aktueller Status 'new'", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    await PATCH(makeRequest("dr-1", { patient_reference: "P-1", status: "in_review" }), CTX("dr-1"));
    expect(pm.digitalRequest.update.mock.calls[0][0].data.status).toBe("in_review");
  });

  it("setzt status=in_review NICHT wenn aktueller Status 'sent'", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "sent" });
    pm.digitalRequest.update.mockResolvedValue({});

    await PATCH(makeRequest("dr-1", { patient_reference: "P-1", status: "in_review" }), CTX("dr-1"));
    expect(pm.digitalRequest.update.mock.calls[0][0].data.status).toBeUndefined();
  });

  it("lehnt status=sent ab (400)", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const res = await PATCH(makeRequest("dr-1", { status: "sent" }), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  // --- Kein Update wenn kein Feld ---

  it("gibt 200 zurück ohne DB-Update wenn kein Feld gesetzt", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });

    const res = await PATCH(makeRequest("dr-1", {}), CTX("dr-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.digitalRequest.update).not.toHaveBeenCalled();
  });

  // --- Practice-Scope (mit current_practice) ---

  it("findet Anfrage im korrekten Practice-Scope", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await PATCH(makeRequest("dr-1", { patient_reference: "PAT-P1" }), CTX("dr-1"));
    expect(res.status).toBe(200);

    // Scope-Check: findFirst wurde mit owner_practice_id aufgerufen
    const whereArg = pm.digitalRequest.findFirst.mock.calls[0][0].where;
    expect(whereArg.owner_practice_id).toBe("p-1");
  });
});
