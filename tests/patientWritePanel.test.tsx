/**
 * Tests für PatientWritePanel (Listenansicht / Initial-State).
 *
 * Da kein @testing-library/react installiert ist, wird `renderToStaticMarkup`
 * aus react-dom/server verwendet. Damit lässt sich der initiale Render-Zustand
 * (activeTemplateId === null) vollständig prüfen.
 * Interaktions-Tests (Vorbereiten → Formular) sind nicht möglich.
 */

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import PatientWritePanel from "@/components/PatientWritePanel";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStandard(
  id: string,
  status: "OK" | "TO_DO" | "ZURÜCKSTELLEN",
): ActiveCheckpoint {
  return {
    id,
    block_id: "test-block",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA],
    title: id,
    status,
    m4: { type: "ACTION", text: `m4 ${id}` },
  } as ActiveCheckpoint;
}

/** Alle Checkpoints K01–K09 auf gegebenen Status setzen. */
function makeAllCheckpoints(status: "OK" | "TO_DO"): ActiveCheckpoint[] {
  return ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08", "K09"].map(
    (id) => makeStandard(id, status),
  );
}

// ---------------------------------------------------------------------------
// 1. Panel-Sichtbarkeit
// ---------------------------------------------------------------------------

describe("PatientWritePanel: Sichtbarkeit", () => {
  it("rendert nichts wenn alle Checkpoints OK (keine Templates available)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: makeAllCheckpoints("OK"),
      }),
    );
    expect(html).toBe("");
  });

  it("rendert nichts bei leerer Checkpoint-Liste", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, { checkpoints: [] }),
    );
    expect(html).toBe("");
  });

  it("zeigt Panel wenn mindestens ein Checkpoint TO_DO ist", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [
          ...makeAllCheckpoints("OK"),
          makeStandard("K03", "TO_DO"),
        ],
      }),
    );
    expect(html).not.toBe("");
    expect(html).toContain("Jetzt vorbereiten");
  });
});

// ---------------------------------------------------------------------------
// 2. Listenansicht – verfügbare Module
// ---------------------------------------------------------------------------

describe("PatientWritePanel: Verfügbare Module", () => {
  it("zeigt 'Jetzt möglich' wenn mindestens ein Template available ist", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [makeStandard("K03", "TO_DO")],
      }),
    );
    expect(html).toContain("Jetzt möglich");
  });

  it("K03=TO_DO → PT-WRITE-001 'Unterlagen anfordern' sichtbar", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [
          ...makeAllCheckpoints("OK"),
          makeStandard("K03", "TO_DO"),
        ],
      }),
    );
    expect(html).toContain("Unterlagen anfordern");
  });

  it("K01=TO_DO → PT-WRITE-002 'Vorbereitung Arztgespräch' sichtbar", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [
          ...makeAllCheckpoints("OK"),
          makeStandard("K01", "TO_DO"),
        ],
      }),
    );
    expect(html).toContain("Vorbereitung Arztgespräch");
  });

  it("K06=TO_DO → PT-WRITE-003 'Offene organisatorische Punkte' sichtbar", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [
          ...makeAllCheckpoints("OK"),
          makeStandard("K06", "TO_DO"),
        ],
      }),
    );
    expect(html).toContain("Offene organisatorische Punkte");
  });

  it("alle Checkpoints TO_DO → alle 3 Templates sichtbar in 'Jetzt möglich'", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: makeAllCheckpoints("TO_DO"),
      }),
    );
    expect(html).toContain("Unterlagen anfordern");
    expect(html).toContain("Vorbereitung Arztgespräch");
    expect(html).toContain("Offene organisatorische Punkte");
  });

  it("zeigt Vorbereiten-Button für verfügbare Templates", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: makeAllCheckpoints("TO_DO"),
      }),
    );
    // Alle 3 Templates sind available → 3 Vorbereiten-Buttons
    const matches = html.match(/Vorbereiten/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 3. Listenansicht – nicht verfügbare Module
// ---------------------------------------------------------------------------

describe("PatientWritePanel: Nicht verfügbare Module", () => {
  it("zeigt 'Noch nicht möglich' wenn mindestens ein Template unavailable ist", () => {
    // Nur K03=TO_DO → PT-WRITE-001 available, PT-WRITE-002 und PT-WRITE-003 unavailable
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [
          ...makeAllCheckpoints("OK"),
          makeStandard("K03", "TO_DO"),
        ],
      }),
    );
    expect(html).toContain("Noch nicht möglich");
  });

  it("zeigt Panel nicht wenn alle Templates unavailable (alle OK)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: makeAllCheckpoints("OK"),
      }),
    );
    // Panel gibt null zurück → leerer HTML-String
    expect(html).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 4. ASSESSMENT-Checkpoints
// ---------------------------------------------------------------------------

describe("PatientWritePanel: ASSESSMENT-Checkpoints", () => {
  it("disabled ASSESSMENT-Checkpoint (K12) triggert keine Templates", () => {
    // K12 disabled → OPEN, aber kein Template triggert auf K12
    // Alle anderen Checkpoints OK → kein Template available → Panel rendert null
    const k12Disabled: ActiveCheckpoint = {
      id: "K12",
      block_id: "pflegebeobachtung",
      type: CheckpointType.BEDARF,
      category: CheckpointCategory.M,
      perspectives: [],
      mode: CheckpointMode.ASSESSMENT,
      enabled: false,
      title: "K12",
      status: "TO_DO",
      m4: { type: "NOTICE", text: "" },
    } as ActiveCheckpoint;

    const html = renderToStaticMarkup(
      React.createElement(PatientWritePanel, {
        checkpoints: [...makeAllCheckpoints("OK"), k12Disabled],
      }),
    );
    expect(html).toBe("");
  });
});
