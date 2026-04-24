export type M2Answer = "ja" | "nein" | "unklar" | "offen";

export type M2Question = {
  id: string;
  text: string;
};

/**
 * Strukturierte M2-Antworten pro Checkpoint.
 * Schlüssel: Fragen-ID (z. B. "M2-01"), Wert: Antwort.
 */
export type M2CheckpointAnswers = Record<string, M2Answer>;

/**
 * Prefill-Daten für eine gesamte M2-Session.
 * Schlüssel: Checkpoint-ID (z. B. "K01"), Wert: Antworten pro Frage.
 */
export type M2PrefillData = Record<string, M2CheckpointAnswers>;

/**
 * Statischer Katalog der M2-Fragen pro Checkpoint K01–K08.
 * Maßgebliche Definitionen: lib/logic/checkpointCatalog.ts und docs/architecture/checkpoints.md
 */
export const M2_QUESTIONS: Record<string, M2Question[]> = {
  K01: [
    {
      id: "M2-01",
      text: "Sind Sie telefonisch und per SMS erreichbar?",
    },
    {
      id: "M2-02",
      text: "Sind Sie per E-Mail oder über unser Praxissystem erreichbar?",
    },
    {
      id: "M2-03",
      text: "Falls Sie selbst nicht gut erreichbar sind: Können wir Sie über eine Kontaktperson erreichen?",
    },
    {
      id: "M2-04",
      text: "Können Sie Informationen oder Nachrichten auf Deutsch gut verstehen?",
    },
  ],
  K02: [
    {
      id: "M2-01",
      text: "Ist es Ihnen grundsätzlich möglich, Termine in unserer Praxis wahrzunehmen?",
    },
    {
      id: "M2-02",
      text: "Haben Sie aktuell Schwierigkeiten, Termine in unserer Praxis wahrzunehmen (z. B. aufgrund eingeschränkter Mobilität oder organisatorischer Gründe)?",
    },
    {
      id: "M2-03",
      text: "Können Sie Unterstützung organisieren, um Termine wahrzunehmen (z. B. durch Angehörige oder andere Personen)?",
    },
  ],
  K03: [
    {
      id: "M2-01",
      text: "Haben Sie Unterlagen zu Ihren Diagnosen (z. B. Arztbriefe oder Befunde)?",
    },
    {
      id: "M2-02",
      text: "Waren Sie in den letzten 3 Monaten im Krankenhaus oder bei Fachärzten in Behandlung?",
    },
    {
      id: "M2-03",
      text: "Sind Sie regelmäßig in fachärztlicher Behandlung?",
    },
    {
      id: "M2-04",
      text: "Wissen Sie, wo Sie Ihre medizinischen Unterlagen finden oder wie Sie diese bei Bedarf erhalten können?",
    },
  ],
  K04: [
    {
      id: "M2-01",
      text: "Haben Sie einen aktuellen Medikamentenplan oder eine Übersicht?",
    },
    {
      id: "M2-02",
      text: "Nehmen Sie Ihre Medikamente regelmäßig ein?",
    },
    {
      id: "M2-03",
      text: "Fällt es Ihnen leicht, die Medikamente wie vorgesehen einzunehmen?",
    },
    {
      id: "M2-04",
      text: "Nehmen Sie Medikamente ein, die nicht auf Ihrem Plan stehen?",
    },
    {
      id: "M2-05",
      text: "Haben Sie Probleme oder Beschwerden im Zusammenhang mit Ihren Medikamenten?",
    },
  ],
  K05: [
    {
      id: "M2-01",
      text: "Befinden Sie sich derzeit wegen einer Erkrankung in ärztlicher Behandlung?",
    },
    {
      id: "M2-02",
      text: "Gibt es Erkrankungen, die aktuell noch abgeklärt oder beobachtet werden?",
    },
    {
      id: "M2-03",
      text: "Werden Sie wegen einer Erkrankung regelmäßig medizinisch von Fachärzten betreut?",
    },
    {
      id: "M2-04",
      text: "Nehmen Sie aktuell Facharzttermine oder medizinische Behandlungen wahr?",
    },
  ],
  K06: [
    {
      id: "M2-01",
      text: "Benötigen Sie im Alltag Hilfe (z. B. bei Terminen, Haushalt oder Versorgung)?",
    },
    {
      id: "M2-02",
      text: "Erhalten Sie aktuell Hilfe durch andere Personen (z. B. Angehörige oder Freunde)?",
    },
    {
      id: "M2-03",
      text: "Werden Sie durch einen Pflegedienst oder andere Dienste betreut?",
    },
    {
      id: "M2-04",
      text: "Ist Ihre Versorgung im Alltag zuverlässig sichergestellt?",
    },
  ],
  K07: [
    {
      id: "M2-01",
      text: "Hatten Sie in letzter Zeit einen Krankenhausaufenthalt, eine Operation oder einen Unfall?",
    },
    {
      id: "M2-02",
      text: "Benötigen Sie vorübergehend Hilfe im Alltag (z. B. nach einem Eingriff oder einer Erkrankung)?",
    },
    {
      id: "M2-03",
      text: "Haben Sie für diese Zeit Unterstützung organisiert (z. B. durch Angehörige oder andere Personen)?",
    },
    {
      id: "M2-04",
      text: "Ist Ihre Versorgung für die nächste Zeit sichergestellt?",
    },
  ],
  K08: [
    {
      id: "M2-01",
      text: "Können Sie Videosprechstunden nutzen (allein oder mit Unterstützung)?",
    },
    {
      id: "M2-02",
      text: "Können Sie digitale Anfragen stellen (z. B. für Rezepte, Überweisungen oder Bescheinigungen)?",
    },
    {
      id: "M2-03",
      text: "Können Sie Nachrichten oder Dokumente digital empfangen und senden?",
    },
    {
      id: "M2-04",
      text: "Möchten Sie Informationen oder Erklärungen zur Nutzung unserer digitalen Angebote erhalten?",
    },
  ],
  K12: [
    // Mobilität
    {
      id: "M2-01",
      text: "Wirkt die Fortbewegung im Alltag sicher?",
    },
    {
      id: "M2-02",
      text: "Gibt es Hinweise auf Unsicherheit oder Sturzgefährdung?",
    },
    // Selbstversorgung
    {
      id: "M2-03",
      text: "Wirkt die Selbstversorgung im Alltag selbstständig möglich?",
    },
    {
      id: "M2-04",
      text: "Gibt es Hinweise, dass Unterstützung notwendig ist?",
    },
    // Kognition / Orientierung
    {
      id: "M2-05",
      text: "Wirkt der Patient im Alltag orientiert und strukturiert?",
    },
    {
      id: "M2-06",
      text: "Gibt es Hinweise auf Vergessen oder Überforderung im Alltag?",
    },
    // Ernährung
    {
      id: "M2-07",
      text: "Wirkt die Nahrungsaufnahme im Alltag ausreichend und regelmäßig?",
    },
    {
      id: "M2-08",
      text: "Gibt es Hinweise auf Probleme beim Essen?",
    },
    // Flüssigkeitsaufnahme
    {
      id: "M2-09",
      text: "Wirkt die Flüssigkeitsaufnahme ausreichend?",
    },
    {
      id: "M2-10",
      text: "Gibt es Hinweise, dass zu wenig getrunken wird?",
    },
    // Umgang mit Hilfsmitteln
    {
      id: "M2-11",
      text: "Wirkt der Umgang mit Hilfsmitteln (z. B. Rollator, Rollstuhl) im Alltag sicher?",
    },
    // Pflegegrad / Versorgungsniveau
    {
      id: "M2-13",
      text: "Besteht aktuell ein Pflegegrad?",
    },
    {
      id: "M2-14",
      text: "Wirkt die aktuelle Einstufung passend zur Situation?",
    },
  ],
};

/**
 * Paralleler Fragenkatalog für die MFA-Vorbereitung.
 *
 * Strukturell identisch zu `M2_QUESTIONS` (`Record<checkpointId, M2Question[]>`),
 * jedoch mit eigenen, praxisorientierten Formulierungen und disjunkten Frage-IDs
 * im Format `MFA-K{nn}-{nn}`, sodass MFA- und Patientenantworten konfliktfrei
 * im selben `ctx_prefill[checkpointId]`-Container koexistieren können.
 *
 * Antwortschema bleibt unverändert (`M2Answer` = "ja" | "nein" | "unklar").
 */
/**
 * Persistierter Vorbereitungsweg eines Falls.
 *
 * - "mfa"           → Vorbereitung durch MFA mit MFA-Fragenkatalog
 * - "conversation"  → Vorbereitung im Patientengespräch in der Praxis
 *                     (nutzt den Patientenfragen-Katalog, gespeichert vom Arzt-Account)
 * - "patient"       → Patient hat den Fragebogen über den externen Link beantwortet
 * - "skipped"       → Vorbereitung wurde bewusst übersprungen
 * - "none"          → noch keine Vorbereitung
 *
 * Nur "mfa" / "conversation" / "patient" haben gespeicherte Antworten in `ctx_prefill`.
 * "skipped" / "none" implizieren `ctx_prefill` ohne gespeicherte Antworten.
 */
export type PreparationMode =
  | "mfa"
  | "conversation"
  | "patient"
  | "skipped"
  | "none";

/**
 * Gibt den passenden Fragenkatalog für einen Vorbereitungsweg zurück.
 * Für Wege ohne Antworten ("skipped" / "none") wird `null` zurückgegeben –
 * Aufrufer dürfen dann nichts rendern und nichts speichern.
 */
export function getCatalogForMode(
  mode: PreparationMode | string | null | undefined,
): Record<string, M2Question[]> | null {
  if (mode === "mfa") return M2_QUESTIONS_MFA;
  if (mode === "conversation" || mode === "patient") return M2_QUESTIONS;
  return null;
}

const ALLOWED_ANSWERS: ReadonlySet<string> = new Set([
  "ja",
  "nein",
  "unklar",
  "offen",
]);

/**
 * Filtert ein Prefill-Objekt strikt auf die IDs des für `mode` zuständigen
 * Katalogs. Antworten mit unbekannten oder fremdmodischen IDs werden verworfen,
 * Checkpoints ohne verbleibende Antworten werden entfernt. Ungültige Antwort-
 * werte werden ebenfalls verworfen.
 *
 * Damit ist garantiert, dass `ctx_prefill` nie eine Mischung aus MFA- und
 * Patienten-IDs enthält und dass M3 für jede gespeicherte ID einen passenden
 * Fragetext im aktiven Katalog findet.
 */
export function sanitizePrefillForMode(
  prefill: unknown,
  mode: PreparationMode | string | null | undefined,
): M2PrefillData {
  const catalog = getCatalogForMode(mode);
  if (
    !catalog ||
    !prefill ||
    typeof prefill !== "object" ||
    Array.isArray(prefill)
  ) {
    return {};
  }

  const result: M2PrefillData = {};
  for (const [checkpointId, rawAnswers] of Object.entries(
    prefill as Record<string, unknown>,
  )) {
    const allowedQuestions = catalog[checkpointId];
    if (
      !allowedQuestions ||
      !rawAnswers ||
      typeof rawAnswers !== "object" ||
      Array.isArray(rawAnswers)
    ) {
      continue;
    }
    const allowedIds = new Set(allowedQuestions.map((q) => q.id));
    const cleanedAnswers: M2CheckpointAnswers = {};
    for (const [qId, answer] of Object.entries(
      rawAnswers as Record<string, unknown>,
    )) {
      if (
        allowedIds.has(qId) &&
        typeof answer === "string" &&
        ALLOWED_ANSWERS.has(answer)
      ) {
        cleanedAnswers[qId] = answer as M2Answer;
      }
    }
    if (Object.keys(cleanedAnswers).length > 0) {
      result[checkpointId] = cleanedAnswers;
    }
  }
  return result;
}

/**
 * Ergänzt für die übergebenen aktiven Checkpoint-IDs alle laut Katalog
 * vorhandenen Fragen, die in `prefill` noch keinen Wert haben, mit `"offen"`.
 *
 * Damit ist die verbindliche Regel umgesetzt: Beim Speichern müssen alle
 * Fragen aller aktiven Checkpoints im Prefill enthalten sein. Bestehende
 * Antworten werden nicht überschrieben; Checkpoints, die nicht zum aktiven
 * Modus-Katalog gehören, werden ignoriert.
 */
export function withDefaultOffenForCheckpoints(
  prefill: M2PrefillData,
  checkpointIds: readonly string[],
  mode: PreparationMode | string | null | undefined,
): M2PrefillData {
  const catalog = getCatalogForMode(mode);
  if (!catalog) return prefill;

  const result: M2PrefillData = {};
  for (const [cpId, answers] of Object.entries(prefill)) {
    result[cpId] = { ...answers };
  }

  for (const cpId of checkpointIds) {
    const questions = catalog[cpId];
    if (!questions || questions.length === 0) continue;
    const merged: M2CheckpointAnswers = { ...(result[cpId] ?? {}) };
    for (const q of questions) {
      if (merged[q.id] === undefined) {
        merged[q.id] = "offen";
      }
    }
    result[cpId] = merged;
  }

  return result;
}

/**
 * Löst den Fragetext einer gespeicherten `questionId` im für `mode` aktiven
 * Katalog auf. Gibt `null` zurück, wenn keine Auflösung möglich ist – Aufrufer
 * sollten den Eintrag dann ausblenden, nicht die Roh-ID darstellen.
 *
 * Zusätzlich wird der historische Patientengesprächs-Sonderfall berücksichtigt,
 * bei dem ältere Daten IDs der Form `K\d{2}-\d{2}` enthalten können
 * (rückwärtskompatibel zur vorigen Implementierung).
 */
export function resolveQuestionTextForMode(
  mode: PreparationMode | string | null | undefined,
  checkpointId: string,
  questionId: string,
): string | null {
  const catalog = getCatalogForMode(mode);
  if (!catalog) return null;
  const questions = catalog[checkpointId] ?? [];
  const exactMatch = questions.find((q) => q.id === questionId);
  if (exactMatch) return exactMatch.text;

  // Rückwärtskompatibel: Patientenkatalog akzeptiert Legacy-Format Kxx-yy
  if (mode === "conversation" || mode === "patient") {
    const legacyMatch = questionId.match(/^(K\d{2})-(\d{2})$/);
    if (legacyMatch && legacyMatch[1] === checkpointId) {
      const normalizedId = `M2-${legacyMatch[2]}`;
      const normalizedMatch = questions.find((q) => q.id === normalizedId);
      if (normalizedMatch) return normalizedMatch.text;
    }
  }

  return null;
}

export const M2_QUESTIONS_MFA: Record<string, M2Question[]> = {
  K01: [
    {
      id: "MFA-K01-01",
      text: "Ist der Patient für uns grundsätzlich erreichbar?",
    },
    {
      id: "MFA-K01-02",
      text: "Sind die hinterlegten Kontaktdaten aktuell?",
    },
    {
      id: "MFA-K01-03",
      text: "Ist bei Bedarf eine Kontaktperson/Vertrauensperson erreichbar?",
    },
  ],
  K02: [
    {
      id: "MFA-K02-01",
      text: "Ist es dem Patienten praktisch möglich, persönliche Termine wahrzunehmen?",
    },
    {
      id: "MFA-K02-02",
      text: "Gibt es erkennbare Einschränkungen bei der Terminwahrnehmung (z. B. Mobilität, Entfernung, Organisation)?",
    },
  ],
  K03: [
    {
      id: "MFA-K03-01",
      text: "Liegen aktuelle Befunde/Unterlagen vor?",
    },
    {
      id: "MFA-K03-02",
      text: "Sind die Diagnosen im Krankenblatt nachvollziehbar dokumentiert?",
    },
  ],
  K04: [
    {
      id: "MFA-K04-01",
      text: "Ist die Begründung der Medikation durch Diagnosen nachvollziehbar dokumentiert?",
    },
  ],
  K05: [
    {
      id: "MFA-K05-01",
      text: "Ist bekannt, bei welchen Fachärzten der Patient aktuell in Behandlung ist?",
    },
    {
      id: "MFA-K05-02",
      text: "Ist die fachärztliche Mitbehandlung strukturiert und nachvollziehbar?",
    },
  ],
  K06: [
    {
      id: "MFA-K06-01",
      text: "Ist bekannt, ob der Patient im Alltag dauerhaft Unterstützung benötigt?",
    },
    {
      id: "MFA-K06-02",
      text: "Ist bekannt, ob der Patient im Alltag zuverlässig Unterstützung erhält?",
    },
    {
      id: "MFA-K06-03",
      text: "Sind Kontaktpersonen oder unterstützende Stellen (z. B. Familie, Pflegedienst) bekannt?",
    },
    {
      id: "MFA-K06-04",
      text: "Funktioniert die Kommunikation mit den unterstützenden Personen oder Stellen zuverlässig?",
    },
  ],
  K07: [
    {
      id: "MFA-K07-01",
      text: "Ist ein vorübergehender Unterstützungsbedarf bekannt?",
    },
    {
      id: "MFA-K07-02",
      text: "Ist die notwendige Unterstützung für diese Phase organisiert?",
    },
    {
      id: "MFA-K07-03",
      text: "Ist nachvollziehbar, wer die Unterstützung übernimmt?",
    },
  ],
  K08: [
    {
      id: "MFA-K08-01",
      text: "Nutzt der Patient digitale Praxisangebote aktiv?",
    },
  ],
  K09: [
    {
      id: "MFA-K09-01",
      text: "Hält der Patient Termine und Absprachen zuverlässig ein?",
    },
    {
      id: "MFA-K09-02",
      text: "Hält sich der Patient an Praxisabläufe (z. B. Terminvereinbarung statt spontanes Erscheinen)?",
    },
  ],
};
