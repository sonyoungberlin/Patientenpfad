/**
 * Tests für buildInquiryM5Summary – kompakte M5-Kurznotiz.
 *
 * Prüft:
 * - Korrekte Profilcodes
 * - Korrekte Entscheidungscodes (POSSIBLE→OK, NOT_POSSIBLE→REJECTED, DISABLED→OPEN)
 * - Ableitbare Grundcodes aus specificRole
 * - Explizite m5Codes (NO_SPECIALTY, HAV, TECH, INFECTIOUS)
 * - Maximal 2 Grundcodes
 * - Ausschlüsse (ACTION-Texte, Links, lange Sätze)
 * - Mehrere Sections
 */

import {
  buildInquiryM5SectionSummary,
  buildInquiryM5Summary,
  M5_PROFILE_CODES,
  M5_DECISION_CODES,
} from "@/lib/inquiries/buildInquiryM5Summary";
import { DecisionStatus, ExplanationStatus, ActionStatus } from "@/lib/inquiries/types";
import type { InquirySection } from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeSection(
  inquiryId: string,
  decisionStatus: DecisionStatus,
  checkpointStatuses: Record<string, string> = {},
): InquirySection {
  return {
    inquiryId,
    decisionStatus,
    checkpointStatuses: checkpointStatuses as Record<string, never>,
  };
}

// ---------------------------------------------------------------------------
// Profilcodes
// ---------------------------------------------------------------------------

describe("M5_PROFILE_CODES", () => {
  it("alle 12 Profile haben einen Kurzcode", () => {
    const profileIds = [
      "AU", "PRESCRIPTION", "REFERRAL", "MEDICAL_DOCUMENTS",
      "APPOINTMENT", "ACUTE_CARE", "LAB", "SAMPLE_COLLECTION",
      "IMMUNIZATION", "BILLING", "TECH_SUPPORT", "ONBOARDING",
    ];
    for (const id of profileIds) {
      expect(M5_PROFILE_CODES[id]).toBeDefined();
      expect(typeof M5_PROFILE_CODES[id]).toBe("string");
    }
  });

  it("Kurzcode ist kürzer als Profil-ID", () => {
    for (const [id, code] of Object.entries(M5_PROFILE_CODES)) {
      expect(code.length).toBeLessThanOrEqual(id.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Decision-Codes
// ---------------------------------------------------------------------------

describe("M5_DECISION_CODES", () => {
  it("POSSIBLE → OK", () => {
    expect(M5_DECISION_CODES[DecisionStatus.POSSIBLE]).toBe("OK");
  });

  it("NOT_POSSIBLE → REJECTED", () => {
    expect(M5_DECISION_CODES[DecisionStatus.NOT_POSSIBLE]).toBe("REJECTED");
  });

  it("DISABLED → OPEN", () => {
    expect(M5_DECISION_CODES[DecisionStatus.DISABLED]).toBe("OPEN");
  });
});

// ---------------------------------------------------------------------------
// buildInquiryM5SectionSummary – Grundstruktur
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Grundstruktur", () => {
  it("AU POSSIBLE ohne Checkpoints → 'AU | OK'", () => {
    const section = makeSection("AU", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | OK");
  });

  it("AU NOT_POSSIBLE ohne Checkpoints → 'AU | REJECTED'", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | REJECTED");
  });

  it("AU DISABLED ohne Checkpoints → 'AU | OPEN'", () => {
    const section = makeSection("AU", DecisionStatus.DISABLED);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | OPEN");
  });

  it("PRESCRIPTION → Kurzcode RX", () => {
    const section = makeSection("PRESCRIPTION", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^RX \|/);
  });

  it("REFERRAL → Kurzcode REF", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^REF \|/);
  });

  it("MEDICAL_DOCUMENTS → Kurzcode DOC", () => {
    const section = makeSection("MEDICAL_DOCUMENTS", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^DOC \|/);
  });

  it("unbekanntes Profil → nutzt Profil-ID als Fallback", () => {
    const section = makeSection("UNKNOWN_PROFILE", DecisionStatus.DISABLED);
    expect(buildInquiryM5SectionSummary(section)).toBe("UNKNOWN_PROFILE | OPEN");
  });
});

// ---------------------------------------------------------------------------
// Grundcodes aus specificRole
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – specificRole → Grundcode", () => {
  it("AU_BACKDATE_LIMIT (RULE_TIME_LIMIT) → TIME_LIMIT", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | REJECTED | TIME_LIMIT");
  });

  it("AU_WORK_ACCIDENT (EXTERNAL_RESPONSIBILITY) → EXTERNAL", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_WORK_ACCIDENT: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | REJECTED | EXTERNAL");
  });

  it("BILLING_COST_NOT_COVERED (RULE_COST_COVERAGE) → COST via BILLING profile", () => {
    const section = makeSection("BILLING", DecisionStatus.NOT_POSSIBLE, {
      BILLING_COST_NOT_COVERED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("BILL | REJECTED | COST");
  });

  it("MEDICAL_CONSULTATION_REQUIRED → NEED_VISIT", () => {
    const section = makeSection("REFERRAL", DecisionStatus.DISABLED, {
      MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("REF | OPEN | NEED_VISIT");
  });

  it("NO-Status → kein Grundcode", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.NO,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | REJECTED");
  });
});

// ---------------------------------------------------------------------------
// Explizite m5Codes
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – explizite m5Codes", () => {
  it("REF_SPECIALTY_REQUIRED → NO_SPECIALTY", () => {
    const section = makeSection("REFERRAL", DecisionStatus.NOT_POSSIBLE, {
      REF_SPECIALTY_REQUIRED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("REF | REJECTED | NO_SPECIALTY");
  });

  it("REF_HAV_CASE → HAV (als Kontextcode bei POSSIBLE)", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_HAV_CASE: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("REF | OK | HAV");
  });

  it("INFECTIOUS_PROTOCOL → INFECTIOUS", () => {
    const section = makeSection("APPOINTMENT", DecisionStatus.DISABLED, {
      INFECTIOUS_PROTOCOL: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("APPT | OPEN | INFECTIOUS");
  });

  it("TECH_VIDEO_NOT_WORKING → TECH (nicht WRONG_CHANNEL)", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_VIDEO_NOT_WORKING: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("TECH | OPEN | TECH");
  });

  it("TECH_UPLOAD_FAILED → TECH", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_UPLOAD_FAILED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("TECH | OPEN | TECH");
  });

  it("TECH_LOGIN_PROBLEM → TECH", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_LOGIN_PROBLEM: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("TECH | OPEN | TECH");
  });
});

// ---------------------------------------------------------------------------
// Maximal 2 Grundcodes
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Begrenzung auf 2 Grundcodes", () => {
  it("3 aktive Checkpoints → nur 2 Grundcodes in Ausgabe", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,   // TIME_LIMIT
      AU_WORK_ACCIDENT: ExplanationStatus.YES,     // EXTERNAL
      AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES, // TIME_LIMIT (Duplikat → 2 unique)
    });
    const result = buildInquiryM5SectionSummary(section);
    const parts = result.split(" | ");
    // PROFILCODE | DECISIONCODE | max 2 Grundcodes = max 4 Teile
    expect(parts.length).toBeLessThanOrEqual(4);
    expect(parts[0]).toBe("AU");
    expect(parts[1]).toBe("REJECTED");
  });

  it("Duplikate aus verschiedenen Checkpoints erscheinen nur einmal", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,    // TIME_LIMIT
      AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES, // TIME_LIMIT (Duplikat)
    });
    const result = buildInquiryM5SectionSummary(section);
    const parts = result.split(" | ");
    const timeLimitCount = parts.filter((p) => p === "TIME_LIMIT").length;
    expect(timeLimitCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Ausschlüsse – keine Action-Texte, keine Links, keine langen Sätze
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Ausschlüsse", () => {
  it("ACTION-Checkpoints erzeugen keine Grundcodes", () => {
    // BOOK_APPOINTMENT ist eine ACTION – darf nicht in M5 erscheinen
    const section = makeSection("AU", DecisionStatus.POSSIBLE, {
      BOOK_APPOINTMENT: ActionStatus.ACTIVE,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | OK");
  });

  it("Ausgabe enthält keine URLs", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_HAV_CASE: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result).not.toMatch(/https?:\/\//);
  });

  it("Ausgabe enthält keine langen Sätze (max 50 Zeichen)", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,
      AU_WORK_ACCIDENT: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result.length).toBeLessThan(50);
  });

  it("Ausgabe enthält maximal 4 Token (geteilt durch ' | ')", () => {
    const section = makeSection("BILLING", DecisionStatus.NOT_POSSIBLE, {
      BILLING_COST_NOT_COVERED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    const tokenCount = result.split(" | ").length;
    // Profilcode + Entscheidungscode + max 2 Grundcodes = max 4
    expect(tokenCount).toBeLessThanOrEqual(4);
  });

  it("PROCESS_INFO specificRole erzeugt keinen Grundcode", () => {
    // REF_PSYCHOTHERAPY_FIRST_STEP hat specificRole=PROCESS_INFO → kein Grundcode
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_PSYCHOTHERAPY_FIRST_STEP: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("REF | OK");
  });
});

// ---------------------------------------------------------------------------
// buildInquiryM5Summary – mehrere Sections
// ---------------------------------------------------------------------------

describe("buildInquiryM5Summary – mehrere Sections", () => {
  it("gibt eine Zeile pro Section zurück", () => {
    const sections = [
      makeSection("AU", DecisionStatus.POSSIBLE),
      makeSection("PRESCRIPTION", DecisionStatus.NOT_POSSIBLE),
      makeSection("REFERRAL", DecisionStatus.DISABLED),
    ];
    const result = buildInquiryM5Summary(sections);
    expect(result).toHaveLength(3);
  });

  it("leere Sections-Liste → leeres Array", () => {
    expect(buildInquiryM5Summary([])).toEqual([]);
  });

  it("kombiniertes Szenario: AU OK, LAB REJECTED mit COST", () => {
    const sections = [
      makeSection("AU", DecisionStatus.POSSIBLE),
      makeSection("LAB", DecisionStatus.NOT_POSSIBLE, {
        LAB_SELF_PAYER_IGEL: ExplanationStatus.YES,
      }),
    ];
    const result = buildInquiryM5Summary(sections);
    expect(result[0]).toBe("AU | OK");
    expect(result[1]).toBe("LAB | REJECTED | COST");
  });
});

// ---------------------------------------------------------------------------
// UI-Integration: Spezifische Ausschlüsse nach Problemstellung
// ---------------------------------------------------------------------------

describe("buildInquiryM5Summary – UI-Integration Ausschlüsse", () => {
  it("CARE_CHANNEL_CHOICE (ACTION) erscheint nicht in M5-Dokumentation", () => {
    // CARE_CHANNEL_CHOICE ist ein ACTION-Checkpoint – darf nicht in M5 erscheinen
    const section = makeSection("AU", DecisionStatus.POSSIBLE, {
      CARE_CHANNEL_CHOICE: ActionStatus.ACTIVE,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result).toBe("AU | OK");
    expect(result).not.toContain("CARE_CHANNEL_CHOICE");
  });

  it("DIGITAL_REQUEST (ACTION) erscheint nicht in M5-Dokumentation", () => {
    const section = makeSection("AU", DecisionStatus.DISABLED, {
      DIGITAL_REQUEST: ActionStatus.ACTIVE,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | OPEN");
  });

  it("MEDICAL_CONSULTATION_REQUIRED erscheint nur als NEED_VISIT", () => {
    const section = makeSection("REFERRAL", DecisionStatus.DISABLED, {
      MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result).toBe("REF | OPEN | NEED_VISIT");
    // Kein langer Text
    expect(result).not.toMatch(/ärztliche/i);
    expect(result).not.toMatch(/Konsultation/i);
  });

  it("Compact summary enthält keine langen Sätze (max 20 Zeichen pro Token)", () => {
    const section = makeSection("REFERRAL", DecisionStatus.NOT_POSSIBLE, {
      REF_SPECIALTY_REQUIRED: ExplanationStatus.YES,
      MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    // Jedes Token ist maximal 20 Zeichen lang
    for (const token of result.split(" | ")) {
      expect(token.length).toBeLessThanOrEqual(20);
    }
  });

  it("Vorschau-Output: mehrere Profile erzeugen je eine Zeile", () => {
    const sections = [
      makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
        AU_BACKDATE_LIMIT: ExplanationStatus.YES,
      }),
      makeSection("REFERRAL", DecisionStatus.DISABLED, {
        REF_SPECIALTY_REQUIRED: ExplanationStatus.YES,
      }),
      makeSection("MEDICAL_DOCUMENTS", DecisionStatus.DISABLED, {
        MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
      }),
    ];
    const result = buildInquiryM5Summary(sections);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("AU | REJECTED | TIME_LIMIT");
    expect(result[1]).toBe("REF | OPEN | NO_SPECIALTY");
    expect(result[2]).toBe("DOC | OPEN | NEED_VISIT");
  });
});
