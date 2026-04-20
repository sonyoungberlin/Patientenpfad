import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
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
      update: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  account: {
    findUnique: jest.Mock;
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
    prismaMock.account.findUnique.mockReset();
    // Default: keine Signatur hinterlegt
    prismaMock.account.findUnique.mockResolvedValue({ message_signature: null });
  });

  function setupCase(data: { active_checkpoints?: ActiveCheckpoint[]; ctx_prefill?: unknown; m2_status?: string }, opts?: { signature?: string }) {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test", ...data });
    if (opts?.signature !== undefined) {
      prismaMock.account.findUnique.mockResolvedValue({ message_signature: opts.signature });
    }
  }

  it("lädt active_checkpoints per Case-ID", async () => {
    setupCase({ active_checkpoints: [mCheckpoint, oCheckpoint] });

    await M3Page({ params: Promise.resolve({ id: "case-123" }) });

    expect(prismaMock.caseSession.findUnique).toHaveBeenCalledWith({
      where: { id: "case-123" },
      select: { active_checkpoints: true, ctx_prefill: true, owner_account_id: true, m2_status: true },
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

    expect(markup).toContain("Zeile A\n\nZeile B");
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
      "Sind Sie telefonisch und per SMS erreichbar?",
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

  it("zeigt Wartebanner wenn m2_status = waiting_for_patient", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], m2_status: "waiting_for_patient" });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-m2-waiting-banner");
    expect(markup).toContain("Es wird auf Antworten gewartet.");
    expect(markup).toContain("data-skip-m2-waiting");
    expect(markup).toContain("Patientenfragen überspringen und ärztlich fortfahren");
  });

  it("Status-Buttons sind bei waiting_for_patient deaktiviert", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], m2_status: "waiting_for_patient" });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Alle Status-Buttons müssen disabled sein
    expect(markup).toContain('disabled=""');
    // Checkpoint-Item soll mit reduzierter Opacity dargestellt sein
    expect(markup).toContain("opacity");
  });

  it("zeigt Übersprungen-Hinweis wenn m2_status = skipped", async () => {
    setupCase({ active_checkpoints: [], m2_status: "skipped" });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-m2-skipped-notice");
    expect(markup).toContain("Patientenfragebogen wurde übersprungen.");
    expect(markup).not.toContain("data-m2-waiting-banner");
  });

  it("zeigt keinen Banner wenn m2_status = none", async () => {
    setupCase({ active_checkpoints: [] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-m2-waiting-banner");
    expect(markup).not.toContain("data-m2-skipped-notice");
  });

  // ------------------------------------------------------------------
  // Nachricht kopieren – Button
  // ------------------------------------------------------------------

  it("zeigt 'Nachricht kopieren'-Button disabled + Hinweis wenn keine Signatur", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-T", status: "TO_DO", m4: { type: "ACTION", text: "Termin buchen." } },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Nachricht kopieren");
    expect(markup).toContain("data-copy-message");
    // Button muss disabled sein
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("data-signature-hint");
    expect(markup).toContain("Bitte hinterlegen Sie zuerst eine Signatur in der Fallübersicht.");
  });

  it("zeigt 'Nachricht kopieren'-Button aktiv wenn Signatur vorhanden", async () => {
    setupCase(
      {
        active_checkpoints: [
          { ...mCheckpoint, id: "K-M-T", status: "TO_DO", m4: { type: "ACTION", text: "Termin buchen." } },
        ],
      },
      { signature: "Mit freundlichen Grüßen\nDr. Muster" },
    );

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Nachricht kopieren");
    // Kein Signatur-Hinweis
    expect(markup).not.toContain("data-signature-hint");
    expect(markup).not.toContain("Bitte hinterlegen Sie zuerst eine Signatur");
  });

  it("zeigt keinen 'Nachricht kopieren'-Button wenn keine TO_DOs", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-OK-ONLY", status: "OK" },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Kein TO_DO → kein M4-Block → kein Nachricht-kopieren-Button
    expect(markup).not.toContain("Nachricht kopieren");
    expect(markup).toContain("Keine weiteren Schritte erforderlich.");
  });

  it("bestehende 'Text kopieren'-Funktion bleibt bei TO_DO erhalten", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-T2", status: "TO_DO", m4: { type: "ACTION", text: "Bitte Termin buchen." } },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Text kopieren");
    expect(markup).toContain("Bitte Termin buchen.");
  });

  // ------------------------------------------------------------------
  // Nachrichtenvorschau
  // ------------------------------------------------------------------

  it("zeigt Nachrichtenvorschau mit Intro + To-do-Text ohne Signatur", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-P1", status: "TO_DO", m4: { type: "ACTION", text: "Bitte Termin buchen." } },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-message-preview");
    expect(markup).toContain("Liebe Patientin, lieber Patient,");
    expect(markup).toContain("für Ihre weitere Versorgung bitten wir Sie, folgende Punkte zu beachten:");
    expect(markup).toContain("Bitte Termin buchen.");
  });

  it("zeigt Nachrichtenvorschau mit Signatur wenn vorhanden", async () => {
    setupCase(
      {
        active_checkpoints: [
          { ...mCheckpoint, id: "K-M-P2", status: "TO_DO", m4: { type: "ACTION", text: "Befund mitbringen." } },
        ],
      },
      { signature: "Mit freundlichen Grüßen\nDr. Muster" },
    );

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-message-preview");
    expect(markup).toContain("Liebe Patientin, lieber Patient,");
    expect(markup).toContain("Befund mitbringen.");
    expect(markup).toContain("Mit freundlichen Grüßen");
    expect(markup).toContain("Dr. Muster");
  });

  it("zeigt keine Nachrichtenvorschau wenn keine TO_DOs", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K-M-OK-NP", status: "OK" },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-message-preview");
    expect(markup).not.toContain("Liebe Patientin, lieber Patient,");
  });
});
