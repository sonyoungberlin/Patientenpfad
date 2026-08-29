/**
 * Tests für die öffentliche /q/[token]-Seite – Du/Sie-Ansprache (Bewerbungsanamnese)
 *
 * Prüft:
 * - context="office" + salutation="du" → Du-Titel + Du-Text sichtbar
 * - context="office" + salutation="sie" → Sie-Titel + Sie-Text sichtbar
 * - context="office" + salutation=null → generischer Office-Introtext
 * - context="patient" → Patienten-Intro (unverändert)
 * - Du-Seite enthält NICHT den Sie-Titel und umgekehrt
 * - Session-select fragt salutation-Feld ab
 */

import { renderToStaticMarkup } from "react-dom/server";
import QuestionnairePage from "@/app/q/[token]/page";
import {
  BEWERBER_INTRO_DU,
  BEWERBER_INTRO_SIE,
  OFFICE_QUESTIONNAIRE_INTRO_TEXT,
} from "@/lib/questionnaire/officeIntro";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  patientQuestionnaireSession: { findUnique: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

function futureDate(): Date {
  return new Date(Date.now() + 48 * 60 * 60 * 1000);
}

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    token_expires_at: futureDate(),
    status: "pending",
    deduplicated_questions: [],
    frozen_conditional_rules: null,
    frozen_blocks: null,
    patient_language: "de",
    deleted_at: null,
    owner_practice: null,
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.patientQuestionnaireSession.findUnique.mockReset();
});

// ---------------------------------------------------------------------------
// Du-Ansprache
// ---------------------------------------------------------------------------

describe("/q/[token] – context=office, salutation=du", () => {
  it("zeigt Du-Titel in der Seite", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "du" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).toContain(BEWERBER_INTRO_DU.title);
  });

  it("zeigt Du-Text in der Seite", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "du" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).toContain("dich erfahren");
    expect(markup).toContain("dich kennenzulernen");
  });

  it("enthält NICHT den Sie-Titel", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "du" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).not.toContain(BEWERBER_INTRO_SIE.title);
  });
});

// ---------------------------------------------------------------------------
// Sie-Ansprache
// ---------------------------------------------------------------------------

describe("/q/[token] – context=office, salutation=sie", () => {
  it("zeigt Sie-Titel in der Seite", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "sie" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).toContain(BEWERBER_INTRO_SIE.title);
  });

  it("zeigt Sie-Text in der Seite", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "sie" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).toContain("über Sie erfahren");
    expect(markup).toContain("Sie kennenzulernen");
  });

  it("enthält NICHT den Du-Titel", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "sie" }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).not.toContain(BEWERBER_INTRO_DU.title);
  });
});

// ---------------------------------------------------------------------------
// Office ohne salutation → generischer Text
// ---------------------------------------------------------------------------

describe("/q/[token] – context=office, salutation=null", () => {
  it("zeigt generischen Office-Introtext", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: null }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).toContain(OFFICE_QUESTIONNAIRE_INTRO_TEXT);
  });

  it("enthält NICHT den Bewerbungsanamnese-Titel", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: null }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).not.toContain("Bewerbungsanamnese");
  });
});

// ---------------------------------------------------------------------------
// Patienten-Session unverändert
// ---------------------------------------------------------------------------

describe("/q/[token] – context=patient (unverändert)", () => {
  it("zeigt Patienten-Intro, nicht Bewerbungsanamnese-Titel", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "patient", salutation: null }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).not.toContain("Bewerbungsanamnese");
    expect(markup).toContain("data-patient-intro");
  });

  it("zeigt Patienten-Intro auch wenn context fehlt (legacy)", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: undefined, salutation: null }),
    );
    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) }),
    );
    expect(markup).not.toContain("Bewerbungsanamnese");
  });
});

// ---------------------------------------------------------------------------
// DB-Select enthält salutation
// ---------------------------------------------------------------------------

describe("/q/[token] – DB-Select", () => {
  it("fragt salutation-Feld ab", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(
      baseSession({ context: "office", salutation: "sie" }),
    );
    await QuestionnairePage({ params: Promise.resolve({ token: "tok" }) });

    const call =
      prismaMock.patientQuestionnaireSession.findUnique.mock.calls[0][0];
    expect(call.select.salutation).toBe(true);
  });
});
