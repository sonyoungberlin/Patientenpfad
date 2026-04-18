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

/** K01 – Kommunikation (O, 4 M2-Fragen) */
const k01Checkpoint: ActiveCheckpoint = {
  id: "K01",
  block_id: "kommunikation",
  type: CheckpointType.PRESENCE_CHECK,
  relevance: CheckpointRelevance.P,
  title: "Erreichbarkeit Patient sichergestellt",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

/** K04 – Medikation (M, 5 M2-Fragen) */
const k04Checkpoint: ActiveCheckpoint = {
  id: "K04",
  block_id: "medizinische_lage",
  type: CheckpointType.VERIFIKATION,
  relevance: CheckpointRelevance.P,
  title: "Medikation geprüft",
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
      active_checkpoints: [k01Checkpoint, k04Checkpoint],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // beide Checkpoints werden gerendert
    expect((markup.match(/data-m2-checkpoint=/g) ?? []).length).toBe(2);

    // K01: erste M2-Frage
    expect(markup).toContain(
      "Ist der Patient direkt erreichbar (Telefon, E-Mail oder persönlich)?",
    );
    // K04: erste M2-Frage
    expect(markup).toContain(
      "Haben Sie einen aktuellen Medikamentenplan oder eine Übersicht?",
    );
  });

  it("rendert pro Frage Ja-, Nein- und Unklar-Buttons", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [k01Checkpoint],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // K01 hat 4 Fragen (M2-01–M2-04), jede mit 3 Buttons → 12 Buttons
    expect(
      (markup.match(/data-m2-answer="K01:M2-0[1-4]:(ja|nein|unklar)"/g) ?? []).length,
    ).toBe(12);
  });

  it("zeigt Hinweis wenn keine Checkpoints aktiv sind", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
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
      active_checkpoints: [k04Checkpoint],
      ctx_prefill: { K04: { "M2-01": "ja", "M2-02": "nein" } },
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    // Der gespeicherte Prefill-Wert "ja" für M2-01 führt zu einem fett dargestellten Button
    expect(markup).toContain('data-m2-answer="K04:M2-01:ja"');
    expect(markup).toContain('data-m2-answer="K04:M2-02:nein"');
  });

  it("enthält den Skip-Link zur M3-Seite", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-42" }) }),
    );

    expect(markup).toContain("/cases/case-42/m3");
    expect(markup).toContain("Ohne M2 direkt zur ärztlichen Checkliste");
  });
});
