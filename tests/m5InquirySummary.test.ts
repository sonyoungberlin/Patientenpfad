/**
 * Tests für buildInquiryM5Summary – kompakte M5-Kurznotiz.
 *
 * Prüft:
 * - Korrekte Profilbezeichnungen (deutsch)
 * - Korrekte Entscheidungstexte (möglich/abgelehnt/offen)
 * - Ableitbare Grundtexte aus specificRole
 * - Explizite m5Codes (Fachrichtung fehlt, Hausarztvermittlungsfall, technisches Problem, Infekt-Verdacht)
 * - Maximal 2 Grundsegmente
 * - Ausschlüsse (ACTION-Texte, Links, lange Sätze)
 * - Mehrere Sections
 */

import {
  buildInquiryM5SectionSummary,
  buildInquiryM5Summary,
  M5_PROFILE_CODES,
  M5_DECISION_CODES,
  M5_REASON_LABELS,
} from "@/lib/inquiries/buildInquiryM5Summary";
import { DecisionStatus, ExplanationStatus, ActionStatus } from "@/lib/inquiries/types";
import type { InquirySection, M5ReasonCode } from "@/lib/inquiries/types";

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
// Profilbezeichnungen
// ---------------------------------------------------------------------------

describe("M5_PROFILE_CODES", () => {
  it("alle 12 Profile haben eine Bezeichnung", () => {
    const profileIds = [
      "AU", "PRESCRIPTION", "REFERRAL", "MEDICAL_DOCUMENTS",
      "APPOINTMENT", "ACUTE_CARE", "LAB", "SAMPLE_COLLECTION",
      "IMMUNIZATION", "BILLING", "TECH_SUPPORT", "ONBOARDING",
    ];
    for (const id of profileIds) {
      expect(M5_PROFILE_CODES[id]).toBeDefined();
      expect(typeof M5_PROFILE_CODES[id]).toBe("string");
      expect(M5_PROFILE_CODES[id].length).toBeGreaterThan(0);
    }
  });

  it("Profilbezeichnungen enthalten keine englischen Großbuchstaben-Codes", () => {
    // Außer AU (Abkürzung im Deutschen)
    const codeValues = Object.entries(M5_PROFILE_CODES).filter(([id]) => id !== "AU");
    for (const [, label] of codeValues) {
      expect(label).not.toMatch(/^[A-Z]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Decision-Codes
// ---------------------------------------------------------------------------

describe("M5_DECISION_CODES", () => {
  it("POSSIBLE → möglich", () => {
    expect(M5_DECISION_CODES[DecisionStatus.POSSIBLE]).toBe("möglich");
  });

  it("NOT_POSSIBLE → abgelehnt", () => {
    expect(M5_DECISION_CODES[DecisionStatus.NOT_POSSIBLE]).toBe("abgelehnt");
  });

  it("DISABLED → offen", () => {
    expect(M5_DECISION_CODES[DecisionStatus.DISABLED]).toBe("offen");
  });
});

// ---------------------------------------------------------------------------
// Reason-Labels
// ---------------------------------------------------------------------------

describe("M5_REASON_LABELS", () => {
  const allCodes: M5ReasonCode[] = [
    "NO_DATA", "NO_DOC", "NO_SPECIALTY", "NO_REPORT",
    "NEED_VISIT", "EXTERNAL", "COST", "TIME_LIMIT",
    "INFECTIOUS", "WRONG_CHANNEL", "TECH", "HAV",
  ];

  it("alle 12 Grund-Codes haben ein deutsches Label", () => {
    for (const code of allCodes) {
      expect(M5_REASON_LABELS[code]).toBeDefined();
      expect(M5_REASON_LABELS[code].length).toBeGreaterThan(0);
    }
  });

  it("keine englischen Großbuchstaben-Codes als Label-Werte", () => {
    for (const code of allCodes) {
      expect(M5_REASON_LABELS[code]).not.toMatch(/^[A-Z_]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// buildInquiryM5SectionSummary – Grundstruktur
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Grundstruktur", () => {
  it("AU POSSIBLE ohne Checkpoints → 'AU | möglich'", () => {
    const section = makeSection("AU", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | möglich");
  });

  it("AU NOT_POSSIBLE ohne Checkpoints → 'AU | abgelehnt'", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | abgelehnt");
  });

  it("AU DISABLED ohne Checkpoints → 'AU | offen'", () => {
    const section = makeSection("AU", DecisionStatus.DISABLED);
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | offen");
  });

  it("PRESCRIPTION → Bezeichnung 'Rezept'", () => {
    const section = makeSection("PRESCRIPTION", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^Rezept \|/);
  });

  it("REFERRAL → Bezeichnung 'Überweisung'", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^Überweisung \|/);
  });

  it("MEDICAL_DOCUMENTS → Bezeichnung 'Attest'", () => {
    const section = makeSection("MEDICAL_DOCUMENTS", DecisionStatus.POSSIBLE);
    expect(buildInquiryM5SectionSummary(section)).toMatch(/^Attest \|/);
  });

  it("unbekanntes Profil → nutzt Profil-ID als Fallback", () => {
    const section = makeSection("UNKNOWN_PROFILE", DecisionStatus.DISABLED);
    expect(buildInquiryM5SectionSummary(section)).toBe("UNKNOWN_PROFILE | offen");
  });
});

// ---------------------------------------------------------------------------
// Grundtexte aus specificRole
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – specificRole → Grundtext", () => {
  it("AU_BACKDATE_LIMIT (RULE_TIME_LIMIT) → 'Frist überschritten'", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | abgelehnt | Frist überschritten");
  });

  it("AU_WORK_ACCIDENT (EXTERNAL_RESPONSIBILITY) → 'externe Zuständigkeit'", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_WORK_ACCIDENT: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | abgelehnt | externe Zuständigkeit");
  });

  it("BILLING_COST_NOT_COVERED (RULE_COST_COVERAGE) → 'Selbstzahlerleistung' via BILLING-Profil", () => {
    const section = makeSection("BILLING", DecisionStatus.NOT_POSSIBLE, {
      BILLING_COST_NOT_COVERED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Abrechnung | abgelehnt | Selbstzahlerleistung");
  });

  it("REF_MEDICAL_CONSULTATION_REQUIRED → 'Arztkontakt nötig'", () => {
    const section = makeSection("REFERRAL", DecisionStatus.DISABLED, {
      REF_MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Überweisung | offen | Arztkontakt nötig");
  });

  it("NO-Status → kein Grundtext", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.NO,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | abgelehnt");
  });
});

// ---------------------------------------------------------------------------
// Explizite m5Codes
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – explizite m5Codes", () => {
  it("REF_SPECIALTY_REQUIRED → 'Fachrichtung fehlt'", () => {
    const section = makeSection("REFERRAL", DecisionStatus.NOT_POSSIBLE, {
      REF_SPECIALTY_REQUIRED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Überweisung | abgelehnt | Fachrichtung fehlt");
  });

  it("REF_HAV_CASE → 'Hausarztvermittlungsfall' (als Kontextcode bei möglich)", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_HAV_CASE: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Überweisung | möglich | Hausarztvermittlungsfall");
  });

  it("INFECTIOUS_PROTOCOL → 'Infekt-Verdacht'", () => {
    const section = makeSection("APPOINTMENT", DecisionStatus.DISABLED, {
      INFECTIOUS_PROTOCOL: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Termin | offen | Infekt-Verdacht");
  });

  it("TECH_VIDEO_NOT_WORKING → 'technisches Problem'", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_VIDEO_NOT_WORKING: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Technik | offen | technisches Problem");
  });

  it("TECH_UPLOAD_FAILED → 'technisches Problem'", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_UPLOAD_FAILED: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Technik | offen | technisches Problem");
  });

  it("TECH_LOGIN_PROBLEM → 'technisches Problem'", () => {
    const section = makeSection("TECH_SUPPORT", DecisionStatus.DISABLED, {
      TECH_LOGIN_PROBLEM: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Technik | offen | technisches Problem");
  });
});

// ---------------------------------------------------------------------------
// Maximal 2 Grundsegmente
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Begrenzung auf 2 Grundsegmente", () => {
  it("3 aktive Checkpoints → nur 2 Grundsegmente in Ausgabe", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,   // Frist überschritten
      AU_WORK_ACCIDENT: ExplanationStatus.YES,     // externe Zuständigkeit
      AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES, // Frist überschritten (Duplikat → 2 unique)
    });
    const result = buildInquiryM5SectionSummary(section);
    const parts = result.split(" | ");
    // Profil | Entscheidung | max 2 Grundsegmente = max 4 Teile
    expect(parts.length).toBeLessThanOrEqual(4);
    expect(parts[0]).toBe("AU");
    expect(parts[1]).toBe("abgelehnt");
  });

  it("Duplikate aus verschiedenen Checkpoints erscheinen nur einmal", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,    // Frist überschritten
      AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES, // Frist überschritten (Duplikat)
    });
    const result = buildInquiryM5SectionSummary(section);
    const parts = result.split(" | ");
    const timeLimitCount = parts.filter((p) => p === "Frist überschritten").length;
    expect(timeLimitCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Ausschlüsse – keine Action-Texte, keine Links, keine langen Sätze
// ---------------------------------------------------------------------------

describe("buildInquiryM5SectionSummary – Ausschlüsse", () => {
  it("ACTION-Checkpoints erzeugen keine Grundsegmente", () => {
    // BOOK_APPOINTMENT ist eine ACTION – darf nicht in M5 erscheinen
    const section = makeSection("AU", DecisionStatus.POSSIBLE, {
      BOOK_APPOINTMENT: ActionStatus.ACTIVE,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | möglich");
  });

  it("Ausgabe enthält keine URLs", () => {
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_HAV_CASE: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result).not.toMatch(/https?:\/\//);
  });

  it("Ausgabe enthält keine englischen Großbuchstaben-Codes", () => {
    const section = makeSection("AU", DecisionStatus.NOT_POSSIBLE, {
      AU_BACKDATE_LIMIT: ExplanationStatus.YES,
      AU_WORK_ACCIDENT: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    // Keine reinen englischen Codes wie REJECTED, TIME_LIMIT etc.
    expect(result).not.toMatch(/\b(OK|REJECTED|OPEN|TIME_LIMIT|EXTERNAL|NO_DATA|COST)\b/);
  });

  it("Ausgabe enthält maximal 4 Segmente (geteilt durch ' | ')", () => {
    const section = makeSection("BILLING", DecisionStatus.NOT_POSSIBLE, {
      BILLING_COST_NOT_COVERED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    const tokenCount = result.split(" | ").length;
    // Profil + Entscheidung + max 2 Grundsegmente = max 4
    expect(tokenCount).toBeLessThanOrEqual(4);
  });

  it("PROCESS_INFO specificRole erzeugt kein Grundsegment", () => {
    // REF_PSYCHOTHERAPY_FIRST_STEP hat specificRole=PROCESS_INFO → kein Grundsegment
    const section = makeSection("REFERRAL", DecisionStatus.POSSIBLE, {
      REF_PSYCHOTHERAPY_FIRST_STEP: ExplanationStatus.YES,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("Überweisung | möglich");
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

  it("kombiniertes Szenario: AU möglich, LAB abgelehnt mit Selbstzahlerleistung", () => {
    const sections = [
      makeSection("AU", DecisionStatus.POSSIBLE),
      makeSection("LAB", DecisionStatus.NOT_POSSIBLE, {
        LAB_SELF_PAYER_IGEL: ExplanationStatus.YES,
      }),
    ];
    const result = buildInquiryM5Summary(sections);
    expect(result[0]).toBe("AU | möglich");
    expect(result[1]).toBe("Labor | abgelehnt | Selbstzahlerleistung");
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
    expect(result).toBe("AU | möglich");
    expect(result).not.toContain("CARE_CHANNEL_CHOICE");
  });

  it("DIGITAL_REQUEST (ACTION) erscheint nicht in M5-Dokumentation", () => {
    const section = makeSection("AU", DecisionStatus.DISABLED, {
      DIGITAL_REQUEST: ActionStatus.ACTIVE,
    });
    expect(buildInquiryM5SectionSummary(section)).toBe("AU | offen");
  });

  it("REF_MEDICAL_CONSULTATION_REQUIRED erscheint nur als 'Arztkontakt nötig'", () => {
    const section = makeSection("REFERRAL", DecisionStatus.DISABLED, {
      REF_MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    expect(result).toBe("Überweisung | offen | Arztkontakt nötig");
    // Kein langer Text
    expect(result).not.toMatch(/ärztliche/i);
    expect(result).not.toMatch(/Konsultation/i);
  });

  it("Compact summary enthält keine langen Sätze (max 25 Zeichen pro Segment)", () => {
    const section = makeSection("REFERRAL", DecisionStatus.NOT_POSSIBLE, {
      REF_SPECIALTY_REQUIRED: ExplanationStatus.YES,
      REF_MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES,
    });
    const result = buildInquiryM5SectionSummary(section);
    // Jedes Segment ist maximal 25 Zeichen lang
    for (const token of result.split(" | ")) {
      expect(token.length).toBeLessThanOrEqual(25);
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
        MEDICAL_DOCUMENT_CONSULTATION_REQUIRED: ExplanationStatus.YES,
      }),
    ];
    const result = buildInquiryM5Summary(sections);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("AU | abgelehnt | Frist überschritten");
    expect(result[1]).toBe("Überweisung | offen | Fachrichtung fehlt");
    expect(result[2]).toBe("Attest | offen | Arztkontakt nötig");
  });
});
