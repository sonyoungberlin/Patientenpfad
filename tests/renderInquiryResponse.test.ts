import { renderInquiryResponse, renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_CHECKPOINT_CATALOGUE } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOGUE } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  InquiryCheckpointStatus,
  InquiryType,
  ResponseKind,
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  type ConfirmedInquiryCheckpoint,
  type InquirySection,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FSME_PROFILE = INQUIRY_PROFILE_CATALOGUE[InquiryType.FSME_IMPFUNG];

/**
 * Erstellt einen ConfirmedInquiryCheckpoint aus einem Katalogeintrag.
 * Alle Statuses außer UNGEKLAERT sind zulässig.
 */
function makeConfirmed(
  id: string,
  status: ConfirmedInquiryCheckpoint["status"],
): ConfirmedInquiryCheckpoint {
  const template = INQUIRY_CHECKPOINT_CATALOGUE[id];
  if (!template) throw new Error(`Checkpoint ${id} not in catalogue`);
  return { ...template, status };
}

/** Alle FSME-Checkpoints mit gegebenem Status. */
function allFsmeConfirmed(
  status: ConfirmedInquiryCheckpoint["status"],
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

  it("Kernantwort enthält 'Online-Kalender'", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.coreAnswer).toContain("Online-Kalender");
  });

  it("gibt keine Hinweise zurück", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.hints).toHaveLength(0);
  });

  it("gibt eine Dokumentationszeile pro Checkpoint + Kopfzeile zurück", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    // 1 Kopfzeile + 6 Checkpoints (IC01–IC06)
    expect(result.documentation).toHaveLength(7);
    expect(result.documentation[0]).toBe("FSME-Impfung angefragt.");
  });

  it("Dokumentation enthält GEKLAERT-Texte für alle Checkpoints", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT));
    expect(result.documentation).toContain("Patientenstatus: Bestandspatient.");
    expect(result.documentation).toContain("Online-Anamnese: vollständig vorhanden.");
    expect(result.documentation).toContain("Impfberatung: bereits erfolgt.");
    expect(result.documentation).toContain("Impfpass: vorhanden.");
    expect(result.documentation).toContain("Terminwunsch: angegeben.");
    expect(result.documentation).toContain("Online-Terminbuchung: Zugang vorhanden.");
  });
});

// ---------------------------------------------------------------------------
// Einzelner HINWEIS
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – einzelner HINWEIS", () => {
  it("IC03 HINWEIS (notwendig) → Pflichtberatungs-Hinweis erscheint in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toBe("Zur Durchführung der Impfung ist eine ärztliche Beratung erforderlich.");
  });

  it("IC04 HINWEIS → Impfpass-Hinweis nennt nur 'Impfpass', nicht 'Nachweis'", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toBe("Zum Termin wird der Impfpass benötigt.");
    expect(result.hints[0]).not.toContain("Nachweis");
  });

  it("IC03 HINWEIS → Dokumentation enthält notwendig-Text", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.documentation).toContain("Impfberatung notwendig – Termin empfohlen.");
  });

  it("IC06 HINWEIS → Online-Terminbuchungs-Hinweis erscheint in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toContain("Online-Terminbuchung");
    expect(result.hints[0]).not.toContain("E-Mail");
  });
});

// ---------------------------------------------------------------------------
// IC03 Impfberatung – differenzierter Status
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – IC03 Impfberatung differenziert", () => {
  it("GEKLAERT → kein Hinweis, GEKLAERT-Dokumentation", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(0);
    expect(result.documentation).toContain("Impfberatung: bereits erfolgt.");
  });

  it("HINWEIS_OPTIONAL → weicher Hinweis erscheint in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0]).toBe(
      "Falls gewünscht, kann vorab ein Termin zur Impfberatung gebucht werden.",
    );
  });

  it("HINWEIS_OPTIONAL → anderer Hinweistext als HINWEIS", () => {
    const optionalResult = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
    ]);
    const notwendigResult = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(optionalResult.hints[0]).not.toBe(notwendigResult.hints[0]);
  });

  it("HINWEIS_OPTIONAL → eigene Dokumentationszeile", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.documentation).toContain("Impfberatung optional – Beratungstermin angeboten.");
  });

  it("HINWEIS → notwendiger Hinweistext", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints[0]).toBe("Zur Durchführung der Impfung ist eine ärztliche Beratung erforderlich.");
  });
});

// ---------------------------------------------------------------------------
// Mehrere HINWEIS → Reihenfolge der Bausteine
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – mehrere HINWEIS", () => {
  it("hints erscheinen in der Reihenfolge der Checkpoints (alle HINWEIS)", () => {
    const confirmed = allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS);
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(6);
    expect(result.hints[0]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC01"].hintText);
    expect(result.hints[1]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    expect(result.hints[2]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintText);
    expect(result.hints[3]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC04"].hintText);
    expect(result.hints[4]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC05"].hintText);
    expect(result.hints[5]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC06"].hintText);
  });

  it("IC02 HINWEIS + IC03 HINWEIS → beide Hinweise, in korrekter Reihenfolge", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(2);
    expect(result.hints[0]).toBe("Zur Vervollständigung der Krankenakte wird eine ausgefüllte Online-Anamnese benötigt.");
    expect(result.hints[1]).toBe("Zur Durchführung der Impfung ist eine ärztliche Beratung erforderlich.");
  });

  it("HINWEIS + HINWEIS_OPTIONAL gemischt → beide erscheinen in hints", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.hints).toHaveLength(2);
    expect(result.hints[0]).toContain("Impfberatung");
    expect(result.hints[1]).toBe("Zum Termin wird der Impfpass benötigt.");
  });

  it("dokumentation hat immer 7 Zeilen (Kopf + 6 Checkpoints)", () => {
    const result = renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS));
    expect(result.documentation).toHaveLength(7);
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
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
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
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
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

  it("wirft nicht wenn alle Checkpoints HINWEIS_OPTIONAL sind", () => {
    expect(() =>
      renderInquiryResponse(FSME_PROFILE, allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS_OPTIONAL)),
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
// Kein E-Mail-Bezug
// ---------------------------------------------------------------------------

describe("Kein E-Mail-Bezug im FSME-Profil", () => {
  it("coreAnswer enthält kein 'E-Mail'", () => {
    expect(FSME_PROFILE.coreAnswer.toLowerCase()).not.toContain("e-mail");
    expect(FSME_PROFILE.coreAnswer.toLowerCase()).not.toContain("email");
  });

  it("kein Checkpoint-hintText enthält 'E-Mail'", () => {
    for (const id of FSME_PROFILE.checkpointIds) {
      const cp = INQUIRY_CHECKPOINT_CATALOGUE[id];
      expect(cp.hintText.toLowerCase()).not.toContain("e-mail");
      expect(cp.hintText.toLowerCase()).not.toContain("email");
    }
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

  it("IC03 hat hintTextOptional für den weichen Hinweis", () => {
    const ic03 = INQUIRY_CHECKPOINT_CATALOGUE["IC03"];
    expect(ic03.hintTextOptional).toBeDefined();
    expect(ic03.hintTextOptional).not.toBe(ic03.hintText);
  });

  it("IC04 hintText enthält nicht 'Nachweis'", () => {
    const ic04 = INQUIRY_CHECKPOINT_CATALOGUE["IC04"];
    expect(ic04.hintText).not.toContain("Nachweis");
  });

  it("IC06 ist im FSME-Profil enthalten", () => {
    expect(FSME_PROFILE.checkpointIds).toContain("IC06");
  });

  it("IC06 hintText enthält keine Anbieterfirma", () => {
    const ic06 = INQUIRY_CHECKPOINT_CATALOGUE["IC06"];
    // Keine konkreten Firmennamen
    expect(ic06.hintText).not.toContain("Doctolib");
    expect(ic06.hintText).not.toContain("Samedi");
    expect(ic06.hintText).not.toContain("Jameda");
  });
});

// ---------------------------------------------------------------------------
// ResponseKind – Typen im Katalog korrekt gesetzt
// ---------------------------------------------------------------------------

describe("INQUIRY_CHECKPOINT_CATALOGUE – responseKind", () => {
  it("IC01 hat responseKind VORAUSSETZUNG", () => {
    expect(INQUIRY_CHECKPOINT_CATALOGUE["IC01"].responseKind).toBe(ResponseKind.VORAUSSETZUNG);
  });

  it("IC02 hat responseKind AKTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].responseKind).toBe(ResponseKind.AKTION);
  });

  it("IC03 hat responseKind VORAUSSETZUNG und responseKindOptional INFO", () => {
    const ic03 = INQUIRY_CHECKPOINT_CATALOGUE["IC03"];
    expect(ic03.responseKind).toBe(ResponseKind.VORAUSSETZUNG);
    expect(ic03.responseKindOptional).toBe(ResponseKind.INFO);
  });

  it("IC04 hat responseKind VORBEREITUNG", () => {
    expect(INQUIRY_CHECKPOINT_CATALOGUE["IC04"].responseKind).toBe(ResponseKind.VORBEREITUNG);
  });

  it("IC05 hat responseKind AKTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOGUE["IC05"].responseKind).toBe(ResponseKind.AKTION);
  });

  it("IC06 hat responseKind AKTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOGUE["IC06"].responseKind).toBe(ResponseKind.AKTION);
  });
});

// ---------------------------------------------------------------------------
// groupedHints – alle GEKLAERT → alle Gruppen leer
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – groupedHints alle GEKLAERT", () => {
  it("alle Gruppen sind leere Arrays", () => {
    const result = renderInquiryResponse(
      FSME_PROFILE,
      allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT),
    );
    expect(result.groupedHints.voraussetzungen).toHaveLength(0);
    expect(result.groupedHints.aktionen).toHaveLength(0);
    expect(result.groupedHints.vorbereitungen).toHaveLength(0);
    expect(result.groupedHints.infos).toHaveLength(0);
    expect(result.groupedHints.ablehnungen).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupedHints – Routing nach ResponseKind
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – groupedHints Routing", () => {
  it("IC01 HINWEIS landet in voraussetzungen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.voraussetzungen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC01"].hintText,
    );
    expect(result.groupedHints.aktionen).toHaveLength(0);
  });

  it("IC02 HINWEIS landet in aktionen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.aktionen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText,
    );
    expect(result.groupedHints.voraussetzungen).toHaveLength(0);
  });

  it("IC03 HINWEIS landet in voraussetzungen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.voraussetzungen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintText,
    );
  });

  it("IC03 HINWEIS_OPTIONAL landet in infos (responseKindOptional = INFO)", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
    ]);
    expect(result.groupedHints.infos).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintTextOptional,
    );
    expect(result.groupedHints.voraussetzungen).toHaveLength(0);
  });

  it("IC04 HINWEIS landet in vorbereitungen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.vorbereitungen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC04"].hintText,
    );
  });

  it("IC05 HINWEIS landet in aktionen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC05", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.aktionen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC05"].hintText,
    );
  });

  it("IC06 HINWEIS landet in aktionen", () => {
    const result = renderInquiryResponse(FSME_PROFILE, [
      makeConfirmed("IC06", InquiryCheckpointStatus.HINWEIS),
    ]);
    expect(result.groupedHints.aktionen).toContain(
      INQUIRY_CHECKPOINT_CATALOGUE["IC06"].hintText,
    );
  });
});

// ---------------------------------------------------------------------------
// groupedHints – stabile Reihenfolge bei mehreren Hinweisen
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – groupedHints Reihenfolge", () => {
  it("aktionen enthalten IC02 vor IC05 vor IC06 (Checkpoint-Reihenfolge)", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC06", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.groupedHints.aktionen).toHaveLength(3);
    expect(result.groupedHints.aktionen[0]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    expect(result.groupedHints.aktionen[1]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC05"].hintText);
    expect(result.groupedHints.aktionen[2]).toBe(INQUIRY_CHECKPOINT_CATALOGUE["IC06"].hintText);
  });

  it("groupedHints und hints enthalten dieselben Texte (Konsistenz)", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC06", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    const allGrouped = [
      ...result.groupedHints.voraussetzungen,
      ...result.groupedHints.aktionen,
      ...result.groupedHints.vorbereitungen,
      ...result.groupedHints.infos,
      ...result.groupedHints.ablehnungen,
    ];
    expect(allGrouped).toHaveLength(result.hints.length);
    for (const hint of result.hints) {
      expect(allGrouped).toContain(hint);
    }
  });
});

// ---------------------------------------------------------------------------
// groupedHints – leere Liste → alle Gruppen leer
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – groupedHints leere Checkpoint-Liste", () => {
  it("alle Gruppen sind leer wenn keine Checkpoints übergeben werden", () => {
    const result = renderInquiryResponse(FSME_PROFILE, []);
    expect(result.groupedHints.voraussetzungen).toHaveLength(0);
    expect(result.groupedHints.aktionen).toHaveLength(0);
    expect(result.groupedHints.vorbereitungen).toHaveLength(0);
    expect(result.groupedHints.infos).toHaveLength(0);
    expect(result.groupedHints.ablehnungen).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// paragraphs – Fließtext-Ausgabe
// ---------------------------------------------------------------------------

describe("renderInquiryResponse – paragraphs", () => {
  it("alle GEKLAERT → paragraphs ist leer", () => {
    const result = renderInquiryResponse(
      FSME_PROFILE,
      allFsmeConfirmed(InquiryCheckpointStatus.GEKLAERT),
    );
    expect(result.paragraphs).toHaveLength(0);
  });

  it("leere Checkpoint-Liste → paragraphs ist leer", () => {
    const result = renderInquiryResponse(FSME_PROFILE, []);
    expect(result.paragraphs).toHaveLength(0);
  });

  it("paragraphs enthält dieselben Texte wie hints (Konsistenz)", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC06", InquiryCheckpointStatus.HINWEIS),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    expect(result.paragraphs).toHaveLength(result.hints.length);
    for (const hint of result.hints) {
      expect(result.paragraphs).toContain(hint);
    }
  });

  it("VORAUSSETZUNG erscheint vor AKTION in paragraphs", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC04", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    // IC03 = VORAUSSETZUNG, IC02 = AKTION
    const idxVoraussetzung = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintText);
    const idxAktion = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    expect(idxVoraussetzung).toBeGreaterThanOrEqual(0);
    expect(idxAktion).toBeGreaterThanOrEqual(0);
    expect(idxVoraussetzung).toBeLessThan(idxAktion);
  });

  it("AKTION erscheint vor VORBEREITUNG in paragraphs", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC03", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    // IC02 = AKTION, IC04 = VORBEREITUNG
    const idxAktion = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    const idxVorbereitung = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC04"].hintText);
    expect(idxAktion).toBeGreaterThanOrEqual(0);
    expect(idxVorbereitung).toBeGreaterThanOrEqual(0);
    expect(idxAktion).toBeLessThan(idxVorbereitung);
  });

  it("VORBEREITUNG erscheint vor INFO in paragraphs", () => {
    const confirmed: ConfirmedInquiryCheckpoint[] = [
      makeConfirmed("IC01", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC02", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC03", InquiryCheckpointStatus.HINWEIS_OPTIONAL),
      makeConfirmed("IC04", InquiryCheckpointStatus.HINWEIS),
      makeConfirmed("IC05", InquiryCheckpointStatus.GEKLAERT),
      makeConfirmed("IC06", InquiryCheckpointStatus.GEKLAERT),
    ];
    const result = renderInquiryResponse(FSME_PROFILE, confirmed);
    // IC04 = VORBEREITUNG, IC03 HINWEIS_OPTIONAL = INFO
    const idxVorbereitung = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC04"].hintText);
    const idxInfo = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC03"].hintTextOptional!);
    expect(idxVorbereitung).toBeGreaterThanOrEqual(0);
    expect(idxInfo).toBeGreaterThanOrEqual(0);
    expect(idxVorbereitung).toBeLessThan(idxInfo);
  });

  it("alle 6 HINWEIS → paragraphs hat 6 Einträge, VORAUSSETZUNG zuerst", () => {
    const result = renderInquiryResponse(
      FSME_PROFILE,
      allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS),
    );
    expect(result.paragraphs).toHaveLength(6);
    // IC01 und IC03 sind VORAUSSETZUNG → kommen vor IC02 (AKTION)
    const idxIC01 = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC01"].hintText);
    const idxIC02 = result.paragraphs.indexOf(INQUIRY_CHECKPOINT_CATALOGUE["IC02"].hintText);
    expect(idxIC01).toBeGreaterThanOrEqual(0);
    expect(idxIC02).toBeGreaterThanOrEqual(0);
    expect(idxIC01).toBeLessThan(idxIC02);
  });

  it("keine Imperative in paragraphs (kein Satz beginnt mit 'Bitte')", () => {
    const result = renderInquiryResponse(
      FSME_PROFILE,
      allFsmeConfirmed(InquiryCheckpointStatus.HINWEIS),
    );
    for (const para of result.paragraphs) {
      expect(para.startsWith("Bitte")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// renderInquiryResponseFromSections – V2 Architecture Tests
// ---------------------------------------------------------------------------

/** Minimale AU-Section ohne Checkpoints (Decision POSSIBLE, alles leer). */
function makeAuSection(overrides: Partial<InquirySection> = {}): InquirySection {
  return {
    inquiryId: "AU",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {},
    ...overrides,
  };
}

describe("renderInquiryResponseFromSections – Decision", () => {
  it("Decision POSSIBLE → mainDecision enthält den Entscheidungstext", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ decisionStatus: DecisionStatus.POSSIBLE }),
    ]);
    expect(result.sections[0].mainDecision).toContain("wurde ausgestellt");
  });

  it("Decision NOT_POSSIBLE → mainDecision enthält Ablehnungstext", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ decisionStatus: DecisionStatus.NOT_POSSIBLE }),
    ]);
    expect(result.sections[0].mainDecision).toContain("wurde nicht ausgestellt");
  });

  it("Decision-Text erscheint NICHT in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ decisionStatus: DecisionStatus.POSSIBLE }),
    ]);
    const decisionText = result.sections[0].mainDecision ?? "";
    expect(result.sections[0].attachedParagraphs).not.toContain(decisionText);
  });
});

describe("renderInquiryResponseFromSections – Global EXPLANATION Checkpoints", () => {
  it("PATIENT_NOT_IN_GERMANY YES → Hinweis aus globalHints erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PATIENT_NOT_IN_GERMANY: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "AU-Hinweis: Aufenthalt in Deutschland relevant.",
    );
  });

  it("PATIENT_NOT_IN_GERMANY NO → kein Hinweis in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PATIENT_NOT_IN_GERMANY: ExplanationStatus.NO },
      }),
    ]);
    const texts = result.sections[0].attachedParagraphs.join(" ");
    expect(texts).not.toContain("PATIENT_NOT_IN_GERMANY");
    expect(texts).not.toContain("Deutschland");
  });

  it("PATIENT_NOT_IN_GERMANY NO → kein Hinweis in attachedParagraphs (UNKNOWN entfernt)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PATIENT_NOT_IN_GERMANY: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PATIENT_NOT_IN_GERMANY fehlt → kein Hinweis in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([makeAuSection()]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("DOCTOR_REVIEW_REQUIRED YES → Hinweis aus globalHints erscheint", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DOCTOR_REVIEW_REQUIRED: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "AU-Hinweis: ärztliche Einschätzung erforderlich.",
    );
  });

  it("checkpoint.textByStatus wird für GLOBAL EXPLANATION NICHT verwendet (auch wenn befüllt)", () => {
    // PATIENT_NOT_IN_GERMANY hat textByStatus: {} – kein Text darf durchkommen
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PATIENT_NOT_IN_GERMANY: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

describe("renderInquiryResponseFromSections – ACTION/SHARED_BOTTOM", () => {
  it("DIGITAL_REQUEST ACTIVE → Text landet in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DIGITAL_REQUEST: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("digitale Anfrage"))).toBe(true);
  });

  it("DIGITAL_REQUEST ACTIVE → Text erscheint NICHT in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DIGITAL_REQUEST: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("digitale Anfrage"))).toBe(false);
  });

  it("DIGITAL_REQUEST INACTIVE → kein Eintrag in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DIGITAL_REQUEST: ActionStatus.INACTIVE },
      }),
    ]);
    expect(result.sharedBottom).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AU-Profil-Struktur
// ---------------------------------------------------------------------------

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { InquiryCheckpointKind, InquiryCheckpointScope, InquiryCheckpointPlacement } from "@/lib/inquiries/types";

describe("AU-Profil – Checkpoint-Bindungen", () => {
  const auProfile = INQUIRY_PROFILE_CATALOG_V2["AU"];

  it("AU-Profil hat genau fünf Specific Checkpoints", () => {
    expect(auProfile.specificCheckpointIds).toHaveLength(5);
  });

  it("AU-Profil bindet alle fünf AU SPECIFIC Explanation Checkpoints", () => {
    expect(auProfile.specificCheckpointIds).toContain("AU_BACKDATE_LIMIT");
    expect(auProfile.specificCheckpointIds).not.toContain("AU_DURATION_LIMIT");
    expect(auProfile.specificCheckpointIds).toContain("AU_WORK_ACCIDENT");
    expect(auProfile.specificCheckpointIds).toContain("AU_CHILD_SICK");
    expect(auProfile.specificCheckpointIds).toContain("AU_CONTINUITY_REQUIRED");
    expect(auProfile.specificCheckpointIds).toContain("AU_RETURN_TO_WORK");
  });

  it("AU-Profil bindet alle vier Global Checkpoints", () => {
    expect(auProfile.boundGlobalCheckpointIds).toContain("IS_NEW_PATIENT");
    expect(auProfile.boundGlobalCheckpointIds).toContain("PATIENT_NOT_IN_GERMANY");
    expect(auProfile.boundGlobalCheckpointIds).toContain("DOCTOR_REVIEW_REQUIRED");
    expect(auProfile.boundGlobalCheckpointIds).toContain("DATA_INCOMPLETE");
    expect(auProfile.boundGlobalCheckpointIds).toHaveLength(4);
  });

  it("Alle gebundenen Global Checkpoints haben globalHints im AU-Profil", () => {
    for (const id of auProfile.boundGlobalCheckpointIds) {
      expect(auProfile.globalHints).toHaveProperty(id);
    }
  });

  it("GLOBAL/EXPLANATION-Checkpoints haben kein textByStatus", () => {
    for (const id of auProfile.boundGlobalCheckpointIds) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp).toBeDefined();
      expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
      expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
      expect(Object.keys(cp.textByStatus)).toHaveLength(0);
    }
  });

  it("IS_CHRONIC_PATIENT ist nicht bei AU gebunden", () => {
    expect(auProfile.boundGlobalCheckpointIds).not.toContain("IS_CHRONIC_PATIENT");
  });
});

describe("AU_DECISION – questions als Klärungshilfe", () => {
  it("AU_DECISION hat genau drei questions (Beschwerden/Diagnose, Zeitraum und Langzeit-AU)", () => {
    const auDecision = INQUIRY_CHECKPOINT_CATALOG_V2["AU_DECISION"];
    expect(auDecision.questions).toBeDefined();
    expect((auDecision.questions ?? []).length).toBe(3);
  });

  it("AU_DECISION question-Texte betreffen Beschwerden/Diagnose und Zeitraum", () => {
    const questions = INQUIRY_CHECKPOINT_CATALOG_V2["AU_DECISION"].questions ?? [];
    const texts = questions.map((q) => q.text);
    expect(texts.some((t) => t.toLowerCase().includes("beschwerden") || t.toLowerCase().includes("diagnose"))).toBe(true);
    expect(texts.some((t) => t.toLowerCase().includes("zeitraum"))).toBe(true);
  });

  it("AU_DECISION enthält keine Rückdatierungsfrage mehr", () => {
    const questions = INQUIRY_CHECKPOINT_CATALOG_V2["AU_DECISION"].questions ?? [];
    const texts = questions.map((q) => q.text.toLowerCase());
    expect(texts.some((t) => t.includes("rückwirkend") || t.includes("rückdatierung"))).toBe(false);
  });

  it("AU_DECISION enthält keine Wiederholung-ohne-Untersuchung-Frage mehr", () => {
    const questions = INQUIRY_CHECKPOINT_CATALOG_V2["AU_DECISION"].questions ?? [];
    const texts = questions.map((q) => q.text.toLowerCase());
    expect(texts.some((t) => t.includes("wiederholung") || t.includes("ohne neue untersuchung"))).toBe(false);
  });

  it("Alte AU-IDs sind nicht in specificCheckpointIds (AU_BACKDATE_ALLOWED, AU_DURATION_ALLOWED, AU_REPEAT_WITHOUT_EXAM)", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["AU"];
    expect(profile.specificCheckpointIds).not.toContain("AU_BACKDATE_ALLOWED");
    expect(profile.specificCheckpointIds).not.toContain("AU_DURATION_ALLOWED");
    expect(profile.specificCheckpointIds).not.toContain("AU_REPEAT_WITHOUT_EXAM");
  });

  it("AU_REPEAT_WITHOUT_EXAM ist nicht mehr im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["AU_REPEAT_WITHOUT_EXAM"]).toBeUndefined();
  });
});

describe("AU-Profil – SPECIFIC Explanation Checkpoints", () => {
  it("AU_BACKDATE_LIMIT YES → Erklärungstext in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_BACKDATE_LIMIT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("rückwirkend"))).toBe(true);
  });

  it("AU_BACKDATE_LIMIT NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_BACKDATE_LIMIT: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("AU_DURATION_LIMIT YES → kein Output in attachedParagraphs (nicht mehr gebunden)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_DURATION_LIMIT: ExplanationStatus.YES },
      }),
    ]);
    // AU_DURATION_LIMIT ist nicht in specificCheckpointIds → erzeugt keinen Output
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("AU_WORK_ACCIDENT YES → Erklärungstext in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_WORK_ACCIDENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("Durchgangsarzt"))).toBe(true);
  });

  it("AU_WORK_ACCIDENT NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_WORK_ACCIDENT: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("AU_CHILD_SICK YES → Erklärungstext in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_CHILD_SICK: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("Kinderarztpraxis"))).toBe(true);
  });

  it("AU_CONTINUITY_REQUIRED YES → Erklärungstext in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_CONTINUITY_REQUIRED: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("Folgebescheinigungen"))).toBe(true);
  });

  it("AU_RETURN_TO_WORK YES → Erklärungstext in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_RETURN_TO_WORK: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs.some((t) => t.includes("Gesundschreibung"))).toBe(true);
  });

  it("Alle fünf gebundenen AU SPECIFIC Checkpoints sind kind EXPLANATION, scope SPECIFIC, placement ATTACHED", () => {
    for (const id of ["AU_BACKDATE_LIMIT", "AU_WORK_ACCIDENT", "AU_CHILD_SICK", "AU_CONTINUITY_REQUIRED", "AU_RETURN_TO_WORK"]) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp).toBeDefined();
      expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
      expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
      expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
    }
  });
});

describe("AU-Profil – IS_NEW_PATIENT globalHint", () => {
  it("IS_NEW_PATIENT YES → AU-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Bei Neupatienten können Arbeitsunfähigkeitsbescheinigungen über eine digitale Anfrage für maximal drei Tage ausgestellt werden; bei bereits bekannten Patienten sind bis zu fünf Tage möglich.",
    );
  });

  it("DATA_INCOMPLETE YES → AU-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DATA_INCOMPLETE: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "AU-Hinweis: Angaben / Daten unvollständig.",
    );
  });

  it("DOCTOR_REVIEW_REQUIRED bleibt globaler AU-Hinweis", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { DOCTOR_REVIEW_REQUIRED: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "AU-Hinweis: ärztliche Einschätzung erforderlich.",
    );
  });
});

describe("PROCESSING_DELAY und TECHNICAL_ISSUE – GLOBAL SHARED_BOTTOM", () => {
  it("PROCESSING_DELAY ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["PROCESSING_DELAY"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("TECHNICAL_ISSUE ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["TECHNICAL_ISSUE"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("PROCESSING_DELAY ACTIVE → Text erscheint in sharedBottom (AU-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PROCESSING_DELAY: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("Bearbeitung"))).toBe(true);
  });

  it("TECHNICAL_ISSUE ACTIVE → Text erscheint in sharedBottom (AU-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { TECHNICAL_ISSUE: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("technische Störung"))).toBe(true);
  });

  it("PROCESSING_DELAY INACTIVE → kein Eintrag in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PROCESSING_DELAY: ActionStatus.INACTIVE },
      }),
    ]);
    expect(result.sharedBottom).toHaveLength(0);
  });

  it("PROCESSING_DELAY und TECHNICAL_ISSUE beide ACTIVE → beide in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: {
          PROCESSING_DELAY: ActionStatus.ACTIVE,
          TECHNICAL_ISSUE: ActionStatus.ACTIVE,
        },
      }),
    ]);
    expect(result.sharedBottom).toHaveLength(2);
  });
});


describe("IS_CHRONIC_PATIENT – kein Profil-Binding", () => {
  it("IS_CHRONIC_PATIENT YES ohne Binding im Profil → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { IS_CHRONIC_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PRESCRIPTION-Profil – Struktur
// ---------------------------------------------------------------------------

describe("PRESCRIPTION-Profil – Checkpoint-Bindungen", () => {
  const prescriptionProfile = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];

  it("PRESCRIPTION-Profil existiert", () => {
    expect(prescriptionProfile).toBeDefined();
  });

  it("PRESCRIPTION-Profil bindet alle sechs Specific Checkpoints", () => {
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_CONTROL_OVERDUE");
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_SPECIALIST_REPORT_REQUIRED");
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_BTM_ADHS_RULES");
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_PRIVATE_ONLY");
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_GYN_EXCLUSIVITY");
    expect(prescriptionProfile.specificCheckpointIds).toContain("PRESCRIPTION_NO_POSTAL_DELIVERY");
    expect(prescriptionProfile.specificCheckpointIds).toHaveLength(6);
  });

  it("Alte Checkpoints sind nicht mehr in PRESCRIPTION.specificCheckpointIds", () => {
    expect(prescriptionProfile.specificCheckpointIds).not.toContain("PRESCRIPTION_KNOWN_MEDICATION");
    expect(prescriptionProfile.specificCheckpointIds).not.toContain("PRESCRIPTION_FOLLOW_UP");
    expect(prescriptionProfile.specificCheckpointIds).not.toContain("PRESCRIPTION_SPECIAL_TYPE");
  });

  it("PRESCRIPTION-Profil bindet alle fünf Global Checkpoints", () => {
    expect(prescriptionProfile.boundGlobalCheckpointIds).toContain("IS_NEW_PATIENT");
    expect(prescriptionProfile.boundGlobalCheckpointIds).toContain("PATIENT_NOT_IN_GERMANY");
    expect(prescriptionProfile.boundGlobalCheckpointIds).toContain("DOCTOR_REVIEW_REQUIRED");
    expect(prescriptionProfile.boundGlobalCheckpointIds).toContain("DATA_INCOMPLETE");
    expect(prescriptionProfile.boundGlobalCheckpointIds).toContain("IS_CHRONIC_PATIENT");
    expect(prescriptionProfile.boundGlobalCheckpointIds).toHaveLength(5);
  });

  it("Alle gebundenen Global Checkpoints haben globalHints im PRESCRIPTION-Profil", () => {
    for (const id of prescriptionProfile.boundGlobalCheckpointIds) {
      expect(prescriptionProfile.globalHints).toHaveProperty(id);
    }
  });

  it("GLOBAL/EXPLANATION-Checkpoints im PRESCRIPTION-Profil haben kein textByStatus", () => {
    for (const id of prescriptionProfile.boundGlobalCheckpointIds) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp).toBeDefined();
      expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
      expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
      expect(Object.keys(cp.textByStatus)).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// PRESCRIPTION_DECISION – questions als Klärungshilfe
// ---------------------------------------------------------------------------

describe("PRESCRIPTION_DECISION – questions als Klärungshilfe", () => {
  it("PRESCRIPTION_DECISION hat genau drei questions", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["PRESCRIPTION_DECISION"];
    expect(cp.questions).toBeDefined();
    expect((cp.questions ?? []).length).toBe(3);
  });

  it("PRESCRIPTION_DECISION question-Texte betreffen Indikation, Wiederverordnung und Anordnung", () => {
    const questions = INQUIRY_CHECKPOINT_CATALOG_V2["PRESCRIPTION_DECISION"].questions ?? [];
    const texts = questions.map((q) => q.text.toLowerCase());
    expect(texts.some((t) => t.includes("indiziert") || t.includes("medizinisch nachvollziehbar"))).toBe(true);
    expect(texts.some((t) => t.includes("wiederverordnung") || t.includes("dauermedikation"))).toBe(true);
    expect(texts.some((t) => t.includes("anordnung"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PRESCRIPTION-Profil – globalHints
// ---------------------------------------------------------------------------

/** Minimale PRESCRIPTION-Section. */
function makePrescriptionSection(overrides: Partial<InquirySection> = {}): InquirySection {
  return {
    inquiryId: "PRESCRIPTION",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {},
    ...overrides,
  };
}

describe("PRESCRIPTION-Profil – IS_CHRONIC_PATIENT globalHint", () => {
  it("IS_CHRONIC_PATIENT YES → Rezept-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { IS_CHRONIC_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Rezept-Hinweis: regelmäßige Kontrolle bei Dauermedikation erforderlich.",
    );
  });

  it("IS_NEW_PATIENT YES → Rezept-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Rezept-Hinweis: Neupatient, Termin erforderlich.",
    );
  });
});

// ---------------------------------------------------------------------------
// PRESCRIPTION-Profil – SPECIFIC Checkpoints erzeugen attachedParagraphs
// ---------------------------------------------------------------------------

describe("PRESCRIPTION-Profil – SPECIFIC Checkpoints", () => {
  it("Alle sechs gebundenen PRESCRIPTION SPECIFIC Checkpoints sind kind EXPLANATION, scope SPECIFIC, placement ATTACHED", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];
    for (const id of profile.specificCheckpointIds) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp).toBeDefined();
      expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
      expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
      expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
    }
  });

  it("PRESCRIPTION_CONTROL_OVERDUE YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_CONTROL_OVERDUE: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("Kontrolltermin")),
    ).toBe(true);
  });

  it("PRESCRIPTION_CONTROL_OVERDUE NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_CONTROL_OVERDUE: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PRESCRIPTION_SPECIALIST_REPORT_REQUIRED YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("Facharztbericht")),
    ).toBe(true);
  });

  it("PRESCRIPTION_SPECIALIST_REPORT_REQUIRED NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PRESCRIPTION_BTM_ADHS_RULES YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_BTM_ADHS_RULES: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("BtM") || t.includes("ADHS")),
    ).toBe(true);
  });

  it("PRESCRIPTION_BTM_ADHS_RULES NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_BTM_ADHS_RULES: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PRESCRIPTION_PRIVATE_ONLY YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_PRIVATE_ONLY: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("Privatrezept")),
    ).toBe(true);
  });

  it("PRESCRIPTION_PRIVATE_ONLY NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_PRIVATE_ONLY: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PRESCRIPTION_GYN_EXCLUSIVITY YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_GYN_EXCLUSIVITY: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("gynäkologische")),
    ).toBe(true);
  });

  it("PRESCRIPTION_GYN_EXCLUSIVITY NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_GYN_EXCLUSIVITY: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("PRESCRIPTION_NO_POSTAL_DELIVERY YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_NO_POSTAL_DELIVERY: ExplanationStatus.YES },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("Postversand")),
    ).toBe(true);
  });

  it("PRESCRIPTION_NO_POSTAL_DELIVERY NO → kein Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PRESCRIPTION_NO_POSTAL_DELIVERY: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PRESCRIPTION-Profil – neue Actions
// ---------------------------------------------------------------------------

describe("PRESCRIPTION-Profil – neue Actions (E_RECIPE_USE, PHARMACY_INFORMATION, DOCUMENT_UPLOAD)", () => {
  it("E_RECIPE_USE ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["E_RECIPE_USE"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("PHARMACY_INFORMATION ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["PHARMACY_INFORMATION"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("DOCUMENT_UPLOAD ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["DOCUMENT_UPLOAD"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("E_RECIPE_USE ACTIVE → Text erscheint in sharedBottom (PRESCRIPTION-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { E_RECIPE_USE: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("eRezept"))).toBe(true);
  });

  it("PHARMACY_INFORMATION ACTIVE → Text erscheint in sharedBottom (PRESCRIPTION-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { PHARMACY_INFORMATION: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("Apotheke") || t.includes("Wunschapo"))).toBe(true);
  });

  it("DOCUMENT_UPLOAD ACTIVE → Text erscheint in sharedBottom (PRESCRIPTION-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makePrescriptionSection({
        checkpointStatuses: { DOCUMENT_UPLOAD: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("Unterlagen") || t.includes("hochladen"))).toBe(true);
  });

  it("PROCESSING_DELAY und TECHNICAL_ISSUE sind in PRESCRIPTION.availableActionIds", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];
    expect(profile.availableActionIds).toContain("PROCESSING_DELAY");
    expect(profile.availableActionIds).toContain("TECHNICAL_ISSUE");
  });
});

// ---------------------------------------------------------------------------
// LAB-Profil – Struktur
// ---------------------------------------------------------------------------

describe("LAB-Profil – Checkpoint-Bindungen", () => {
  const labProfile = INQUIRY_PROFILE_CATALOG_V2["LAB"];

  it("LAB-Profil existiert", () => {
    expect(labProfile).toBeDefined();
  });

  it("LAB-Profil bindet alle fünf Specific Checkpoints", () => {
    expect(labProfile.specificCheckpointIds).toContain("LAB_CHECKUP_RULES");
    expect(labProfile.specificCheckpointIds).toContain("LAB_FASTING_REQUIRED");
    expect(labProfile.specificCheckpointIds).toContain("LAB_SELF_PAYER_IGEL");
    expect(labProfile.specificCheckpointIds).toContain("LAB_DISCUSSION_PROCESS_CODE");
    expect(labProfile.specificCheckpointIds).toContain("LAB_MPU_EXCLUSION");
    expect(labProfile.specificCheckpointIds).toHaveLength(5);
  });

  it("LAB-Profil bindet die alten Checkpoints nicht mehr", () => {
    expect(labProfile.specificCheckpointIds).not.toContain("LAB_MEDICAL_INDICATION");
    expect(labProfile.specificCheckpointIds).not.toContain("LAB_CHECKUP_ELIGIBLE");
    expect(labProfile.specificCheckpointIds).not.toContain("LAB_VALUES_DEFINED");
  });

  it("LAB-Profil bindet alle fünf Global Checkpoints", () => {
    expect(labProfile.boundGlobalCheckpointIds).toContain("IS_NEW_PATIENT");
    expect(labProfile.boundGlobalCheckpointIds).toContain("PATIENT_NOT_IN_GERMANY");
    expect(labProfile.boundGlobalCheckpointIds).toContain("DOCTOR_REVIEW_REQUIRED");
    expect(labProfile.boundGlobalCheckpointIds).toContain("DATA_INCOMPLETE");
    expect(labProfile.boundGlobalCheckpointIds).toContain("IS_CHRONIC_PATIENT");
    expect(labProfile.boundGlobalCheckpointIds).toHaveLength(5);
  });

  it("Alle gebundenen Global Checkpoints haben globalHints im LAB-Profil", () => {
    for (const id of labProfile.boundGlobalCheckpointIds) {
      expect(labProfile.globalHints).toHaveProperty(id);
    }
  });

  it("LAB_DECISION hat genau 2 questions", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_DECISION"];
    expect(cp.questions).toHaveLength(2);
    expect(cp.questions![0].text).toBe("Liegt eine externe Anordnung oder Überweisung vor?");
    expect(cp.questions![1].text).toBe("Liegt eine ärztliche Anordnung aus unserer Praxis vor?");
  });

  it("Alle fünf neuen SPECIFIC Checkpoints sind EXPLANATION/SPECIFIC/ATTACHED im Katalog", () => {
    for (const id of [
      "LAB_CHECKUP_RULES",
      "LAB_FASTING_REQUIRED",
      "LAB_SELF_PAYER_IGEL",
      "LAB_DISCUSSION_PROCESS_CODE",
      "LAB_MPU_EXCLUSION",
    ]) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp).toBeDefined();
      expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
      expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
      expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
    }
  });

  it("Alle fünf neuen SPECIFIC Checkpoints haben questions", () => {
    for (const id of [
      "LAB_CHECKUP_RULES",
      "LAB_FASTING_REQUIRED",
      "LAB_SELF_PAYER_IGEL",
      "LAB_DISCUSSION_PROCESS_CODE",
      "LAB_MPU_EXCLUSION",
    ]) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp.questions).toBeDefined();
      expect((cp.questions ?? []).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// LAB-Profil – globalHints
// ---------------------------------------------------------------------------

function makeLabSection(overrides: Partial<InquirySection> = {}): InquirySection {
  return {
    inquiryId: "LAB",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {},
    ...overrides,
  };
}

describe("LAB-Profil – globalHints", () => {
  it("IS_NEW_PATIENT YES → Labor-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Labor-Hinweis: Erstvorstellung vor Labordiagnostik erforderlich.",
    );
  });

  it("IS_CHRONIC_PATIENT YES → Labor-spezifischer Hint erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { IS_CHRONIC_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Labor-Hinweis: regelmäßige Verlaufskontrolle relevant.",
    );
  });
});

// ---------------------------------------------------------------------------
// LAB-Profil – SPECIFIC Checkpoints erzeugen attachedParagraphs
// ---------------------------------------------------------------------------

describe("LAB-Profil – SPECIFIC Checkpoints", () => {
  it("LAB_CHECKUP_RULES NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_CHECKUP_RULES: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_CHECKUP_RULES YES → Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_CHECKUP_RULES: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("Der gesetzliche Gesundheits-Check-up ist ab 35 Jahren alle drei Jahre sowie einmalig zwischen 18 und 34 Jahren möglich. Häufigere Kontrollen ohne medizinischen Anlass sind keine Kassenleistung.");
  });

  it("LAB_FASTING_REQUIRED NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_FASTING_REQUIRED: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_FASTING_REQUIRED YES → Hinweis in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_FASTING_REQUIRED: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Bitte kommen Sie nüchtern zur Blutentnahme (mindestens 8 Stunden vorher nichts essen, kein Kaffee; Wasser ist erlaubt).",
    );
  });

  it("LAB_SELF_PAYER_IGEL NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_SELF_PAYER_IGEL: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_SELF_PAYER_IGEL YES → Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_SELF_PAYER_IGEL: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("Blutuntersuchungen ohne medizinische Indikation oder außerhalb der Vorsorgefristen werden als Selbstzahlerleistung durchgeführt.");
  });

  it("LAB_DISCUSSION_PROCESS_CODE NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_DISCUSSION_PROCESS_CODE: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_DISCUSSION_PROCESS_CODE YES → Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_DISCUSSION_PROCESS_CODE: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Der Buchungscode für die Befundbesprechung wird automatisch versendet, sobald alle Laborergebnisse vorliegen.",
    );
  });

  it("LAB_MPU_EXCLUSION NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_MPU_EXCLUSION: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_MPU_EXCLUSION YES → Output in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_MPU_EXCLUSION: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Untersuchungen für eine MPU werden hier nicht durchgeführt. Bitte wenden Sie sich an ein entsprechend zertifiziertes Institut.",
    );
  });
});

// ---------------------------------------------------------------------------
// GLOBAL M5 Deduplizierung – Kernregel: einmal pro aktivem Checkpoint
// ---------------------------------------------------------------------------

describe("renderInquiryResponseFromSections – GLOBAL M5 Deduplizierung", () => {
  it("IS_NEW_PATIENT YES in AU + PRESCRIPTION → M5-Doku enthält den Label genau einmal", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
      makePrescriptionSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
    ]);
    const entries = result.documentation.filter((d) => d.includes("Neupatient"));
    expect(entries).toHaveLength(1);
  });

  it("IS_NEW_PATIENT YES in AU + LAB + PRESCRIPTION → M5-Doku enthält den Label genau einmal", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
      makeLabSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
      makePrescriptionSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
    ]);
    const entries = result.documentation.filter((d) => d.includes("Neupatient"));
    expect(entries).toHaveLength(1);
  });

  it("IS_NEW_PATIENT YES → M5-Marker ist checkpoint.label (kurzer Text, kein Hint-Text)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
    ]);
    const auGlobalHint = INQUIRY_PROFILE_CATALOG_V2["AU"].globalHints?.["IS_NEW_PATIENT"] ?? "";
    // Der Hint-Text darf NICHT als Doku-Marker erscheinen
    expect(result.documentation).not.toContain(auGlobalHint);
    // Nur der kurze Label (checkpoint.label) erscheint
    const cpLabel = INQUIRY_CHECKPOINT_CATALOG_V2["IS_NEW_PATIENT"].label;
    expect(result.documentation).toContain(cpLabel);
  });

  it("IS_NEW_PATIENT YES → M4 attachedParagraphs erscheinen pro Anliegen separat (anliegenspezifisch)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
      makePrescriptionSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES } }),
    ]);
    // AU-spezifischer Hint in Section 0
    expect(result.sections[0].attachedParagraphs).toContain(
      "Bei Neupatienten können Arbeitsunfähigkeitsbescheinigungen über eine digitale Anfrage für maximal drei Tage ausgestellt werden; bei bereits bekannten Patienten sind bis zu fünf Tage möglich.",
    );
    // PRESCRIPTION-spezifischer Hint in Section 1
    expect(result.sections[1].attachedParagraphs).toContain(
      "Rezept-Hinweis: Neupatient, Termin erforderlich.",
    );
  });

  it("GLOBAL NO in einem Anliegen → kein M5-Eintrag und kein M4-Hint", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.NO } }),
    ]);
    const cpLabel = INQUIRY_CHECKPOINT_CATALOG_V2["IS_NEW_PATIENT"].label;
    expect(result.documentation).not.toContain(cpLabel);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("DATA_INCOMPLETE YES in zwei Anliegen → M5-Doku enthält den Label genau einmal", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ checkpointStatuses: { DATA_INCOMPLETE: ExplanationStatus.YES } }),
      makePrescriptionSection({ checkpointStatuses: { DATA_INCOMPLETE: ExplanationStatus.YES } }),
    ]);
    const cpLabel = INQUIRY_CHECKPOINT_CATALOG_V2["DATA_INCOMPLETE"].label;
    const entries = result.documentation.filter((d) => d === cpLabel);
    expect(entries).toHaveLength(1);
  });

  it("SPECIFIC Checkpoints werden unverändert pro Anliegen dokumentiert (kein Verlust durch GLOBAL-Dedup)", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: {
          IS_NEW_PATIENT: ExplanationStatus.YES,
          LAB_CHECKUP_RULES: ExplanationStatus.YES,
        },
      }),
      makePrescriptionSection({
        checkpointStatuses: {
          IS_NEW_PATIENT: ExplanationStatus.YES,
          PRESCRIPTION_CONTROL_OVERDUE: ExplanationStatus.YES,
        },
      }),
    ]);
    // SPECIFIC docs: both inquiries (YES → output produced)
    expect(result.documentation.some((d) => d.includes("Check-up-Regelung"))).toBe(true);
    expect(result.documentation.some((d) => d.includes("Kontrolltermin"))).toBe(true);
    // GLOBAL doc: exactly once
    const entries = result.documentation.filter((d) => d.includes("Neupatient"));
    expect(entries).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// URINE_SAMPLE_ONSITE – GLOBAL ACTION / SHARED_BOTTOM
// ---------------------------------------------------------------------------

describe("URINE_SAMPLE_ONSITE – GLOBAL SHARED_BOTTOM", () => {
  it("URINE_SAMPLE_ONSITE ist im Katalog als ACTION / GLOBAL / SHARED_BOTTOM definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["URINE_SAMPLE_ONSITE"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
  });

  it("URINE_SAMPLE_ONSITE ist in LAB.availableActionIds enthalten", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["LAB"];
    expect(profile.availableActionIds).toContain("URINE_SAMPLE_ONSITE");
  });

  it("URINE_SAMPLE_ONSITE ACTIVE → Text erscheint in sharedBottom (LAB-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { URINE_SAMPLE_ONSITE: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("Urinprobe"))).toBe(true);
  });

  it("URINE_SAMPLE_ONSITE INACTIVE → kein Eintrag in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { URINE_SAMPLE_ONSITE: ActionStatus.INACTIVE },
      }),
    ]);
    expect(result.sharedBottom).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SAMPLE_COLLECTION-Profil
// ---------------------------------------------------------------------------

function makeSampleCollectionSection(overrides: Partial<InquirySection> = {}): InquirySection {
  return {
    inquiryId: "SAMPLE_COLLECTION",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {},
    ...overrides,
  };
}

describe("SAMPLE_COLLECTION-Profil – Struktur", () => {
  it("Profil SAMPLE_COLLECTION ist im Katalog registriert", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];
    expect(profile).toBeDefined();
    expect(profile.id).toBe("SAMPLE_COLLECTION");
    expect(profile.label).toBe("Urin- und Stuhlprobe");
  });

  it("SAMPLE_COLLECTION_DECISION hat genau 3 questions", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["SAMPLE_COLLECTION_DECISION"];
    expect(cp).toBeDefined();
    expect(cp.questions).toHaveLength(3);
  });

  it("alle 4 SPECIFIC Checkpoints sind im Katalog und an SAMPLE_COLLECTION gebunden", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];
    const ids = ["URINE_SAMPLE_INSTRUCTIONS", "STOOL_SAMPLE_INSTRUCTIONS", "SAMPLE_HANDOVER", "LAB_RESULT_TIME"];
    for (const id of ids) {
      expect(profile.specificCheckpointIds).toContain(id);
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
    }
  });

  it("SAMPLE_COLLECTION hat die erwarteten boundGlobalCheckpointIds", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];
    expect(profile.boundGlobalCheckpointIds).toContain("IS_NEW_PATIENT");
    expect(profile.boundGlobalCheckpointIds).toContain("PATIENT_NOT_IN_GERMANY");
    expect(profile.boundGlobalCheckpointIds).toContain("DOCTOR_REVIEW_REQUIRED");
    expect(profile.boundGlobalCheckpointIds).toContain("DATA_INCOMPLETE");
  });

  it("SAMPLE_COLLECTION hat die erwarteten availableActionIds", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];
    expect(profile.availableActionIds).toContain("BOOK_APPOINTMENT");
    expect(profile.availableActionIds).toContain("OPEN_CONSULTATION");
    expect(profile.availableActionIds).toContain("PROCESSING_DELAY");
    expect(profile.availableActionIds).toContain("TECHNICAL_ISSUE");
  });
});

describe("SAMPLE_COLLECTION-Profil – Decision", () => {
  it("POSSIBLE → mainDecision enthält Probentext", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({ decisionStatus: DecisionStatus.POSSIBLE }),
    ]);
    expect(result.sections[0].mainDecision).toContain("Probenabgabe");
  });

  it("NOT_POSSIBLE → mainDecision enthält Ablehnungstext", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({ decisionStatus: DecisionStatus.NOT_POSSIBLE }),
    ]);
    expect(result.sections[0].mainDecision).toContain("nicht berücksichtigt");
  });
});

describe("SAMPLE_COLLECTION-Profil – SPECIFIC Checkpoints", () => {
  it("URINE_SAMPLE_INSTRUCTIONS YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { URINE_SAMPLE_INSTRUCTIONS: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Die Urinprobe sollte als Mittelstrahl in ein steriles Gefäß abgegeben werden.",
    );
  });

  it("URINE_SAMPLE_INSTRUCTIONS NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { URINE_SAMPLE_INSTRUCTIONS: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("STOOL_SAMPLE_INSTRUCTIONS YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { STOOL_SAMPLE_INSTRUCTIONS: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Die Stuhlprobe wird mit dem Probenröhrchen entnommen; eine kleine Menge ist ausreichend und sollte nicht aus dem Toilettenwasser entnommen werden.",
    );
  });

  it("STOOL_SAMPLE_INSTRUCTIONS NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { STOOL_SAMPLE_INSTRUCTIONS: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("SAMPLE_HANDOVER YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { SAMPLE_HANDOVER: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Die Probe sollte mit Name und Datum beschriftet und zeitnah in der Praxis abgegeben werden.",
    );
  });

  it("SAMPLE_HANDOVER NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { SAMPLE_HANDOVER: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("LAB_RESULT_TIME YES → Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { LAB_RESULT_TIME: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Die Auswertung kann mehrere Tage dauern. Die Befunde werden übermittelt, sobald sie vorliegen.",
    );
  });

  it("LAB_RESULT_TIME NO → kein Text in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { LAB_RESULT_TIME: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

describe("SAMPLE_COLLECTION-Profil – GLOBALs unverändert", () => {
  it("IS_NEW_PATIENT YES → proben-spezifischer Hint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { IS_NEW_PATIENT: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Proben-Hinweis: Bitte melden Sie sich vorab in unserer Praxis an.",
    );
  });

  it("PROCESSING_DELAY ACTIVE → Text in sharedBottom (SAMPLE_COLLECTION-Section)", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { PROCESSING_DELAY: ActionStatus.ACTIVE },
      }),
    ]);
    expect(result.sharedBottom.some((t) => t.includes("Bearbeitung"))).toBe(true);
  });

  it("PROCESSING_DELAY INACTIVE → kein Eintrag in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      makeSampleCollectionSection({
        checkpointStatuses: { PROCESSING_DELAY: ActionStatus.INACTIVE },
      }),
    ]);
    expect(result.sharedBottom).toHaveLength(0);
  });

  it("LAB-Profil bleibt durch SAMPLE_COLLECTION unberührt", () => {
    const result = renderInquiryResponseFromSections([
      makeLabSection({
        checkpointStatuses: { LAB_CHECKUP_RULES: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Der gesetzliche Gesundheits-Check-up ist ab 35 Jahren alle drei Jahre sowie einmalig zwischen 18 und 34 Jahren möglich. Häufigere Kontrollen ohne medizinischen Anlass sind keine Kassenleistung.",
    );
  });
});
