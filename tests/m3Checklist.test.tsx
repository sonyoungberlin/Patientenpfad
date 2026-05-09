import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
import {
  CheckpointCategory,
  CheckpointPerspective,
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
    current_practice: { id: "prac-test" },
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    practice: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/server/prefillRuns", () => {
  // Hinweis: Der tatsächliche Import enthält `isPrefillRunSource`, den die
  // page.tsx zum Filtern nutzt. Wir simulieren beides lokal.
  const SOURCES = ["mfa", "conversation", "patient"] as const;
  return {
    getFrozenRuns: jest.fn().mockResolvedValue([]),
    getOpenRun: jest.fn().mockResolvedValue(null),
    isPrefillRunSource: (v: unknown) =>
      typeof v === "string" && (SOURCES as readonly string[]).includes(v),
  };
});

import { prisma } from "@/lib/prisma";
import { getFrozenRuns, getOpenRun } from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  practice: {
    findUnique: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;
const getFrozenRunsMock = getFrozenRuns as unknown as jest.Mock;
const getOpenRunMock = getOpenRun as unknown as jest.Mock;

const mCheckpoint: ActiveCheckpoint = {
  id: "K03",
  block_id: "medizinische_lage",
  type: CheckpointType.VERIFIKATION,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  title: "Medizinischer Checkpoint",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

const oCheckpoint: ActiveCheckpoint = {
  id: "K01",
  block_id: "kommunikation",
  type: CheckpointType.PRESENCE_CHECK,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  title: "Organisatorischer Checkpoint",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "NOTICE", text: "M4" },
};

describe("M3 Checkliste", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.practice.findUnique.mockReset();
    getFrozenRunsMock.mockReset();
    getFrozenRunsMock.mockResolvedValue([]);
    getOpenRunMock.mockReset();
    getOpenRunMock.mockResolvedValue(null);
    // Default: keine Signatur hinterlegt
    prismaMock.practice.findUnique.mockResolvedValue({ message_signature: null });
  });

  function setupCase(data: { active_checkpoints?: ActiveCheckpoint[]; ctx_prefill?: unknown; m2_status?: string; preparation_mode?: string; doctor_confirmed?: boolean; clinical_status?: string }, opts?: { signature?: string }) {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test", ...data });
    if (opts?.signature !== undefined) {
      prismaMock.practice.findUnique.mockResolvedValue({ message_signature: opts.signature });
    }
  }

  function setFrozenRuns(
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

  it("lädt active_checkpoints per Case-ID", async () => {
    setupCase({ active_checkpoints: [mCheckpoint, oCheckpoint] });

    await M3Page({ params: Promise.resolve({ id: "case-123" }) });

    expect(prismaMock.caseSession.findUnique).toHaveBeenCalledWith({
      where: { id: "case-123" },
      select: { active_checkpoints: true, ctx_prefill: true, owner_account_id: true, m2_status: true, preparation_mode: true, doctor_confirmed: true, clinical_status: true },
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

    expect(markup).toContain('data-status-button="K03:ZURÜCKSTELLEN"');
    expect(markup).not.toContain('data-status-button="K01:ZURÜCKSTELLEN"');
  });

  it("zeigt bei TO_DO nur die abgeleiteten M4-Texte (OK/ZURÜCKSTELLEN ohne Output)", async () => {
    setupCase({
      active_checkpoints: [
        {
          ...mCheckpoint,
          id: "K04",
          status: "TO_DO",
          m4: { type: "ACTION", text: "Bitte Termin buchen." },
        },
        {
          ...mCheckpoint,
          id: "K05",
          status: "OK",
          m4: { type: "ACTION", text: "Soll nicht erscheinen (OK)." },
        },
        {
          ...mCheckpoint,
          id: "K07",
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
          id: "K04",
          status: "TO_DO",
          m4: { type: "ACTION", text: "Zeile A" },
        },
        {
          ...oCheckpoint,
          id: "K06",
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
          id: "K03",
          status: "OK",
        },
        {
          ...mCheckpoint,
          id: "K04",
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
        { ...mCheckpoint, id: "K03", title: "Diagnose", status: "OK" },
        {
          ...mCheckpoint,
          id: "K04",
          title: "Behandlungsplan",
          status: "TO_DO",
        },
        {
          ...mCheckpoint,
          id: "K05",
          title: "Prognose",
          status: "ZURÜCKSTELLEN",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Dokumentation für das Krankenblatt");
    expect(markup).toContain("Nicht vollständig geklärt:");
    expect(markup).toContain("- Behandlungsplan");
    expect(markup).toContain("- Prognose");
    expect(markup).toContain("Vollständig geklärt:");
    expect(markup).toContain("- Diagnose");
  });

  it("M5: O-OK → geklärt, O-TODO → nicht ausreichend", async () => {
    setupCase({
      active_checkpoints: [
        { ...oCheckpoint, id: "K01", title: "Terminkoordination", status: "OK" },
        {
          ...oCheckpoint,
          id: "K06",
          title: "Überweisung",
          status: "TO_DO",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Nicht vollständig geklärt:");
    expect(markup).toContain("- Überweisung");
    expect(markup).toContain("Vollständig geklärt:");
    expect(markup).toContain("- Terminkoordination");
  });

  it("M5: mehrere Checkpoints → mehrere Zeilen", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K03", title: "Alpha", status: "OK" },
        { ...oCheckpoint, id: "K01", title: "Beta", status: "TO_DO" },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain(
      "Nicht vollständig geklärt:\n- Beta\n\nVollständig geklärt:\n- Alpha",
    );
  });

  it("M3 zeigt M2-Antworten lesend als aufklappbaren Prefill an (Schritt 3: aus eingefrorenem Run)", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K01", title: "Kommunikation" },
      ],
    });
    setFrozenRuns([
      { sequence: 1, source: "conversation", answers: { K01: { "M2-01": "ja", "M2-02": "nein" } } },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Vorbereitung – Patientengespräch");
    // Fragetext aus Katalog wird angezeigt
    expect(markup).toContain(
      "Sind Sie telefonisch und per SMS erreichbar?",
    );
    expect(markup).toContain("ja");
    expect(markup).toContain("nein");
  });

  it("löst Patientengespräch-IDs im Format Kxx-yy gegen den Patientenkatalog auf (source=patient)", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K02", title: "Terminwahrnehmung" },
      ],
    });
    setFrozenRuns([
      { sequence: 1, source: "patient", answers: { K02: { "K02-02": "ja" } } },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
    expect(markup).toContain(
      "Haben Sie aktuell Schwierigkeiten, Termine in unserer Praxis wahrzunehmen (z. B. aufgrund eingeschränkter Mobilität oder organisatorischer Gründe)?",
    );
    expect(markup).not.toContain("K02-02");
    expect(markup).toContain("ja");
  });

  it("blendet Cross-Mode-IDs aus, statt sie roh anzuzeigen (Run-Quelle=patient + MFA-IDs im Run)", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K01", title: "Kommunikation" },
      ],
    });
    // Defensive Darstellung: Auch wenn ein Patient-Run defensiv noch eine
    // MFA-ID enthielte, darf sie nie roh auftauchen – die Auflösung nutzt
    // jetzt `run.source` statt `preparation_mode`.
    setFrozenRuns([
      {
        sequence: 1,
        source: "patient",
        answers: { K01: { "M2-01": "ja", "MFA-K01-01": "nein" } },
      },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Patientenfrage wird mit Klartext gerendert.
    expect(markup).toContain("Sind Sie telefonisch und per SMS erreichbar?");
    // MFA-Roh-ID wird NIE im Markup auftauchen.
    expect(markup).not.toContain("MFA-K01-01");
  });

  it("zeigt Quellenblöcke immer an, blendet aber Cross-Mode-IDs aus (keine Roh-ID, kein Inhalt)", async () => {
    setupCase({
      active_checkpoints: [
        { ...mCheckpoint, id: "K01", title: "Kommunikation" },
      ],
    });
    // Run-Quelle=mfa, aber nur Patienten-IDs vorhanden → Fenster wird
    // gerendert, aber keine Antwort ist auflösbar (kein Inhalt, kein run-id).
    setFrozenRuns([
      { sequence: 1, source: "mfa", answers: { K01: { "M2-01": "ja" } } },
    ]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Alle drei Fenster sind immer sichtbar.
    expect(markup).toContain("Vorbereitung – MFA");
    expect(markup).toContain("Vorbereitung – Patientengespräch");
    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
    // Roh-ID darf nie auftauchen.
    expect(markup).not.toContain("M2-01");
  });

  it("zeigt drei leere Vorbereitungs-Fenster auch wenn keine Runs existieren (kein Antwortinhalt)", async () => {
    // getFrozenRuns-Default ist bereits []; ctx_prefill würde selbst mit
    // Antworten **nicht mehr** konsultiert (kein Fallback in Schritt 3).
    setupCase({
      active_checkpoints: [{ ...mCheckpoint, id: "K03", title: "Diagnose" }],
      ctx_prefill: { "K-M-NP": { "M2-01": "ja" } },
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Alle drei Fenster immer angezeigt.
    expect(markup).toContain("Vorbereitung – MFA");
    expect(markup).toContain("Vorbereitung – Patientengespräch");
    expect(markup).toContain("Vorbereitung – Patientenfragebogen");
    // Kein Antwortinhalt (kein Fragetext aus ctx_prefill oder Runs).
    expect(markup).not.toContain("Sind Sie telefonisch und per SMS erreichbar?");
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

  it("Status-Buttons sind bei preparation_mode=mfa NICHT deaktiviert (auch wenn m2_status=waiting_for_patient)", async () => {
    setupCase({
      active_checkpoints: [mCheckpoint],
      m2_status: "waiting_for_patient",
      preparation_mode: "mfa",
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("opacity:0.5");
  });

  it("Status-Buttons sind bei preparation_mode=skipped NICHT deaktiviert", async () => {
    setupCase({
      active_checkpoints: [mCheckpoint],
      m2_status: "waiting_for_patient",
      preparation_mode: "skipped",
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("opacity:0.5");
  });

  it("Status-Buttons sind bei preparation_mode=patient + waiting_for_patient deaktiviert", async () => {
    setupCase({
      active_checkpoints: [mCheckpoint],
      m2_status: "waiting_for_patient",
      preparation_mode: "patient",
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("opacity:0.5");
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
        { ...mCheckpoint, id: "K03", status: "TO_DO", m4: { type: "ACTION", text: "Termin buchen." } },
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
    expect(markup).toContain("Bitte hinterlegen Sie zuerst eine Signatur unter Praxis &gt; Signatur.");
  });

  it("zeigt 'Nachricht kopieren'-Button aktiv wenn Signatur vorhanden", async () => {
    setupCase(
      {
        active_checkpoints: [
          { ...mCheckpoint, id: "K03", status: "TO_DO", m4: { type: "ACTION", text: "Termin buchen." } },
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
        { ...mCheckpoint, id: "K03", status: "OK" },
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
        { ...mCheckpoint, id: "K03", status: "TO_DO", m4: { type: "ACTION", text: "Bitte Termin buchen." } },
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
        { ...mCheckpoint, id: "K03", status: "TO_DO", m4: { type: "ACTION", text: "Bitte Termin buchen." } },
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
          { ...mCheckpoint, id: "K03", status: "TO_DO", m4: { type: "ACTION", text: "Befund mitbringen." } },
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
        { ...mCheckpoint, id: "K03", status: "OK" },
      ],
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-message-preview");
    expect(markup).not.toContain("Liebe Patientin, lieber Patient,");
  });

  // Schritt 4 – Einstieg „Weitere Vorbereitung starten"
  it("zeigt den Button 'Weitere Vorbereitung starten' im Aktionsbereich (ohne 'Ärztlich vorbereitet')", async () => {
    setupCase({ active_checkpoints: [mCheckpoint] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-start-additional-prefill-run");
    expect(markup).toContain("Weitere Vorbereitung starten");
    // „Ärztlich vorbereitet" wurde nach M1 verschoben – darf nicht mehr in M3 erscheinen.
    expect(markup).not.toContain("data-clinical-status-prepared");
    expect(markup).not.toContain("Ärztlich vorbereitet");
    // „Weitere Vorbereitung starten" liegt VOR dem schwarzen „Ärztlich bestätigt"-Button.
    const groupIdx = markup.indexOf("data-clinical-status-actions");
    const startIdx = markup.indexOf("data-start-additional-prefill-run");
    const confirmIdx = markup.indexOf("data-doctor-confirm");
    expect(groupIdx).toBeGreaterThan(-1);
    expect(startIdx).toBeGreaterThan(groupIdx);
    expect(confirmIdx).toBeGreaterThan(startIdx);
  });

  it("M3 zeigt 'Ärztlich vorbereitet' nicht mehr (wurde nach M1 verschoben)", async () => {
    setupCase({ active_checkpoints: [mCheckpoint] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-clinical-status-prepared");
    expect(markup).not.toContain("Ärztlich vorbereitet");
  });

  it("blendet 'Weitere Vorbereitung starten' aus, wenn der Fall ärztlich bestätigt ist (doctor_confirmed)", async () => {
    setupCase({
      active_checkpoints: [mCheckpoint],
      doctor_confirmed: true,
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-start-additional-prefill-run");
    expect(markup).not.toContain("Weitere Vorbereitung starten");
  });

  it("blendet 'Weitere Vorbereitung starten' aus, wenn clinical_status === 'confirmed'", async () => {
    setupCase({
      active_checkpoints: [mCheckpoint],
      clinical_status: "confirmed",
    });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("data-start-additional-prefill-run");
  });

  it("schwarzer 'Ärztlich bestätigt'-Button bleibt unverändert sichtbar, wenn 'Weitere Vorbereitung starten' eingebaut ist", async () => {
    setupCase({ active_checkpoints: [mCheckpoint] });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-doctor-confirm");
    expect(markup).toContain("btn-primary");
    expect(markup).toContain("Ärztlich bestätigt");
  });

  // Ergänzungslauf-Sperre
  it("deaktiviert 'Weitere Vorbereitung starten' wenn clinical_status prepared und frozen run vorhanden", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], clinical_status: "prepared" });
    setFrozenRuns([{ sequence: 1, source: "mfa", answers: {} }]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-start-additional-prefill-run");
    expect(markup).toContain("disabled");
    expect(markup).toContain("data-ergaenzung-gestartet-notice");
    expect(markup).toContain("Weitere Vorbereitung wurde bereits gestartet.");
  });

  it("deaktiviert 'Weitere Vorbereitung starten' wenn clinical_status prepared und offener Run vorhanden", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], clinical_status: "prepared" });
    // keine frozen runs, aber open run existiert
    getOpenRunMock.mockResolvedValue({ id: "run-open-1", sequence: 1 });

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-start-additional-prefill-run");
    expect(markup).toContain("disabled");
    expect(markup).toContain("data-ergaenzung-gestartet-notice");
  });

  it("lässt 'Weitere Vorbereitung starten' aktiv wenn clinical_status prepared aber noch kein Run vorhanden", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], clinical_status: "prepared" });
    // keine frozen runs, kein open run (handleCreateAndPrepare-Fall)
    getOpenRunMock.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-start-additional-prefill-run");
    expect(markup).not.toContain("data-ergaenzung-gestartet-notice");
  });

  it("lässt 'Weitere Vorbereitung starten' aktiv wenn clinical_status none und frozen runs vorhanden", async () => {
    setupCase({ active_checkpoints: [mCheckpoint], clinical_status: "none" });
    setFrozenRuns([{ sequence: 1, source: "mfa", answers: {} }]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("data-start-additional-prefill-run");
    expect(markup).not.toContain("data-ergaenzung-gestartet-notice");
  });
});
