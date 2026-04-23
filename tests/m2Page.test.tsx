import { renderToStaticMarkup } from "react-dom/server";
import M2Page from "@/app/cases/[id]/m2/page";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
    },
    prefillRun: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
  };
  prefillRun: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

/** K01 – Kommunikation (O, 3 MFA-Fragen) */
const k01Checkpoint: ActiveCheckpoint = {
  id: "K01",
  block_id: "kommunikation",
  type: CheckpointType.PRESENCE_CHECK,
  relevance: CheckpointRelevance.P,
  title: "Erreichbarkeit des Patienten",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

/** K04 – Medikation (M, 1 MFA-Frage) */
const k04Checkpoint: ActiveCheckpoint = {
  id: "K04",
  block_id: "medizinische_lage",
  type: CheckpointType.VERIFIKATION,
  relevance: CheckpointRelevance.P,
  title: "Medikation",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

/** K12 – Mobilität (nur Patienten-/Gesprächsfragen, keine MFA-Fragen) */
const k12Checkpoint: ActiveCheckpoint = {
  id: "K12",
  block_id: "pflegebeobachtung",
  type: CheckpointType.BEDARF,
  relevance: CheckpointRelevance.P,
  title: "Mobilität",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "NOTICE", text: "M4" },
};

describe("M2 Seite", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.prefillRun.findFirst.mockReset();
    prismaMock.prefillRun.findFirst.mockResolvedValue(null);
    prismaMock.prefillRun.findMany.mockReset();
    prismaMock.prefillRun.findMany.mockResolvedValue([]);
  });

  it("rendert pro aktivem Checkpoint die M2-Fragen aus dem Katalog", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint, k04Checkpoint],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // beide Checkpoints werden gerendert
    expect((markup.match(/data-m2-checkpoint=/g) ?? []).length).toBe(2);

    // K01: erste MFA-Frage
    expect(markup).toContain(
      "Ist der Patient für uns grundsätzlich erreichbar?",
    );
    // K04: erste MFA-Frage
    expect(markup).toContain(
      "Ist die Begründung der Medikation durch Diagnosen nachvollziehbar dokumentiert?",
    );
  });

  it("rendert pro Frage Ja-, Nein- und Unklar-Buttons", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // K01 hat 3 MFA-Fragen (MFA-K01-01–MFA-K01-03), jede mit 3 Buttons → 9 Buttons
    expect(
      (markup.match(/data-m2-answer="K01:MFA-K01-0[1-3]:(ja|nein|unklar)"/g) ?? []).length,
    ).toBe(9);
  });

  it("zeigt Hinweis wenn keine Checkpoints aktiv sind", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    expect(markup).toContain("Keine aktiven Checkpoints vorhanden.");
  });

  it("zeigt pflegebeobachtung-Checkpoint im MFA-Modus nicht an (keine MFA-Fragen)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k12Checkpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-pflege-mfa" }) }),
    );

    expect(markup).not.toContain('data-m2-checkpoint="K12"');
    expect(markup).toContain("data-m2-mfa-form");
  });

  it("zeigt pflegebeobachtung-Checkpoint im Gesprächsmodus mit Patientenkatalog", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k12Checkpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-pflege-conversation" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K12"');
    expect(markup).toContain(
      "Können Sie sich in Ihrer Wohnung bzw. Ihrem Alltag sicher fortbewegen?",
    );
  });

  it("vorgespeicherte Antworten werden per data-Attribut auf Buttons reflektiert", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k04Checkpoint],
      ctx_prefill: { K04: { "MFA-K04-01": "ja" } },
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // Der gespeicherte Prefill-Wert "ja" für MFA-K04-01 wird per data-Attribut auf den Buttons reflektiert
    expect(markup).toContain('data-m2-answer="K04:MFA-K04-01:ja"');
    expect(markup).toContain('data-m2-answer="K04:MFA-K04-01:nein"');
  });

  it("enthält den Skip-Button für Patientenfragebogen überspringen", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-42" }) }),
    );

    expect(markup).toContain("data-m2-skip");
    expect(markup).toContain("Vorbereitung überspringen und ärztlich fortfahren");
  });

  it("zeigt Patientengespräch-Button und alternative Wege oberhalb des MFA-Formulars", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-77" }) }),
    );

    // Patientengespräch ist erreichbar
    expect(markup).toContain("data-m2-patient-conversation-button");
    expect(markup).toContain(">Patientengespräch<");

    // Reihenfolge: Skip → M2-Link → Patientengespräch → MFA-Formular → schwarzer Save-Button
    const idxConversation = markup.indexOf("data-m2-patient-conversation");
    const idxLink = markup.indexOf("data-m2-link-generator");
    const idxSkip = markup.indexOf("data-m2-skip");
    const idxMfaForm = markup.indexOf("data-m2-mfa-form");
    const idxSave = markup.indexOf("data-m2-save");

    expect(idxSkip).toBeGreaterThan(-1);
    expect(idxLink).toBeGreaterThan(idxSkip);
    expect(idxConversation).toBeGreaterThan(idxLink);
    expect(idxMfaForm).toBeGreaterThan(idxConversation);
    expect(idxSave).toBeGreaterThan(idxMfaForm);
  });

  // ------------------------------------------------------------------
  // Per-Source-Filter: Checkpoints werden pro Quelle gefiltert
  // ------------------------------------------------------------------

  it("blendet im MFA-Modus Checkpoints aus, die bereits in einem eingefrorenen MFA-Run beantwortet wurden", async () => {
    // Session hat K01 (bereits MFA-beantwortet) und K04 (neu).
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint, k04Checkpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });
    // Kein offener Run – erster Ergänzungslauf nach bereits eingefrorenem Run.
    prismaMock.prefillRun.findFirst.mockResolvedValue(null);
    // Eingefrorener MFA-Run hat K01 bereits beantwortet.
    prismaMock.prefillRun.findMany.mockResolvedValue([
      {
        id: "run-first",
        sequence: 1,
        source: "mfa",
        frozen_at: new Date(),
        active_checkpoints: [k01Checkpoint],
        answers: { K01: { "MFA-K01-01": "ja" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-perSrc" }) }),
    );

    // K04 (noch nicht MFA-beantwortet) soll erscheinen.
    expect(markup).toContain('data-m2-checkpoint="K04"');
    // K01 (bereits im eingefrorenen MFA-Run) darf nicht erscheinen.
    expect(markup).not.toContain('data-m2-checkpoint="K01"');
  });
});
