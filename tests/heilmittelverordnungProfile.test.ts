import * as fs from "fs";
import * as path from "path";

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  ActionStatus,
  DecisionStatus,
  ExplanationStatus,
  InquiryCheckpointKind,
} from "@/lib/inquiries/types";

const PROFILE_ID = "HEILMITTELVERORDNUNG";

type Cond = {
  showWhenAny?: Array<Record<string, string>>;
  hideWhenAny?: Array<Record<string, string>>;
};

function isVisible(cond: Cond | undefined, statuses: Record<string, string>): boolean {
  const matchesAny = (sets?: Array<Record<string, string>>) =>
    !!sets &&
    sets.some((set) =>
      Object.entries(set).every(([cpId, expected]) => statuses[cpId] === expected),
    );

  if (cond?.hideWhenAny && matchesAny(cond.hideWhenAny)) return false;
  if (cond?.showWhenAny) return matchesAny(cond.showWhenAny);
  return true;
}

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("HEILMITTELVERORDNUNG – Profil und Checkpoints", () => {
  const profile = INQUIRY_PROFILE_CATALOG_V2[PROFILE_ID];

  it("Profil ist vorhanden", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe(PROFILE_ID);
  });

  it("enthält genau die sechs HMV-spezifischen Checkpoints", () => {
    expect(profile.specificCheckpointIds).toEqual([
      "HMV_REQUEST_COMPLETE",
      "HMV_INFO_MISSING",
      "HMV_PREVIOUS_ORDER_MISSING",
      "HMV_DOCTOR_REVIEW_REQUIRED",
      "HMV_IN_PERSON_REQUIRED",
      "HMV_NOT_DIGITAL_POSSIBLE",
    ]);
  });

  it("verwendet EXPLANATION-Checkpoints mit passenden Rollen", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_REQUEST_COMPLETE.kind).toBe(
      InquiryCheckpointKind.EXPLANATION,
    );
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_REQUEST_COMPLETE.specificRole).toBe("PROCESS_INFO");

    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_INFO_MISSING.specificRole).toBe("MISSING_INFORMATION");
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_PREVIOUS_ORDER_MISSING.specificRole).toBe("MISSING_DOCUMENT");
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_DOCTOR_REVIEW_REQUIRED.specificRole).toBe("MEDICAL_REVIEW_REQUIRED");
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_IN_PERSON_REQUIRED.specificRole).toBe("MEDICAL_REVIEW_REQUIRED");
    expect(INQUIRY_CHECKPOINT_CATALOG_V2.HMV_NOT_DIGITAL_POSSIBLE.specificRole).toBe("CHANNEL_NOT_SUITABLE");
  });

  it("enthält keine Alarmwörter wie 'dringend' oder 'akut' in den HMV-Patiententexten", () => {
    const ids = profile.specificCheckpointIds;
    for (const id of ids) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      const text = cp.textByStatus[ExplanationStatus.YES] ?? "";
      const lower = text.toLowerCase();
      expect(lower).not.toContain("dringend");
      expect(lower).not.toContain("akut");
    }
  });
});

describe("HEILMITTELVERORDNUNG – M2 Section-Intro-Zuordnung", () => {
  const src = loadM2ClientSource();

  it("hat ein Mapping im SECTION_INTRO_GROUPS_BY_PROFILE", () => {
    const start = src.indexOf("  HEILMITTELVERORDNUNG: [");
    expect(start).toBeGreaterThan(-1);
  });

  it("ordnet die HMV-Checkpoints den erwarteten Schubladen zu", () => {
    const start = src.indexOf("  HEILMITTELVERORDNUNG: [");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("\n  ],", start);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);

    expect(block).toContain('sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE"');
    expect(block).toContain('"HMV_REQUEST_COMPLETE"');

    expect(block).toContain('sectionIntroId: "SECTION_INTRO_INFO_MISSING"');
    expect(block).toContain('"HMV_INFO_MISSING"');

    expect(block).toContain('sectionIntroId: "SECTION_INTRO_DOCS_MISSING"');
    expect(block).toContain('"HMV_PREVIOUS_ORDER_MISSING"');

    expect(block).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
    expect(block).toContain('"HMV_DOCTOR_REVIEW_REQUIRED"');
    expect(block).toContain('"HMV_IN_PERSON_REQUIRED"');

    expect(block).toContain('sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE"');
    expect(block).toContain('"HMV_NOT_DIGITAL_POSSIBLE"');
  });
});

describe("HEILMITTELVERORDNUNG – M3 Action-Bindung", () => {
  const profile = INQUIRY_PROFILE_CATALOG_V2[PROFILE_ID];

  it("nutzt nur bestehende Actions als boundActionCheckpointIds", () => {
    expect(profile.boundActionCheckpointIds).toEqual([
      "DIGITAL_REQUEST",
      "DOCUMENT_UPLOAD",
      "BOOK_APPOINTMENT",
    ]);
  });

  it("ordnet Actions nur den vorgesehenen Triggern zu", () => {
    expect(profile.boundActionConditions?.DIGITAL_REQUEST?.showWhenAny).toEqual([
      { HMV_INFO_MISSING: "YES" },
    ]);
    expect(profile.boundActionConditions?.DOCUMENT_UPLOAD?.showWhenAny).toEqual([
      { HMV_PREVIOUS_ORDER_MISSING: "YES" },
    ]);
    expect(profile.boundActionConditions?.BOOK_APPOINTMENT?.showWhenAny).toEqual([
      { HMV_IN_PERSON_REQUIRED: "YES" },
    ]);
  });

  it("zeigt DIGITAL_REQUEST nur bei HMV_INFO_MISSING=YES", () => {
    const cond = profile.boundActionConditions?.DIGITAL_REQUEST as Cond | undefined;
    expect(
      isVisible(cond, { HMV_INFO_MISSING: ExplanationStatus.YES }),
    ).toBe(true);
    expect(
      isVisible(cond, { HMV_INFO_MISSING: ExplanationStatus.NO }),
    ).toBe(false);
  });

  it("zeigt DOCUMENT_UPLOAD nur bei HMV_PREVIOUS_ORDER_MISSING=YES", () => {
    const cond = profile.boundActionConditions?.DOCUMENT_UPLOAD as Cond | undefined;
    expect(
      isVisible(cond, { HMV_PREVIOUS_ORDER_MISSING: ExplanationStatus.YES }),
    ).toBe(true);
    expect(
      isVisible(cond, { HMV_PREVIOUS_ORDER_MISSING: ExplanationStatus.NO }),
    ).toBe(false);
  });

  it("zeigt BOOK_APPOINTMENT nur bei HMV_IN_PERSON_REQUIRED=YES", () => {
    const cond = profile.boundActionConditions?.BOOK_APPOINTMENT as Cond | undefined;
    expect(
      isVisible(cond, { HMV_IN_PERSON_REQUIRED: ExplanationStatus.YES }),
    ).toBe(true);
    expect(
      isVisible(cond, { HMV_IN_PERSON_REQUIRED: ExplanationStatus.NO }),
    ).toBe(false);
  });
});

describe("HEILMITTELVERORDNUNG – Renderer-Ausgabe", () => {
  it("gibt die neutralen HMV-Texte aus", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: PROFILE_ID,
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          HMV_REQUEST_COMPLETE: ExplanationStatus.YES,
          HMV_INFO_MISSING: ExplanationStatus.YES,
          HMV_PREVIOUS_ORDER_MISSING: ExplanationStatus.YES,
          HMV_DOCTOR_REVIEW_REQUIRED: ExplanationStatus.YES,
          HMV_IN_PERSON_REQUIRED: ExplanationStatus.YES,
          HMV_NOT_DIGITAL_POSSIBLE: ExplanationStatus.YES,
          DIGITAL_REQUEST: ActionStatus.ACTIVE,
          DOCUMENT_UPLOAD: ActionStatus.ACTIVE,
          BOOK_APPOINTMENT: ActionStatus.ACTIVE,
        },
      },
    ]);

    const attached = result.sections[0]?.attachedParagraphs ?? [];
    const output = attached.join("\n");

    expect(output).toContain("Ihre Angaben zur Heilmittelverordnung liegen für die weitere Bearbeitung vor.");
    expect(output).toContain("Für die Bearbeitung benötigen wir noch weitere Angaben.");
    expect(output).toContain("Für die Prüfung benötigen wir noch Angaben zur bisherigen Verordnung oder relevante Unterlagen.");
    expect(output).toContain("Vor einer Entscheidung ist eine ärztliche Prüfung erforderlich.");
    expect(output).toContain("Für die weitere Bearbeitung ist ein persönlicher Termin in der Praxis erforderlich.");
    expect(output).toContain("Dieses Anliegen kann nicht vollständig digital abgeschlossen werden.");
  });
});
