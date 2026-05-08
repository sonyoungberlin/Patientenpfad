/**
 * Tests für den globalen EXPLANATION-Baustein DIGITAL_REQUEST_MEDICAL_REVIEW.
 *
 * Prozess-/Erwartungsmanagement-Hinweis für digitale Anfragen:
 * - kein Outcome, kein NEED_VISIT
 * - keine Ablehnung, keine Terminpflicht, keine harte Grenze
 * - in AU, PRESCRIPTION, REFERRAL gebunden
 *
 * 1. Katalogstruktur (kind, scope, classification, placement, Texte)
 * 2. Profilbindung in AU, PRESCRIPTION, REFERRAL
 * 3. Keine Bindung in optionalen Profilen MEDICAL_DOCUMENTS, HOSPITAL_ADMISSION
 *    (bewusst nicht blind eingebaut – siehe User-Vorgabe „Nicht blind überall einbauen.")
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  ExplanationStatus,
  InquiryCheckpointKind,
  InquiryCheckpointPlacement,
  InquiryCheckpointScope,
} from "@/lib/inquiries/types";

const ID = "DIGITAL_REQUEST_MEDICAL_REVIEW";
const EXPECTED_TEXT =
  "Digitale Anfragen werden vor der Bearbeitung ärztlich geprüft. Je nach Anliegen kann eine persönliche Vorstellung in der Praxis erforderlich sein.";

// ---------------------------------------------------------------------------
// 1. Katalogstruktur
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_MEDICAL_REVIEW – Katalogstruktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2[ID];

  it("ist im Katalog definiert", () => {
    expect(cp).toBeDefined();
    expect(cp.id).toBe(ID);
  });

  it("hat kind EXPLANATION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat placement ATTACHED", () => {
    expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
  });

  it("hat classification MODULAR", () => {
    expect((cp as { classification?: string }).classification).toBe("MODULAR");
  });

  it("hat genau eine Klärungsfrage", () => {
    const questions = (cp as { questions?: ReadonlyArray<{ id: string }> })
      .questions;
    expect(questions).toBeDefined();
    expect(questions).toHaveLength(1);
    expect(questions?.[0].id).toBe(`${ID}-Q1`);
  });

  it("hat YES-Text mit erwartetem Wortlaut", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ExplanationStatus.YES
    ];
    expect(text).toBe(EXPECTED_TEXT);
  });

  it("hat keinen NO-Text (NO bewusst still)", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ExplanationStatus.NO
    ];
    expect(text).toBeUndefined();
  });

  it("setzt keinen m5Code (kein Outcome / kein NEED_VISIT)", () => {
    expect((cp as { m5Code?: string }).m5Code).toBeUndefined();
  });

  it("hat keine specificRole (GLOBAL scope)", () => {
    expect((cp as { specificRole?: string }).specificRole).toBeUndefined();
  });

  it("verwendet keine harten / juristischen Formulierungen", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ExplanationStatus.YES
    ];
    expect(text).toBeDefined();
    const lower = (text as string).toLowerCase();
    // Negativliste laut User-Vorgabe
    expect(lower).not.toMatch(/anspruch/);
    expect(lower).not.toMatch(/abgelehnt/);
    expect(lower).not.toMatch(/behalten wir uns vor/);
    expect(lower).not.toMatch(/bestellung/);
    // Hinweis: "kann … erforderlich sein" ist bewusst zulässig (weiches Modal),
    // harte Pflichtformulierungen ("ist erforderlich") werden separat vermieden.
  });

  it("hat docByStatus für YES gesetzt", () => {
    const doc = (cp as { docByStatus?: Record<string, string | undefined> })
      .docByStatus;
    expect(doc?.[ExplanationStatus.YES]).toBe(
      "Patient über ärztliche Prüfung digitaler Anfragen informiert",
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Profilbindung
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_MEDICAL_REVIEW – Profilbindung", () => {
  it.each(["AU", "PRESCRIPTION", "REFERRAL"])(
    "ist in %s.boundGlobalCheckpointIds enthalten",
    (profileId) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile).toBeDefined();
      expect(profile.boundGlobalCheckpointIds).toContain(ID);
    },
  );

  it.each(["MEDICAL_DOCUMENTS", "HOSPITAL_ADMISSION"])(
    "ist in %s NICHT gebunden (bewusst nicht blind überall eingebaut)",
    (profileId) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile).toBeDefined();
      expect(profile.boundGlobalCheckpointIds).not.toContain(ID);
    },
  );
});
