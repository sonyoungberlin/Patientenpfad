/**
 * Schritt 3: M3 rendert alle eingefrorenen PrefillRuns in Reihenfolge –
 * jeden Run separat, mit festem Label pro Quelle, ohne Aggregation.
 */

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
    caseSession: { findUnique: jest.fn(), update: jest.fn() },
    account: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/server/prefillRuns", () => {
  const SOURCES = ["mfa", "conversation", "patient"] as const;
  return {
    getFrozenRuns: jest.fn().mockResolvedValue([]),
    isPrefillRunSource: (v: unknown) =>
      typeof v === "string" && (SOURCES as readonly string[]).includes(v),
  };
});

import { prisma } from "@/lib/prisma";
import { getFrozenRuns } from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
  account: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getFrozenRunsMock = getFrozenRuns as unknown as jest.Mock;

const cpK01: ActiveCheckpoint = {
  id: "K01",
  block_id: "communication",
  type: CheckpointType.PRESENCE_CHECK,
  relevance: CheckpointRelevance.P,
  title: "Kommunikation",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};
const cpK02: ActiveCheckpoint = {
  ...cpK01,
  id: "K02",
  title: "Terminwahrnehmung",
};

function setupCase(activeCheckpoints: ActiveCheckpoint[]) {
  pm.caseSession.findUnique.mockResolvedValue({
    owner_account_id: "acc-test",
    active_checkpoints: activeCheckpoints,
    ctx_prefill: null,
    m2_status: "none",
    preparation_mode: "none",
    doctor_confirmed: false,
    clinical_status: "none",
  });
  pm.account.findUnique.mockResolvedValue({ message_signature: null });
}

function setRuns(
  runs: Array<{
    id?: string;
    sequence: number;
    source: "mfa" | "conversation" | "patient";
    answers: Record<string, Record<string, string>>;
  }>,
) {
  getFrozenRunsMock.mockResolvedValue(
    runs.map((r, i) => ({
      id: r.id ?? `run-${i + 1}`,
      sequence: r.sequence,
      source: r.source,
      answers: r.answers,
      case_id: "case-123",
      frozen_at: new Date(),
      active_checkpoints: [],
      created_by_account_id: null,
      patient_token_used: null,
    })),
  );
}

describe("M3 Schritt 3 – PrefillRuns-Anzeige", () => {
  beforeEach(() => {
    pm.caseSession.findUnique.mockReset();
    pm.account.findUnique.mockReset();
    getFrozenRunsMock.mockReset();
    getFrozenRunsMock.mockResolvedValue([]);
  });

  it("rendert mehrere Runs pro Checkpoint in aufsteigender sequence-Reihenfolge (keine Zusammenführung)", async () => {
    setupCase([cpK01]);
    // MFA-Run (sequence=2) UND Patient-Run (sequence=1) – bewusst
    // verkehrt geliefert, um Sortierung zu prüfen.
    setRuns([
      {
        id: "run-mfa",
        sequence: 2,
        source: "mfa",
        answers: { K01: { "MFA-K01-01": "ja" } },
      },
      {
        id: "run-patient",
        sequence: 1,
        source: "patient",
        answers: { K01: { "M2-01": "nein" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Beide Blöcke sind sichtbar.
    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
    expect(markup).toContain("Vorbereitung – MFA");

    // Reihenfolge: Patient (sequence=1) vor MFA (sequence=2) im Markup.
    const patientIdx = markup.indexOf("Vorbereitung – Patientenfragebogen");
    const mfaIdx = markup.indexOf("Vorbereitung – MFA");
    expect(patientIdx).toBeGreaterThan(-1);
    expect(mfaIdx).toBeGreaterThan(patientIdx);

    // Keine Zusammenführung: beide Antworten erscheinen separat, jede in
    // ihrem eigenen Run-Block (Texttokens einmalig pro Block).
    expect(markup).toContain("Ist der Patient für uns grundsätzlich erreichbar?");
    expect(markup).toContain("Sind Sie telefonisch und per SMS erreichbar?");
  });

  it("beschriftet jede Run-Quelle mit dem festgelegten Label", async () => {
    setupCase([cpK01, cpK02]);
    setRuns([
      { sequence: 1, source: "mfa", answers: { K01: { "MFA-K01-01": "ja" } } },
      { sequence: 2, source: "conversation", answers: { K02: { "M2-01": "ja" } } },
      { sequence: 3, source: "patient", answers: { K01: { "M2-01": "nein" } } },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Vorbereitung – MFA");
    expect(markup).toContain("Vorbereitung – Patientengespräch");
    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
  });

  it("blendet leere Runs aus (kein Platzhalter, kein Hinweis)", async () => {
    setupCase([cpK01]);
    setRuns([
      { id: "run-empty", sequence: 1, source: "mfa", answers: {} },
      {
        id: "run-filled",
        sequence: 2,
        source: "patient",
        answers: { K01: { "M2-01": "ja" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Nur der nicht-leere Run wird als Block dargestellt.
    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
    expect(markup).not.toContain("Vorbereitung – MFA");
    // Kein Data-Attribut des leeren Runs im Markup.
    expect(markup).not.toContain('data-prefill-run-id="run-empty"');
    expect(markup).toContain('data-prefill-run-id="run-filled"');
  });

  it("kein Rückfall auf ctx_prefill, wenn Runs existieren (keine Überschneidung)", async () => {
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [cpK01],
      // ctx_prefill enthält Antworten – sie dürfen NICHT im Markup erscheinen.
      ctx_prefill: { K01: { "M2-02": "ja" } },
      m2_status: "none",
      preparation_mode: "patient",
      doctor_confirmed: false,
      clinical_status: "none",
    });
    pm.account.findUnique.mockResolvedValue({ message_signature: null });
    setRuns([
      {
        id: "only-run",
        sequence: 1,
        source: "patient",
        answers: { K01: { "M2-01": "ja" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Angezeigt wird nur die Antwort aus dem Run:
    expect(markup).toContain("Sind Sie telefonisch und per SMS erreichbar?");
    // Text der ctx_prefill-only-Antwort (M2-02) erscheint nicht:
    expect(markup).not.toContain(
      "Sind Sie per E-Mail oder über unser Praxissystem erreichbar?",
    );
  });

  it("single-run Fall: bestehende Struktur bleibt erhalten (ein Block pro Checkpoint mit Answers-Liste)", async () => {
    setupCase([cpK01]);
    setRuns([
      {
        id: "only",
        sequence: 1,
        source: "patient",
        answers: { K01: { "M2-01": "ja" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Genau ein `<details>`-Prefill-Block für diesen Checkpoint.
    const matches = markup.match(/data-m2-prefill="K01"/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
