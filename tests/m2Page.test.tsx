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
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

/** K01 – Kommunikation (O, 2 MFA-Fragen) */
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

describe("M2 Seite", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
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
      "Ist der Patient für uns zuverlässig erreichbar?",
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

    // K01 hat 2 MFA-Fragen (MFA-K01-01–MFA-K01-02), jede mit 3 Buttons → 6 Buttons
    expect(
      (markup.match(/data-m2-answer="K01:MFA-K01-0[1-2]:(ja|nein|unklar)"/g) ?? []).length,
    ).toBe(6);
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
    expect(markup).toContain("Patientenfragebogen überspringen und ärztlich fortfahren");
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

    // Reihenfolge: Patientengespräch → M2-Link → Skip → MFA-Formular → schwarzer Save-Button
    const idxConversation = markup.indexOf("data-m2-patient-conversation");
    const idxLink = markup.indexOf("data-m2-link-generator");
    const idxSkip = markup.indexOf("data-m2-skip");
    const idxMfaForm = markup.indexOf("data-m2-mfa-form");
    const idxSave = markup.indexOf("data-m2-save");

    expect(idxConversation).toBeGreaterThan(-1);
    expect(idxLink).toBeGreaterThan(idxConversation);
    expect(idxSkip).toBeGreaterThan(idxLink);
    expect(idxMfaForm).toBeGreaterThan(idxSkip);
    expect(idxSave).toBeGreaterThan(idxMfaForm);
  });
});
