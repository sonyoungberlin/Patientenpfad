/**
 * Tests für die POST /api/questionnaire Route.
 *
 * Prüft:
 * - Token wird erzeugt und gespeichert
 * - Ablehnung bei fehlenden/ungültigen Block-IDs
 * - Ablehnung ohne Authentifizierung
 * - patient_reference und inquiry_session_id werden korrekt weitergegeben
 */

import { NextRequest } from "next/server";
import { POST } from "@/app/api/questionnaire/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  patientQuestionnaireSession: { create: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const APPROVED_ACCOUNT = {
  id: "account-1",
  email: "test@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/questionnaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/questionnaire", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.create.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("erzeugt eine Session und gibt einen Link zurück", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "REZEPT"],
      patient_reference: "PAT-001",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(typeof json.link).toBe("string");
    expect(json.link).toContain("/q/");
  });

  it("speichert Token, deduplizierte Fragen und owner_account_id", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
      patient_reference: "PAT-001",
      inquiry_session_id: "inquiry-abc",
    });
    await POST(req);

    const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
    expect(createCall.data.owner_account_id).toBe("account-1");
    expect(createCall.data.patient_reference).toBe("PAT-001");
    expect(createCall.data.inquiry_session_id).toBe("inquiry-abc");
    expect(typeof createCall.data.token).toBe("string");
    expect(createCall.data.token.length).toBeGreaterThan(0);
    expect(Array.isArray(createCall.data.deduplicated_questions)).toBe(true);
    expect((createCall.data.deduplicated_questions as unknown[]).length).toBeGreaterThan(0);
    expect(createCall.data.status).toBe("pending");
  });

  it("gibt 401 zurück wenn nicht angemeldet", async () => {
    getSessionAccountMock.mockResolvedValue(null);

    const req = makeRequest({ selected_block_ids: ["ARBEITSUNFAEHIGKEIT"] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("gibt 403 zurück wenn Account nicht freigeschaltet", async () => {
    getSessionAccountMock.mockResolvedValue({ ...APPROVED_ACCOUNT, is_approved: false });

    const req = makeRequest({ selected_block_ids: ["ARBEITSUNFAEHIGKEIT"] });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("gibt 403 zurück wenn patient_communication_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED_ACCOUNT,
      patient_communication_enabled: false,
    });

    const req = makeRequest({ selected_block_ids: ["ARBEITSUNFAEHIGKEIT"] });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Patientenkommunikation nicht freigeschaltet.");
  });

  it("gibt 400 zurück wenn selected_block_ids fehlt", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurück wenn selected_block_ids kein Array ist", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const req = makeRequest({ selected_block_ids: "ARBEITSUNFAEHIGKEIT" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurück wenn keine gültigen Block-IDs angegeben", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const req = makeRequest({ selected_block_ids: ["UNKNOWN_BLOCK"] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("filtert ungültige Block-IDs heraus, akzeptiert wenn min. eine gültige ID vorhanden", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "INVALID_BLOCK"],
      patient_reference: "PAT-007",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
    expect(createCall.data.selected_block_ids).toEqual(["ARBEITSUNFAEHIGKEIT"]);
  });

  it("Token-Ablaufzeit ist ~48 Stunden in der Zukunft", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

    const before = Date.now();
    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
      patient_reference: "PAT-TTL",
    });
    await POST(req);
    const after = Date.now();

    const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
    const expiresAt: Date = createCall.data.token_expires_at;
    const ttlMs = expiresAt.getTime() - before;
    const expectedTtl = 48 * 60 * 60 * 1000;

    expect(ttlMs).toBeGreaterThanOrEqual(expectedTtl - 1000);
    expect(ttlMs).toBeLessThanOrEqual(expectedTtl + (after - before) + 1000);
  });

  it("gibt 400 zurück wenn patient_reference fehlt", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const req = makeRequest({ selected_block_ids: ["ARBEITSUNFAEHIGKEIT"] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Patientennummer / Referenz ist erforderlich.");
    expect(prismaMock.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("gibt 400 zurück wenn patient_reference nur aus Leerzeichen besteht", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
      patient_reference: "   ",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Patientennummer / Referenz ist erforderlich.");
    expect(prismaMock.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("trimmt patient_reference vor dem Speichern", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

    const req = makeRequest({
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
      patient_reference: "  PAT-042  ",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
    expect(createCall.data.patient_reference).toBe("PAT-042");
  });

  describe("language (Patientensicht-Sprache)", () => {
    it("speichert language='en' wenn explizit gesetzt", async () => {
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
      prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

      const req = makeRequest({
        selected_block_ids: ["KONTAKT"],
        patient_reference: "PAT-EN",
        language: "en",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(createCall.data.patient_language).toBe("en");
    });

    it("Default ist 'de' ohne language-Feld", async () => {
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
      prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

      const req = makeRequest({
        selected_block_ids: ["KONTAKT"],
        patient_reference: "PAT-DE",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(createCall.data.patient_language).toBe("de");
    });

    it("ungültige Sprachen fallen auf 'de' zurück", async () => {
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
      prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

      const req = makeRequest({
        selected_block_ids: ["KONTAKT"],
        patient_reference: "PAT-X",
        language: "fr",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(createCall.data.patient_language).toBe("de");
    });

    it("lehnt language='en' ab, wenn ein Block nicht vollständig EN-ready ist", async () => {
      // ARBEITSUNFAEHIGKEIT enthält Fragen ohne text_en und ist daher nicht EN-ready.
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

      const req = makeRequest({
        selected_block_ids: ["KONTAKT", "ARBEITSUNFAEHIGKEIT"],
        patient_reference: "PAT-MIX",
        language: "en",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.not_en_ready_block_ids).toEqual(["ARBEITSUNFAEHIGKEIT"]);
      expect(prismaMock.patientQuestionnaireSession.create).not.toHaveBeenCalled();
    });

    it("akzeptiert language='en' wenn ALLE Blöcke vollständig EN-ready sind", async () => {
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
      prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

      const req = makeRequest({
        selected_block_ids: ["IDENTITAET", "KONTAKT"],
        patient_reference: "PAT-EN-OK",
        language: "en",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const createCall = prismaMock.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(createCall.data.patient_language).toBe("en");
    });

    it("EN-Reject greift NICHT, wenn language='de'", async () => {
      // Bei DE darf jede Block-Kombination versendet werden.
      getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
      prismaMock.patientQuestionnaireSession.create.mockResolvedValue({ id: "session-1" });

      const req = makeRequest({
        selected_block_ids: ["KONTAKT", "ARBEITSUNFAEHIGKEIT"],
        patient_reference: "PAT-DE",
        language: "de",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
