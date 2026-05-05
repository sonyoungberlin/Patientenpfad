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

  it("rendert englische multi_select-Optionen bei patient_language='en'", async () => {
    const html = await render("en", ["AU_SYMPTOMS"]);
    expect(html).toContain("Cough");
    expect(html).toContain("Fever");
    // Deutsche Originalbezeichnungen erscheinen nicht in der Patientensicht.
    expect(html).not.toContain(">Husten<");
    expect(html).not.toContain(">Fieber<");
  });

  it("fällt für Fragen ohne _en-Übersetzung auf Deutsch zurück", async () => {
    // ANAMNESE_GP existiert ohne text_en → muss DE bleiben.
    const html = await render("en", ["ANAMNESE_GP"]);
    expect(html).toContain("Haben Sie einen Hausarzt");
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
});
