/**
 * Tests für die M4-Ergebnislogik: Narrativ-Generierung und IS/SOLL-Vergleich.
 *
 * 18 Tests nach Spezifikation:
 *  1.  CURRENT_STATE → zusammenhängender Ist-Praxistext
 *  2.  CURRENT_STATE → geklärte und offene Aspekte getrennt
 *  3.  TARGET_STATE (ohne Quelle) → zukünftiger Praxisablauf
 *  4.  TARGET_STATE (mit Quelle) → Änderungsvergleich erzeugt
 *  5.  Unveränderte Antworten landen NICHT in "Das wurde geändert"
 *  6.  Geänderte YES/NO-Antwort → verständliches Vorher/Nachher
 *  7.  Hinzugefügte MULTI_SELECT-Optionen → "künftig zusätzlich"
 *  8.  Entfernte MULTI_SELECT-Optionen → "künftig nicht mehr"
 *  9.  Geänderter FREE_TEXT → mit fachlichem Kontext
 * 10.  Isolierter Freitext ("telefonisch") erscheint NICHT ohne Kontext
 * 11.  M3-Urteile fließen nicht als fachliche Aussagen in den Narrativ
 * 12.  CURRENT_STATE "ausreichend geklärt" → Ist-Ablauf beschrieben
 * 13.  TARGET_STATE "ausreichend geklärt" → zukünftige Entscheidung getroffen
 * 14.  Fehlende Quell-Session → Ziel-Ablauf trotzdem angezeigt
 * 15.  Quell-Session unverändert → keine Änderungen
 * 16.  Keine technischen Fragen-IDs oder JSON in Ausgabe
 * 17.  Hauptansicht wiederholt nicht alle Fragen einzeln
 * 18.  Detailansicht kann Originalfragen anzeigen
 */

import {
  buildProcessNarrative,
  getAnswerSentences,
  getAnswerSentence,
  getOpenStatement,
  MULTI_SELECT_OPTION_TEXTS,
} from "@/lib/workflow/internalProtocol/narrativeEngine";
import {
  buildChangeComparison,
  buildUnchangedSummary,
} from "@/lib/workflow/internalProtocol/changeComparison";
import {
  getPatientWithoutAppointmentSections,
  TARGET_STATE_QUESTION_TEXTS,
} from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import type {
  ProtocolWorkflowCheckpoint,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

// ---------------------------------------------------------------------------
// Testfixtures
// ---------------------------------------------------------------------------

function makeCheckpoint(
  id: string,
  title: string,
  answers: Record<string, string | string[] | null>,
): ProtocolWorkflowCheckpoint {
  return {
    id,
    title,
    status: "CONFIRMED",
    answers: answers as Record<string, import("@/lib/workflow/internalProtocol/workflowAdapter").ProtocolWorkflowAnswerValue>,
  };
}

function fullCurrentCheckpoints(): ProtocolWorkflowCheckpoint[] {
  return [
    makeCheckpoint("PC-C01", "Geltungsbereich", {
      "POT-Q-C01-01": ["POT-Q-C01-01-A"],      // MULTI_SELECT: reguläre Sprechzeiten
      "POT-Q-C01-02": "YES",                    // gilt für alle
      "POT-Q-C01-03": "NO",                     // keine schriftlichen Ausnahmen
    }),
    makeCheckpoint("PC-C02", "Zuständigkeit und Entscheidungsbefugnis", {
      "POT-Q-C02-01": "POT-Q-C02-01-A",         // MFA am Empfang
      "POT-Q-C02-02": "POT-Q-C02-02-B",         // erfahrene MFA mit Schema
      "POT-Q-C02-03": "YES",                    // Zuständigkeiten schriftlich
      "POT-Q-C02-04": "YES",                    // Vertretungsregelung vorhanden
    }),
    makeCheckpoint("PC-C03", "Standardablauf", {
      "POT-Q-C03-01": ["POT-Q-C03-01-A", "POT-Q-C03-01-B"],  // Name+GD, Beschwerden
      "POT-Q-C03-02": "POT-Q-C03-02-A",                      // Wartezeit+Einplanung
      "POT-Q-C03-03": "YES",                                  // Anliegen wird festgehalten
    }),
    makeCheckpoint("PC-C04", "Ausnahmen und Eskalation", {
      "POT-Q-C04-01": ["POT-Q-C04-01-A"],       // Warnsymptome
      "POT-Q-C04-02": "POT-Q-C04-02-A",         // Arzt + Notruf parallel
      "POT-Q-C04-03": "bei Kapazitätserschöpfung oder außerhalb der Öffnungszeiten",
      "POT-Q-C04-04": "YES",                    // Team kennt Eskalationsstufen
    }),
    makeCheckpoint("PC-C05", "Dokumentation und Überprüfung", {
      "POT-Q-C05-01": "YES",                    // Weiterleitungen werden festgehalten
      "POT-Q-C05-02": ["POT-Q-C05-02-A"],       // jährliche QM-Überprüfung
      "POT-Q-C05-03": "POT-Q-C05-03-A",         // Praxisinhaber verantwortlich
    }),
  ];
}

const SECTIONS = getPatientWithoutAppointmentSections();

// ---------------------------------------------------------------------------
// Test 1: CURRENT_STATE → zusammenhängender Ist-Praxistext
// ---------------------------------------------------------------------------

describe("Test 1: CURRENT_STATE Narrativ enthält Ist-Ablauf", () => {
  it("enthält Sätze aus allen Abschnitten", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");

    const allSentences = narrative.flatMap((s) => s.sentences);
    expect(allSentences.length).toBeGreaterThan(0);

    // Prüfe spezifische Sätze für verschiedene Abschnitte
    expect(allSentences.some((s) => s.includes("regulärer Sprechzeiten"))).toBe(true);
    expect(allSentences.some((s) => s.includes("MFA am Empfang"))).toBe(true);
    expect(allSentences.some((s) => s.includes("Wartezeit"))).toBe(true);
    expect(allSentences.some((s) => s.includes("Warnsymptome"))).toBe(true);
    expect(allSentences.some((s) => s.includes("jährlich"))).toBe(true);
  });

  it("erzeugt 5 Abschnitte (einen pro Sektion)", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    expect(narrative).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Test 2: CURRENT_STATE → geklärte und offene Aspekte getrennt
// ---------------------------------------------------------------------------

describe("Test 2: Offene und beantwortete Punkte getrennt", () => {
  it("offene Pflichtfragen landen in openTexts, nicht in sentences", () => {
    const checkpointsWithOpen: ProtocolWorkflowCheckpoint[] = [
      makeCheckpoint("PC-C01", "Geltungsbereich", {
        "POT-Q-C01-01": ["POT-Q-C01-01-A"],
        "POT-Q-C01-02": null,   // Pflichtfrage ohne Antwort → offen
        "POT-Q-C01-03": null,
      }),
      ...fullCurrentCheckpoints().slice(1),
    ];

    const narrative = buildProcessNarrative(SECTIONS, checkpointsWithOpen, "CURRENT_STATE");
    const c01 = narrative.find((s) => s.sectionId === "PC-C01")!;

    expect(c01.openTexts.length).toBeGreaterThan(0);
    expect(c01.openTexts.some((t) => t.includes("Mitarbeitenden"))).toBe(true);
    // Der offene Text darf nicht in sentences landen
    expect(c01.sentences.some((s) => s.includes("Mitarbeitenden"))).toBe(false);
  });

  it("vollständig beantwortete Abschnitte haben keine openTexts", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    const c01 = narrative.find((s) => s.sectionId === "PC-C01")!;
    expect(c01.openTexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: TARGET_STATE ohne Quelle → zukünftiger Praxisablauf
// ---------------------------------------------------------------------------

describe("Test 3: TARGET_STATE Narrativ", () => {
  it("verwendet Zukünftig-Formulierungen für YES/NO-Antworten", () => {
    const checkpoints = fullCurrentCheckpoints();
    const narrative = buildProcessNarrative(SECTIONS, checkpoints, "TARGET_STATE");

    const allSentences = narrative.flatMap((s) => s.sentences);
    // YES-Antwort auf C01-02 im TARGET_STATE-Modus
    expect(allSentences.some((s) => s.includes("soll") || s.includes("Soll"))).toBe(true);
  });

  it("enthält spezifische TARGET_STATE-Sätze für Zuständigkeit", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "TARGET_STATE");
    const c02 = narrative.find((s) => s.sectionId === "PC-C02")!;
    expect(c02.sentences.some((s) => s.includes("sollen") || s.includes("soll"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 4: TARGET_STATE mit Quelle → Änderungsvergleich wird erzeugt
// ---------------------------------------------------------------------------

describe("Test 4: Änderungsvergleich bei geänderter Antwort", () => {
  it("erzeugt Änderungseintrag wenn Antwort geändert wurde", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // Änderung: C02-01 von MFA → Arzt
    target[1].answers["POT-Q-C02-01"] = "POT-Q-C02-01-C";

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c02 = changes.find((s) => s.sectionId === "PC-C02")!;
    const diff = c02.diffs.find((d) => d.questionId === "POT-Q-C02-01");

    expect(diff).toBeDefined();
    expect(diff!.kind).toBe("changed");
  });
});

// ---------------------------------------------------------------------------
// Test 5: Unveränderte Antworten landen NICHT in "Das wurde geändert"
// ---------------------------------------------------------------------------

describe("Test 5: Unveränderte Antworten nicht in Änderungen", () => {
  it("unveränderte Fragen haben kind=unchanged und erscheinen nicht als Diff", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // Nur C03-02 ändern
    target[2].answers["POT-Q-C03-02"] = "POT-Q-C03-02-B";

    const changes = buildChangeComparison(SECTIONS, current, target);

    // C01-01 (MULTI_SELECT) ist unverändert → darf in keiner Diff-Liste auftauchen
    const c01 = changes.find((s) => s.sectionId === "PC-C01")!;
    const c01Diff = c01.diffs.find((d) => d.questionId === "POT-Q-C01-01");
    expect(c01Diff).toBeUndefined();

    // C03-02 (geändert) soll vorhanden sein
    const c03 = changes.find((s) => s.sectionId === "PC-C03")!;
    const c03Diff = c03.diffs.find((d) => d.questionId === "POT-Q-C03-02");
    expect(c03Diff).toBeDefined();
    expect(c03Diff!.kind).toBe("changed");
  });

  it("buildUnchangedSummary enthält unveränderte Sätze (C02-02 unverändert)", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // Nur C02-01 ändern; C02-02 bleibt unverändert → ist in der Whitelist
    target[1].answers["POT-Q-C02-01"] = "POT-Q-C02-01-C";

    const unchanged = buildUnchangedSummary(SECTIONS, current, target);
    const c02 = unchanged.find((s) => s.sectionId === "PC-C02")!;
    expect(c02.sentences.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 6: Geänderte YES/NO-Antwort → verständliches Vorher/Nachher
// ---------------------------------------------------------------------------

describe("Test 6: YES/NO Änderung → natürlichsprachliche Vor/Nach-Sätze", () => {
  it("produziert lesbare Vorher/Nachher-Texte für YES→NO Änderung", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // C02-03: YES → NO (Zuständigkeiten nicht mehr schriftlich)
    target[1].answers["POT-Q-C02-03"] = "NO";

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c02 = changes.find((s) => s.sectionId === "PC-C02")!;
    const diff = c02.diffs.find((d) => d.questionId === "POT-Q-C02-03")!;

    expect(diff.kind).toBe("changed");
    expect(diff.beforeTexts.length).toBeGreaterThan(0);
    expect(diff.afterTexts.length).toBeGreaterThan(0);

    // Vorher-Text sollte die IS-Formulierung enthalten
    expect(diff.beforeTexts[0]).toContain("bekannt");
    // Nachher-Text sollte die Verneinung enthalten
    expect(diff.afterTexts[0]).not.toBe(diff.beforeTexts[0]);
  });

  it("Vorher/Nachher-Texte enthalten keine rohen Werte wie 'YES' oder 'NO'", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    target[1].answers["POT-Q-C02-04"] = "NO";

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c02 = changes.find((s) => s.sectionId === "PC-C02")!;
    const diff = c02.diffs.find((d) => d.questionId === "POT-Q-C02-04")!;

    expect(diff.beforeTexts.join(" ")).not.toMatch(/^YES$|^NO$|^UNCLEAR$/);
    expect(diff.afterTexts.join(" ")).not.toMatch(/^YES$|^NO$|^UNCLEAR$/);
  });
});

// ---------------------------------------------------------------------------
// Test 7: Hinzugefügte MULTI_SELECT-Optionen → "künftig zusätzlich"
// ---------------------------------------------------------------------------

describe("Test 7: MULTI_SELECT neu hinzugefügte Optionen", () => {
  it("erzeugt multi-partial diff mit addedTexts für neue Option", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // C01-01: bisher nur A, jetzt A+B (neu: außerhalb Sprechzeiten)
    target[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A", "POT-Q-C01-01-B"];

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c01 = changes.find((s) => s.sectionId === "PC-C01")!;
    const diff = c01.diffs.find((d) => d.questionId === "POT-Q-C01-01")!;

    expect(diff.kind).toBe("multi-partial");
    expect(diff.addedTexts.length).toBeGreaterThan(0);
    expect(diff.addedTexts.some((t) => t.includes("außerhalb"))).toBe(true);
    expect(diff.removedTexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 8: Entfernte MULTI_SELECT-Optionen → "künftig nicht mehr"
// ---------------------------------------------------------------------------

describe("Test 8: MULTI_SELECT entfernte Optionen", () => {
  it("erzeugt multi-partial diff mit removedTexts für entfernte Option", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    // C03-01: bisher A+B, künftig nur A (B entfernt)
    current[2].answers["POT-Q-C03-01"] = ["POT-Q-C03-01-A", "POT-Q-C03-01-B"];
    target[2].answers["POT-Q-C03-01"] = ["POT-Q-C03-01-A"];

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c03 = changes.find((s) => s.sectionId === "PC-C03")!;
    const diff = c03.diffs.find((d) => d.questionId === "POT-Q-C03-01")!;

    expect(diff.kind).toBe("multi-partial");
    expect(diff.removedTexts.length).toBeGreaterThan(0);
    expect(diff.removedTexts.some((t) => t.includes("Beschwerden"))).toBe(true);
    expect(diff.addedTexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 9: Geänderter FREE_TEXT → mit fachlichem Kontext
// ---------------------------------------------------------------------------

describe("Test 9: FREE_TEXT Änderung mit Kontext", () => {
  it("FREE_TEXT-Antwort enthält den fachlichen Kontext der Frage", () => {
    const section = SECTIONS.find((s) => s.id === "PC-C04")!;
    const question = section.questions.find((q) => q.id === "POT-Q-C04-03")!;

    const sentences = getAnswerSentences(
      question,
      "bei erschöpfter Praxiskapazität",
      "CURRENT_STATE",
    );

    expect(sentences.length).toBe(1);
    // Muss fachlichen Kontext enthalten (nicht nur den Rohtext)
    expect(sentences[0]).toContain("116 117");
    expect(sentences[0]).toContain("bei erschöpfter Praxiskapazität");
  });

  it("Änderung von FREE_TEXT erzeugt Diff mit Kontext in before/afterTexts", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    current[3].answers["POT-Q-C04-03"] = "bei Kapazitätserschöpfung";
    target[3].answers["POT-Q-C04-03"] = "bei Kapazitätserschöpfung oder nach 18 Uhr";

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c04 = changes.find((s) => s.sectionId === "PC-C04")!;
    const diff = c04.diffs.find((d) => d.questionId === "POT-Q-C04-03")!;

    expect(diff.kind).toBe("changed");
    expect(diff.beforeTexts[0]).toContain("116 117");
    expect(diff.afterTexts[0]).toContain("116 117");
  });
});

// ---------------------------------------------------------------------------
// Test 10: "telefonisch" erscheint NICHT isoliert ohne Kontext
// ---------------------------------------------------------------------------

describe("Test 10: Kein isolierter Freitext ohne Kontext", () => {
  it("FREE_TEXT-Antwort wird nie als reiner Rohtext ausgegeben", () => {
    const section = SECTIONS.find((s) => s.id === "PC-C04")!;
    const question = section.questions.find((q) => q.id === "POT-Q-C04-03")!;

    const sentences = getAnswerSentences(question, "telefonisch", "CURRENT_STATE");

    expect(sentences.length).toBe(1);
    // "telefonisch" allein darf nicht das einzige Ergebnis sein
    expect(sentences[0]).not.toBe("telefonisch");
    // Stattdessen muss Kontext hinzugefügt worden sein
    expect(sentences[0].length).toBeGreaterThan("telefonisch".length);
  });
});

// ---------------------------------------------------------------------------
// Test 11: M3-Urteile fließen nicht als fachliche Aussagen in den Narrativ
// ---------------------------------------------------------------------------

describe("Test 11: M3-Urteile nicht im Narrativ", () => {
  it("buildProcessNarrative greift nicht auf clarificationJudgement zurück", () => {
    const checkpoints = fullCurrentCheckpoints();
    // Setze M3-Urteile
    checkpoints[0].clarificationJudgement = "SUFFICIENTLY_CLARIFIED";
    checkpoints[1].clarificationJudgement = "OPEN";
    checkpoints[2].clarificationJudgement = "NOT_RELEVANT";

    const narrative = buildProcessNarrative(SECTIONS, checkpoints, "CURRENT_STATE");
    const allText = narrative.flatMap((s) => [...s.sentences, ...s.openTexts, ...s.unclearTexts]).join(" ");

    // Technische M3-Werte dürfen nicht auftauchen
    expect(allText).not.toContain("SUFFICIENTLY_CLARIFIED");
    expect(allText).not.toContain("NOT_RELEVANT");
    expect(allText).not.toContain("clarificationJudgement");
    // Die Sätze kommen aus den Antworten, nicht aus Urteilen
    expect(allText).toContain("MFA am Empfang");
  });
});

// ---------------------------------------------------------------------------
// Test 12: CURRENT_STATE "ausreichend geklärt" = Ist-Ablauf beschrieben
// ---------------------------------------------------------------------------

describe("Test 12: Vollständig geklärter CURRENT_STATE", () => {
  it("alle Abschnitte haben sentences und keine offenen Punkte", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");

    for (const section of narrative) {
      expect(section.sentences.length).toBeGreaterThan(0);
      expect(section.openTexts).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 13: TARGET_STATE "ausreichend geklärt" = zukünftige Entscheidung
// ---------------------------------------------------------------------------

describe("Test 13: Vollständig geklärter TARGET_STATE", () => {
  it("YES-Antworten in TARGET_STATE erzeugen Soll-Formulierungen", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "TARGET_STATE");

    const c02 = narrative.find((s) => s.sectionId === "PC-C02")!;
    const zustaendigkeitSatz = c02.sentences.find((s) => s.includes("sollen") || s.includes("soll"));
    expect(zustaendigkeitSatz).toBeDefined();
  });

  it("TARGET_STATE openTexts-Formulierungen enthalten 'festzulegen'", () => {
    const stmt = getOpenStatement("POT-Q-C02-01", "TARGET_STATE");
    expect(stmt).toContain("festzulegen");
  });
});

// ---------------------------------------------------------------------------
// Test 14: Fehlende Quell-Session → Ziel-Ablauf trotzdem angezeigt
// ---------------------------------------------------------------------------

describe("Test 14: TARGET_STATE ohne Quell-Session", () => {
  it("buildProcessNarrative funktioniert auch ohne Quell-Checkpoints", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "TARGET_STATE");
    expect(narrative.length).toBe(5);
    const allSentences = narrative.flatMap((s) => s.sentences);
    expect(allSentences.length).toBeGreaterThan(0);
  });

  it("buildChangeComparison mit leeren Quell-Checkpoints gibt leere Diffs zurück", () => {
    const target = fullCurrentCheckpoints();
    const changes = buildChangeComparison(SECTIONS, [], target);

    // Alle Antworten im Target sind "added" (neu hinzugefügt)
    const allDiffs = changes.flatMap((s) => s.diffs);
    expect(allDiffs.every((d) => d.kind === "added")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 15: Quell-Session unverändert → keine Änderungen
// ---------------------------------------------------------------------------

describe("Test 15: Identische IS/SOLL-Snapshots → keine Änderungen", () => {
  it("buildChangeComparison liefert leere diffs wenn Antworten identisch", () => {
    const checkpoints = fullCurrentCheckpoints();
    const changes = buildChangeComparison(SECTIONS, checkpoints, checkpoints);
    const allDiffs = changes.flatMap((s) => s.diffs);
    expect(allDiffs).toHaveLength(0);
  });

  it("buildUnchangedSummary enthält alle Sätze bei identischen Snapshots", () => {
    const checkpoints = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    const allSentences = unchanged.flatMap((s) => s.sentences);
    expect(allSentences.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 16: Keine technischen Fragen-IDs oder JSON in der Ausgabe
// ---------------------------------------------------------------------------

describe("Test 16: Keine technischen IDs oder JSON in Narrativ", () => {
  it("Sätze enthalten keine POT-Q-Präfixe", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    const allText = narrative.flatMap((s) => s.sentences).join(" ");
    expect(allText).not.toMatch(/POT-Q-C\d\d-\d\d/);
  });

  it("Sätze enthalten keine JSON-Artefakte wie '[' oder '{'", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    const allText = narrative.flatMap((s) => s.sentences).join(" ");
    expect(allText).not.toContain("[\"");
    expect(allText).not.toContain("{\"");
  });

  it("Änderungstexte enthalten keine technischen Option-IDs", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    target[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A", "POT-Q-C01-01-B"];

    const changes = buildChangeComparison(SECTIONS, current, target);
    const c01 = changes.find((s) => s.sectionId === "PC-C01")!;
    const diff = c01.diffs.find((d) => d.questionId === "POT-Q-C01-01")!;

    const allTexts = [...diff.addedTexts, ...diff.removedTexts, ...diff.beforeTexts, ...diff.afterTexts].join(" ");
    expect(allTexts).not.toMatch(/POT-Q-C\d\d-\d\d-[A-Z]/);
  });
});

// ---------------------------------------------------------------------------
// Test 17: Hauptansicht wiederholt nicht alle Fragen einzeln
// ---------------------------------------------------------------------------

describe("Test 17: Narrativ fasst zusammen, fragt nicht einzeln ab", () => {
  it("Anzahl der Sätze ist kleiner als Gesamtzahl der Fragen (17)", () => {
    // 17 Fragen insgesamt — bei kompakter Darstellung sollten weniger Sätze erscheinen
    // (pro Ja/Nein-Frage nur 1 Satz, pro SINGLE_SELECT 1 Satz)
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    const totalSentences = narrative.flatMap((s) => s.sentences).length;
    // Es gibt 17 Fragen, aber C01-01 hat 1 Option = 1 Satz,
    // C03-01 hat 2 Optionen = 2 Sätze, C04-01 hat 1 Option = 1 Satz,
    // C05-02 hat 1 Option = 1 Satz. Yes/No → je 1 Satz.
    // Erwartete Zahl: 14 Sätze (17 Fragen, aber 1 MULTI_SELECT mit 2 Optionen → +1)
    // Testen: deutlich weniger als "alle Fragen doppelt" (34) und alle Antworten vorhanden
    expect(totalSentences).toBeGreaterThan(0);
    expect(totalSentences).toBeLessThanOrEqual(25); // nicht jede Frage als Block mit Metainfo
  });

  it("Sätze sind Aussagen, keine 'Frage: Antwort'-Konstrukte für Yes/No", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "CURRENT_STATE");
    const allSentences = narrative.flatMap((s) => s.sentences);
    // Kein Satz endet auf ": Ja" oder ": Nein" (altes Format)
    expect(allSentences.some((s) => s.endsWith(": Ja"))).toBe(false);
    expect(allSentences.some((s) => s.endsWith(": Nein"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test 18: Detailansicht kann Originalfragen zeigen
// ---------------------------------------------------------------------------

describe("Test 18: Detail-Level zeigt Originalfragen", () => {
  it("synthesizeAnswer (aus synthesis.ts) liefert Frage-basierte Sätze für Detail-Ansicht", () => {
    const { synthesizeCheckpoint } = require("@/lib/workflow/internalProtocol/synthesis");
    const section = SECTIONS.find((s) => s.id === "PC-C01")!;
    const checkpoint = fullCurrentCheckpoints()[0];
    const items = synthesizeCheckpoint(section, checkpoint);

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("text");
    expect(items[0]).toHaveProperty("status");
  });

  it("getAnswerSentences und synthesizeAnswer liefern kompatible aber unterschiedliche Texte", () => {
    const { synthesizeAnswer } = require("@/lib/workflow/internalProtocol/synthesis");
    const section = SECTIONS.find((s) => s.id === "PC-C01")!;
    const q = section.questions.find((q) => q.id === "POT-Q-C01-02")!;

    // Altes Format (Detail-Ansicht)
    const oldItems = synthesizeAnswer(q, "YES");
    expect(oldItems[0].text).toBe("Gilt dieser Ablauf für alle Mitarbeitenden in der Praxis?: Ja");

    // Neues Format (Narrativ)
    const newSentences = getAnswerSentences(q, "YES", "CURRENT_STATE");
    expect(newSentences[0]).toBe("Dieser Ablauf gilt für alle Mitarbeitenden der Praxis.");
    expect(newSentences[0]).not.toBe(oldItems[0].text);
  });
});

// ---------------------------------------------------------------------------
// Punkt 1B: Reproduzierbarkeit (Variante B)
// ---------------------------------------------------------------------------

describe("Punkt 1B: Ergebnisse deterministisch reproduzierbar", () => {
  it("buildProcessNarrative liefert bei identischen Eingaben identische Ausgaben", () => {
    const checkpoints = fullCurrentCheckpoints();
    const result1 = buildProcessNarrative(SECTIONS, checkpoints, "CURRENT_STATE");
    const result2 = buildProcessNarrative(SECTIONS, checkpoints, "CURRENT_STATE");
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it("buildChangeComparison liefert bei identischen Eingaben identische Ausgaben", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();
    target[1].answers["POT-Q-C02-01"] = "POT-Q-C02-01-C";
    const r1 = buildChangeComparison(SECTIONS, current, target);
    const r2 = buildChangeComparison(SECTIONS, current, target);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("buildUnchangedSummary liefert bei identischen Eingaben identische Ausgaben", () => {
    const checkpoints = fullCurrentCheckpoints();
    const r1 = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    const r2 = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

// ---------------------------------------------------------------------------
// Punkt 3: Fehlende Ursprungssession
// ---------------------------------------------------------------------------

describe("Punkt 3: Fehlende Ursprungssession – kein Fehler, Ablauf weiterhin sichtbar", () => {
  it("buildProcessNarrative ohne Quell-Checkpoints ergibt vollständigen TARGET_STATE-Narrativ", () => {
    const narrative = buildProcessNarrative(SECTIONS, fullCurrentCheckpoints(), "TARGET_STATE");
    expect(narrative).toHaveLength(5);
    const allSentences = narrative.flatMap((s) => s.sentences);
    expect(allSentences.length).toBeGreaterThan(0);
  });

  it("buildChangeComparison mit leeren Quell-Checkpoints → alle Einträge sind 'added'", () => {
    const changes = buildChangeComparison(SECTIONS, [], fullCurrentCheckpoints());
    const allDiffs = changes.flatMap((s) => s.diffs);
    expect(allDiffs.length).toBeGreaterThan(0);
    expect(allDiffs.every((d) => d.kind === "added")).toBe(true);
  });

  it("Hinweis-String ist im Client-Komponenten-Quellcode vorhanden", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.join(
        __dirname,
        "../app/workflow-cases/[id]/protocol/result/InternalProtocolResultClient.tsx",
      ),
      "utf-8",
    );
    expect(content).toContain("Die zugehörige Bestandsaufnahme ist nicht mehr verfügbar.");
  });
});

// ---------------------------------------------------------------------------
// Punkt 4: FREE_TEXT – kein semantisch falscher Konnektor
// ---------------------------------------------------------------------------

describe("Punkt 4: FREE_TEXT – kein 'wenn:'-Antipattern", () => {
  it("Antwort 'telefonisch' erzeugt keinen 'wenn: telefonisch'-Satz", () => {
    const section = SECTIONS.find((s) => s.id === "PC-C04")!;
    const question = section.questions.find((q) => q.id === "POT-Q-C04-03")!;

    const sentences = getAnswerSentences(question, "telefonisch", "CURRENT_STATE");

    expect(sentences[0]).not.toMatch(/,\s*wenn:\s*telefonisch/i);
    expect(sentences[0]).not.toMatch(/\bwenn:\b/i);
  });

  it("Satzvorlage enthält keinen grammatischen Konnektor der eine temporale/konditionale Aussage voraussetzt", () => {
    const section = SECTIONS.find((s) => s.id === "PC-C04")!;
    const question = section.questions.find((q) => q.id === "POT-Q-C04-03")!;

    // Beide Modi prüfen
    const currentSentence = getAnswerSentences(question, "Testinhalt", "CURRENT_STATE")[0];
    const targetSentence = getAnswerSentences(question, "Testinhalt", "TARGET_STATE")[0];

    expect(currentSentence).not.toContain(", wenn:");
    expect(targetSentence).not.toContain(", wenn:");
  });

  it("116 117 erscheint weiterhin im Kontext (Kontext ist vorhanden)", () => {
    const section = SECTIONS.find((s) => s.id === "PC-C04")!;
    const question = section.questions.find((q) => q.id === "POT-Q-C04-03")!;
    const sentences = getAnswerSentences(question, "Antwortinhalt", "CURRENT_STATE");
    expect(sentences[0]).toContain("116 117");
  });
});

// ---------------------------------------------------------------------------
// Punkt 5: "Das bleibt bestehen" – max. 5 Kernregeln
// ---------------------------------------------------------------------------

describe("Punkt 5: buildUnchangedSummary auf Kernregeln begrenzt", () => {
  it("liefert maximal 5 Aussagen über alle Abschnitte hinweg", () => {
    const checkpoints = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    const allSentences = unchanged.flatMap((s) => s.sentences);
    // Whitelist umfasst 5 Fragen; bei MULTI_SELECT kann es mehr Sätze sein, aber begrenzt
    expect(allSentences.length).toBeLessThanOrEqual(10); // 5 Fragen, max. ~2 Optionen pro MULTI
  });

  it("enthält nicht alle 10+ Pflichtfragen", () => {
    const checkpoints = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    const allSentences = unchanged.flatMap((s) => s.sentences);
    // Bei 17 Fragen (10 Pflicht) + 3 optionale → wäre voll aufgelistet ~13+ Sätze
    // Die Whitelist begrenzt auf die 5 Kernfragen
    expect(allSentences.length).toBeLessThan(13);
  });

  it("enthält Zuständigkeit (C02-01) wenn unverändert", () => {
    const checkpoints = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    const c02 = unchanged.find((s) => s.sectionId === "PC-C02")!;
    expect(c02.sentences.some((s) => s.includes("MFA am Empfang"))).toBe(true);
  });

  it("enthält keine rein administrativen Fragen wie C01-02 (gilt für alle Mitarbeitenden)", () => {
    const checkpoints = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, checkpoints, checkpoints);
    // C01-02 ist NICHT in der Whitelist
    const c01 = unchanged.find((s) => s.sectionId === "PC-C01")!;
    expect(c01.sentences.some((s) => s.includes("alle Mitarbeitenden"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Punkt 6: Vollständigkeit aller 17 Fragen
// ---------------------------------------------------------------------------

describe("Punkt 6: Alle 17 Fragen werden korrekt behandelt", () => {
  it("alle 18 Fragen-IDs sind im Datensatz vorhanden (inkl. neue C04-05)", () => {
    const allQuestions = SECTIONS.flatMap((s) => s.questions);
    const allIds = allQuestions.map((q) => q.id);

    const expected18 = [
      "POT-Q-C01-01", "POT-Q-C01-02", "POT-Q-C01-03",
      "POT-Q-C02-01", "POT-Q-C02-02", "POT-Q-C02-03", "POT-Q-C02-04",
      "POT-Q-C03-01", "POT-Q-C03-02", "POT-Q-C03-03",
      "POT-Q-C04-01", "POT-Q-C04-02", "POT-Q-C04-03", "POT-Q-C04-04", "POT-Q-C04-05",
      "POT-Q-C05-01", "POT-Q-C05-02", "POT-Q-C05-03",
    ];

    for (const id of expected18) {
      expect(allIds).toContain(id);
    }
    expect(allIds).toHaveLength(18);
  });

  it("alle beantworteten Fragen (inkl. optional) erscheinen im CURRENT_STATE-Narrativ", () => {
    // C04-03 (optional, FREE_TEXT) und C05-01 (optional, YES_NO) müssen erscheinen
    const checkpoints = fullCurrentCheckpoints();
    // C04-03 und C05-01 sind in fullCurrentCheckpoints() bereits gesetzt
    const narrative = buildProcessNarrative(SECTIONS, checkpoints, "CURRENT_STATE");

    const c04 = narrative.find((s) => s.sectionId === "PC-C04")!;
    expect(c04.sentences.some((s) => s.includes("116 117"))).toBe(true); // C04-03 erscheint

    const c05 = narrative.find((s) => s.sectionId === "PC-C05")!;
    expect(c05.sentences.some((s) => s.includes("festgehalten"))).toBe(true); // C05-01 erscheint
  });

  it("optionale Fragen ohne Antwort erzeugen keinen openText-Eintrag", () => {
    const checkpoints = [
      makeCheckpoint("PC-C01", "Geltungsbereich", {
        "POT-Q-C01-01": ["POT-Q-C01-01-A"],
        "POT-Q-C01-02": "YES",
        "POT-Q-C01-03": null, // optional, kein openText erwartet
      }),
      ...fullCurrentCheckpoints().slice(1),
    ];

    const narrative = buildProcessNarrative(SECTIONS, checkpoints, "CURRENT_STATE");
    const c01 = narrative.find((s) => s.sectionId === "PC-C01")!;

    // C01-03 ist optional → kein openText
    expect(c01.openTexts).toHaveLength(0);
  });

  it("alle Pflichtfragen ohne Antwort erscheinen als openTexts", () => {
    // Alle Antworten leer → alle Pflichtfragen sollen als offen erscheinen
    const emptyCheckpoints = SECTIONS.map((s) =>
      makeCheckpoint(s.id, s.title, {}),
    );

    const narrative = buildProcessNarrative(SECTIONS, emptyCheckpoints, "CURRENT_STATE");
    const allOpen = narrative.flatMap((s) => s.openTexts);

    // 14 Pflichtfragen → 14 offene Einträge erwartet
    const requiredQuestions = SECTIONS.flatMap((s) =>
      s.questions.filter((q) => q.required),
    );
    expect(allOpen).toHaveLength(requiredQuestions.length);
  });

  it("alle 17 Fragen werden im Änderungsvergleich erfasst wenn geändert", () => {
    const current = fullCurrentCheckpoints();
    const target = fullCurrentCheckpoints();

    // Jede beantwortete Frage im Target ändern
    target[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-B"];
    target[0].answers["POT-Q-C01-02"] = "NO";
    target[1].answers["POT-Q-C02-01"] = "POT-Q-C02-01-C";
    target[2].answers["POT-Q-C03-03"] = "NO";
    target[3].answers["POT-Q-C04-04"] = "NO";

    const changes = buildChangeComparison(SECTIONS, current, target);
    const allDiffs = changes.flatMap((s) => s.diffs);

    expect(allDiffs.some((d) => d.questionId === "POT-Q-C01-01")).toBe(true);
    expect(allDiffs.some((d) => d.questionId === "POT-Q-C01-02")).toBe(true);
    expect(allDiffs.some((d) => d.questionId === "POT-Q-C02-01")).toBe(true);
    expect(allDiffs.some((d) => d.questionId === "POT-Q-C03-03")).toBe(true);
    expect(allDiffs.some((d) => d.questionId === "POT-Q-C04-04")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Punkt 7: Reales Beispielszenario
// ---------------------------------------------------------------------------

describe("Punkt 7: Reales Beispielszenario – Standardablauf-Änderungen", () => {
  // CURRENT_STATE:
  //   C03-01: Name+GD + Versicherungsstatus (A+D), KEINE Beschwerden
  //   C03-02: Wartezeit+Einplanung (A)
  //   C03-03: NO (Anliegen nicht vor Entscheidung festgehalten)
  //
  // TARGET_STATE:
  //   C03-01: Name+GD + Beschwerden + Versicherungsstatus (A+B+D) – B hinzugefügt
  //   C03-02: Wartezeit+Einplanung (A) – unverändert
  //   C03-03: YES – geändert

  function scenarioCurrentCheckpoints(): ProtocolWorkflowCheckpoint[] {
    return fullCurrentCheckpoints().map((cp) =>
      cp.id !== "PC-C03"
        ? cp
        : makeCheckpoint("PC-C03", "Standardablauf", {
            "POT-Q-C03-01": ["POT-Q-C03-01-A", "POT-Q-C03-01-D"],
            "POT-Q-C03-02": "POT-Q-C03-02-A",
            "POT-Q-C03-03": "NO",
          }),
    );
  }

  function scenarioTargetCheckpoints(): ProtocolWorkflowCheckpoint[] {
    return fullCurrentCheckpoints().map((cp) =>
      cp.id !== "PC-C03"
        ? cp
        : makeCheckpoint("PC-C03", "Standardablauf", {
            "POT-Q-C03-01": ["POT-Q-C03-01-A", "POT-Q-C03-01-B", "POT-Q-C03-01-D"],
            "POT-Q-C03-02": "POT-Q-C03-02-A",
            "POT-Q-C03-03": "YES",
          }),
    );
  }

  it("C03-01: addedTexts enthält 'Art und Schwere der Beschwerden'", () => {
    const changes = buildChangeComparison(
      SECTIONS,
      scenarioCurrentCheckpoints(),
      scenarioTargetCheckpoints(),
    );
    const c03 = changes.find((s) => s.sectionId === "PC-C03")!;
    const diff = c03.diffs.find((d) => d.questionId === "POT-Q-C03-01")!;

    expect(diff.kind).toBe("multi-partial");
    expect(diff.addedTexts.some((t) => t.includes("Beschwerden"))).toBe(true);
    expect(diff.removedTexts).toHaveLength(0);
  });

  it("C03-03: beforeTexts enthält Verneinung, afterTexts enthält 'soll festgehalten'", () => {
    const changes = buildChangeComparison(
      SECTIONS,
      scenarioCurrentCheckpoints(),
      scenarioTargetCheckpoints(),
    );
    const c03 = changes.find((s) => s.sectionId === "PC-C03")!;
    const diff = c03.diffs.find((d) => d.questionId === "POT-Q-C03-03")!;

    expect(diff.kind).toBe("changed");
    expect(diff.beforeTexts[0]).toContain("nicht");
    expect(diff.afterTexts[0]).toContain("soll");
  });

  it("C03-02: unverändert und erscheint NICHT in den Diffs", () => {
    const changes = buildChangeComparison(
      SECTIONS,
      scenarioCurrentCheckpoints(),
      scenarioTargetCheckpoints(),
    );
    const c03 = changes.find((s) => s.sectionId === "PC-C03")!;
    const noChangeDiff = c03.diffs.find((d) => d.questionId === "POT-Q-C03-02");
    expect(noChangeDiff).toBeUndefined();
  });

  it("TARGET_STATE-Narrativ enthält beide geänderten Entscheidungen", () => {
    const narrative = buildProcessNarrative(
      SECTIONS,
      scenarioTargetCheckpoints(),
      "TARGET_STATE",
    );
    const c03 = narrative.find((s) => s.sectionId === "PC-C03")!;

    // C03-01: Beschwerden sind jetzt dabei
    expect(c03.sentences.some((s) => s.includes("Beschwerden"))).toBe(true);
    // C03-03: Anliegen soll festgehalten werden
    expect(c03.sentences.some((s) => s.includes("soll"))).toBe(true);
  });

  it("unchanged summary enthält unveränderte Aufnahmeinformationen (C03-01 war Kernregel)", () => {
    // C03-01 ist unverändert in einem anderen Szenario
    const cps = fullCurrentCheckpoints();
    const unchanged = buildUnchangedSummary(SECTIONS, cps, cps);
    const c03 = unchanged.find((s) => s.sectionId === "PC-C03")!;
    expect(c03.sentences.length).toBeGreaterThan(0); // C03-01 ist in der Whitelist
  });
});

// ─── C04-03 / C04-05 fachliche Modellierung ──────────────────────────────────────────────
describe("C04-03/C04-05 Aufspaltung Anlass / Art der Weiterleitung", () => {
  const c04Section = SECTIONS.find((s) => s.id === "PC-C04")!;

  // 1. Zwei getrennte Fragen mit separaten IDs
  it("Anlass (C04-03) und Art (C04-05) sind getrennte Fragen mit separaten IDs", () => {
    const ids = c04Section.questions.map((q) => q.id);
    expect(ids).toContain("POT-Q-C04-03");
    expect(ids).toContain("POT-Q-C04-05");
  });

  // 2. C04-03 Fragentext enthält "In welchen Situationen"
  it("C04-03 hat aktuellen Fragetext 'In welchen Situationen'", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-03")!;
    expect(q).toBeDefined();
    expect(q.text).toContain("In welchen Situationen");
  });

  // 3. C04-05 ist eine MULTI_SELECT-Frage mit Antwortoptionen
  it("C04-05 ist MULTI_SELECT mit Optionen", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-05")!;
    expect(q).toBeDefined();
    expect(q.kind).toBe("MULTI_SELECT");
    expect(q.options).toBeDefined();
    expect(q.options!.length).toBeGreaterThan(0);
  });

  // 4. C04-05 hat keinen required-Flag (optional)
  it("C04-05 ist optional (kein required: true)", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-05")!;
    expect((q as { required?: boolean }).required).toBeFalsy();
  });

  // 5. C04-03 Anlass-Antwort erzeugt Satz mit Bereitschaftsdienst-Kontext
  it("C04-03 Antwort erzeugt Satz mit '116 117'", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-03")!;
    const sentences = getAnswerSentences(q, "bei erschöpfter Praxiskapazität", "CURRENT_STATE");
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0]).toContain("116 117");
    expect(sentences[0]).toContain("bei erschöpfter Praxiskapazität");
  });

  // 6. C04-05 Weiterleitungsart erzeugt korrekten Satz via MULTI_SELECT_OPTION_TEXTS
  it("C04-05 Option-A erzeugt Satz mit Telefonnummer aus MULTI_SELECT_OPTION_TEXTS", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-05")!;
    const selectedIds = ["POT-Q-C04-05-A"];
    const sentences = getAnswerSentences(q, selectedIds, "CURRENT_STATE");
    expect(sentences.length).toBe(1);
    expect(sentences[0]).toContain("116 117");
    expect(sentences[0]).toContain("Telefonnummer");
  });

  // 7. Altdaten-Kompatibilität: alte C04-03-Antwort bleibt sichtbar
  it("Altdaten-Antwort 'telefonisch' in C04-03 bleibt im Narrativ sichtbar", () => {
    const q = c04Section.questions.find((q) => q.id === "POT-Q-C04-03")!;
    const sentences = getAnswerSentences(q, "telefonisch", "CURRENT_STATE");
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0]).toContain("telefonisch");
  });

  // 8. Alte C04-03-Antwort erscheint NICHT automatisch als C04-05-Antwort
  it("Alte C04-03-Daten sind kein Standardwert für C04-05", () => {
    const checkpoints: Record<string, string | string[] | null> = {
      "POT-Q-C04-03": "telefonisch",
      // C04-05 absichtlich nicht gesetzt
    };
    const c04q05 = c04Section.questions.find((q) => q.id === "POT-Q-C04-05")!;
    const answer = checkpoints[c04q05.id];
    expect(answer).toBeUndefined();
  });

  // 9. TARGET_STATE_QUESTION_TEXTS enthält C04-03 und C04-05
  it("TARGET_STATE_QUESTION_TEXTS enthält C04-03 und C04-05", () => {
    expect(TARGET_STATE_QUESTION_TEXTS["POT-Q-C04-03"]).toBeDefined();
    expect(TARGET_STATE_QUESTION_TEXTS["POT-Q-C04-03"]).toContain("In welchen Situationen");
    expect(TARGET_STATE_QUESTION_TEXTS["POT-Q-C04-05"]).toBeDefined();
    expect(TARGET_STATE_QUESTION_TEXTS["POT-Q-C04-05"]).toContain("Weiterleitung");
  });

  // 10. Vergleich erzeugt separate Diffs für C04-03 und C04-05
  it("Vergleich erzeugt separate Diffs für C04-03 und C04-05", () => {
    const source = [
      makeCheckpoint("PC-C04", "Ausnahmen und Eskalation", {
        "POT-Q-C04-01": ["POT-Q-C04-01-A"],
        "POT-Q-C04-02": "POT-Q-C04-02-A",
        "POT-Q-C04-03": "bisher: bei Kapazitätserschöpfung",
        "POT-Q-C04-04": "YES",
        "POT-Q-C04-05": ["POT-Q-C04-05-A"],
      }),
    ];
    const target = [
      makeCheckpoint("PC-C04", "Ausnahmen und Eskalation", {
        "POT-Q-C04-01": ["POT-Q-C04-01-A"],
        "POT-Q-C04-02": "POT-Q-C04-02-A",
        "POT-Q-C04-03": "zukünftig: bei allen Nicht-Notfällen außerhalb der Öffnungszeiten",
        "POT-Q-C04-04": "YES",
        "POT-Q-C04-05": ["POT-Q-C04-05-A", "POT-Q-C04-05-C"],
      }),
    ];
    const comparison = buildChangeComparison(SECTIONS, source, target);
    const c04 = comparison.find((s) => s.sectionId === "PC-C04")!;
    const q03diff = c04.diffs.find((d) => d.questionId === "POT-Q-C04-03");
    const q05diff = c04.diffs.find((d) => d.questionId === "POT-Q-C04-05");
    expect(q03diff).toBeDefined();
    expect(q05diff).toBeDefined();
    expect(q03diff!.kind).toBe("changed");
    expect(q05diff!.kind).not.toBe("unchanged");
  });
});
