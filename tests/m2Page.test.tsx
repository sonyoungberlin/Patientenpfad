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

describe("M2 Seite", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.prefillRun.findFirst.mockReset();
    prismaMock.prefillRun.findFirst.mockResolvedValue(null);
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
  // Fehler-1-Fix: Ergänzungs-Flow zeigt nur Delta-Checkpoints
  // ------------------------------------------------------------------

  it("zeigt im Ergänzungslauf nur die Delta-Checkpoints aus dem offenen Run", async () => {
    // Session hat zwei Checkpoints (K01 = bereits vorbereitet, K04 = neu ergänzt).
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint, k04Checkpoint],
      ctx_prefill: { K01: { "MFA-K01-01": "ja" } },
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });
    // Offener Run enthält nur das Delta (K04).
    prismaMock.prefillRun.findFirst.mockResolvedValue({
      id: "run-ergaenzung",
      sequence: 2,
      source: "mfa",
      frozen_at: null,
      active_checkpoints: [k04Checkpoint],
      answers: {},
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-ergl" }) }),
    );

    // Nur K04 (Delta) soll als aktive Eingabe erscheinen.
    expect(markup).toContain('data-m2-checkpoint="K04"');
    // K01 (bereits vorbereitet) darf nicht erneut erscheinen.
    expect(markup).not.toContain('data-m2-checkpoint="K01"');
  });
});
