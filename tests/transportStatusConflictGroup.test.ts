/**
 * Tests für die TRANSPORT_STATUS-Exklusivgruppe.
 *
 * Die Gruppe umfasst drei Checkpoints:
 *   TRANSPORT_APPROVED, TRANSPORT_NOT_APPROVED, TRANSPORT_INFO_MISSING
 *
 * Invariante: Maximal einer darf gleichzeitig SHOW sein.
 * Durchgesetzt durch `applyExclusiveGroupConstraints` in inquirySessionService.
 *
 * Fälle:
 *  1. TRANSPORT_APPROVED → SHOW: andere werden auf HIDE gesetzt.
 *  2. TRANSPORT_NOT_APPROVED → SHOW: andere werden auf HIDE gesetzt.
 *  3. TRANSPORT_INFO_MISSING → SHOW: andere werden auf HIDE gesetzt.
 *  4. Alle auf HIDE: keine Änderung.
 *  5. Ein Checkpoint SHOW, ein anderer HIDE (bereits korrekt): SHOW bleibt, HIDE bleibt.
 *  6. Leere Map: keine Änderung.
 *  7. Nicht-Gruppe-Checkpoints werden nicht berührt.
 *  8. Wenn SHOW→HIDE gesetzt wird, bleiben andere Mitglieder unverändert (kein Auto-SHOW).
 */

import { applyExclusiveGroupConstraints } from "@/lib/inquiries/inquirySessionService";
import { ExplanationOutputStatus } from "@/lib/inquiries/types";

const SHOW = ExplanationOutputStatus.SHOW;
const HIDE = ExplanationOutputStatus.HIDE;

const GROUP = [
  "TRANSPORT_APPROVED",
  "TRANSPORT_NOT_APPROVED",
  "TRANSPORT_INFO_MISSING",
] as const;

// ---------------------------------------------------------------------------
// 1. TRANSPORT_APPROVED → SHOW
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – TRANSPORT_APPROVED SHOW", () => {
  it("TRANSPORT_APPROVED SHOW → TRANSPORT_NOT_APPROVED und TRANSPORT_INFO_MISSING werden HIDE", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_APPROVED: SHOW,
    });
    expect(result["TRANSPORT_APPROVED"]).toBe(SHOW);
    expect(result["TRANSPORT_NOT_APPROVED"]).toBe(HIDE);
    expect(result["TRANSPORT_INFO_MISSING"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 2. TRANSPORT_NOT_APPROVED → SHOW
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – TRANSPORT_NOT_APPROVED SHOW", () => {
  it("TRANSPORT_NOT_APPROVED SHOW → TRANSPORT_APPROVED und TRANSPORT_INFO_MISSING werden HIDE", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_NOT_APPROVED: SHOW,
    });
    expect(result["TRANSPORT_NOT_APPROVED"]).toBe(SHOW);
    expect(result["TRANSPORT_APPROVED"]).toBe(HIDE);
    expect(result["TRANSPORT_INFO_MISSING"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 3. TRANSPORT_INFO_MISSING → SHOW
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – TRANSPORT_INFO_MISSING SHOW", () => {
  it("TRANSPORT_INFO_MISSING SHOW → TRANSPORT_APPROVED und TRANSPORT_NOT_APPROVED werden HIDE", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_INFO_MISSING: SHOW,
    });
    expect(result["TRANSPORT_INFO_MISSING"]).toBe(SHOW);
    expect(result["TRANSPORT_APPROVED"]).toBe(HIDE);
    expect(result["TRANSPORT_NOT_APPROVED"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 4. Alle auf HIDE – keine Änderung
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – alle HIDE", () => {
  it("alle drei HIDE → keine Änderung an der Map", () => {
    const input = {
      TRANSPORT_APPROVED: HIDE,
      TRANSPORT_NOT_APPROVED: HIDE,
      TRANSPORT_INFO_MISSING: HIDE,
    };
    const result = applyExclusiveGroupConstraints(input);
    expect(result).toEqual(input);
  });
});

// ---------------------------------------------------------------------------
// 5. Eines SHOW, anderes bereits HIDE (konsistenter Eingabestand)
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – konsistenter Eingabestand", () => {
  it("TRANSPORT_APPROVED SHOW + TRANSPORT_NOT_APPROVED HIDE eingegeben → Ergebnis konsistent", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_APPROVED: SHOW,
      TRANSPORT_NOT_APPROVED: HIDE,
    });
    expect(result["TRANSPORT_APPROVED"]).toBe(SHOW);
    expect(result["TRANSPORT_NOT_APPROVED"]).toBe(HIDE);
    expect(result["TRANSPORT_INFO_MISSING"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 6. Leere Map
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – leere Map", () => {
  it("leere Map → leere Map zurück (kein Fehler)", () => {
    const result = applyExclusiveGroupConstraints({});
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 7. Nicht-Gruppe-Checkpoints unberührt
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – fremde Checkpoints unberührt", () => {
  it("TRANSPORT_APPROVED SHOW → andere Checkpoints außerhalb der Gruppe bleiben unverändert", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_APPROVED: SHOW,
      SOME_OTHER_CHECKPOINT: SHOW,
      ANOTHER_CHECKPOINT: HIDE,
    });
    expect(result["SOME_OTHER_CHECKPOINT"]).toBe(SHOW);
    expect(result["ANOTHER_CHECKPOINT"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 8. HIDE-Aktion löst kein Auto-SHOW aus
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – HIDE löst kein Auto-SHOW aus", () => {
  it("TRANSPORT_APPROVED HIDE → andere bleiben wie eingegeben (kein Auto-SHOW)", () => {
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_APPROVED: HIDE,
    });
    // Kein SHOW-Propagation
    expect(result["TRANSPORT_NOT_APPROVED"]).toBeUndefined();
    expect(result["TRANSPORT_INFO_MISSING"]).toBeUndefined();
    expect(result["TRANSPORT_APPROVED"]).toBe(HIDE);
  });
});

// ---------------------------------------------------------------------------
// 9. Nur maximal einer kann nach Anwendung SHOW sein
// ---------------------------------------------------------------------------

describe("TRANSPORT_STATUS Exklusivgruppe – Invariante: maximal einer SHOW", () => {
  it.each(GROUP)("%s SHOW → danach hat genau einer der Gruppe SHOW", (showId) => {
    const result = applyExclusiveGroupConstraints({ [showId]: SHOW });
    const showCount = GROUP.filter((id) => result[id] === SHOW).length;
    expect(showCount).toBe(1);
  });

  it("alle drei auf SHOW gesetzt (ungültiger Eingabestand) → nach Anwendung maximal einer SHOW", () => {
    // Eingabe ist inkonsistent; Funktion soll deterministisch korrigieren.
    // Reihenfolge der Object.entries-Iteration entscheidet; Test prüft nur die Invariante.
    const result = applyExclusiveGroupConstraints({
      TRANSPORT_APPROVED: SHOW,
      TRANSPORT_NOT_APPROVED: SHOW,
      TRANSPORT_INFO_MISSING: SHOW,
    });
    const showCount = GROUP.filter((id) => result[id] === SHOW).length;
    expect(showCount).toBeLessThanOrEqual(1);
  });
});
