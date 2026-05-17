/**
 * Tests für OfficeWritePanel (Listenansicht / Initial-State).
 *
 * Da kein @testing-library/react installiert ist, wird `renderToStaticMarkup`
 * aus react-dom/server verwendet. Damit lässt sich der initiale Render-Zustand
 * (activeTemplateId === null) vollständig prüfen.
 * Interaktions-Tests (Vorbereiten → Formular) sind nicht möglich.
 */

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import OfficeWritePanel from "@/components/office/OfficeWritePanel";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import { OFFICE_TOPIC_REGRESS } from "@/lib/office/checkpointCatalog";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeCheckpoint(
  id: string,
  state: OfficeCheckpointState,
): OfficeCheckpointSnapshot {
  return { id, title: id, kind: OfficeCheckpointKind.FACT, state };
}

/** Alle RG-Checkpoints auf YES – einzelne States via overrides überschreibbar. */
function makeRegressCheckpoints(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "RG-01": OfficeCheckpointState.YES,
    "RG-02": OfficeCheckpointState.YES,
    "RG-03": OfficeCheckpointState.YES,
    "RG-04": OfficeCheckpointState.YES,
    "RG-05": OfficeCheckpointState.YES,
    "RG-06": OfficeCheckpointState.YES,
    "RG-07": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(([id, state]) =>
    makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 1. Panel-Sichtbarkeit
// ---------------------------------------------------------------------------

describe("OfficeWritePanel: Sichtbarkeit", () => {
  it("rendert nichts wenn topicId null", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, { topicId: null, checkpoints: [] }),
    );
    expect(html).toBe("");
  });

  it("rendert nichts bei unbekanntem Topic (keine Templates registriert)", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: "unbekanntes-topic-xyz",
        checkpoints: [],
      }),
    );
    expect(html).toBe("");
  });

  it("zeigt Panel bei Regress-Topic wenn Checkpoints vorhanden", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: makeRegressCheckpoints(),
      }),
    );
    expect(html).not.toBe("");
    expect(html).toContain("Jetzt weiterarbeiten");
  });
});

// ---------------------------------------------------------------------------
// 2. Listenansicht – verfügbare Module
// ---------------------------------------------------------------------------

describe("OfficeWritePanel: Verfügbare Module", () => {
  it("zeigt Abschnitt 'Jetzt möglich' wenn mindestens ein Modul verfügbar ist", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: makeRegressCheckpoints(),
      }),
    );
    expect(html).toContain("Jetzt möglich");
  });

  it("zeigt Vorbereiten-Button für jedes verfügbare Modul", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: makeRegressCheckpoints(),
      }),
    );
    expect(html).toContain("Vorbereiten");
  });

  it("zeigt Label des verfügbaren Moduls im Panel", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: makeRegressCheckpoints(),
      }),
    );
    // Mindestens eines der drei Template-Labels muss erscheinen
    const hasLabel =
      html.includes("Stellungnahme") ||
      html.includes("Arztgespräch") ||
      html.includes("Unterlagen");
    expect(hasLabel).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Listenansicht – gesperrte Module
// ---------------------------------------------------------------------------

describe("OfficeWritePanel: Gesperrte Module", () => {
  it("zeigt Abschnitt 'Noch nicht möglich' wenn alle Checkpoints offen", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [],
      }),
    );
    expect(html).toContain("Noch nicht möglich");
  });

  it("zeigt keinen Vorbereiten-Button wenn alle Module gesperrt", () => {
    // regress-stellungnahme braucht RG-01+RG-02 YES → bei OPEN gesperrt
    // regress-arztgespraech-vorbereiten braucht RG-03 OPEN oder RG-05 OPEN → bei YES gesperrt
    // regress-unterlagen-nachfordern braucht RG-04 NO/OPEN → bei YES gesperrt
    const noAvailableCheckpoints: OfficeCheckpointSnapshot[] = [
      makeCheckpoint("RG-01", OfficeCheckpointState.OPEN),
      makeCheckpoint("RG-02", OfficeCheckpointState.OPEN),
      makeCheckpoint("RG-03", OfficeCheckpointState.YES),
      makeCheckpoint("RG-04", OfficeCheckpointState.YES),
      makeCheckpoint("RG-05", OfficeCheckpointState.YES),
    ];
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: noAvailableCheckpoints,
      }),
    );
    expect(html).not.toContain("Vorbereiten");
  });

  it("zeigt unavailableReason-Text für gesperrte Module", () => {
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [],
      }),
    );
    // Die unavailableReason enthält erklärenden Text (z. B. über fehlende Checkpoints)
    expect(html.length).toBeGreaterThan(100);
    // Es sollte kein leeres Reason-Element geben (jedes gesperrte Modul hat einen Grund)
    expect(html).not.toMatch(/unavailableReason">\s*<\/span>/);
  });
});

// ---------------------------------------------------------------------------
// 4. Gemischte Verfügbarkeit
// ---------------------------------------------------------------------------

describe("OfficeWritePanel: Gemischte Verfügbarkeit", () => {
  it("zeigt beide Abschnitte wenn einige Module verfügbar und andere gesperrt sind", () => {
    // checkpoints: [] → RG-03/RG-04 sind OPEN:
    //   arztgespraech (anyOf RG-03 OPEN) → verfügbar
    //   unterlagen (anyOf RG-04 OPEN)    → verfügbar
    //   stellungnahme (allOf RG-01 YES)  → gesperrt (RG-01 fehlt)
    const html = renderToStaticMarkup(
      React.createElement(OfficeWritePanel, {
        topicId: OFFICE_TOPIC_REGRESS,
        checkpoints: [],
      }),
    );
    // Mindestens ein verfügbares Modul (RG-01+RG-02 YES)
    expect(html).toContain("Jetzt möglich");
    // Mindestens ein gesperrtes Modul
    expect(html).toContain("Noch nicht möglich");
  });
});
