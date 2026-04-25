"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Topic decisions (Anliegen) – local to this demo page
// ---------------------------------------------------------------------------

type TopicDecision = "possible" | "not_possible" | null;

type Topic = {
  id: string;
  label: string;
  heading: string;
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
    heading: "Zur Impfung",
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
    heading: "Zur Arbeitsunfähigkeitsbescheinigung",
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
    heading: "Zum Rezept",
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
    heading: "Zur Wundversorgung",
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
      yes: "Für die Bearbeitung fehlen noch notwendige Angaben.",
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

// ---------------------------------------------------------------------------
// Section – one Antwortabschnitt with its own topic + global checkpoints
// ---------------------------------------------------------------------------

type Section = {
  id: string;
  topicId: string | null;
  topicDecision: TopicDecision;
  globalState: Record<string, GlobalCheckpointStatus>;
};

let _sectionCounter = 0;

function buildInitialGlobalState(): Record<string, GlobalCheckpointStatus> {
  return Object.fromEntries(GLOBAL_CHECKPOINTS.map((cp) => [cp.id, "unknown"]));
}

function newSection(): Section {
  return {
    id: String(++_sectionCounter),
    topicId: null,
    topicDecision: null,
    globalState: buildInitialGlobalState(),
  };
}

function getSectionParagraphs(s: Section): string[] {
  const paras: string[] = [];

  if (s.topicId && s.topicDecision) {
    const topic = TOPICS.find((t) => t.id === s.topicId);
    if (topic) paras.push(topic.textByDecision[s.topicDecision]);
  }

  GLOBAL_CHECKPOINTS.filter((cp) => cp.type === "explanation").forEach((cp) => {
    const status = s.globalState[cp.id] ?? "unknown";
    const text = cp.textByStatus?.[status];
    if (text) paras.push(text);
  });

  return paras;
}

function getSectionHeading(s: Section): string {
  if (s.topicId) {
    const topic = TOPICS.find((t) => t.id === s.topicId);
    if (topic) return topic.heading;
  }
  return "Allgemeiner Hinweis";
}

function getSectionDocLines(s: Section): string[] {
  if (!s.topicId || !s.topicDecision) return [];
  const topic = TOPICS.find((t) => t.id === s.topicId);
  return topic ? [topic.docByDecision[s.topicDecision]] : [];
}

/**
 * Demo-Seite: Mehrere Antwortabschnitte, jeder mit eigenem Anliegen + globalen Bausteinen.
 *
 * Kein API-Aufruf, kein Login, kein Speichern.
 */
export default function InquiryDemoClient() {
  const [sections, setSections] = useState<Section[]>(() => [newSection()]);

  function addSection() {
    setSections((prev) => [...prev, newSection()]);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function setTopicDecision(
    sectionId: string,
    topicId: string,
    decision: TopicDecision,
  ) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, topicId, topicDecision: decision } : s,
      ),
    );
  }

  function clearTopic(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, topicId: null, topicDecision: null } : s,
      ),
    );
  }

  function setGlobalStatus(
    sectionId: string,
    cpId: string,
    status: GlobalCheckpointStatus,
  ) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, globalState: { ...s.globalState, [cpId]: status } }
          : s,
      ),
    );
  }

  const allSectionOutputs = sections.map((s) => ({
    id: s.id,
    heading: getSectionHeading(s),
    paragraphs: getSectionParagraphs(s),
    docLines: getSectionDocLines(s),
  }));

  const hasAnyOutput = allSectionOutputs.some((o) => o.paragraphs.length > 0);
  const allDocLines = allSectionOutputs.flatMap((o) => o.docLines);

  // Collect unique active "way" checkpoints across all sections
  const activeWayTexts: string[] = [];
  GLOBAL_CHECKPOINTS.filter((cp) => cp.type === "way").forEach((cp) => {
    const isActiveInAnySection = sections.some(
      (s) => s.globalState[cp.id] === "yes",
    );
    if (isActiveInAnySection && cp.text) {
      activeWayTexts.push(cp.text);
    }
  });

  return (
    <main style={{ maxWidth: "72rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anfrage-Assistent – Demo</h1>
      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        Stateless-Prototyp · Antwortabschnitte · Kein Speichern, kein Login
      </p>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left column: sections ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className="card"
              style={{ marginBottom: "1.5rem" }}
            >
              {/* Section header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h2 style={{ margin: 0 }}>Abschnitt {idx + 1}</h2>
                {sections.length > 1 && (
                  <button
                    type="button"
                    className="answer-btn"
                    onClick={() => removeSection(section.id)}
                  >
                    Abschnitt entfernen
                  </button>
                )}
              </div>

              {/* Anliegen */}
              <h3 style={{ marginBottom: "0.5rem" }}>Anliegen</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                {TOPICS.map((t) => {
                  const isSelected = section.topicId === t.id;
                  const current = isSelected ? section.topicDecision : null;
                  return (
                    <div key={t.id} className="card">
                      <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
                        {t.label}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className={`answer-btn${current === "possible" ? " active" : ""}`}
                          onClick={() =>
                            setTopicDecision(section.id, t.id, "possible")
                          }
                        >
                          möglich
                        </button>
                        <button
                          type="button"
                          className={`answer-btn${current === "not_possible" ? " active" : ""}`}
                          onClick={() =>
                            setTopicDecision(section.id, t.id, "not_possible")
                          }
                        >
                          nicht möglich
                        </button>
                        {isSelected && (
                          <button
                            type="button"
                            className="answer-btn"
                            onClick={() => clearTopic(section.id)}
                          >
                            deaktivieren
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Globale Checkpoints */}
              <h3 style={{ marginBottom: "0.5rem" }}>Globale Checkpoints</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {GLOBAL_CHECKPOINTS.map((cp) => {
                  const current = section.globalState[cp.id];
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
                            onClick={() =>
                              setGlobalStatus(section.id, cp.id, "yes")
                            }
                          >
                            Ja
                          </button>
                          <button
                            type="button"
                            className={`answer-btn${current === "no" ? " active" : ""}`}
                            onClick={() =>
                              setGlobalStatus(section.id, cp.id, "no")
                            }
                          >
                            Nein
                          </button>
                          <button
                            type="button"
                            className={`answer-btn${current === "unknown" ? " active" : ""}`}
                            onClick={() =>
                              setGlobalStatus(section.id, cp.id, "unknown")
                            }
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
                                section.id,
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
          ))}

          <button type="button" className="answer-btn" onClick={addSection}>
            Weiteren Abschnitt hinzufügen
          </button>
        </div>

        {/* ── Right column: Live-Vorschau ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h2>Live-Vorschau</h2>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Antwort</h3>
            {!hasAnyOutput && activeWayTexts.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
                Bitte Anliegen oder globale Bausteine auswählen.
              </p>
            ) : (
              <>
                {allSectionOutputs
                  .filter((o) => o.paragraphs.length > 0)
                  .map((output, idx) => (
                    <div
                      key={output.id}
                      style={
                        idx > 0
                          ? {
                              borderTop: "1px solid var(--border, #e5e7eb)",
                              paddingTop: "1rem",
                              marginTop: "1rem",
                            }
                          : undefined
                      }
                    >
                      <p
                        style={{
                          margin: "0 0 0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {output.heading}
                      </p>
                      <p style={{ margin: 0 }}>
                        {output.paragraphs.join(" ")}
                      </p>
                    </div>
                  ))}
                {activeWayTexts.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border, #e5e7eb)",
                      paddingTop: "1rem",
                      marginTop: "1rem",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      {activeWayTexts.join(" ")}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {allDocLines.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Dokumentation</h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {allDocLines.map((line, i) => (
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



