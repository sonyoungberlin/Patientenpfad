import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const mCheckpoint: ActiveCheckpoint = {
  id: "K-M",
  block_id: "diagnosis_status",
  type: CheckpointType.VERIFIKATION,
  relevance: CheckpointRelevance.P,
  title: "Medizinischer Checkpoint",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

const oCheckpoint: ActiveCheckpoint = {
  id: "K-O",
  block_id: "communication",
  type: CheckpointType.PRESENCE_CHECK,
  relevance: CheckpointRelevance.P,
  title: "Organisatorischer Checkpoint",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "NOTICE", text: "M4" },
};

describe("M3 Checkliste", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
  });

  it("lädt active_checkpoints per Case-ID", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [mCheckpoint, oCheckpoint],
    });

    await M3Page({ params: Promise.resolve({ id: "case-123" }) });

    expect(prismaMock.caseSession.findUnique).toHaveBeenCalledWith({
      where: { id: "case-123" },
      select: { active_checkpoints: true },
    });
  });

  it("rendert die richtige Anzahl an Checkpoints", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [mCheckpoint, oCheckpoint],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect((markup.match(/data-checkpoint-item=/g) ?? []).length).toBe(2);
    expect(markup).toContain("Medizinischer Checkpoint");
    expect(markup).toContain("Organisatorischer Checkpoint");
  });

  it("rendert für M drei Buttons und für O zwei (kein ZURÜCKSTELLEN bei O)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [mCheckpoint, oCheckpoint],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain('data-status-button="K-M:ZURÜCKSTELLEN"');
    expect(markup).not.toContain('data-status-button="K-O:ZURÜCKSTELLEN"');
  });

  it("zeigt bei TO_DO nur die abgeleiteten M4-Texte (OK/ZURÜCKSTELLEN ohne Output)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [
        {
          ...mCheckpoint,
          id: "K-M-TODO",
          status: "TO_DO",
          m4: { type: "ACTION", text: "Bitte Termin buchen." },
        },
        {
          ...mCheckpoint,
          id: "K-M-OK",
          status: "OK",
          m4: { type: "ACTION", text: "Soll nicht erscheinen (OK)." },
        },
        {
          ...mCheckpoint,
          id: "K-M-Z",
          status: "ZURÜCKSTELLEN",
          m4: { type: "ACTION", text: "Soll nicht erscheinen (Z)." },
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Patientenhinweise / To-dos");
    expect(markup).toContain("Bitte Termin buchen.");
    expect(markup).not.toContain("Soll nicht erscheinen (OK).");
    expect(markup).not.toContain("Soll nicht erscheinen (Z).");
  });

  it("zeigt mehrere TO_DOs als mehrere Zeilen", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [
        {
          ...mCheckpoint,
          id: "K-M-TODO-1",
          status: "TO_DO",
          m4: { type: "ACTION", text: "Zeile A" },
        },
        {
          ...oCheckpoint,
          id: "K-O-TODO-2",
          status: "TO_DO",
          m4: { type: "NOTICE", text: "Zeile B" },
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Zeile A\nZeile B");
  });

  it("zeigt leeren Zustand ohne TO_DO", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [
        {
          ...mCheckpoint,
          id: "K-M-OK-ONLY",
          status: "OK",
        },
        {
          ...mCheckpoint,
          id: "K-M-Z-ONLY",
          status: "ZURÜCKSTELLEN",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Keine weiteren Schritte erforderlich.");
    expect(markup).not.toContain("Text kopieren");
  });
});
