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
    expect(result.sections[0].mainDecision).toContain("kann ausgestellt werden");
  });

  it("Decision NOT_POSSIBLE → mainDecision enthält Ablehnungstext", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({ decisionStatus: DecisionStatus.NOT_POSSIBLE }),
    ]);
    expect(result.sections[0].mainDecision).toContain("kann nicht ausgestellt werden");
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

  it("PATIENT_NOT_IN_GERMANY UNKNOWN → kein Hinweis in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { PATIENT_NOT_IN_GERMANY: ExplanationStatus.UNKNOWN },
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
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

describe("AU-Profil – Checkpoint-Bindungen", () => {
  const auProfile = INQUIRY_PROFILE_CATALOG_V2["AU"];

  it("AU-Profil bindet alle drei Specific Checkpoints", () => {
    expect(auProfile.specificCheckpointIds).toContain("AU_BACKDATE_ALLOWED");
    expect(auProfile.specificCheckpointIds).toContain("AU_DURATION_ALLOWED");
    expect(auProfile.specificCheckpointIds).toContain("AU_REPEAT_WITHOUT_EXAM");
    expect(auProfile.specificCheckpointIds).toHaveLength(3);
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
});

describe("AU-Profil – AU_REPEAT_WITHOUT_EXAM als Specific Checkpoint", () => {
  it("AU_REPEAT_WITHOUT_EXAM NO → Text erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_REPEAT_WITHOUT_EXAM: ExplanationStatus.NO },
      }),
    ]);
    expect(
      result.sections[0].attachedParagraphs.some((t) => t.includes("Wiederholte digitale AU")),
    ).toBe(true);
  });

  it("AU_REPEAT_WITHOUT_EXAM YES → kein Text in attachedParagraphs (kein textByStatus für YES)", () => {
    const result = renderInquiryResponseFromSections([
      makeAuSection({
        checkpointStatuses: { AU_REPEAT_WITHOUT_EXAM: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
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
      "AU-Hinweis: Neupatient / Erstkontakt relevant.",
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
});

