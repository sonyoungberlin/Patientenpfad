"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Topic decisions (Anliegen) – local to this demo page
// ---------------------------------------------------------------------------

type TopicDecision = "possible" | "not_possible" | null;

type Topic = {
  id: string;
  label: string;
  textByDecision: {
    possible: string;
    not_possible: string;
  };
  docByDecision: {
    possible: string;
    not_possible: string;
  };
};

const TOPICS: Topic[] = [
  {
    id: "impfung",
    label: "Impfung",
    textByDecision: {
      possible: "Eine Impfung kann in unserer Praxis durchgeführt werden.",
      not_possible: "Eine direkte Impfung ist aktuell nicht möglich.",
    },
    docByDecision: {
      possible: "Impfung: möglich.",
      not_possible: "Impfung: nicht möglich.",
    },
  },
  {
    id: "au",
    label: "AU / Krankschreibung",
    textByDecision: {
      possible: "Eine Arbeitsunfähigkeitsbescheinigung kann ausgestellt werden.",
      not_possible:
        "Eine Arbeitsunfähigkeitsbescheinigung kann nicht ausgestellt werden.",
    },
    docByDecision: {
      possible: "AU: möglich.",
      not_possible: "AU: nicht möglich.",
    },
  },
  {
    id: "rezept",
    label: "Rezept",
    textByDecision: {
      possible: "Ein Rezept kann ausgestellt werden.",
      not_possible: "Ein Rezept kann nicht ausgestellt werden.",
    },
    docByDecision: {
      possible: "Rezept: möglich.",
      not_possible: "Rezept: nicht möglich.",
    },
  },
  {
    id: "wundversorgung",
    label: "Wundversorgung",
    textByDecision: {
      possible:
        "Eine Wundversorgung kann in unserer Praxis durchgeführt werden.",
      not_possible:
        "Diese Form der Wundversorgung führen wir in unserer Praxis nicht durch.",
    },
    docByDecision: {
      possible: "Wundversorgung: möglich.",
      not_possible: "Wundversorgung: nicht möglich.",
    },
  },
];

// ---------------------------------------------------------------------------
// Global Checkpoints (Erklärungen + Wege) – local to this demo page
// ---------------------------------------------------------------------------

type GlobalCheckpointStatus = "yes" | "no" | "unknown";

type GlobalCheckpoint = {
  id: string;
  label: string;
  type: "explanation" | "way";
  textByStatus?: {
    yes?: string;
    no?: string;
    unknown?: string;
  };
  text?: string; // für Wege ohne Status
};

const GLOBAL_CHECKPOINTS: GlobalCheckpoint[] = [
  {
    id: "abroad",
    label: "Patient im Ausland",
    type: "explanation",
    textByStatus: {
      yes: "Bestimmte Leistungen können nur durchgeführt werden, wenn sich die Person in Deutschland befindet.",
      unknown:
        "Befinden Sie sich aktuell in Deutschland? Falls nicht, können bestimmte Leistungen nicht durchgeführt werden.",
    },
  },
  {
    id: "missing_data",
    label: "Daten unvollständig",
    type: "explanation",
    textByStatus: {
      no: "Für die Bearbeitung fehlen noch notwendige Angaben.",
      unknown: "Damit wir das prüfen können, benötigen wir noch einige Angaben.",
    },
  },
  {
    id: "doctor_required",
    label: "Ärztliche Vorstellung erforderlich",
    type: "explanation",
    textByStatus: {
      yes: "Für dieses Anliegen ist eine persönliche ärztliche Vorstellung erforderlich.",
      unknown:
        "Gegebenenfalls ist eine persönliche ärztliche Vorstellung erforderlich.",
    },
  },
  {
    id: "booking",
    label: "Termin buchen",
    type: "way",
    text: "Termine können über den Online-Kalender vereinbart werden.",
  },
  {
    id: "digital",
    label: "Digitale Anfrage",
    type: "way",
    text: "Die Anfrage kann über die digitale Anfrage gestellt werden.",
  },
  {
    id: "documents",
    label: "Unterlagen mitbringen",
    type: "way",
    text: "Zum Termin werden die relevanten Unterlagen benötigt.",
  },
];

/**
 * Demo-Seite: Anliegen-Entscheidung + globale Erklärungen + globale Wege.
 *
 * Kein API-Aufruf, kein Login, kein Speichern.
 * Ziel: testen, ob Entscheidung + globale Erklärung + globaler Weg als Puzzle funktioniert.
 */
export default function InquiryDemoPage() {
  const [topicState, setTopicState] = useState<Record<string, TopicDecision>>(
    () => Object.fromEntries(TOPICS.map((t) => [t.id, null])),
  );
  const [globalState, setGlobalState] = useState<
    Record<string, GlobalCheckpointStatus>
  >(
    () =>
      Object.fromEntries(GLOBAL_CHECKPOINTS.map((cp) => [cp.id, "unknown"])),
  );

  // ── Computed output paragraphs ──────────────────────────────────────────

  const topicParagraphs: string[] = TOPICS.flatMap((t) => {
    const decision = topicState[t.id];
    return decision ? [t.textByDecision[decision]] : [];
  });

  const globalExplanationParagraphs: string[] = GLOBAL_CHECKPOINTS.filter(
    (cp) => cp.type === "explanation",
  ).flatMap((cp) => {
    const status = globalState[cp.id] ?? "unknown";
    const text = cp.textByStatus?.[status];
    return text ? [text] : [];
  });

  const globalWayParagraphs: string[] = GLOBAL_CHECKPOINTS.filter(
    (cp) => cp.type === "way" && globalState[cp.id] === "yes",
  ).flatMap((cp) => (cp.text ? [cp.text] : []));

  const allParagraphs = [
    ...topicParagraphs,
    ...globalExplanationParagraphs,
    ...globalWayParagraphs,
  ];

  // ── Computed documentation lines ────────────────────────────────────────

  const docLines: string[] = TOPICS.flatMap((t) => {
    const decision = topicState[t.id];
    return decision ? [t.docByDecision[decision]] : [];
  });

  // ── Helpers ─────────────────────────────────────────────────────────────

  function setTopicDecision(id: string, decision: TopicDecision) {
    setTopicState((prev) => ({ ...prev, [id]: decision }));
  }

  function setGlobalStatus(id: string, status: GlobalCheckpointStatus) {
    setGlobalState((prev) => ({ ...prev, [id]: status }));
  }

  const hasAnyOutput = allParagraphs.length > 0;

  return (
    <main style={{ maxWidth: "72rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anfrage-Assistent – Demo</h1>
      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        Stateless-Prototyp · Anliegen + globale Bausteine · Kein Speichern,
        kein Login
      </p>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left column ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          {/* ── Anliegen ── */}
          <h2>Anliegen</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {TOPICS.map((t) => {
              const current = topicState[t.id];
              return (
                <div key={t.id} className="card">
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
                    {t.label}
                  </p>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    <button
                      type="button"
                      className={`answer-btn${current === "possible" ? " active" : ""}`}
                      onClick={() => setTopicDecision(t.id, "possible")}
                    >
                      möglich
                    </button>
                    <button
                      type="button"
                      className={`answer-btn${current === "not_possible" ? " active" : ""}`}
                      onClick={() => setTopicDecision(t.id, "not_possible")}
                    >
                      nicht möglich
                    </button>
                    {current !== null && (
                      <button
                        type="button"
                        className="answer-btn"
                        onClick={() => setTopicDecision(t.id, null)}
                      >
                        deaktivieren
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Globale Checkpoints ── */}
          <h2 style={{ marginTop: "1.5rem" }}>Globale Checkpoints</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {GLOBAL_CHECKPOINTS.map((cp) => {
              const current = globalState[cp.id];
              return (
                <div key={cp.id} className="card">
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
                    {cp.label}
                  </p>
                  {cp.type === "explanation" ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className={`answer-btn${current === "yes" ? " active" : ""}`}
                        onClick={() => setGlobalStatus(cp.id, "yes")}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        className={`answer-btn${current === "no" ? " active" : ""}`}
                        onClick={() => setGlobalStatus(cp.id, "no")}
                      >
                        Nein
                      </button>
                      <button
                        type="button"
                        className={`answer-btn${current === "unknown" ? " active" : ""}`}
                        onClick={() => setGlobalStatus(cp.id, "unknown")}
                      >
                        Unklar
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={current === "yes"}
                        onChange={(e) =>
                          setGlobalStatus(
                            cp.id,
                            e.target.checked ? "yes" : "unknown",
                          )
                        }
                      />
                      <span className="text-small">Aktiv</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column: Live-Vorschau ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h2>Live-Vorschau</h2>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Antwort</h3>
            {!hasAnyOutput ? (
              <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
                Bitte Anliegen oder globale Bausteine auswählen.
              </p>
            ) : (
              allParagraphs.map((para, i) => (
                <p
                  key={para}
                  style={{
                    margin: i < allParagraphs.length - 1 ? "0 0 0.75rem" : "0",
                  }}
                >
                  {para}
                </p>
              ))
            )}
          </div>

          {docLines.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Dokumentation</h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {docLines.map((line, i) => (
                  <li
                    key={i}
                    style={{ marginBottom: "0.25rem", fontSize: "0.875rem" }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


// ---------------------------------------------------------------------------
// Global Checkpoints (local to this demo page, no backend, no data model)
// ---------------------------------------------------------------------------

type GlobalCheckpointStatus = "yes" | "no" | "unknown";

type GlobalCheckpoint = {
  id: string;
  label: string;
  type: "explanation" | "way";
  textByStatus?: {
    yes?: string;
    no?: string;
    unknown?: string;
  };
  text?: string; // für Wege ohne Status
};

const GLOBAL_CHECKPOINTS: GlobalCheckpoint[] = [
  {
    id: "abroad",
    label: "Patient im Ausland",
    type: "explanation",
    textByStatus: {
      yes: "Bestimmte Leistungen können nur durchgeführt werden, wenn sich die Person in Deutschland befindet.",
      unknown:
        "Befinden Sie sich aktuell in Deutschland? Falls nicht, können bestimmte Leistungen nicht durchgeführt werden.",
    },
  },
  {
    id: "missing_data",
    label: "Daten unvollständig",
    type: "explanation",
    textByStatus: {
      no: "Für die Bearbeitung fehlen noch notwendige Angaben.",
      unknown: "Damit wir das prüfen können, benötigen wir noch einige Angaben.",
    },
  },
  {
    id: "doctor_required",
    label: "Ärztliche Vorstellung erforderlich",
    type: "explanation",
    textByStatus: {
      yes: "Für dieses Anliegen ist eine persönliche ärztliche Vorstellung erforderlich.",
      unknown:
        "Gegebenenfalls ist eine persönliche ärztliche Vorstellung erforderlich.",
    },
  },
  {
    id: "booking",
    label: "Termin buchen",
    type: "way",
    text: "Termine können über den Online-Kalender vereinbart werden.",
  },
  {
    id: "digital",
    label: "Digitale Anfrage",
    type: "way",
    text: "Die Anfrage kann über die digitale Anfrage gestellt werden.",
  },
];

