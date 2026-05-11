/**
 * Tests für app/q/[token]/page.tsx Mehrsprachigkeit.
 *
 * Kernzusicherungen:
 *  - patient_language="en" rendert englische Patientenformulierungen, sofern
 *    eine _en-Übersetzung im Katalog vorhanden ist.
 *  - Fehlende _en-Übersetzungen fallen transparent auf Deutsch zurück.
 *  - patient_language="de" (Default) zeigt weiterhin nur deutsche Texte.
 *
 * Praxis-Output bleibt deutsch — das wird in den jeweiligen Praxis-/PDF-/
 * Krankenblatt-Tests separat geprüft (diese Schichten verwenden den i18n-
 * Helper bewusst nicht).
 */

import { renderToStaticMarkup } from "react-dom/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
    },
  },
}));

// IdentityGate rendert children unbedingt, damit Fragen im Markup auftauchen.
jest.mock("@/components/IdentityGate", () => ({
  // Wir rendern die echten EN-Strings hier nicht; die Lokalisierung
  // des Gates ist separat in `tests/identityGateI18n.test.tsx` abgedeckt.
  IdentityGate: ({ children }: { children: React.ReactNode }) => children,
}));

import { prisma } from "@/lib/prisma";
import QuestionnairePage from "@/app/q/[token]/page";
import { QUESTION_CATALOG } from "@/lib/questionnaire/blockCatalog";

type PrismaMock = {
  patientQuestionnaireSession: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const FUTURE = new Date(Date.now() + 60 * 60 * 1000);

async function render(language: "de" | "en", questionIds: string[]) {
  const questions = questionIds.map((id) => QUESTION_CATALOG[id]);
  pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
    token_expires_at: FUTURE,
    status: "pending",
    deduplicated_questions: questions,
    patient_language: language,
    owner_practice: { message_signature: null },
  });
  const ui = await QuestionnairePage({
    params: Promise.resolve({ token: "tok-1" }),
  });
  return renderToStaticMarkup(ui as React.ReactElement);
}

describe("/q/[token] Mehrsprachigkeit", () => {
  beforeEach(() => {
    pm.patientQuestionnaireSession.findUnique.mockReset();
  });

  it("rendert englische Patientenformulierungen bei patient_language='en'", async () => {
    const html = await render("en", ["CONTACT_PHONE", "CONTACT_EMAIL"]);
    expect(html).toContain("What is your phone number");
    expect(html).toContain("What is your email address");
    expect(html).not.toContain("Wie lautet Ihre Telefonnummer");
  });

  it("rendert das korrigierte Versicherungsfeld in DE und EN mit Hilfetext", async () => {
    const deHtml = await render("de", ["INSURANCE_CARD_IDENTIFIER"]);
    expect(deHtml).toContain("Krankenkassen-Kennung / IK-Nummer");
    expect(deHtml).toContain(
      "Meist 9-stellig, beginnt häufig mit 10. Nicht die Kartenkennung der Gesundheitskarte.",
    );

    const enHtml = await render("en", ["INSURANCE_CARD_IDENTIFIER"]);
    expect(enHtml).toContain(
      "Health insurance fund identifier / provider institution number (IK number)",
    );
    expect(enHtml).toContain(
      "Usually 9 digits and often starts with 10. Not the identifier of the health insurance card.",
    );
    expect(enHtml).not.toContain("Kartenkennung / Kennung der Gesundheitskarte");
  });

  it("rendert englische multi_select-Optionen bei patient_language='en'", async () => {
    const html = await render("en", ["AU_SYMPTOMS"]);
    expect(html).toContain("Cough");
    expect(html).toContain("Fever");
    // Deutsche Originalbezeichnungen erscheinen nicht in der Patientensicht.
    expect(html).not.toContain(">Husten<");
    expect(html).not.toContain(">Fieber<");
  });

  it("fällt für Fragen ohne _en-Übersetzung auf Deutsch zurück", async () => {
    // AU_START_DATE existiert ohne text_en → muss DE bleiben.
    const html = await render("en", ["AU_START_DATE"]);
    expect(html).toContain("Seit wann bestehen die Beschwerden");
  });

  it("zeigt bei patient_language='de' deutsche Texte (Default-Verhalten)", async () => {
    const html = await render("de", ["CONTACT_PHONE"]);
    expect(html).toContain("Wie lautet Ihre Telefonnummer");
    expect(html).not.toContain("What is your phone number");
  });

  it("Yes/No-Buttons sind sprachlokalisiert, der gespeicherte Wert bleibt deutsch", async () => {
    const html = await render("en", ["CONTACT_DOCTOLIB"]);
    // sichtbare Buttonbeschriftung
    expect(html).toContain(">Yes<");
    expect(html).toContain(">No<");
    // Stored value im data-attribut bleibt sprachneutral DE-codiert
    expect(html).toContain('data-q-yesno="CONTACT_DOCTOLIB:ja"');
    expect(html).toContain('data-q-yesno="CONTACT_DOCTOLIB:nein"');
  });

  it("rendert IDENTITAET-Block (inkl. Optionen) komplett englisch", async () => {
    const html = await render("en", [
      "IDENTITY_FIRST_NAME",
      "IDENTITY_LAST_NAME",
      "IDENTITY_BIRTHDATE",
      "IDENTITY_INSURANCE_TYPE",
    ]);
    // Fragen
    expect(html).toContain("First name");
    expect(html).toContain("Last name");
    expect(html).toContain("Date of birth");
    expect(html).toContain("Type of insurance");
    // Optionen für IDENTITY_INSURANCE_TYPE
    expect(html).toContain("statutory insurance");
    expect(html).toContain("private insurance");
    // Keine deutschen Originaltexte für diesen Block
    expect(html).not.toContain("Vorname");
    expect(html).not.toContain("Nachname");
    expect(html).not.toContain("Geburtsdatum");
    expect(html).not.toContain("Versicherungsart");
    expect(html).not.toContain("gesetzlich versichert");
    expect(html).not.toContain("privat versichert");
  });

  it("UI-Texte außerhalb des Katalogs sind in EN lokalisiert (Intro, Submit, Placeholder, Title)", async () => {
    const html = await render("en", ["IDENTITY_INSURANCE_TYPE"]);
    // Intro
    expect(html).toContain("Please fill in the following information completely");
    expect(html).not.toContain(
      "Bitte füllen Sie die folgenden Angaben vollständig aus",
    );
    // Page title
    expect(html).toContain("<h1>Questionnaire</h1>");
    expect(html).not.toContain("<h1>Fragebogen</h1>");
    // Submit button
    expect(html).toContain(">Submit<");
    expect(html).not.toContain(">Absenden<");
    // Select placeholder
    expect(html).toContain("— please choose —");
    expect(html).not.toContain("— bitte wählen —");
  });

  it("rendert die vier Basisblöcke (IDENTITAET+KONTAKT+ADRESSE+KURZANAMNESE) komplett englisch ohne deutsche Fragmente", async () => {
    // Alle Fragen-IDs der vier Basisblöcke (DE-Original) bei language='en'.
    const html = await render("en", [
      // IDENTITAET
      "IDENTITY_FIRST_NAME",
      "IDENTITY_LAST_NAME",
      "IDENTITY_BIRTHDATE",
      "IDENTITY_INSURANCE_TYPE",
      // KONTAKT
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "CONTACT_DOCTOLIB",
      // ADRESSE
      "ADDRESS_POSTAL",
      // KURZANAMNESE
      "ANAMNESE_GP",
      "ANAMNESE_HEIGHT",
      "ANAMNESE_WEIGHT",
      "ANAMNESE_CHRONIC",
      "ANAMNESE_HEREDITARY",
      "ANAMNESE_ALLERGIES",
      "ANAMNESE_MEDICATIONS",
      "ANAMNESE_SMOKING",
      "ANAMNESE_ALCOHOL",
      "ANAMNESE_SUBSTANCES",
      "ANAMNESE_VACCINATION",
      "ANAMNESE_OCCUPATION",
    ]);

    // Stichproben für jede Block-Übersetzung
    expect(html).toContain("First name");
    expect(html).toContain("What is your phone number");
    expect(html).toContain("What is your postal address");
    expect(html).toContain("Required for billing and documents.");
    expect(html).toContain("Do you have a general practitioner");
    expect(html).toContain("How tall are you");
    expect(html).toContain("Do you suffer from any chronic illnesses");
    expect(html).toContain("Is your vaccination status known");
    expect(html).toContain("What is your occupation");

    // Garantie: keinerlei deutsche Originalfragetexte/-helper aus den
    // vier Basisblöcken erscheinen. Bewusst lange/eindeutige Substrings,
    // damit die Assertion nicht mit anderen Tokens kollidiert.
    const forbiddenDe = [
      "Vorname",
      "Nachname",
      "Geburtsdatum",
      "Versicherungsart",
      "gesetzlich versichert",
      "privat versichert",
      "Wie lautet Ihre Telefonnummer",
      "Wie lautet Ihre E-Mail-Adresse",
      "Haben Sie einen Doctolib-Account",
      "Wie lautet Ihre Postanschrift",
      "Wird für Abrechnung und Dokumente benötigt.",
      "Haben Sie einen Hausarzt",
      "Wie groß sind Sie",
      "Wie viel wiegen Sie",
      "Leiden Sie an chronischen Erkrankungen",
      "Gibt es bekannte Erbkrankheiten",
      "Haben Sie Allergien oder Unverträglichkeiten",
      "Nehmen Sie regelmäßig Medikamente",
      "Rauchen Sie",
      "Trinken Sie Alkohol",
      "Nehmen Sie sonstige Substanzen",
      "Ist Ihr Impfstatus bekannt",
      "Was ist Ihr Beruf",
    ];
    for (const de of forbiddenDe) {
      expect(html).not.toContain(de);
    }
  });

  it("zeigt englische Expired-Meldung, wenn Session abgelaufen + patient_language='en'", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: new Date(Date.now() - 60 * 1000),
      status: "pending",
      deduplicated_questions: [],
      patient_language: "en",
      owner_practice: null,
    });
    const ui = await QuestionnairePage({
      params: Promise.resolve({ token: "tok-x" }),
    });
    const html = renderToStaticMarkup(ui as React.ReactElement);
    expect(html).toContain("This link is no longer valid");
    expect(html).not.toContain("Dieser Link ist nicht mehr gültig");
  });

  it("zeigt englische Completed-Meldung, wenn bereits ausgefüllt + patient_language='en'", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: FUTURE,
      status: "completed",
      deduplicated_questions: [],
      patient_language: "en",
      owner_practice: null,
    });
    const ui = await QuestionnairePage({
      params: Promise.resolve({ token: "tok-y" }),
    });
    const html = renderToStaticMarkup(ui as React.ReactElement);
    expect(html).toContain("This questionnaire has already been completed");
    expect(html).not.toContain("Dieser Fragebogen wurde bereits ausgefüllt");
  });
});
