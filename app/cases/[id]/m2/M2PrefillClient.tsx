"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";
import {
  CheckpointPerspective,
  isMultiSelectCheckpoint,
  isAssessmentCheckpoint,
  type ActiveCheckpoint,
} from "@/lib/types";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";
import {
  M2_QUESTIONS,
  M2_QUESTIONS_MFA,
  sanitizePrefillForMode,
  withDefaultOffenForCheckpoints,
  type M2Answer,
  type M2PrefillData,
} from "@/lib/logic/m2Questions";

const ANSWER_OPTIONS: { value: M2Answer; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "unklar", label: "Unklar" },
];

/**
 * Schritt 2 (rein visuelle Gruppierung): Wenn K12 und K13 in M2 gemeinsam in
 * einer Karte gerendert werden (Patientenmodus), werden die Fragen statt als
 * lange Liste in fachliche Gruppen mit kleinen Zwischenüberschriften
 * aufgeteilt.
 *
 * Wichtig:
 * - Rein Rendering-basiert. Keine Änderung an Frage-IDs, Antwort-Handlern,
 *   Datenstrukturen, Persistenz, APIs oder M1/M3/M4/M5.
 * - Antworten bleiben unter den originalen Checkpoint-IDs gespeichert
 *   (handleAnswer wird mit der jeweils originalen `cp.id` aufgerufen).
 * - data-m2-question / data-m2-answer ändern sich pro Frage nicht.
 * - Reihenfolge der Items innerhalb einer Gruppe spiegelt die Vorgabe wider.
 * - Sicherheitsnetz: Fragen, die in keiner Gruppe gelistet sind, werden am
 *   Ende unter "Weitere Fragen" angefügt, damit nichts verloren geht.
 */
type K12K13GroupSpec = {
  title: string;
  items: ReadonlyArray<{ cp: "K12" | "K13"; q: string }>;
};

const K12_K13_GROUPS: ReadonlyArray<K12K13GroupSpec> = [
  {
    title: "Mobilität & Sturz",
    items: [
      { cp: "K12", q: "M2-01" }, // Fortbewegung sicher
      { cp: "K12", q: "M2-02" }, // Unsicherheit / Sturzgefährdung
      { cp: "K13", q: "M2-01" }, // Sturz letzte 12 Monate
      { cp: "K13", q: "M2-02" }, // Angst vor Sturz
    ],
  },
  {
    title: "Selbstversorgung & Alltag",
    items: [
      { cp: "K12", q: "M2-03" }, // Selbstversorgung möglich
      { cp: "K12", q: "M2-04" }, // Unterstützung notwendig
      { cp: "K13", q: "M2-04" }, // lebt allein
    ],
  },
  {
    title: "Kognition & Stimmung",
    items: [
      { cp: "K12", q: "M2-05" }, // orientiert / strukturiert
      { cp: "K12", q: "M2-06" }, // Vergessen / Überforderung
      { cp: "K13", q: "M2-03" }, // Stimmung / Erschöpfung / Antriebsmangel
    ],
  },
  {
    title: "Ernährung & Flüssigkeit",
    items: [
      { cp: "K12", q: "M2-07" }, // Nahrungsaufnahme ausreichend
      { cp: "K12", q: "M2-08" }, // Probleme beim Essen
      { cp: "K12", q: "M2-09" }, // Flüssigkeitsaufnahme ausreichend
      { cp: "K12", q: "M2-10" }, // zu wenig trinken
      { cp: "K13", q: "M2-08" }, // Gewichtsverlust / Appetit
    ],
  },
  {
    title: "Beschwerden & Sinnesfunktionen",
    items: [
      { cp: "K12", q: "M2-11" }, // Umgang mit Hilfsmitteln sicher
      { cp: "K13", q: "M2-05" }, // Hören / Sehen
      { cp: "K13", q: "M2-07" }, // Schmerzen
      { cp: "K13", q: "M2-06" }, // Inkontinenz
    ],
  },
  {
    title: "Versorgung & Vorsorge",
    items: [
      { cp: "K12", q: "M2-13" }, // Pflegegrad vorhanden
      { cp: "K12", q: "M2-14" }, // Einstufung passend
      { cp: "K13", q: "M2-09" }, // Vorsorgevollmacht / Patientenverfügung
    ],
  },
  {
    title: "Durchgeführte Assessments",
    items: [
      // Die "Liegt ein Ergebnis vor"-Folgefragen (M2-11/13/15) werden direkt
      // hinter ihrer jeweiligen "durchgeführt"-Frage gerendert, damit keine
      // bestehende Frage entfällt (Vorgabe: keine Entfernung von Fragen).
      { cp: "K13", q: "M2-10" }, // Mobilitäts-Assessment durchgeführt
      { cp: "K13", q: "M2-11" }, // Ergebnis Mobilitäts-Assessment
      { cp: "K13", q: "M2-12" }, // kognitives Assessment durchgeführt
      { cp: "K13", q: "M2-13" }, // Ergebnis kognitives Assessment
      { cp: "K13", q: "M2-14" }, // Stimmungs-/Belastungsfragebogen durchgeführt
      { cp: "K13", q: "M2-15" }, // Ergebnis Stimmungs-/Belastungsfragebogen
    ],
  },
];

export function M2PrefillClient({
  caseId,
  checkpoints,
  initialPrefill,
  initialPreparationMode = "none",
  answeredCheckpointIdsBySource = { mfa: [], conversation: [], patient: [] },
}: {
  caseId: string;
  checkpoints: ActiveCheckpoint[];
  initialPrefill: M2PrefillData;
  initialPreparationMode?: string;
  /**
   * Pro Quelle: Checkpoint-IDs, die bereits in einem eingefrorenen Run
   * dieser Quelle Antworten haben. Diese Checkpoints werden in M2 nicht
   * mehr als aktive Eingabe angezeigt (sie sind im Prefill-Fenster der
   * Quelle bereits ausgefüllt).
   */
  answeredCheckpointIdsBySource?: {
    mfa: string[];
    conversation: string[];
    patient: string[];
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState<M2PrefillData>(() => {
    const init: M2PrefillData = {};
    for (const cp of checkpoints) {
      init[cp.id] = initialPrefill[cp.id] ?? {};
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  // Lokaler Modus, der nur die Fragenquelle bestimmt:
  // - "mfa"     → MFA-Standardweg (M2_QUESTIONS_MFA)
  // - "patient" → Patientengespräch in der Praxis (M2_QUESTIONS)
  // Persistenz/API/DB bleiben unverändert (immer derselbe Prefill-Endpunkt).
  // Initial wird der zuletzt gespeicherte Vorbereitungsweg übernommen,
  // damit ein bereits abgeschlossener Fall nicht beim erneuten Öffnen
  // unbemerkt vom MFA-Default überschrieben werden kann.
  const [mode, setMode] = useState<"mfa" | "patient">(() =>
    initialPreparationMode === "conversation" || initialPreparationMode === "patient"
      ? "patient"
      : "mfa",
  );

  useEffect(() => {
    function handleSetMode(e: Event) {
      const detail = (e as CustomEvent<"mfa" | "patient">).detail;
      if (detail === "mfa" || detail === "patient") {
        setMode(detail);
      }
    }
    window.addEventListener("m2-set-mode", handleSetMode);
    return () => window.removeEventListener("m2-set-mode", handleSetMode);
  }, []);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!isDirtyRef.current) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href) return;
      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      if (!window.confirm(UNSAVED_WARNING)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  function handleAnswer(checkpointId: string, questionId: string, answer: M2Answer) {
    setIsDirty(true);
    setValues((prev) => ({
      ...prev,
      [checkpointId]: {
        ...(prev[checkpointId] ?? {}),
        [questionId]: answer,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      // Vor dem Senden lokal nach aktivem Modus filtern, damit nie versehentlich
      // Antworten des jeweils anderen Wegs (z. B. nach Modus-Toggle) mitgeschickt
      // werden. Die Server-Route sanitisiert zusätzlich erneut.
      const persistedMode = mode === "patient" ? "conversation" : "mfa";
      const cleanValues = sanitizePrefillForMode(values, persistedMode);
      // Verbindliche Regel: Nach dem Speichern müssen alle Fragen aller
      // aktiven Checkpoints im Prefill enthalten sein. Fehlende Antworten
      // werden hier explizit auf "offen" gesetzt, bevor der Request raus geht.
      const checkpointIds = checkpoints.map((cp) => cp.id);
      const filledValues = withDefaultOffenForCheckpoints(
        cleanValues,
        checkpointIds,
        persistedMode,
      );

      const response = await fetch(`/api/cases/${caseId}/m2/prefill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefill: filledValues,
          // Lokaler Modus → persistierter preparation_mode:
          // - "mfa"     → "mfa"
          // - "patient" (Patientengespräch in der Praxis) → "conversation"
          mode: persistedMode,
        }),
      });

      if (!response.ok) {
        setError("Angaben konnten nicht gespeichert werden.");
        return;
      }

      setIsDirty(false);
      router.push(buildCaseM3Path(caseId));
    } catch {
      setError("Angaben konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="m2-mfa-form" data-m2-mfa-form>
      <h2 data-m2-form-heading style={{ marginTop: 0, marginBottom: "1rem" }}>
        {mode === "patient" ? "Patientengespräch" : "MFA-Vorbereitung"}
      </h2>
      {(() => {
        // Per-Source-Filter: Nur Checkpoints anzeigen, die für die aktuelle
        // Quelle noch nicht in einem eingefrorenen Run beantwortet wurden.
        // "patient"-Modus nutzt die "conversation"-Quelle (Patientengespräch
        // in der Praxis wird als source="conversation" gespeichert).
        const sourceForMode = mode === "patient" ? "conversation" : "mfa";
        const answeredSet = new Set(
          answeredCheckpointIdsBySource[sourceForMode] ?? [],
        );
        // Primäre Sichtbarkeitsregel: nur Checkpoints rendern, deren perspectives
        // die aktive Vorbereitungsperspektive enthält.
        const perspectiveForMode =
          mode === "patient"
            ? CheckpointPerspective.PATIENT
            : CheckpointPerspective.MFA;
        const visibleCheckpoints = checkpoints.filter((cp) => {
          if (answeredSet.has(cp.id)) return false;
          // MULTI_SELECT-Checkpoints sind M3-only → immer aus M2 ausblenden.
          if (isMultiSelectCheckpoint(cp)) return false;
          // ASSESSMENT-Checkpoints (K12) nur anzeigen, wenn enabled === true.
          if (isAssessmentCheckpoint(cp) && cp.enabled !== true) return false;
          // Im MFA-Modus alle nicht beantworteten Standard-Checkpoints anzeigen,
          // auch wenn sie keine MFA-Perspektive haben (Hinweistext statt Fragen).
          if (mode === "mfa") return true;
          return cp.perspectives.includes(perspectiveForMode);
        });

        if (visibleCheckpoints.length === 0) {
          if (mode === "mfa") {
            return <p>Für die MFA gibt es hier keine vorbereitenden Fragen.</p>;
          }
          return null;
        }

        const questionCatalog =
          mode === "patient" ? M2_QUESTIONS : M2_QUESTIONS_MFA;

        // Schritt 1 (nur Rendering): K13 nicht mehr als eigene Hauptkarte
        // anzeigen, wenn K12 ebenfalls sichtbar ist. K13 wird stattdessen
        // unten in der K12-Karte als optionaler Unterabschnitt
        // "Geriatrische Zusatzfragen" eingebettet.
        // Persistenz, Checkpoint-Identitäten, Antworten und API bleiben
        // unverändert – nur die Render-Reihenfolge wird angepasst.
        const visibleIds = new Set(visibleCheckpoints.map((cp) => cp.id));
        const k13EmbeddedInK12 = visibleIds.has("K12") && visibleIds.has("K13");
        const k13Checkpoint = k13EmbeddedInK12
          ? visibleCheckpoints.find((cp) => cp.id === "K13") ?? null
          : null;

        const renderQuestionItem = (
          checkpointId: string,
          q: { id: string; text: string },
          cpAnswers: Record<string, M2Answer | undefined>,
        ) => (
          <li
            key={`${checkpointId}:${q.id}`}
            data-m2-question={`${checkpointId}:${q.id}`}
            style={{ marginBottom: "0.75rem" }}
          >
            <div style={{ marginBottom: "0.4rem" }}>{q.text}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {ANSWER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`answer-btn${cpAnswers[q.id] === opt.value ? " active" : ""}`}
                  data-m2-answer={`${checkpointId}:${q.id}:${opt.value}`}
                  onClick={() => handleAnswer(checkpointId, q.id, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>
        );

        const renderQuestionList = (
          checkpointId: string,
          qs: ReadonlyArray<{ id: string; text: string }>,
        ) => {
          const cpAnswers = values[checkpointId] ?? {};
          return (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {qs.map((q) => renderQuestionItem(checkpointId, q, cpAnswers))}
            </ul>
          );
        };

        // Schritt 2: Render-Helper für die thematische Gruppierung der
        // K12+K13-Fragen innerhalb der gemeinsamen Karte. Nimmt die jeweiligen
        // Fragenarrays beider Checkpoints, sortiert sie nach K12_K13_GROUPS
        // und hängt nicht zugeordnete Fragen unter "Weitere Fragen" an.
        const renderGroupedK12K13 = (
          k12Qs: ReadonlyArray<{ id: string; text: string }>,
          k13Qs: ReadonlyArray<{ id: string; text: string }>,
        ) => {
          const byCp: Record<"K12" | "K13", Map<string, { id: string; text: string }>> = {
            K12: new Map(k12Qs.map((q) => [q.id, q])),
            K13: new Map(k13Qs.map((q) => [q.id, q])),
          };
          const usedIds = new Set<string>(); // "K12:M2-01" usw.
          const k12Answers = values["K12"] ?? {};
          const k13Answers = values["K13"] ?? {};
          const answersFor = (cp: "K12" | "K13") =>
            cp === "K12" ? k12Answers : k13Answers;

          const groupBlocks: ReactNode[] = [];

          K12_K13_GROUPS.forEach((group, gi) => {
            const groupItems: ReactNode[] = [];
            for (const item of group.items) {
              const q = byCp[item.cp].get(item.q);
              if (!q) continue;
              usedIds.add(`${item.cp}:${item.q}`);
              groupItems.push(renderQuestionItem(item.cp, q, answersFor(item.cp)));
            }
            if (groupItems.length === 0) return;
            groupBlocks.push(
              <div
                key={`grp-${gi}`}
                data-m2-group={group.title}
                style={{
                  marginTop: gi === 0 ? 0 : "1rem",
                  paddingTop: gi === 0 ? 0 : "0.75rem",
                  borderTop:
                    gi === 0 ? "none" : "1px solid var(--border, #e5e7eb)",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                  }}
                >
                  {group.title}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {groupItems}
                </ul>
              </div>,
            );
          });

          // Fallback: noch nicht gruppierte Fragen am Ende anhängen, damit
          // keine Frage verloren geht (z. B. wenn der Katalog erweitert wird).
          const leftover: ReactNode[] = [];
          for (const cp of ["K12", "K13"] as const) {
            for (const q of cp === "K12" ? k12Qs : k13Qs) {
              if (usedIds.has(`${cp}:${q.id}`)) continue;
              leftover.push(renderQuestionItem(cp, q, answersFor(cp)));
            }
          }
          if (leftover.length > 0) {
            groupBlocks.push(
              <div
                key="grp-rest"
                data-m2-group="Weitere Fragen"
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border, #e5e7eb)",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                  }}
                >
                  Weitere Fragen
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {leftover}
                </ul>
              </div>,
            );
          }

          // Unsichtbare Wrapper, damit K13-Antworten weiterhin DOM-seitig
          // einem Checkpoint-Container zugeordnet werden können (Marker-Attr).
          return (
            <>
              {groupBlocks}
              <span
                hidden
                aria-hidden="true"
                data-m2-checkpoint-embedded="K13"
              />
            </>
          );
        };

        return (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visibleCheckpoints.map((cp) => {
              // K13 wird in die K12-Karte eingebettet, wenn beide sichtbar sind
              // → keine eigene Hauptkarte für K13 in diesem Fall.
              if (k13EmbeddedInK12 && cp.id === "K13") return null;

              const questions = questionCatalog[cp.id] ?? [];
              // Im MFA-Modus: Block trotzdem rendern, aber mit Hinweistext statt Fragen.
              // Im Patienten-Modus: Checkpoint ohne Fragen ausblenden (bisheriges Verhalten).
              if (mode !== "mfa" && questions.length === 0) return null;

              const isK12WithK13 = cp.id === "K12" && k13EmbeddedInK12 && k13Checkpoint;
              const k13Questions = isK12WithK13
                ? questionCatalog[k13Checkpoint!.id] ?? []
                : [];
              // Schritt 2: Grouped-Layout greift nur, wenn beide Checkpoints
              // tatsächlich Fragen liefern (Patientenmodus). Im MFA-Modus
              // (keine K12/K13-Fragen) bleibt das Schritt-1-Fallback aktiv.
              const renderGrouped =
                isK12WithK13 && questions.length > 0 && k13Questions.length > 0;
              const showK13Subsection =
                isK12WithK13 && !renderGrouped && (mode === "mfa" || k13Questions.length > 0);

              return (
                <li
                  key={cp.id}
                  data-m2-checkpoint={cp.id}
                  className="card"
                  style={{ marginBottom: "0.75rem" }}
                >
                  <div style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
                    {cp.title}
                  </div>
                  {"introText" in cp && cp.introText ? (
                    <div style={{ marginBottom: "0.75rem", fontStyle: "italic" }}>
                      {cp.introText}
                    </div>
                  ) : null}
                  {renderGrouped ? (
                    renderGroupedK12K13(questions, k13Questions)
                  ) : questions.length > 0 ? (
                    renderQuestionList(cp.id, questions)
                  ) : (
                    <p style={{ margin: 0, fontStyle: "italic" }}>
                      Für die MFA gibt es hier keine vorbereitenden Fragen.
                    </p>
                  )}
                  {showK13Subsection ? (
                    <div
                      data-m2-checkpoint-embedded={k13Checkpoint!.id}
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border, #e5e7eb)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: "0.5rem",
                          fontWeight: 500,
                          fontSize: "0.95rem",
                        }}
                      >
                        Geriatrische Zusatzfragen
                      </div>
                      {"introText" in k13Checkpoint! && k13Checkpoint!.introText ? (
                        <div
                          style={{
                            marginBottom: "0.75rem",
                            fontStyle: "italic",
                          }}
                        >
                          {k13Checkpoint!.introText}
                        </div>
                      ) : null}
                      {k13Questions.length > 0 ? (
                        renderQuestionList(k13Checkpoint!.id, k13Questions)
                      ) : (
                        <p style={{ margin: 0, fontStyle: "italic" }}>
                          Für die MFA gibt es hier keine vorbereitenden Fragen.
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        );
      })()}
      {error ? (
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary"
        data-m2-save
        onClick={() => void handleSave()}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        Speichern und weiter zur ärztlichen Checkliste
      </button>
    </div>
  );
}
