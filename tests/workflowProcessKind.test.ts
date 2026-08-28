/**
 * Tests für lib/workflow/processKind.ts
 * Explizite, katalogbasierte Prozessartenklassifikation.
 */

import {
  getProcessKindForTopicId,
  isWorkflowProcessKind,
  type WorkflowProcessKind,
} from "@/lib/workflow/processKind";

// ---------------------------------------------------------------------------
// Alle bekannten STANDARD_PROCESS-IDs
// ---------------------------------------------------------------------------

describe("getProcessKindForTopicId – STANDARD_PROCESS", () => {
  const STANDARD_TOPICS = [
    "au-musterprozess",
    "rezept-musterprozess",
    "ueberweisung-musterprozess",
    "heilmittel-musterprozess",
    "hilfsmittel-musterprozess",
    "krankentransport-musterprozess",
  ];

  for (const id of STANDARD_TOPICS) {
    it(`"${id}" ist STANDARD_PROCESS`, () => {
      expect(getProcessKindForTopicId(id)).toBe("STANDARD_PROCESS");
    });
  }
});

// ---------------------------------------------------------------------------
// Alle bekannten PRACTICE_PROCESS-IDs
// ---------------------------------------------------------------------------

describe("getProcessKindForTopicId – PRACTICE_PROCESS", () => {
  it('"patienten-ohne-termin" ist PRACTICE_PROCESS', () => {
    expect(getProcessKindForTopicId("patienten-ohne-termin")).toBe("PRACTICE_PROCESS");
  });
});

// ---------------------------------------------------------------------------
// Unbekannte IDs → undefined (kein stilles Fallback)
// ---------------------------------------------------------------------------

describe("getProcessKindForTopicId – unbekannte IDs", () => {
  it("gibt undefined für leeren String zurück", () => {
    expect(getProcessKindForTopicId("")).toBeUndefined();
  });

  it("gibt undefined für unbekannte ID zurück", () => {
    expect(getProcessKindForTopicId("unbekannter-prozess")).toBeUndefined();
    expect(getProcessKindForTopicId("STANDARD_PROCESS")).toBeUndefined();
    expect(getProcessKindForTopicId("PRACTICE_PROCESS")).toBeUndefined();
  });

  it("gibt undefined für Tippfehler in bekannten IDs zurück", () => {
    expect(getProcessKindForTopicId("au_musterprozess")).toBeUndefined();
    expect(getProcessKindForTopicId("AU-musterprozess")).toBeUndefined();
    expect(getProcessKindForTopicId("patienten_ohne_termin")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isWorkflowProcessKind Guard
// ---------------------------------------------------------------------------

describe("isWorkflowProcessKind", () => {
  it("akzeptiert STANDARD_PROCESS und PRACTICE_PROCESS", () => {
    expect(isWorkflowProcessKind("STANDARD_PROCESS")).toBe(true);
    expect(isWorkflowProcessKind("PRACTICE_PROCESS")).toBe(true);
  });

  it("lehnt andere Werte ab", () => {
    expect(isWorkflowProcessKind("UNKNOWN")).toBe(false);
    expect(isWorkflowProcessKind("")).toBe(false);
    expect(isWorkflowProcessKind(null)).toBe(false);
    expect(isWorkflowProcessKind(undefined)).toBe(false);
    expect(isWorkflowProcessKind(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Vollständigkeit: Jede Prozess-ID wird exakt einer Prozessart zugeordnet
// ---------------------------------------------------------------------------

it("Alle 7 bekannten Prozess-IDs haben eine definierte Prozessart", () => {
  const known = [
    "au-musterprozess",
    "rezept-musterprozess",
    "ueberweisung-musterprozess",
    "heilmittel-musterprozess",
    "hilfsmittel-musterprozess",
    "krankentransport-musterprozess",
    "patienten-ohne-termin",
  ];
  for (const id of known) {
    const kind = getProcessKindForTopicId(id);
    expect(kind).toBeDefined();
    expect(isWorkflowProcessKind(kind)).toBe(true);
  }
});
