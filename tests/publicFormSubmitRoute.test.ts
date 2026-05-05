/**
 * Phase 3d: Tests für POST /api/p/[slug]/submit.
 *
 * Sicherungen:
 *   - 404 bei ungültigem/unbekanntem Slug, inaktivem Form, fehlenden
 *     Owner-Flags. Keine Enumeration.
 *   - 400 bei ungültiger E-Mail.
 *   - 429 bei Rate-Limit-Überschreitung (IP+Slug bzw. E-Mail-Hash).
 *   - Honeypot-Treffer → identische Erfolgs-Antwort, KEINE DB-Schreibung.
 *   - Happy Path: prisma.create wird mit
 *       status="awaiting_email_confirmation",
 *       source="website",
 *       gehashtem confirm_token (NICHT Klartext),
 *       gehashter submitter_email_hash (NICHT Klartext)
 *     aufgerufen, Mailversand erhält Klartext-Token-URL.
 *   - Mailfehler: Session bleibt bestehen (KEIN delete), generischer
 *     Erfolgs-Redirect.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findUnique: jest.fn(),
    },
    patientQuestionnaireSession: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/mail/sendWebsiteFormConfirmationEmail", () => ({
  sendWebsiteFormConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { sendWebsiteFormConfirmationEmail } from "@/lib/mail/sendWebsiteFormConfirmationEmail";
import { hashConfirmToken } from "@/lib/websiteForms/confirmToken";
import { hashSubmitterEmail } from "@/lib/websiteForms/emailHash";
import { POST } from "@/app/api/p/[slug]/submit/route";

type PrismaMock = {
  practiceQuestionnaireForm: { findUnique: jest.Mock };
  patientQuestionnaireSession: { create: jest.Mock; delete: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const sendMailMock = sendWebsiteFormConfirmationEmail as jest.Mock;

const SLUG = "praxis-formular";

const ENABLED_OWNER = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeForm(overrides: Partial<{
  is_active: boolean;
  selected_block_ids: string[];
  owner_account: typeof ENABLED_OWNER | null;
  patient_language: string;
}> = {}) {
  return {
    id: "form-1",
    is_active: true,
    selected_block_ids: ["KONTAKT"],
    patient_language: "de",
    owner_account_id: "acc-1",
    owner_account: ENABLED_OWNER,
    ...overrides,
  };
}

function formReq(
  fields: Record<string, string>,
  slug = SLUG,
  ip = "9.9.9.9",
): NextRequest {
  const body = new URLSearchParams(fields).toString();
  return new NextRequest(`http://localhost/api/p/${slug}/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": ip,
    },
    body,
  });
}

let consoleErrorSpy: jest.SpyInstance;
let consoleInfoSpy: jest.SpyInstance;

beforeEach(() => {
  pm.practiceQuestionnaireForm.findUnique.mockReset();
  pm.patientQuestionnaireSession.create.mockReset().mockResolvedValue({});
  pm.patientQuestionnaireSession.delete.mockReset();
  sendMailMock.mockReset().mockResolvedValue(undefined);
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  // Wichtig: jeder Test verwendet eine neue IP, damit der Modul-scope
  // Limiter unabhängige Buckets sieht.
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleInfoSpy.mockRestore();
});

describe("POST /api/p/[slug]/submit", () => {
  it("404 bei ungültigem Slug ohne DB-Roundtrip", async () => {
    const res = await POST(formReq({ email: "a@b.de" }, "BAD_SLUG"), {
      params: Promise.resolve({ slug: "BAD_SLUG" }),
    });
    expect(res.status).toBe(404);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("404 bei unbekanntem Slug", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(null);
    const res = await POST(formReq({ email: "a@b.de" }, SLUG, "1.1.1.1"), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("404 bei inaktivem Formular", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ is_active: false }),
    );
    const res = await POST(formReq({ email: "a@b.de" }, SLUG, "1.1.1.2"), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(404);
  });

  it.each([
    ["is_approved", { ...ENABLED_OWNER, is_approved: false }],
    ["patient_communication_enabled", { ...ENABLED_OWNER, patient_communication_enabled: false }],
    ["website_forms_enabled", { ...ENABLED_OWNER, website_forms_enabled: false }],
  ])("404 wenn Owner-Flag %s false ist", async (_name, owner) => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ owner_account: owner }),
    );
    const res = await POST(formReq({ email: "a@b.de" }, SLUG, `2.0.0.${Math.floor(Math.random() * 250)}`), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("400 bei ungültiger E-Mail", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const res = await POST(formReq({ email: "not-an-email" }, SLUG, "3.0.0.1"), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(400);
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("Honeypot-Treffer: 303-Redirect auf /p/[slug]/eingereicht, KEINE DB-Schreibung, KEINE Mail", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const res = await POST(
      formReq({ email: "a@b.de", company_website: "https://spam.bot" }, SLUG, "4.0.0.1"),
      { params: Promise.resolve({ slug: SLUG }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain(`/p/${SLUG}/eingereicht`);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("Happy Path: erstellt Session mit Hash-Token, Hash-Email, status=awaiting_email_confirmation", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const res = await POST(
      formReq(
        {
          email: "Patient@Example.COM",
          CONTACT_PHONE: "+49 30 123",
          UNKNOWN_FIELD: "wird verworfen",
        },
        SLUG,
        "5.0.0.1",
      ),
      { params: Promise.resolve({ slug: SLUG }) },
    );

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain(`/p/${SLUG}/eingereicht`);

    expect(pm.patientQuestionnaireSession.create).toHaveBeenCalledTimes(1);
    const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
    expect(call.data.status).toBe("awaiting_email_confirmation");
    expect(call.data.source).toBe("website");
    expect(call.data.submitted_by).toBe("patient");
    expect(call.data.owner_account_id).toBe("acc-1");
    expect(call.data.practice_form_id).toBe("form-1");
    expect(call.data.submitted_at).toBeUndefined();

    // E-Mail-Hash, KEIN Klartext (außerhalb von `answers`, wo CONTACT_EMAIL
    // bewusst aus der Bestätigungs-E-Mail gespiegelt wird, sobald der
    // KONTAKT-Block aktiv ist — siehe describe("CONTACT_EMAIL-Spiegelung")).
    expect(call.data.submitter_email_hash).toBe(
      hashSubmitterEmail("Patient@Example.COM"),
    );
    // Original-Casing darf nirgends auftauchen (validateSubmitterEmail normalisiert).
    expect(JSON.stringify(call.data)).not.toContain("Patient@Example.COM");
    // Außerhalb von `answers` darf auch die normalisierte Form nicht vorkommen.
    const { answers: _answers, ...withoutAnswers } = call.data;
    expect(JSON.stringify(withoutAnswers)).not.toContain("patient@example.com");

    // confirm_token in DB ist hex-Hash, NICHT base64url-Klartext.
    expect(call.data.confirm_token).toMatch(/^[a-f0-9]{64}$/);
    expect(call.data.confirm_token_expires_at).toBeInstanceOf(Date);
    expect(call.data.confirmed_at).toBeUndefined();

    // Antworten: nur whitelisted questionId; CONTACT_EMAIL wird aus der
    // Bestätigungs-E-Mail gespiegelt, weil KONTAKT im Formular ist.
    expect(call.data.answers).toEqual({
      CONTACT_PHONE: "+49 30 123",
      CONTACT_EMAIL: "patient@example.com",
    });

    // Mail wurde mit Klartext-URL und normalisierter Empfänger-Adresse aufgerufen.
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0][0];
    expect(mailArg.to).toBe("patient@example.com");
    expect(mailArg.confirmationUrl).toMatch(/\/p\/confirm\/[A-Za-z0-9_-]{43}$/);

    // Klartext-Token aus URL entspricht dem in der DB gespeicherten Hash.
    const rawFromUrl = mailArg.confirmationUrl.split("/").pop()!;
    expect(hashConfirmToken(rawFromUrl)).toBe(call.data.confirm_token);
  });

  it("Mailfehler: Session bleibt bestehen, KEIN delete, generischer Erfolgs-Redirect", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    sendMailMock.mockRejectedValueOnce(new Error("smtp blew up"));
    const res = await POST(formReq({ email: "a@b.de" }, SLUG, "6.0.0.1"), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(303);
    expect(pm.patientQuestionnaireSession.create).toHaveBeenCalledTimes(1);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("Rate-Limit IP+Slug: greift nach mehrfachen Submits derselben IP", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const ip = "7.7.7.7";
    // 5 erlaubte Submits, der 6. soll 429 sein.
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        formReq({ email: `u${i}@b.de` }, SLUG, ip),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
    }
    const blocked = await POST(formReq({ email: "u5@b.de" }, SLUG, ip), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(blocked.status).toBe(429);
  });

  describe("CONTACT_EMAIL-Spiegelung", () => {
    it("KONTAKT-Block enthalten + CONTACT_EMAIL leer → wird aus Bestätigungs-E-Mail übernommen", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({ selected_block_ids: ["KONTAKT"] }),
      );
      const res = await POST(
        formReq({ email: "Patient1@Example.COM" }, SLUG, "9.0.0.1"),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      expect(pm.patientQuestionnaireSession.create).toHaveBeenCalledTimes(1);
      const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
      // normalisiert (lowercased) wie validateSubmitterEmail.
      expect(call.data.answers.CONTACT_EMAIL).toBe("patient1@example.com");
    });

    it("KONTAKT-Block enthalten + CONTACT_EMAIL abweichend → wird von Bestätigungs-E-Mail überschrieben", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({ selected_block_ids: ["KONTAKT"] }),
      );
      const res = await POST(
        formReq(
          {
            email: "patient2@example.com",
            CONTACT_EMAIL: "abweichend@example.org",
            CONTACT_PHONE: "+49 30 123",
          },
          SLUG,
          "9.0.0.2",
        ),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(call.data.answers.CONTACT_EMAIL).toBe("patient2@example.com");
      // Andere Antworten unverändert.
      expect(call.data.answers.CONTACT_PHONE).toBe("+49 30 123");
    });

    it("KONTAKT-Block nicht enthalten → CONTACT_EMAIL wird NICHT gesetzt", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({ selected_block_ids: [] }),
      );
      const res = await POST(
        formReq(
          {
            email: "patient3@example.com",
            // Patient versucht CONTACT_EMAIL einzuschmuggeln, obwohl der
            // Block nicht ausgewählt ist — sanitizeAnswers verwirft es,
            // und auch die Spiegelung darf es NICHT nachträglich setzen.
            CONTACT_EMAIL: "abweichend@example.org",
          },
          SLUG,
          "9.0.0.3",
        ),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(call.data.answers.CONTACT_EMAIL).toBeUndefined();
    });
  });

  describe("Sprachwahl (patient_language)", () => {
    it("EN-Formular: Select-Antwort in englisch wird deutsch normalisiert gespeichert", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({
          patient_language: "en",
          selected_block_ids: ["IDENTITAET"],
        }),
      );
      const res = await POST(
        formReq(
          {
            email: "p-en@example.com",
            // Englische Option (laut Katalog) — muss serverseitig auf das
            // deutsche Originallabel zurückgemappt werden.
            IDENTITY_INSURANCE_TYPE: "statutory insurance",
          },
          SLUG,
          "9.0.1.1",
        ),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(call.data.answers.IDENTITY_INSURANCE_TYPE).toBe(
        "gesetzlich versichert",
      );
      // Praxis-/PDF-/Krankenblatt-Output bleibt deutsch — durch Normalisierung
      // ist der Speicher-Wert garantiert deutsch.
      expect(call.data.patient_language).toBe("en");
    });

    it("DE-Formular: deutsche Select-Antwort bleibt unverändert", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({
          patient_language: "de",
          selected_block_ids: ["IDENTITAET"],
        }),
      );
      const res = await POST(
        formReq(
          {
            email: "p-de@example.com",
            IDENTITY_INSURANCE_TYPE: "privat versichert",
          },
          SLUG,
          "9.0.1.2",
        ),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      const call = pm.patientQuestionnaireSession.create.mock.calls[0][0];
      expect(call.data.answers.IDENTITY_INSURANCE_TYPE).toBe(
        "privat versichert",
      );
      expect(call.data.patient_language).toBe("de");
    });
  });

  describe("strukturierte Logs ([website-form/submit])", () => {
    function logCalls(): Array<Record<string, unknown>> {
      const all = [
        ...consoleInfoSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
      ];
      return all
        .filter((c) => c[0] === "[website-form/submit]")
        .map((c) => c[1] as Record<string, unknown>);
    }

    it("success-Log enthält sessionId und practiceFormId, KEINE PII (E-Mail, Hash, Token)", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
      pm.patientQuestionnaireSession.create.mockResolvedValueOnce({
        id: "sess-xyz",
      });
      const res = await POST(
        formReq({ email: "patient@example.com" }, SLUG, "8.0.0.1"),
        { params: Promise.resolve({ slug: SLUG }) },
      );
      expect(res.status).toBe(303);
      const success = logCalls().find((p) => p.outcome === "success");
      expect(success).toMatchObject({
        event: "submit",
        outcome: "success",
        sessionId: "sess-xyz",
        practiceFormId: "form-1",
        slug: SLUG,
      });
      const s = JSON.stringify(success);
      expect(s).not.toContain("patient@example.com");
      expect(s).not.toContain(hashSubmitterEmail("patient@example.com"));
    });

    it.each([
      ["honeypot", { email: "a@b.de", company_website: "x" }, "8.0.1.1"],
      ["invalid_email", { email: "no-at" }, "8.0.2.1"],
    ])("Outcome %s wird geloggt", async (outcome, fields, ip) => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
      await POST(formReq(fields, SLUG, ip), {
        params: Promise.resolve({ slug: SLUG }),
      });
      const found = logCalls().find((p) => p.outcome === outcome);
      expect(found).toBeDefined();
      expect(found?.event).toBe("submit");
    });

    it("not_found wird geloggt, ohne sessionId", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(null);
      await POST(formReq({ email: "a@b.de" }, SLUG, "8.0.3.1"), {
        params: Promise.resolve({ slug: SLUG }),
      });
      const found = logCalls().find((p) => p.outcome === "not_found");
      expect(found).toMatchObject({ event: "submit", slug: SLUG });
      expect(found?.sessionId).toBeUndefined();
    });

    it("mail_failed wird mit error-Level und sessionId geloggt", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
      pm.patientQuestionnaireSession.create.mockResolvedValueOnce({
        id: "sess-mail-failed",
      });
      sendMailMock.mockRejectedValueOnce(new Error("smtp blew up"));
      await POST(formReq({ email: "a@b.de" }, SLUG, "8.0.4.1"), {
        params: Promise.resolve({ slug: SLUG }),
      });
      const errCall = consoleErrorSpy.mock.calls.find(
        (c) =>
          c[0] === "[website-form/submit]" &&
          (c[1] as Record<string, unknown>)?.outcome === "mail_failed",
      );
      expect(errCall).toBeDefined();
      expect(errCall?.[1]).toMatchObject({
        event: "submit",
        outcome: "mail_failed",
        sessionId: "sess-mail-failed",
        practiceFormId: "form-1",
      });
    });
  });
});
