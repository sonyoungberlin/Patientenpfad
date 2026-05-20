import { listOfficeTopics } from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForTopic } from "@/lib/office/m2Questions";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Entfernt alle (...)-Blöcke aus einem Text, bevor Regex-Prüfungen angewendet
 * werden. Verhindert Falsch-Positive bei erklärenden Klammerinhalten.
 * Beispiel: "(z. B. Anstellung, BAG)" → ""
 */
function stripParentheses(text: string): string {
  return text.replace(/\([^)]*\)/g, "");
}

interface M2QuestionRef {
  topicId: string;
  checkpointId: string;
  questionId: string;
  text: string;
}

/**
 * Iteriert über alle Topics und Checkpoints und gibt eine flache Liste aller
 * M2-Fragen zurück. Nutzt ausschließlich die öffentlichen Getter-Funktionen.
 */
function collectAllM2Questions(): M2QuestionRef[] {
  const result: M2QuestionRef[] = [];
  for (const topic of listOfficeTopics()) {
    const byCheckpoint = getM2QuestionsForTopic(topic.id);
    for (const [checkpointId, questions] of Object.entries(byCheckpoint)) {
      for (const q of questions) {
        result.push({
          topicId: topic.id,
          checkpointId,
          questionId: q.id,
          text: q.text,
        });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Structural Allowlist — KEIN TODO
//
// Fragen, die " oder " außerhalb von Klammern enthalten, aber eindeutig
// Ja/Nein-tauglich sind. Kategorien:
//   - Gendering: geschlechtsneutrale Arzt/Ärztin- und Patientinnen/Patienten-Varianten
//   - Nominale Beispielreihe nach "wie" (Existenzfrage, nicht Auswahlfrage)
//   - Synonymes Nomen-Paar (beide Terme bezeichnen dieselbe Aktion)
//   - Adjektiv-Paar für eine einheitliche Personengruppe
//
// Neue Einträge nur nach fachlicher Prüfung — nicht für strukturelle Probleme.
// ---------------------------------------------------------------------------
const ODER_STRUCTURAL_ALLOWLIST = new Set<string>([
  // Gendering: Arzt/Ärztin — zwei separate Formulierungen in der Datei
  "Ist klar, welcher Arzt oder welche Aerztin die medizinische Pruefung uebernimmt?",
  "Ist klar, welcher Arzt oder welche Ärztin vom Fortbildungsnachweis betroffen ist?",
  // Gendering: Patientinnen/Patienten
  "Müssen betroffene Patientinnen oder Patienten informiert werden?",
  // Nominale Beispielreihe nach "wie" (Ja/Nein: fehlt irgendein Bestandteil?)
  "Fehlt ein konkreter Dokumentationsbestandteil wie Befund, Diagnose oder Indikation?",
  // Synonymes Nomen-Paar (Antwort und Korrektur beschreiben dieselbe Aktion)
  "Gibt es noch offene Punkte, bevor die Antwort oder Korrektur an die KV geht?",
  // Adjektiv-Paar für eine Personengruppe (keine Entscheidungsambiguität)
  "Sind die Eskalationswege auch fuer neue oder vertretende Mitarbeitende verstaendlich?",
]);

// ---------------------------------------------------------------------------
// Harte Regeln (CI-blockierend)
// ---------------------------------------------------------------------------

describe("M2-Fragen Qualität: Struktur (CI-blockierend)", () => {
  const ALL_QUESTIONS = collectAllM2Questions();

  it("alle M2-Fragen enden mit '?'", () => {
    const violations: string[] = [];
    for (const q of ALL_QUESTIONS) {
      if (!q.text.trim().endsWith("?")) {
        violations.push(
          `${q.topicId}/${q.checkpointId}/${q.questionId}: "${q.text}"`,
        );
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `${violations.length} M2-Frage(n) enden nicht mit "?":\n` +
          violations.map((v) => `  - ${v}`).join("\n"),
      );
    }
  });

  it("keine direkte W-Frage als Hauptinterrogativ", () => {
    // Erlaubt: eingebettete W-Fragen wie "Ist bekannt, wer ..."
    // Verboten: Satzanfang mit Wer/Was/Wie/Wann/Wo/Warum als Hauptinterrogativ
    const W_PATTERN = /^(Wer|Was|Wie|Wann|Wo|Warum)\b/i;
    const violations: string[] = [];
    for (const q of ALL_QUESTIONS) {
      if (W_PATTERN.test(q.text.trim())) {
        violations.push(
          `${q.topicId}/${q.checkpointId}/${q.questionId}: "${q.text}"`,
        );
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `${violations.length} M2-Frage(n) beginnen mit einem direkten W-Interrogativ:\n` +
          violations.map((v) => `  - ${v}`).join("\n"),
      );
    }
  });

  it('kein echtes "oder" außerhalb von Klammern im Hauptsatz', () => {
    // Vorgehen:
    //   1. Klammerinhalte ausblenden (stripParentheses)
    //   2. Auf " oder " prüfen
    //   3. Einträge aus ODER_STRUCTURAL_ALLOWLIST überspringen
    // Neue Fragen mit "oder" außerhalb Klammern müssen entweder umformuliert
    // oder mit Begründung in die ODER_STRUCTURAL_ALLOWLIST aufgenommen werden.
    const violations: string[] = [];
    for (const q of ALL_QUESTIONS) {
      const stripped = stripParentheses(q.text);
      if (!/ oder /i.test(stripped)) continue;
      if (ODER_STRUCTURAL_ALLOWLIST.has(q.text)) continue;
      violations.push(
        `${q.topicId}/${q.checkpointId}/${q.questionId}: "${q.text}"`,
      );
    }
    if (violations.length > 0) {
      throw new Error(
        `${violations.length} M2-Frage(n) enthalten "oder" außerhalb von Klammern:\n` +
          violations.map((v) => `  - ${v}`).join("\n"),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Weiche Regeln (informativ — Test passiert immer, nur console.warn)
// ---------------------------------------------------------------------------

describe("M2-Fragen Qualität: Hinweise (informativ, kein FAIL)", () => {
  const ALL_QUESTIONS = collectAllM2Questions();

  it("komplexe Aufzählungen mit >= 3 Kommas im Hauptsatz (console.warn)", () => {
    let count = 0;
    for (const q of ALL_QUESTIONS) {
      const stripped = stripParentheses(q.text);
      const commaCount = (stripped.match(/,/g) ?? []).length;
      if (commaCount >= 3) {
        count++;
        console.warn(
          `[M2-HINWEIS] Komplexe Aufzählung (${commaCount} Kommas): ` +
            `${q.topicId}/${q.checkpointId}/${q.questionId}: "${q.text}"`,
        );
      }
    }
    if (count > 0) {
      console.warn(
        `[M2-HINWEIS] ${count} Frage(n) mit >= 3 Kommas im Hauptsatz — prüfen, ob vereinfachbar.`,
      );
    }
    // Kein throw — immer bestanden
  });

  it("regulatorische Sprache (§, 'gesetzlich verpflichtet', 'gemäß')", () => {
    const LEGAL_PATTERN = /nach §|gemäß §|gesetzlich verpflichtet|nach Absatz|laut §/i;
    let count = 0;
    for (const q of ALL_QUESTIONS) {
      if (LEGAL_PATTERN.test(q.text)) {
        count++;
        console.warn(
          `[M2-HINWEIS] Regulatorische Sprache: ` +
            `${q.topicId}/${q.checkpointId}/${q.questionId}: "${q.text}"`,
        );
      }
    }
    if (count > 0) {
      console.warn(
        `[M2-HINWEIS] ${count} Frage(n) mit regulatorischer Sprache — ggf. vereinfachen.`,
      );
    }
    // Kein throw — immer bestanden
  });
});
