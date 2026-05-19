import { renderToStaticMarkup } from "react-dom/server";
import M2Page from "@/app/cases/[id]/m2/page";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
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
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
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
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
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
  perspectives: [CheckpointPerspective.PATIENT],
  title: "Mobilität",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "NOTICE", text: "M4" },
};

/** K09 – Mitwirkung (nur MFA-Perspektive, keine Patientenfragen) */
const k09Checkpoint: ActiveCheckpoint = {
  id: "K09",
  block_id: "kommunikation",
  type: CheckpointType.VERIFIKATION,
  perspectives: [CheckpointPerspective.MFA],
  title: "Mitwirkung",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

/** K10 – MULTI_SELECT, kein M2-Anteil */
const k10Checkpoint: ActiveCheckpoint = {
  id: "K10",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Besonderer Versorgungsaufwand",
  options: ["Neupatient / unbekannt"],
  selections: [],
  enabled: false,
};

/** K11 – MULTI_SELECT, kein M2-Anteil */
const k11Checkpoint: ActiveCheckpoint = {
  id: "K11",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Formularanliegen",
  options: ["Pflegegrad / Höherstufung"],
  selections: [],
  enabled: false,
};

/** K11 – MULTI_SELECT mit Reha-Antrag-Selektion → löst K14/K15 aus */
const k11RehaCheckpoint: ActiveCheckpoint = {
  id: "K11",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Formularanliegen",
  options: ["Reha-Antrag"],
  selections: ["Reha-Antrag"],
  enabled: true,
};

/** K11 – MULTI_SELECT mit Pflegegrad-Selektion → löst K16/K17 aus */
const k11PflegeCheckpoint: ActiveCheckpoint = {
  id: "K11",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Formularanliegen",
  options: ["Pflegegrad / Höherstufung"],
  selections: ["Pflegegrad / Höherstufung"],
  enabled: true,
};

/** K11 – MULTI_SELECT mit Attest-Selektion → löst K03/K18 aus */
const k11AttestCheckpoint: ActiveCheckpoint = {
  id: "K11",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Formularanliegen",
  options: ["Attest / Bescheinigung"],
  selections: ["Attest / Bescheinigung"],
  enabled: true,
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

    expect(markup).toContain("Für die MFA gibt es hier keine vorbereitenden Fragen.");
  });

  it("zeigt pflegebeobachtung-Checkpoint im MFA-Modus mit internem Hinweis statt Fragen", async () => {
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

    // K12 erscheint im MFA-Modus – Titel sichtbar
    expect(markup).toContain('data-m2-checkpoint="K12"');
    // interner Hinweis statt Fragen
    expect(markup).toContain("Für die MFA gibt es hier keine vorbereitenden Fragen.");
    // keine Antwort-Buttons (keine MFA-Fragen vorhanden)
    expect(markup).not.toContain("data-m2-question");
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
      "Wirkt die Fortbewegung im Alltag sicher?",
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

    // MFA-Vorbereitung-Button ist erreichbar
    expect(markup).toContain("data-m2-mfa-mode-button");
    expect(markup).toContain(">MFA-Vorbereitung<");

    // Reihenfolge: Skip → M2-Link → Patientengespräch → MFA-Vorbereitung → MFA-Formular → schwarzer Save-Button
    const idxConversation = markup.indexOf("data-m2-patient-conversation");
    const idxLink = markup.indexOf("data-m2-link-generator");
    const idxSkip = markup.indexOf("data-m2-skip");
    const idxMfaMode = markup.indexOf("data-m2-mfa-mode");
    const idxMfaForm = markup.indexOf("data-m2-mfa-form");
    const idxSave = markup.indexOf("data-m2-save");

    expect(idxSkip).toBeGreaterThan(-1);
    expect(idxLink).toBeGreaterThan(idxSkip);
    expect(idxConversation).toBeGreaterThan(idxLink);
    expect(idxMfaMode).toBeGreaterThan(idxConversation);
    expect(idxMfaForm).toBeGreaterThan(idxMfaMode);
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

  // ------------------------------------------------------------------
  // Neue Rendering-Regeln: MULTI_SELECT, K09, kein MFA-Hinweis im Patientenmodus
  // ------------------------------------------------------------------

  it("blendet MULTI_SELECT-Checkpoints (K10, K11) im MFA-Modus aus", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k01Checkpoint, k10Checkpoint, k11Checkpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-multi-mfa" }) }),
    );

    expect(markup).not.toContain('data-m2-checkpoint="K10"');
    expect(markup).not.toContain('data-m2-checkpoint="K11"');
    // K01 erscheint wie gewohnt
    expect(markup).toContain('data-m2-checkpoint="K01"');
  });

  it("blendet MULTI_SELECT-Checkpoints (K10, K11) im PATIENT-Modus aus", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k12Checkpoint, k10Checkpoint, k11Checkpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-multi-patient" }) }),
    );

    expect(markup).not.toContain('data-m2-checkpoint="K10"');
    expect(markup).not.toContain('data-m2-checkpoint="K11"');
  });

  it("zeigt K09 im MFA-Modus (perspectives enthält MFA)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k09Checkpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-k09-mfa" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K09"');
  });

  it("blendet K09 im PATIENT-Modus aus (perspectives enthält kein PATIENT)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k09Checkpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-k09-patient" }) }),
    );

    expect(markup).not.toContain('data-m2-checkpoint="K09"');
  });

  it("zeigt keinen internen MFA-Hinweis im PATIENT-Modus", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k12Checkpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-no-hint-patient" }) }),
    );

    // K12 erscheint mit Patientenfragen
    expect(markup).toContain('data-m2-checkpoint="K12"');
    // interner MFA-Hinweis darf im PATIENT-Modus NICHT erscheinen
    expect(markup).not.toContain("Für die MFA gibt es hier keine vorbereitenden Fragen.");
  });

  it("zeigt K14/K15 im MFA-Modus wenn K11 = 'Reha-Antrag'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11RehaCheckpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-reha-mfa" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K14"');
    expect(markup).toContain('data-m2-checkpoint="K15"');
    expect(markup).toContain("Sind frühere Reha- oder Kurmaßnahmen dokumentiert oder bekannt?");
    expect(markup).toContain("Besteht eine aktuelle Arbeitsunfähigkeit?");
  });

  it("zeigt K14/K15 im Patientengespräch-Modus wenn K11 = 'Reha-Antrag'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11RehaCheckpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-reha-conv" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K14"');
    expect(markup).toContain('data-m2-checkpoint="K15"');
    expect(markup).toContain("Haben Sie in den letzten Jahren bereits eine Reha oder Kur gemacht?");
    expect(markup).toContain("Sind Sie aktuell berufstätig?");
  });

  it("zeigt K16/K17 im MFA-Modus wenn K11 = 'Pflegegrad / Höherstufung'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11PflegeCheckpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-pflege-mfa" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K16"');
    expect(markup).toContain('data-m2-checkpoint="K17"');
    expect(markup).toContain("Ist bekannt, ob ein Erstantrag oder eine Höherstufung beantragt wird?");
    expect(markup).toContain("Ist Kurzzeitpflege für diesen Patienten bekannt oder relevant?");
  });

  it("zeigt K16/K17 im Patientengespräch-Modus wenn K11 = 'Pflegegrad / Höherstufung'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11PflegeCheckpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-pflege-conv" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K16"');
    expect(markup).toContain('data-m2-checkpoint="K17"');
    expect(markup).toContain("Wissen Sie, ob es sich um eine Erstbeantragung oder um eine Höherstufung handelt?");
    expect(markup).toContain("Benötigen oder nutzen Sie Kurzzeitpflege (z. B. wenn Ihre Pflegeperson vorübergehend ausfällt)?");
  });

  it("zeigt K18 im MFA-Modus wenn K11 = 'Attest / Bescheinigung'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11AttestCheckpoint],
      ctx_prefill: null,
      preparation_mode: "mfa",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-attest-mfa" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K18"');
    expect(markup).toContain("Von welcher Stelle wird das Dokument angefordert?");
  });

  it("zeigt K18 im Patientengespräch-Modus wenn K11 = 'Attest / Bescheinigung'", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [k11AttestCheckpoint],
      ctx_prefill: null,
      preparation_mode: "conversation",
      doctor_confirmed: false,
    });

    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-attest-conv" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K18"');
    expect(markup).toContain("Wer oder welche Stelle hat das Dokument angefordert?");
  });
});
