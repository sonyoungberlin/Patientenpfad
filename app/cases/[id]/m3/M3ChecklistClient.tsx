"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckpointCategory, type ActiveCheckpoint, type ActiveCheckpointMultiSelect, type StandardCheckpoint, isStandardCheckpoint, isMultiSelectCheckpoint } from "@/lib/types";
import { resolveQuestionTextForMode, type M2PrefillData } from "@/lib/logic/m2Questions";
import { deriveM5OutputCondensed } from "@/lib/logic/deriveM5Output";
import type { PrefillRunSource } from "@/lib/server/prefillRuns";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";

const MESSAGE_INTRO =
  "Liebe Patientin, lieber Patient,\n" +
  "für Ihre weitere Versorgung bitten wir Sie, folgende Punkte zu beachten:";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";

type M3Checkpoint = Omit<StandardCheckpoint, "status"> & {
  status: CheckpointStatus;
};

function normalizeStatus(checkpoint: StandardCheckpoint): CheckpointStatus {
  if (checkpoint.category === CheckpointCategory.M) {
    return checkpoint.status === "OK" ||
      checkpoint.status === "TO_DO" ||
      checkpoint.status === "ZURÜCKSTELLEN"
      ? checkpoint.status
      : "TO_DO";
  }

  return checkpoint.status === "OK" ? "OK" : "TO_DO";
}

function getStatusOptions(category: CheckpointCategory): CheckpointStatus[] {
  if (category === CheckpointCategory.M) {
    return ["OK", "TO_DO", "ZURÜCKSTELLEN"];
  }
  return ["OK", "TO_DO"];
}

function getStatusLabel(status: CheckpointStatus): string {
  if (status === "OK") return "ausreichend";
  if (status === "TO_DO") return "nicht ausreichend";
  return "zurückgestellt";
}

function getAnswerSymbol(answer: string): string {
  if (answer === "ja") return "✓";
  if (answer === "nein") return "✗";
  if (answer === "unklar") return "?";
  return "";
}

/**
 * Versucht den Fragetext einer gespeicherten `questionId` aufzulösen.
 *
 * Hauptweg ist der per Run-Quelle (bzw. als Fallback `preparationMode`)
 * ausgewählte Katalog – genau eine Quelle pro Eintrag, keine Mischanzeige.
 * Für Altdaten ohne expliziten Modus ("none" / "skipped") wird defensiv
 * erst der Patientenkatalog und dann der MFA-Katalog versucht. Bleibt alles
 * erfolglos, wird `null` zurückgegeben – der Aufrufer blendet den Eintrag
 * dann aus, statt eine Roh-ID anzuzeigen.
 */
function resolveQuestionTextForDisplay(
  preparationMode: string,
  checkpointId: string,
  questionId: string,
): string | null {
  if (
    preparationMode === "mfa" ||
    preparationMode === "conversation" ||
    preparationMode === "patient"
  ) {
    return resolveQuestionTextForMode(preparationMode, checkpointId, questionId);
  }
  // Legacy/unbekannt: Patientenkatalog hat in der bisherigen Implementierung
  // priorität, danach MFA als zweiter Versuch.
  return (
    resolveQuestionTextForMode("conversation", checkpointId, questionId) ??
    resolveQuestionTextForMode("mfa", checkpointId, questionId)
  );
}

/**
 * Schritt 3 der PrefillRun-Umstellung: M3 rendert pro Checkpoint die
 * eingefrorenen Runs in `sequence`-Reihenfolge, jeden Run in einem eigenen
 * Block mit festem Label. Keine Aggregation, keine Zusammenführung, keine
 * Priorisierung.
 */
export type M3FrozenRunView = {
  id: string;
  sequence: number;
  source: PrefillRunSource;
  answers: M2PrefillData;
};

const RUN_SOURCE_LABEL: Record<PrefillRunSource, string> = {
  mfa: "Vorbereitung – MFA",
  conversation: "Vorbereitung – Patientengespräch",
  patient: "Vorbereitung – Patientenfragebogen",
};

// Feste Reihenfolge der Vorbereitungs-Fenster pro Checkpoint (immer sichtbar).
const PREFILL_SOURCES: PrefillRunSource[] = ["mfa", "conversation", "patient"];

export function M3ChecklistClient({
  caseId,
  initialCheckpoints,
  frozenRuns = [],
  m2Status = "none",
  preparationMode = "none",
  messageSignature = "",
  doctorConfirmed = false,
  clinicalStatus = "none",
}: {
  caseId: string;
  initialCheckpoints: ActiveCheckpoint[];
  frozenRuns?: M3FrozenRunView[];
  m2Status?: string;
  preparationMode?: string;
  messageSignature?: string;
  doctorConfirmed?: boolean;
  clinicalStatus?: string;
}) {
  const router = useRouter();
  // M3 wird nur gesperrt, wenn der Patientenweg gewählt wurde und der
  // Patientenfragebogen noch aussteht. Für Bestandsfälle ohne gesetzten
  // preparation_mode ("none") bleibt das bisherige Verhalten erhalten.
  const waitingForPatient =
    (preparationMode === "patient" || preparationMode === "none") &&
    m2Status === "waiting_for_patient";
  // Nach „Ärztlich bestätigt" wird M3 zusätzlich dauerhaft eingefroren
  // (read-only). M4/M5 und Copy-Buttons bleiben nutzbar.
  const [confirmed, setConfirmed] = useState<boolean>(doctorConfirmed);
  // Zusätzlicher ärztlicher Workflow-Status (additiv, ändert keine bestehende Logik):
  // - "none"      : kein ärztlicher Zwischenstatus gesetzt
  // - "prepared"  : Arzt hat in M3 vorbereitet / Lücken markiert (MFA übernimmt weiter)
  // - "confirmed" : Arzt hat M3 final geprüft (fachlicher Abschluss)
  const [clinical, setClinical] = useState<string>(clinicalStatus);
  const [savingClinical, setSavingClinical] = useState<boolean>(false);
  // Schritt 4 der PrefillRun-Umstellung: Einstieg „Weitere Vorbereitung
  // starten". Nur lokaler UI-Zustand; Klick ruft die neue Route, navigiert
  // dann nach M2. Keine Wirkung auf bestehende Buttons / M3-Lock-Logik.
  const [startingPrefillRun, setStartingPrefillRun] = useState<boolean>(false);
  const isLocked = waitingForPatient || confirmed;
  // MULTI_SELECT checkpoints (K10/K11) are read from the DB via initialCheckpoints
  // but are no longer editable in M3 – they are set/changed in M1.
  // They are still included in allCheckpoints for M5 documentation output.
  const standardInitial = initialCheckpoints.filter(isStandardCheckpoint);
  const multiSelectCheckpoints = initialCheckpoints.filter(isMultiSelectCheckpoint);
  const [checkpoints, setCheckpoints] = useState<M3Checkpoint[]>(
    standardInitial.map((checkpoint) => ({
      ...checkpoint,
      status: normalizeStatus(checkpoint),
    })),
  );
  // isDirty tracks unsaved local M3 checkpoint changes (per-Klick-Saves
  // wurden entfernt – nur "Ärztlich bestätigt" persistiert den Stand).
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!isDirty) return;
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
  }, [isDirty]);
  const m4Entries = checkpoints
    .filter((cp) => cp.status === "TO_DO")
    .filter((cp) => (cp.m4?.text ?? "").length > 0);
  // Insert blank line between different blocks for visual grouping
  const m4TextParts: string[] = [];
  let prevBlockId: string | null = null;
  for (const cp of m4Entries) {
    if (prevBlockId !== null && cp.block_id !== prevBlockId) {
      m4TextParts.push("");
    }
    m4TextParts.push(cp.m4?.text ?? "");
    prevBlockId = cp.block_id;
  }
  const m4TextBlock = m4TextParts.join("\n");

  // M3Checkpoint widens StandardCheckpoint's discriminated-union status via Omit,
  // which makes TS unable to confirm structural compatibility. The cast is safe
  // because M3Checkpoint is a strict superset of StandardCheckpoint's shape.
  const allCheckpoints: ActiveCheckpoint[] = [
    ...(checkpoints as unknown as ActiveCheckpoint[]),
    ...multiSelectCheckpoints,
  ];
  const m5Entries = deriveM5OutputCondensed(allCheckpoints);
  const m5TextBlock = m5Entries
    .map((e) => e.text)
    .filter((t) => t.length > 0)
    .join("\n");

  const [copiedM4, setCopiedM4] = useState(false);
  const [copiedM5, setCopiedM5] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const hasSignature = messageSignature.trim().length > 0;

  const messagePreview = hasSignature
    ? `${MESSAGE_INTRO}\n\n${m4TextBlock}\n\n${messageSignature.trim()}`
    : `${MESSAGE_INTRO}\n\n${m4TextBlock}`;

  function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to fallback
      }
    }
    return fallbackCopyText(text);
  }

  async function copyM4Text() {
    if (!m4TextBlock) return;
    const ok = await copyToClipboard(m4TextBlock);
    if (ok) {
      setCopiedM4(true);
      setTimeout(() => setCopiedM4(false), 2000);
    } else {
      setError("Text konnte nicht kopiert werden.");
    }
  }

  async function copyMessageText() {
    if (!m4TextBlock || !hasSignature) return;
    const ok = await copyToClipboard(messagePreview);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      setError("Nachricht konnte nicht kopiert werden.");
    }
  }

  async function copyM5Text() {
    if (!m5TextBlock) return;
    const ok = await copyToClipboard(m5TextBlock);
    if (ok) {
      setCopiedM5(true);
      setTimeout(() => setCopiedM5(false), 2000);
    } else {
      setError("Dokumentation konnte nicht kopiert werden.");
    }
  }

  // Fachregel: M3 speichert nicht jeden Klick – Checkpoint-Status-Änderungen
  // sind zunächst nur lokaler Arbeitsstand. Fehlerbehandlung und Persistenz
  // erfolgen ausschließlich beim Batch-Save in closeCase().
  function updateStatus(checkpointId: string, status: CheckpointStatus) {
    setCheckpoints((current) =>
      current.map((checkpoint) =>
        checkpoint.id === checkpointId ? { ...checkpoint, status } : checkpoint,
      ),
    );
    setIsDirty(true);
  }

  async function skipM2Waiting() {
    setSkipping(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/m2-skip`, {
        method: "PATCH",
      });
      if (!response.ok) {
        setError("Freischalten fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setError("Freischalten fehlgeschlagen.");
    } finally {
      setSkipping(false);
    }
  }

  async function closeCase() {
    if (confirmed) return;
    setClosing(true);
    setError(null);
    // Fachregel: „Ärztlich bestätigt" friert M3 ein und persistiert den
    // finalen ärztlichen Stand (Checkpoint-Zustände als Batch-Save).
    // MULTI_SELECT-Checkpoints (K10/K11) werden unverändert übernommen,
    // da sie nicht mehr in M3 bearbeitet werden.
    const allCp: ActiveCheckpoint[] = [
      ...(checkpoints as unknown as ActiveCheckpoint[]),
      ...multiSelectCheckpoints,
    ];
    try {
      const response = await fetch(`/api/cases/${caseId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints: allCp }),
      });
      if (!response.ok) {
        setError("Fall konnte nicht ärztlich bestätigt werden.");
        return;
      }
      // Fall bleibt geöffnet: M3 wird eingefroren, M4/M5 bleiben nutzbar.
      setConfirmed(true);
      setIsDirty(false);
      router.refresh();
    } catch {
      setError("Fall konnte nicht ärztlich bestätigt werden.");
    } finally {
      setClosing(false);
    }
  }

  /**
   * Schritt B des Ergänzungs-Flows: Einstieg „Weitere Vorbereitung
   * starten" führt direkt auf die Per-Case-M1-Seite
   * (`/cases/[id]/m1?mode=erweiterung`).
   *
   * Fachregel: „Ergänzung speichert nur den Status" – bevor zur M1-Seite
   * navigiert wird, wird `clinical_status = "prepared"` gesetzt (sofern
   * nicht bereits gesetzt). Die aktuellen M3-Checkpoint-Klicks werden
   * dabei **nicht** dauerhaft übernommen.
   */
  async function startAdditionalPrefillRun() {
    if (startingPrefillRun) return;
    if (confirmed || clinical === "confirmed") return;
    setStartingPrefillRun(true);
    setError(null);
    // Status speichern (best-effort) bevor zum Ergänzungs-Flow navigiert wird.
    if (clinical !== "prepared") {
      setSavingClinical(true);
      try {
        const res = await fetch(`/api/cases/${caseId}/clinical-status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "prepared" }),
        });
        if (res.ok) {
          setClinical("prepared");
        }
      } catch {
        // Best-effort: Navigation findet trotzdem statt.
      } finally {
        setSavingClinical(false);
      }
    }
    try {
      router.push(`/cases/${caseId}/m1?mode=erweiterung`);
    } finally {
      setStartingPrefillRun(false);
    }
  }

  return (
    <section>
      {m2Status === "waiting_for_patient" ? (
        <div
          data-m2-waiting-banner
          role="status"
          className="banner-warning"
        >
          <strong>Patientenfragebogen-Link wurde versendet. Es wird auf Antworten gewartet.</strong>
          <div style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              data-skip-m2-waiting
              onClick={() => void skipM2Waiting()}
              disabled={skipping}
            >
              {skipping ? "Wird freigeschaltet…" : "Patientenfragen überspringen und ärztlich fortfahren"}
            </button>
          </div>
        </div>
      ) : null}
      {m2Status === "skipped" ? (
        <p
          data-m2-skipped-notice
          className="text-muted"
          style={{ marginBottom: "1rem", fontStyle: "italic" }}
        >
          Patientenfragebogen wurde übersprungen.
        </p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {checkpoints.map((checkpoint) => {
          // Fachliche Regel: Pro Checkpoint werden immer drei feste
          // Vorbereitungs-Fenster gerendert (mfa / conversation / patient),
          // unabhängig davon ob ein eingefrorener Run vorhanden ist.
          // Hat eine Quelle Antworten für diesen Checkpoint, werden diese
          // angezeigt; andernfalls bleibt das Fenster leer (kein Platzhalter).
          return (
            <li
              key={checkpoint.id}
              data-checkpoint-item={checkpoint.id}
              className="card"
              style={{
                marginBottom: "0.75rem",
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <div style={{ marginBottom: "0.5rem", fontWeight: 500 }}>{checkpoint.title}</div>
              {PREFILL_SOURCES.map((source) => {
                // Fehler-1-Fix: Im Ergänzungs-Flow haben spätere Runs nur
                // Antworten für das Delta. Wir suchen daher den neuesten
                // Run dieser Quelle, der tatsächlich Antworten für diesen
                // Checkpoint enthält – nicht einfach den neuesten Run.
                const latestRunForSource = frozenRuns
                  .filter((r) => r.source === source && r.answers[checkpoint.id] != null)
                  .sort((a, b) => b.sequence - a.sequence)[0];

                const resolvedAnswers: { qId: string; text: string; answer: string }[] =
                  latestRunForSource?.answers[checkpoint.id]
                    ? Object.entries(latestRunForSource.answers[checkpoint.id]).flatMap(
                        ([qId, answer]) => {
                          const text = resolveQuestionTextForDisplay(
                            source,
                            checkpoint.id,
                            qId,
                          );
                          return text === null
                            ? []
                            : [{ qId, text, answer: answer as string }];
                        },
                      )
                    : [];

                const isEmpty = resolvedAnswers.length === 0;
                return (
                  <details
                    key={source}
                    data-m2-prefill={checkpoint.id}
                    data-prefill-source={source}
                    {...(resolvedAnswers.length > 0 && latestRunForSource
                      ? { "data-prefill-run-id": latestRunForSource.id }
                      : {})}
                    style={{
                      marginBottom: "0.5rem",
                      ...(isEmpty
                        ? { pointerEvents: "none", opacity: 0.45 }
                        : {}),
                    }}
                  >
                    <summary
                      style={isEmpty ? { color: "var(--text-muted, #888)" } : undefined}
                    >
                      {RUN_SOURCE_LABEL[source]}
                    </summary>
                    {resolvedAnswers.length > 0 ? (
                      <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1rem", listStyle: "none" }}>
                        {resolvedAnswers.map(({ qId, text, answer }) => {
                          const symbol = getAnswerSymbol(answer);
                          return (
                            <li key={qId} style={{ marginBottom: "0.25rem" }}>
                              <span>{text}</span>
                              {" — "}
                              <span style={{ fontWeight: 500 }}>{symbol} {answer}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </details>
                );
              })}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {getStatusOptions(checkpoint.category).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    className={`answer-btn${checkpoint.status === statusOption ? " active" : ""}`}
                    data-status-button={`${checkpoint.id}:${statusOption}`}
                    onClick={() => void updateStatus(checkpoint.id, statusOption)}
                    disabled={isLocked}
                  >
                    {getStatusLabel(statusOption)}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Patientenhinweise / To-dos</h2>
        {m4Entries.length > 0 ? (
          <>
            <div
              data-message-preview
              style={{
                marginBottom: "0.75rem",
                padding: "1rem",
                border: "1px solid #e0e0e0",
                borderRadius: "0.5rem",
                backgroundColor: "#fafafa",
                userSelect: "text",
                cursor: "text",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              <span className="text-muted">{MESSAGE_INTRO}</span>
              {"\n\n"}
              <span>{m4TextBlock}</span>
              {hasSignature && (
                <>
                  {"\n\n"}
                  <span className="text-muted">{messageSignature.trim()}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void copyM4Text()}
            >
              {copiedM4 ? "Kopiert ✓" : "Text kopieren"}
            </button>
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                data-copy-message
                onClick={() => void copyMessageText()}
                disabled={!hasSignature}
              >
                {copiedMessage ? "Kopiert ✓" : "Nachricht kopieren"}
              </button>
              {!hasSignature && (
                <p
                  data-signature-hint
                  className="text-muted text-small"
                  style={{ marginTop: "0.25rem", marginBottom: 0 }}
                >
                  Bitte hinterlegen Sie zuerst eine Signatur in der Fallübersicht.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted">Keine weiteren Schritte erforderlich.</p>
        )}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Dokumentation für das Krankenblatt</h2>
        <pre style={{ marginBottom: "0.75rem", userSelect: "text", cursor: "text" }}>
          {m5TextBlock}
        </pre>
        <button type="button" onClick={() => void copyM5Text()}>
          {copiedM5 ? "Kopiert ✓" : "Dokumentation kopieren"}
        </button>
      </section>
      <section className="section-divider">
        {confirmed ? (
          <p
            data-doctor-confirmed-notice
            role="status"
            className="banner-success"
            style={{ margin: 0 }}
          >
            <strong>Ärztlich bestätigt.</strong> Die Entscheidungen bleiben unverändert.
            Patientenhinweise und Krankenblatt-Dokumentation bleiben lesbar und kopierbar.
          </p>
        ) : null}
        <div
          data-clinical-status-actions
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}
        >
          {confirmed || clinical === "confirmed" ? null : (
            <button
              type="button"
              data-start-additional-prefill-run
              onClick={() => void startAdditionalPrefillRun()}
              disabled={startingPrefillRun}
              className="answer-btn"
            >
              {startingPrefillRun
                ? "Wird gestartet…"
                : "Weitere Vorbereitung starten"}
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn-primary"
          data-close-case
          data-doctor-confirm
          onClick={closeCase}
          disabled={closing || confirmed}
        >
          {confirmed
            ? "Ärztlich bestätigt ✓"
            : closing
              ? "Wird bestätigt…"
              : "Ärztlich bestätigt"}
        </button>
      </section>
    </section>
  );
}
