import { renderInquiryResponse } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_CHECKPOINT_CATALOGUE } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOGUE } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  InquiryCheckpointStatus,
  InquiryType,
  type ConfirmedInquiryCheckpoint,
  type InquiryCheckpointTemplate,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FSME_PROFILE = INQUIRY_PROFILE_CATALOGUE[InquiryType.FSME_IMPFUNG];

/**
 * Erstellt einen ConfirmedInquiryCheckpoint aus einem Katalogeintrag.
 * Nur GEKLAERT oder HINWEIS erlaubt (Typ-Constraint).
 */
function makeConfirmed(
  id: string,
  status: InquiryCheckpointStatus.GEKLAERT | InquiryCheckpointStatus.HINWEIS,
): ConfirmedInquiryCheckpoint {
  const template = INQUIRY_CHECKPOINT_CATALOGUE[id];
  if (!template) throw new Error(`Checkpoint ${id} not in catalogue`);
  return { ...template, status };
}

/** Alle FSME-Checkpoints mit gegebenem Status. */
function allFsmeConfirmed(
  status: InquiryCheckpointStatus.GEKLAERT | InquiryCheckpointStatus.HINWEIS,
): ConfirmedInquiryCheckpoint[] {
  return FSME_PROFILE.checkpointIds.map((id) => makeConfirmed(id, status));
}

// ---------------------------------------------------------------------------
// Alle GEKLAERT → nur Kernantwort, keine Hinweise
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – alle GEKLAERT", () => {
  it("gibt die Kernantwort zurück", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.coreAnswer).toBe(FSME_PROFILE.coreAnswer);
  });

  it("gibt keine Hinweise zurück", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.hints).toHaveLength(0);
  });

  it("gibt eine Dokumentationszeile pro Checkpoint + Kopfzeile zurück", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    // 1 Kopfzeile + 5 Checkpoints
    expect(result.documentation).toHaveLength(6);
    expect(result.documentation[0]).toBe("FSME-Impfung angefragt.");
  });

  it("Dokumentation enthält GEKLAERT-Texte", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.documentation).toContain("Patientenstatus: Bestandspatient.");
    expect(result.documentation).toContain("Online-Anamnese: vollständig vorhanden.");
    expect(result.documentation).toContain("Impfberatung: bereits erfolgt.");
    expect(result.documentation).toContain("Impfpass: vorhanden.");
    expect(result.documentation).toContain("Terminwunsch: angegeben.");
  });
});

// ---------------------------------------------------------------------------
// Einzelner HINWEIS
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – einzelner HINWEIS", () => {
  it("IC03 HINWEIS → Impfberatungs-Hinweis erscheint in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toBe("Bitte buchen Sie vorab einen Termin zur Impfberatung.");
  });

  it("IC04 HINWEIS → Impfpass-Hinweis erscheint in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toBe(
      "Bitte bringen Sie Ihren Impfpass oder einen Nachweis Ihres Impfstatus mit.",
    );
  });

  it("IC03 HINWEIS → Dokumentation enthält HINWEIS-Text", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.documentation).toContain(
      "Impfberatung fehlt – Termin zur Beratung empfohlen.",
    );
  });
});

// ---------------------------------------------------------------------------
// Mehrere HINWEIS → Reihenfolge der Bausteine
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – mehrere HINWEIS", () => {
  it("hints erscheinen in der Reihenfolge der Checkpoints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(5);
    expect(result.hints[0]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC01"].hintText);
    expect(result.hints[1]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    expect(result.hints[2]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintText);
    expect(result.hints[3]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC04"].hintText);
    expect(result.hints[4]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC05"].hintText);
  });

  it("IC02 HINWEIS + IC03 HINWEIS → beide Hinweise, in korrekter Reihenfolge", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(2);
    expect(result.hints[0]).toBe("Bitte füllen Sie vorab unsere Online-Anamnese aus.");
    expect(result.hints[1]).toBe("Bitte buchen Sie vorab einen Termin zur Impfberatung.");
  });

  it("dokumentation hat immer 6 Zeilen (Kopf + 5 Checkpoints)", () => {
    const confirmed = allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS);
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.documentation).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Kein doppelter Online-Anamnese-Hinweis
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – keine doppelten Online-Anamnese-Hinweise", () => {
  it("IC01 HINWEIS enthält keinen Anamnese-Hinweis", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    // IC01 hat einen eigenen Hinweis, aber keinen Anamnese-Text
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).not.toContain("Online-Anamnese");
    expect(result.hints[0]).not.toContain("Anamnese");
  });

  it("IC01 HINWEIS + IC02 HINWEIS → Anamnese-Hinweis erscheint genau einmal", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    const anamneseHints = result.hints.filter((h) => h.includes("Online-Anamnese"));
    expect(anamneseHints).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// UNGEKLAERT im bestätigten Input → Fehler
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – UNGEKLAERT blockiert", () => {
  it("wirft Fehler wenn ein Checkpoint UNGEKLAERT ist", () => {
    // Wir umgehen den TypeScript-Typ mit einem expliziten Cast,
    // um den Laufzeit-Guard zu testen.
    const malformed = [
      {
        ...INQUIRY_CHECKPOINT_CATALOGUE["IC01"],
        status: InquiryCheckpointStatus.UNGEKLAERT,
      },
    ] as unknown as ConfirmedInquiryCheckpoint[];

    expect(() => renderInquiryResponse(FSME_PROFILE, malformed)).toThrow(
      /UNGEKLAERT/,
    );
  });

  it("Fehlermeldung nennt die Checkpoint-ID", () => {
    const malformed = [
      {
        ...INQUIRY_CHECKPOINT_CATALOGUE["IC03"],
        status: InquiryCheckpointStatus.UNGEKLAERT,
      },
    ] as unknown as ConfirmedInquiryCheckpoint[];

    expect(() => renderInquiryResponse(FSME_PROFILE, malformed)).toThrow(
      /IC03/,
    );
  });

  it("wirft nicht wenn alle Checkpoints GEKLAERT sind", () => {
    expect(() =>
      renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT)),
    ).not.toThrow();
  });

  it("wirft nicht wenn alle Checkpoints HINWEIS sind", () => {
    expect(() =>
      renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS)),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Leere Checkpoint-Liste
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – leere Checkpoint-Liste", () => {
  it("gibt coreAnswer zurück, keine hints, nur Kopfzeile in documentation", () => {
    const result = renderInquiryResponse(FSME_PROFILE, []);
    expect(result.coreAnswer).toBe(FSME_PROFILE.coreAnswer);
    expect(result.hints).toHaveLength(0);
    expect(result.documentation).toHaveLength(1);
    expect(result.documentation[0]).toBe("FSME-Impfung angefragt.");
  });
});

// ---------------------------------------------------------------------------
// Katalog-Vollständigkeit
// ---------------------------------------------------------------------------

describe("INQUIRY_CHECKPOINT_CATALOGUE – Vollständigkeit", () => {
  it("FSME-Profil referenziert nur existierende Checkpoint-IDs", () => {
    for (const id of FSME_PROFILE.checkpointIds) {
      expect(INQUIRY_CHECKPOINT_CATALOGUE[id]).toBeDefined();
    }
  });

  it("IC01 hintText enthält keinen Anamnese-Text", () => {
    const ic01 = INQUIRY_CHECKPOINT_CATALOGUE["IC01"];
    expect(ic01.hintText).not.toContain("Online-Anamnese");
    expect(ic01.hintText).not.toContain("Anamnese");
  });

  it("IC02 ist der einzige Checkpoint mit Online-Anamnese im hintText", () => {
    const ids = Object.keys(INQUIRY_CHECKPOINT_CATALOGUE);
    const withAnamnese = ids.filter((id) =>
      INQUIRY_CHECKPOINT_CATALOGUE[id].hintText.includes("Online-Anamnese"),
    );
    expect(withAnamnese).toEqual(["IC02"]);
  });
});
