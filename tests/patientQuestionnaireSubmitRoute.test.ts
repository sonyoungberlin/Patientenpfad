/**
 * Tests für die POST /api/q/[token] Route (Antworten einreichen).
 *
 * Prüft:
 * - Erfolgreicher Submit: status = completed, token = null, submitted_at gesetzt
 * - Abgelaufener Token wird mit 410 abgelehnt
 * - Unbekannter Token wird mit 404 abgelehnt
 * - Bereits abgeschlossener Token wird mit 409 abgelehnt
 * - Antworten werden validiert und auf bekannte questionIds beschränkt
 * - CaseSession/PrefillRun bleiben vollständig unberührt
 */

import { NextRequest } from "next/server";
import { POST } from "@/app/api/q/[token]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    // Explizit keine caseSession / prefillRun – zeigt Isolation
    caseSession: undefined,
    prefillRun: undefined,
  },
}));

import { prisma } from "@/lib/prisma";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";

type PrismaMock = {
  patientQuestionnaireSession: { findUnique: jest.Mock; update: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

function futureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

function pastDate(hoursAgo: number): Date {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

function makeRequest(token: string, body: unknown) {
  return new NextRequest(`http://localhost/api/q/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SESSION_BASE = {
  id: "qs-1",
  token_expires_at: futureDate(48),
  status: "pending",
  deduplicated_questions: [
    { id: "CONTACT_PHONE", text: "Telefon?", type: "text", required: true },
    { id: "AU_SYMPTOMS", text: "Beschwerden?", type: "textarea", required: true },
  ],
};

const CONFIRMATION_SESSION = {
  ...SESSION_BASE,
  deduplicated_questions: [
    ...SESSION_BASE.deduplicated_questions,
    {
      id: "PRACTICE_CONFIRMATION_1",
      text: "Ich bestätige A.",
      type: "confirmation",
      required: true,
    },
    {
      id: "PRACTICE_CONFIRMATION_2",
      text: "Ich bestätige B.",
      type: "confirmation",
      required: true,
    },
  ],
  frozen_blocks: [
    {
      id: "PRACTICE_CONFIRMATIONS",
      label: "Bestätigungen",
      displayOrder: 10_000,
      questions: [
        {
          id: "PRACTICE_CONFIRMATION_1",
          text: "Ich bestätige A.",
          type: "confirmation",
          required: true,
        },
        {
          id: "PRACTICE_CONFIRMATION_2",
          text: "Ich bestätige B.",
          type: "confirmation",
          required: true,
        },
      ],
      conditionalRules: [],
      initiallyVisible: true,
    },
  ],
};

describe("POST /api/q/[token]", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.findUnique.mockReset();
    prismaMock.patientQuestionnaireSession.update.mockReset();
    prismaMock.patientQuestionnaireSession.update.mockResolvedValue({});
  });

  it("Submit setzt status=completed, nullt token, setzt submitted_at", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(SESSION_BASE);

    const req = makeRequest("valid-token", {
      answers: { CONTACT_PHONE: "0171 123456", AU_SYMPTOMS: "Husten" },
    });
    const res = await POST(req, { params: Promise.resolve({ token: "valid-token" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const updateData = prismaMock.patientQuestionnaireSession.update.mock.calls[0][0].data;
    expect(updateData.status).toBe("completed");
    expect(updateData.token).toBeNull();
    expect(updateData.token_expires_at).toBeNull();
    expect(updateData.submitted_at).toBeInstanceOf(Date);
  });

  it("Antworten werden korrekt gespeichert", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(SESSION_BASE);

    const answers = { CONTACT_PHONE: "0171 123456", AU_SYMPTOMS: "Kopfschmerzen" };
    const req = makeRequest("valid-token", { answers });
    await POST(req, { params: Promise.resolve({ token: "valid-token" }) });

    const updateData = prismaMock.patientQuestionnaireSession.update.mock.calls[0][0].data;
    expect(updateData.answers).toEqual(answers);
  });

  it("liefert für practice_direct den bestehenden Krankenblatt-Text", async () => {
    const directSession = {
      ...SESSION_BASE,
      source: "practice_direct",
      inquiry_session_id: "inquiry-1",
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    };
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(directSession);

    const answers = { CONTACT_PHONE: "0171 123456", AU_SYMPTOMS: "Husten" };
    const res = await POST(
      makeRequest("valid-token", { answers }),
      { params: Promise.resolve({ token: "valid-token" }) },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      sessionId: "qs-1",
      inquiry_session_id: "inquiry-1",
    });
    expect(json.noteText).toBe(
      buildMedicalRecordNote({
        answers,
        selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
        frozenBlocks: null,
      }),
    );
  });

  it("erlaubt mehrere Confirmations nur wenn alle exakt true sind", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      CONFIRMATION_SESSION,
    );
    const req = makeRequest("valid-token", {
      answers: {
        PRACTICE_CONFIRMATION_1: "true",
        PRACTICE_CONFIRMATION_2: "true",
      },
    });
    const res = await POST(req, {
      params: Promise.resolve({ token: "valid-token" }),
    });
    expect(res.status).toBe(200);
    expect(
      prismaMock.patientQuestionnaireSession.update.mock.calls[0][0].data.answers,
    ).toMatchObject({
      PRACTICE_CONFIRMATION_1: "true",
      PRACTICE_CONFIRMATION_2: "true",
    });
  });

  it.each([undefined, "", "false", "ja", "nein"])(
    "lehnt manipulierte Confirmation %p serverseitig ab",
    async (value) => {
      prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
        CONFIRMATION_SESSION,
      );
      const answers: Record<string, string> = {
        PRACTICE_CONFIRMATION_1: "true",
      };
      if (value !== undefined) answers.PRACTICE_CONFIRMATION_2 = value;
      const req = makeRequest("valid-token", { answers });
      const res = await POST(req, {
        params: Promise.resolve({ token: "valid-token" }),
      });
      expect(res.status).toBe(400);
      expect(prismaMock.patientQuestionnaireSession.update).not.toHaveBeenCalled();
    },
  );

  it("Fremde questionIds werden verworfen (nur bekannte werden gespeichert)", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(SESSION_BASE);

    const req = makeRequest("valid-token", {
      answers: {
        CONTACT_PHONE: "123",
        UNKNOWN_QUESTION: "sollte verworfen werden",
        PRESCRIPTION_MEDICATION: "Ibuprofen", // nicht in dieser Session
      },
    });
    await POST(req, { params: Promise.resolve({ token: "valid-token" }) });

    const updateData = prismaMock.patientQuestionnaireSession.update.mock.calls[0][0].data;
    expect(updateData.answers).toHaveProperty("CONTACT_PHONE");
    expect(updateData.answers).not.toHaveProperty("UNKNOWN_QUESTION");
    expect(updateData.answers).not.toHaveProperty("PRESCRIPTION_MEDICATION");
  });

  it("abgelaufener Token: 410", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...SESSION_BASE,
      token_expires_at: pastDate(1),
    });

    const req = makeRequest("expired-token", { answers: {} });
    const res = await POST(req, { params: Promise.resolve({ token: "expired-token" }) });
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("unbekannter Token: 404", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(null);

    const req = makeRequest("unknown-token", { answers: {} });
    const res = await POST(req, { params: Promise.resolve({ token: "unknown-token" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("bereits abgeschlossener Token: 409", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...SESSION_BASE,
      status: "completed",
    });

    const req = makeRequest("used-token", { answers: {} });
    const res = await POST(req, { params: Promise.resolve({ token: "used-token" }) });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("nach erfolgreichem Submit ist Token null → 404 bei erneutem Aufruf", async () => {
    // Simuliert den Zustand nach dem Nullen des Tokens
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(null);

    const req = makeRequest("consumed-token", { answers: {} });
    const res = await POST(req, { params: Promise.resolve({ token: "consumed-token" }) });
    expect(res.status).toBe(404);
  });

  it("fehlende answers-Feld: 400", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(SESSION_BASE);

    const req = makeRequest("valid-token", {});
    const res = await POST(req, { params: Promise.resolve({ token: "valid-token" }) });
    expect(res.status).toBe(400);
  });

  it("CaseSession und PrefillRun werden nicht aufgerufen (Isolation)", async () => {
    // prisma.caseSession und prisma.prefillRun sind in diesem Mock undefined –
    // wenn der Route-Handler sie aufruft, würde ein Fehler entstehen.
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(SESSION_BASE);

    const req = makeRequest("valid-token", {
      answers: { CONTACT_PHONE: "0171" },
    });
    const res = await POST(req, { params: Promise.resolve({ token: "valid-token" }) });
    expect(res.status).toBe(200);
    // Kein Fehler → Route hat caseSession/prefillRun nicht verwendet.
  });

  describe("Zeichenvalidierung Freitext (Bypass-Schutz)", () => {
    it("400 bei kyrillischer Eingabe in einem Freitextfeld (Bypass-Schutz)", async () => {
      prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
        SESSION_BASE,
      );

      const req = makeRequest("valid-token", {
        answers: { CONTACT_PHONE: "Нет" },
      });
      const res = await POST(req, {
        params: Promise.resolve({ token: "valid-token" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toContain("lateinische Buchstaben");
      expect(json.invalidQuestionIds).toEqual(["CONTACT_PHONE"]);
      // Keine DB-Schreibung trotz Bypass-Versuch via direktem JSON-POST.
      expect(prismaMock.patientQuestionnaireSession.update).not.toHaveBeenCalled();
    });

    it("400 bei Emoji-Eingabe in einem Freitextfeld", async () => {
      prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
        SESSION_BASE,
      );

      const req = makeRequest("valid-token", {
        answers: { CONTACT_PHONE: "0171 😀" },
      });
      const res = await POST(req, {
        params: Promise.resolve({ token: "valid-token" }),
      });
      expect(res.status).toBe(400);
      expect(prismaMock.patientQuestionnaireSession.update).not.toHaveBeenCalled();
    });

    it("englische Fehlermeldung bei patient_language='en'", async () => {
      prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
        ...SESSION_BASE,
        patient_language: "en",
      });

      const req = makeRequest("valid-token", {
        answers: { CONTACT_PHONE: "你好" },
      });
      const res = await POST(req, {
        params: Promise.resolve({ token: "valid-token" }),
      });
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("Latin letters");
    });

    it("akzeptiert deutsche Umlaute, ß und übliche Satzzeichen", async () => {
      prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
        SESSION_BASE,
      );

      const req = makeRequest("valid-token", {
        answers: { CONTACT_PHONE: "+49 30 1234, Müller-Str. 5 (Hinterhof) & Co." },
      });
      const res = await POST(req, {
        params: Promise.resolve({ token: "valid-token" }),
      });
      expect(res.status).toBe(200);
    });
  });
});
