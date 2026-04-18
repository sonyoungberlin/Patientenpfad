import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

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

  function setupCase(data: object) {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test", ...data });
  }

  it("lädt active_checkpoints per Case-ID", async () => {
    setupCase({ active_checkpoints: [mCheckpoint, oCheckpoint] });

    await M3Page({ params: Promise.resolve({ id: "case-123" }) });

    expect(prismaMock.caseSession.findUnique).toHaveBeenCalledWith({
      where: { id: "case-123" },
      select: { active_checkpoints: true, ctx_prefill: true, owner_account_id: true },
    });
  });

  it("rendert die richtige Anzahl an Checkpoints", async () => {
    setupCase({ active_checkpoints: [mCheckpoint, oCheckpoint] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect((markup.match(/data-checkpoint-item=/g) ?? []).length).toBe(2);
    expect(markup).toContain("Medizinischer Checkpoint");
    expect(markup).toContain("Organisatorischer Checkpoint");
  });

  it("rendert für M drei Buttons und für O zwei (kein ZURÜCKSTELLEN bei O)", async () => {
    setupCase({ active_checkpoints: [mCheckpoint, oCheckpoint] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain('data-status-button="K-M:ZURÜCKSTELLEN"');
    expect(markup).not.toContain('data-status-button="K-O:ZURÜCKSTELLEN"');
  });

  it("zeigt bei TO_DO nur die abgeleiteten M4-Texte (OK/ZURÜCKSTELLEN ohne Output)", async () => {
    setupCase({
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
    setupCase({
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
    setupCase({
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

  it("M5: M-OK → ausreichend geklärt, M-TODO → nicht ausreichend, M-ZURÜCKSTELLEN → unklar", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-OK", title: "Diagnose", status: "OK" },
        {
          ...mCheckpoint,
          id: "K-M-TODO",
          title: "Behandlungsplan",
          status: "TO_DO",
        },
        {
          ...mCheckpoint,
          id: "K-M-Z",
          title: "Prognose",
          status: "ZURÜCKSTELLEN",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Dokumentation für das Krankenblatt");
    expect(markup).toContain("Diagnose ist ausreichend geklärt.");
    expect(markup).toContain("Behandlungsplan ist aktuell nicht ausreichend geklärt.");
    expect(markup).toContain("Prognose ist unklar.");
  });

  it("M5: O-OK → geklärt, O-TODO → nicht ausreichend", async () => {
    setupCase({
      active_checkpoints: [
        { ...oCheckpoint, id: "K-O-OK", title: "Terminkoordination", status: "OK" },
        {
          ...oCheckpoint,
          id: "K-O-TODO",
          title: "Überweisung",
          status: "TO_DO",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Terminkoordination ist geklärt.");
    expect(markup).toContain("Überweisung ist aktuell nicht ausreichend geklärt.");
  });

  it("M5: mehrere Checkpoints → mehrere Zeilen", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-1", title: "Alpha", status: "OK" },
        { ...oCheckpoint, id: "K-O-1", title: "Beta", status: "TO_DO" },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain(
      "Alpha ist ausreichend geklärt.\nBeta ist aktuell nicht ausreichend geklärt.",
    );
  });

  it("M3 zeigt M2-Antworten lesend als aufklappbaren Prefill an", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K01", title: "Kommunikation" },
      ],
      ctx_prefill: { K01: { "M2-01": "ja", "M2-02": "nein" } },
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Aus M2:");
    // Fragetext aus Katalog wird angezeigt
    expect(markup).toContain(
      "Ist der Patient direkt erreichbar (Telefon, E-Mail oder persönlich)?",
    );
    expect(markup).toContain("ja");
    expect(markup).toContain("nein");
  });

  it("M3 zeigt keinen Prefill-Bereich wenn kein Prefill gespeichert", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-NP", title: "Diagnose" },
      ],
      ctx_prefill: null,
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("Aus M2:");
  });
});
