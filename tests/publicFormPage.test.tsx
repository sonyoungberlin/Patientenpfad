/**
 * Phase 3c: Tests für app/p/[slug]/page.tsx (öffentliche Formularseite).
 *
 * Kernzusicherungen:
 *   - notFound() für ungültige Slugs (kein DB-Roundtrip)
 *   - notFound() für unbekannte Slugs
 *   - notFound() für inaktive Formulare
 *   - notFound() bei fehlenden Account-Flags (is_approved,
 *     patient_communication_enabled, website_forms_enabled)
 *   - Happy Path: Titel, Intro, E-Mail-Pflichtfeld, Fragen, deaktivierter
 *     Submit-Button mit Hinweis
 *   - Kein Submit-Endpoint: kein <form action="..."> im Markup, kein
 *     submit-Button
 *   - Markup gibt keine internen Owner- oder Form-IDs preis
 */

import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  },
  notFound: () => notFoundMock(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import PublicFormPage from "@/app/p/[slug]/page";

type PrismaMock = {
  practiceQuestionnaireForm: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const ENABLED_OWNER = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeForm(overrides: Partial<{
  title: string;
  intro_text: string | null;
  is_active: boolean;
  selected_block_ids: string[];
  owner_account: typeof ENABLED_OWNER | null;
  owner_practice: (typeof ENABLED_OWNER & { message_signature?: string | null }) | null;
  patient_language: string;
}> = {}) {
  return {
    title: "Aufnahmeformular",
    intro_text: "Bitte füllen Sie das Formular aus.",
    is_active: true,
    selected_block_ids: ["KONTAKT", "REZEPT"],
    patient_language: "de",
    owner_account: ENABLED_OWNER,
    owner_practice: null as
      | (typeof ENABLED_OWNER & { message_signature?: string | null })
      | null,
    ...overrides,
  };
}

async function runPage(slug = "praxis-formular"): Promise<{
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await PublicFormPage({ params: Promise.resolve({ slug }) });
    return { notFound: false, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__") {
      return { notFound: true, markup: null };
    }
    throw err;
  }
}

beforeEach(() => {
  notFoundMock.mockClear();
  pm.practiceQuestionnaireForm.findUnique.mockReset();
});

describe("/p/[slug] public form page", () => {
  it("notFound() bei ungültigem Slug-Format ohne DB-Zugriff", async () => {
    const r = await runPage("BAD_SLUG_with_underscores");
    expect(r.notFound).toBe(true);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
  });

  it("notFound() bei reserviertem Slug ohne DB-Zugriff", async () => {
    const r = await runPage("admin");
    expect(r.notFound).toBe(true);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
  });

  it("notFound() bei zu kurzem Slug ohne DB-Zugriff", async () => {
    const r = await runPage("ab");
    expect(r.notFound).toBe(true);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
  });

  it("notFound() bei unbekanntem Slug", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(null);
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("notFound() für inaktive Formulare", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ is_active: false }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("notFound() wenn Owner nicht freigegeben (is_approved=false)", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ owner_account: { ...ENABLED_OWNER, is_approved: false } }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("notFound() wenn Owner ohne patient_communication_enabled", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: { ...ENABLED_OWNER, patient_communication_enabled: false },
      }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("notFound() wenn Owner ohne website_forms_enabled", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: { ...ENABLED_OWNER, website_forms_enabled: false },
      }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(true);
  });

  it("rendert Titel, Intro, E-Mail-Feld, Fragen und deaktivierten Submit", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const r = await runPage();

    expect(r.notFound).toBe(false);
    expect(r.markup).not.toBeNull();
    const m = r.markup!;

    // Titel als <h1>
    expect(m).toContain("<h1>Aufnahmeformular</h1>");

    // Intro
    expect(m).toContain("Bitte füllen Sie das Formular aus.");

    // E-Mail-Pflichtfeld
    expect(m).toMatch(/<input[^>]*type="email"[^>]*required/);
    expect(m).toContain('id="public-form-email"');

    // Mindestens eine Frage gerendert (KONTAKT-Block enthält CONTACT_PHONE)
    expect(m).toContain('data-q-question="CONTACT_PHONE"');

    // Submit-Button (form aktiv in 3d)
    expect(m).toMatch(/<button[^>]*type="submit"/);
    expect(m).toContain("data-q-submit");
    expect(m).toContain('aria-describedby="public-form-confirm-notice"');

    // Hinweistext zur E-Mail-Bestätigung sichtbar
    expect(m).toContain("Bestätigungs-E-Mail");
    expect(m).toContain("48 Stunden");

    // Patienten-Einleitungstext oberhalb des Formulars
    expect(m).toContain("data-patient-intro");
    expect(m).toContain(
      "Bitte füllen Sie die folgenden Angaben vollständig aus. Vielen Dank für Ihre Unterstützung.",
    );
  });

  it("rendert die Praxis-Signatur unverändert oberhalb des Formulars, wenn vorhanden", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_practice: {
          ...ENABLED_OWNER,
          message_signature:
            "Mit freundlichen Grüßen\nDr. Muster\nPraxis am Park",
        },
      }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(false);
    const m = r.markup!;
    expect(m).toContain("data-practice-signature");
    expect(m).toContain("Mit freundlichen Grüßen");
    expect(m).toContain("Dr. Muster");
    expect(m).toContain("Praxis am Park");
    // Signatur muss mit pre-wrap gerendert werden, damit Zeilenumbrüche erhalten bleiben
    expect(m).toContain("white-space:pre-wrap");
  });

  it("rendert keinen Signaturblock, wenn Practice keine message_signature hat", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_practice: { ...ENABLED_OWNER, message_signature: null },
        intro_text: null,
      }),
    );
    const r = await runPage();
    expect(r.notFound).toBe(false);
    const m = r.markup!;
    // Intro-Text trotzdem da
    expect(m).toContain("data-patient-intro");
    // Aber kein Signaturblock
    expect(m).not.toContain("data-practice-signature");
  });

  it("postet an /api/p/[slug]/submit und enthält Honeypot-Feld", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    const r = await runPage("praxis-formular");
    const m = r.markup!;
    expect(m).toMatch(/<form\b[^>]*\bmethod="POST"/);
    expect(m).toContain('action="/api/p/praxis-formular/submit"');
    // Honeypot-Feld vorhanden, aber off-screen versteckt
    expect(m).toContain('name="company_website"');
    expect(m).toContain('aria-hidden="true"');
    expect(m).toContain("left:-9999px");
  });

  it("Query filtert über owner_account-Select; selektiert keine sensiblen Felder", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());
    await runPage("praxis-formular");

    expect(pm.practiceQuestionnaireForm.findUnique).toHaveBeenCalledTimes(1);
    const call = pm.practiceQuestionnaireForm.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ slug: "praxis-formular" });
    expect(call.select.owner_account.select).toEqual({
      is_approved: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
    });
    expect(call.select.owner_practice.select).toEqual({
      is_approved: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      message_signature: true,
    });
    // Keine E-Mail / kein owner_account_id im Select
    expect(call.select.owner_account.select).not.toHaveProperty("email");
    expect(call.select).not.toHaveProperty("owner_account_id");
    expect(call.select).not.toHaveProperty("id");
  });

  it("rendert Fallback-Meldung bei leeren selected_block_ids", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ selected_block_ids: [] }),
    );
    const r = await runPage();
    expect(r.markup).toContain("data-q-empty");
    expect(r.markup).toContain("keine Fragen");
  });

  it("rendert kein Intro-Element wenn intro_text null ist", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ intro_text: null }),
    );
    const r = await runPage();
    // Hinweis bleibt, aber kein zusätzlicher whiteSpace pre-wrap-Absatz
    expect(r.markup).not.toContain("white-space:pre-wrap");
  });

  describe("Sprachwahl (patient_language)", () => {
    it("DE-Formular: deutsche UI-Texte (Default)", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({ selected_block_ids: ["KONTAKT"], patient_language: "de" }),
      );
      const r = await runPage();
      expect(r.notFound).toBe(false);
      const m = r.markup!;
      expect(m).toContain('lang="de"');
      expect(m).toContain("Bestätigungs-E-Mail");
      expect(m).toContain("Absenden");
      expect(m).toContain("E-Mail-Adresse");
      // Patient-Intro deutsch
      expect(m).toContain(
        "Bitte füllen Sie die folgenden Angaben vollständig aus.",
      );
    });

    it("EN-Formular: englische UI-Texte und englische Fragetexte", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        // VERSICHERUNG ist EN-ready und enthält IDENTITY_INSURANCE_TYPE
        // (select mit EN-Optionen).
        makeForm({
          selected_block_ids: ["VERSICHERUNG"],
          patient_language: "en",
        }),
      );
      const r = await runPage();
      expect(r.notFound).toBe(false);
      const m = r.markup!;
      expect(m).toContain('lang="en"');
      // UI-Strings auf Englisch
      expect(m).toContain("confirmation email");
      expect(m).toContain("Submit");
      expect(m).toContain("Email address");
      expect(m).toContain("— please choose —");
      // Patient-Intro englisch
      expect(m).toContain(
        "Please fill in the following information completely.",
      );
      // Frage selbst wird über localizeQuestion englisch gerendert
      expect(m).toContain("Type of insurance");
      // Englische Optionen
      expect(m).toContain("statutory insurance");
      expect(m).toContain("private insurance");
      // Keine deutschen Originale zu select-Optionen
      expect(m).not.toContain("gesetzlich versichert");
    });

    it("EN-Formular ohne Fragen: englische Empty-Meldung", async () => {
      pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
        makeForm({ selected_block_ids: [], patient_language: "en" }),
      );
      const r = await runPage();
      expect(r.markup).toContain("data-q-empty");
      expect(r.markup).toContain("This form currently contains no questions.");
    });
  });
});
