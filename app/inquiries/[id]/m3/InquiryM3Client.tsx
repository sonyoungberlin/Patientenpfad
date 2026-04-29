"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DecisionStatus,
  ExplanationOutputStatus,
  InquiryCheckpointKind,
  type CheckpointStatusValue,
  type InquirySection,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

export type M3SpecificCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  questions?: Array<{ id: string; text: string }>;
};

export type M3BoundActionData = {
  id: string;
  label: string;
  actionCategory?: string;
  questions?: Array<{ id: string; text: string }>;
  /**
   * M3 Anzeige-Filter: Action wird angezeigt, wenn mindestens eine Bedingungsmenge erfüllt ist.
   * Jede Menge ist AND-verknüpft; die Liste ist OR-verknüpft.
   * Fehlt das Feld, greift der Standard (ACTIVE/INACTIVE-Filter aus M2).
   */
  showWhenAny?: Array<Record<string, string>>;
  /**
   * M3 Anzeige-Filter: Action wird ausgeblendet, wenn mindestens eine Bedingungsmenge erfüllt ist.
   * Hat Vorrang vor showWhenAny.
   */
  hideWhenAny?: Array<Record<string, string>>;
};

export type M3SectionData = {
  inquiryId: string;
  label: string;
  decisionCheckpointId: string;
  decisionLabel: string;
  decisionQuestions: Array<{ id: string; text: string }>;
  specificCheckpoints: M3SpecificCheckpoint[];
  /** Profil-spezifische ACTION-Checkpoints (boundActionCheckpointIds) – in Aktionen/Infos. */
  boundActionCheckpoints: M3BoundActionData[];
  /** GLOBAL MODULAR EXPLANATION-Checkpoints – in M3 als SHOW/HIDE-fähige Output-Bausteine. */
  boundGlobalOutputCheckpoints?: M3SpecificCheckpoint[];
};

export type M3ActionData = {
  id: string;
  label: string;
};

type Props = {
  sessionId: string;
  sections: M3SectionData[];
  actionCheckpoints: M3ActionData[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  /** Gespeicherte outputStatus-Entscheidungen aus M3 (SHOW / HIDE pro EXPLANATION-Checkpoint). */
  initialExplanationOutputStatuses: Record<string, string>;
  /** M3 – Antwortziel-Auswahl pro Profil (menschliche Auswahl). Record<inquiryId, responseGoalId> */
  initialResponseGoalSelection: Record<string, string>;
  actionIds: string[];
  initialGeneratedOutput: InquiryResponseV2Output | null;
  isConfirmed: boolean;
};

const DECISION_OPTIONS = [
  { value: "POSSIBLE", label: "Möglich" },
  { value: "NOT_POSSIBLE", label: "Nicht möglich" },
  { value: "DISABLED", label: "Keine Entscheidung" },
];

const EXPLANATION_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

/** Ausgabe-Entscheidung in M3 für EXPLANATION-Checkpoints (outputStatus). */
const OUTPUT_OPTIONS = [
  { value: ExplanationOutputStatus.SHOW, label: "Anzeigen" },
  { value: ExplanationOutputStatus.HIDE, label: "Nicht anzeigen" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

const ACTION_GROUPS: Array<{ label: string; ids: string[] }> = [
  {
    label: "Kontakt & Anfrage",
    ids: ["DIGITAL_REQUEST", "ONLINE_ANAMNESIS"],
  },
  {
    label: "Termin & Behandlung",
    ids: ["BOOK_APPOINTMENT"],
  },
  {
    label: "Rezept & Einlösung",
    ids: ["E_RECIPE_USE", "PHARMACY_INFORMATION"],
  },
  {
    label: "Organisation & Hinweise",
    ids: ["DOCUMENT_UPLOAD", "PROCESSING_DELAY", "TECHNICAL_ISSUE"],
  },
];

/** Menschenlesbare Bezeichnung für actionCategory. */
const ACTION_CATEGORY_LABELS: Record<string, string> = {
  PREPARATION: "Vorbereitung",
  PROCESS: "Ablauf",
  NEXT_STEP: "Nächste Schritte",
  INFO: "Information",
};

/** Gemeinsamer Stil für dezente Gruppen-Badges (immer kombiniert mit className="text-muted text-small"). */
const GROUP_BADGE_STYLE = {
  fontWeight: 600 as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

function optionsForKind(kind: InquiryCheckpointKind) {
  switch (kind) {
    case InquiryCheckpointKind.PREPARATION:
      return ACTION_OPTIONS;
    default:
      return EXPLANATION_OPTIONS;
  }
}

function StatusButtons({
  checkpointId,
  options,
  value,
  onChange,
  disabled,
}: {
  checkpointId: string;
  options: Array<{ value: string; label: string }>;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(checkpointId, opt.value)}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
            color: value === opt.value ? "#fff" : "var(--foreground)",
            fontWeight: value === opt.value ? 600 : 400,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.85rem",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OutputView({
  output,
  heading,
}: {
  output: InquiryResponseV2Output;
  heading: string;
}) {
  return (
    <div
      className="card"
      style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}
    >
      <h2 style={{ marginTop: 0 }}>{heading}</h2>

      {output.sections.map((sec) => (
        <section key={sec.inquiryId}>
          {sec.mainDecision && (
            <p style={{ fontWeight: 600, margin: "0 0 0.5rem" }}>{sec.mainDecision}</p>
          )}
          {sec.attachedParagraphs.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      ))}

      {output.sharedBottom.length > 0 && (
        <section>
          {output.sharedBottom.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      )}

      {output.documentation.length > 0 && (
        <section>
          <h3 style={{ marginBottom: "0.5rem" }}>Dokumentation</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {output.documentation.map((d, i) => (
              <li key={i} className="text-small">
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function InquiryM3Client({
  sessionId,
  sections,
  actionCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  initialExplanationOutputStatuses,
  initialResponseGoalSelection,
  actionIds,
  initialGeneratedOutput,
  isConfirmed,
}: Props) {
  const actionIdSet = new Set(actionIds);

  // IDs aller EXPLANATION-Checkpoints aus allen Sections (für outputStatus-Initialisierung).
  const explanationCheckpointIds = useMemo(
    () =>
      new Set(
        sections
          .flatMap((s) => [
            ...s.specificCheckpoints,
            ...(s.boundGlobalOutputCheckpoints ?? []),
          ])
          .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
          .map((cp) => cp.id),
      ),
    [sections],
  );

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });

  // outputStatuses: M3-Ausgabeentscheidung (SHOW / HIDE) pro EXPLANATION-Checkpoint.
  // Initialisierung: gespeicherte Werte haben Vorrang; fehlende Werte werden aus factStatus abgeleitet.
  //   factStatus YES → SHOW vorausgewählt
  //   factStatus NO  → HIDE vorausgewählt
  const [outputStatuses, setOutputStatuses] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = { ...initialExplanationOutputStatuses };
    for (const id of explanationCheckpointIds) {
      if (!result[id]) {
        const factStatus = initialCheckpointStatuses[id];
        if (factStatus === "YES") result[id] = ExplanationOutputStatus.SHOW;
        else if (factStatus === "NO") result[id] = ExplanationOutputStatus.HIDE;
      }
    }
    return result;
  });

  const [responseGoalSelection, setResponseGoalSelection] = useState<Record<string, string>>(
    initialResponseGoalSelection,
  );

  const [actionsOpen, setActionsOpen] = useState(() => {
    // Automatisch aufklappen, wenn bereits ein Action-Status gesetzt ist
    // (globale Actions oder boundActionCheckpointIds).
    const allBoundActionIds = sections.flatMap((s) => s.boundActionCheckpoints.map((cp) => cp.id));
    const hasExplicitActionStatus =
      actionIds.some(
        (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
      ) ||
      allBoundActionIds.some(
        (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
      );
    if (hasExplicitActionStatus) return true;
    // Automatisch aufklappen, wenn showWhenAny-Bedingungen bereits erfüllt sind
    // (z.B. M2-Schalter mit YES → condition-gesteuerte Actions sind sofort sichtbar).
    const allStatuses = { ...initialCheckpointStatuses, ...initialActionStatuses };
    const matchesConditionSet = (condSet: Record<string, string>) =>
      Object.entries(condSet).every(([id, expected]) => allStatuses[id] === expected);
    return sections.some((s) =>
      s.boundActionCheckpoints.some(
        (cp) => cp.showWhenAny && cp.showWhenAny.some(matchesConditionSet),
      ),
    );
  });

  const [confirmed, setConfirmed] = useState(isConfirmed);
  const [frozenOutput, setFrozenOutput] = useState<InquiryResponseV2Output | null>(
    initialGeneratedOutput,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview: computed from current statuses on every render before confirm.
  // renderInquiryResponseFromSections is a pure function (no network, no side effects).
  const livePreview = useMemo((): InquiryResponseV2Output | null => {
    if (confirmed) return null;
    try {
      const inquirySections: InquirySection[] = sections.map((sec) => ({
        inquiryId: sec.inquiryId,
        decisionStatus:
          (statuses[sec.decisionCheckpointId] as DecisionStatus | undefined) ??
          DecisionStatus.DISABLED,
        checkpointStatuses: statuses as Record<string, CheckpointStatusValue>,
        explanationOutputStatuses: outputStatuses as Record<string, ExplanationOutputStatus>,
      }));
      return renderInquiryResponseFromSections(inquirySections);
    } catch {
      return null;
    }
  }, [confirmed, statuses, outputStatuses, sections]);

  function setStatus(checkpointId: string, value: string) {
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  function setOutputStatus(checkpointId: string, value: string) {
    setOutputStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save current decision + specific + action statuses + explanationOutputStatuses
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }

      // Nur tatsächlich gesetzte outputStatuses senden.
      const explanationOutputStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(outputStatuses)) {
        if (v) explanationOutputStatuses[k] = v;
      }

      const patchRes = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses, explanationOutputStatuses, responseGoalSelection }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => null);
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      // 2. Confirm session
      const confirmRes = await fetch(`/api/inquiries/${sessionId}/confirm`, {
        method: "POST",
      });
      const confirmData = await confirmRes.json().catch(() => null);
      if (!confirmRes.ok || !confirmData?.ok) {
        setError(confirmData?.error ?? "Bestätigen fehlgeschlagen.");
        return;
      }

      setFrozenOutput(confirmData.output as InquiryResponseV2Output);
      setConfirmed(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {confirmed ? (
        <>
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "var(--success-bg, #dcfce7)",
              borderRadius: "var(--radius)",
              marginBottom: "1.5rem",
              color: "var(--success-fg, #166534)",
              fontWeight: 500,
            }}
          >
            ✓ Anfrage bestätigt – Ansicht ist schreibgeschützt.
          </div>
          {frozenOutput && (
            <OutputView output={frozenOutput} heading="Bestätigter Output" />
          )}
        </>
      ) : (
        <>
          {/* Decision + SPECIFIC Checkpoints per inquiry */}
          {sections.map((section) => {
            const visibleSpecificCps = section.specificCheckpoints.filter((cp) => {
              if (cp.kind !== InquiryCheckpointKind.EXPLANATION) return true;
              const status = statuses[cp.id];
              if (status !== "YES" && status !== "NO") return false;
              // Nur anzeigen wenn für den gesetzten Status tatsächlich ein nicht-leerer Text vorhanden ist.
              // Reine M2-Schalter (textByStatus.YES = "") dürfen nicht als Zusatzinfo in M3 erscheinen.
              const text = cp.textByStatus[status as keyof typeof cp.textByStatus];
              return !!text;
            });
            return (
            <section key={section.inquiryId} style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>

              {/* Decision – nur bei Profilen mit Decision-Checkpoint */}
              {section.decisionCheckpointId && (
                <>
                  <div
                    className="text-muted text-small"
                    style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
                  >
                    <span aria-hidden="true">? </span>Entscheidung
                  </div>
                  <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 500 }}>{section.decisionLabel}</div>
                  {section.decisionQuestions.length > 0 && (
                    <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
                      {section.decisionQuestions
                        .filter((q) => statuses[q.id] === "YES" || statuses[q.id] === "NO")
                        .map((q) => {
                          const answer = statuses[q.id] === "YES" ? "Ja" : "Nein";
                          return (
                            <div key={q.id}>
                              {q.text}
                              <span style={{ fontWeight: 500 }}> — {answer}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  <StatusButtons
                    checkpointId={section.decisionCheckpointId}
                    options={DECISION_OPTIONS}
                    value={statuses[section.decisionCheckpointId]}
                    onChange={setStatus}
                    disabled={false}
                  />
                </div>
                </>
              )}

              {/* SPECIFIC Checkpoints */}
              {visibleSpecificCps.length > 0 && (
                <div
                  className="text-muted text-small"
                  style={{ ...GROUP_BADGE_STYLE, margin: "0.5rem 0 0.25rem" }}
                >
                  <span aria-hidden="true">+ </span>Zusatzinfos
                </div>
              )}
              {visibleSpecificCps
                .map((cp) => {
                const m2Status = statuses[cp.id];
                const m2Label =
                  m2Status === "YES" ? "Ja" : m2Status === "NO" ? "Nein" : undefined;
                return (
                  <div
                    key={cp.id}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                  >
                    <div style={{ fontWeight: 500 }}>{cp.label}</div>
                    {/* M2 Prefill – zeigt Fragen + M2-Antwort als Kontext (schreibgeschützt) */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.2rem" }}
                        >
                          {cp.questions.map((q) => (
                            <div key={q.id}>
                              {q.text}
                              {m2Label !== undefined && (
                                <span style={{ fontWeight: 500 }}> — {m2Label}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    {/* Legacy: non-EXPLANATION questions (informational only) */}
                    {cp.kind !== InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <ul
                          className="text-muted text-small"
                          style={{ margin: "0.2rem 0 0.2rem 1.25rem", padding: 0 }}
                        >
                          {cp.questions.map((q) => (
                            <li key={q.id}>{q.text}</li>
                          ))}
                        </ul>
                      )}
                    {/* EXPLANATION: outputStatus-Buttons (SHOW / HIDE) statt factStatus-Buttons */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION ? (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={OUTPUT_OPTIONS}
                        value={outputStatuses[cp.id]}
                        onChange={setOutputStatus}
                        disabled={false}
                      />
                    ) : (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={optionsForKind(cp.kind)}
                        value={statuses[cp.id]}
                        onChange={setStatus}
                        disabled={false}
                      />
                    )}
                    {/* Hinweis bei outputStatus HIDE */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      outputStatuses[cp.id] === ExplanationOutputStatus.HIDE && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          keine Erklärung erforderlich
                        </div>
                      )}
                  </div>
                );
              })}

              {/* Globale Output-Bausteine (GLOBAL MODULAR EXPLANATION) */}
              {(section.boundGlobalOutputCheckpoints ?? []).filter((cp) => statuses[cp.id] === "YES").length > 0 && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                  <div className="text-muted text-small" style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.35rem" }}>
                    <span aria-hidden="true">ⓘ </span>Globale Bausteine
                  </div>
                  {(section.boundGlobalOutputCheckpoints ?? []).filter((cp) => statuses[cp.id] === "YES").map((cp) => (
                    <div
                      key={cp.id}
                      style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                    >
                      <div style={{ fontWeight: 500 }}>{cp.label}</div>
                      <StatusButtons
                        checkpointId={cp.id}
                        options={OUTPUT_OPTIONS}
                        value={outputStatuses[cp.id]}
                        onChange={setOutputStatus}
                        disabled={false}
                      />
                      {outputStatuses[cp.id] === ExplanationOutputStatus.HIDE && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          keine Erklärung erforderlich
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            );
          })}

          {/* Action checkpoints (globale availableActionIds + profilgebundene boundActionCheckpointIds) */}
          {(actionCheckpoints.filter((cp) => statuses[cp.id] === "ACTIVE").length > 0 || sections.some((s) => s.boundActionCheckpoints.length > 0)) && (
            <section style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: actionsOpen ? "0.5rem" : 0 }}>
                <h2 style={{ margin: 0 }}><span aria-hidden="true">→ </span>Aktionen / Infos</h2>
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  style={{
                    padding: "0.15rem 0.6rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {actionsOpen ? "Weniger ▲" : "Mehr ▼"}
                </button>
              </div>
              {actionsOpen && (() => {
                const groupElements: ReactNode[] = [];

                // --- Globale availableActionIds (gruppiert nach ACTION_GROUPS) ---
                if (actionCheckpoints.length > 0) {
                  const activeActionCheckpoints = actionCheckpoints.filter(
                    (cp) => statuses[cp.id] === "ACTIVE",
                  );
                  const cpById = Object.fromEntries(activeActionCheckpoints.map((cp) => [cp.id, cp]));
                  const renderedIds = new Set<string>();

                  for (const group of ACTION_GROUPS) {
                    const groupCps = group.ids
                      .map((id) => cpById[id])
                      .filter((cp): cp is M3ActionData => !!cp);
                    if (groupCps.length === 0) continue;
                    groupCps.forEach((cp) => renderedIds.add(cp.id));
                    groupElements.push(
                      <div key={group.label} style={{ marginTop: "0.75rem" }}>
                        <div
                          className="text-muted text-small"
                          style={{ fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                        >
                          {group.label}
                        </div>
                        {groupCps.map((cp) => (
                          <div
                            key={cp.id}
                            style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                          >
                            <div style={{ fontWeight: 500 }}>{cp.label}</div>
                            <StatusButtons
                              checkpointId={cp.id}
                              options={ACTION_OPTIONS}
                              value={statuses[cp.id]}
                              onChange={setStatus}
                              disabled={false}
                            />
                          </div>
                        ))}
                      </div>,
                    );
                  }

                  // Ungrouped fallback
                  const ungrouped = activeActionCheckpoints.filter((cp) => !renderedIds.has(cp.id));
                  if (ungrouped.length > 0) {
                    groupElements.push(
                      <div key="__ungrouped__" style={{ marginTop: "0.75rem" }}>
                        {ungrouped.map((cp) => (
                          <div
                            key={cp.id}
                            style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                          >
                            <div style={{ fontWeight: 500 }}>{cp.label}</div>
                            <StatusButtons
                              checkpointId={cp.id}
                              options={ACTION_OPTIONS}
                              value={statuses[cp.id]}
                              onChange={setStatus}
                              disabled={false}
                            />
                          </div>
                        ))}
                      </div>,
                    );
                  }
                }

                // --- Profil-spezifische boundActionCheckpoints ---
                for (const sec of sections) {
                  // Filtere Checkpoints nach Sichtbarkeitsregeln:
                  // – Hat der Checkpoint showWhenAny oder hideWhenAny, gelten die Bedingungen.
                  // – Andernfalls wird er nur angezeigt, wenn er in M2 auf ACTIVE/INACTIVE gesetzt wurde.
                  const SET_STATUSES = ["ACTIVE", "INACTIVE"] as const;
                  const setCps = sec.boundActionCheckpoints.filter((cp) => {
                    const hasConditions = cp.showWhenAny !== undefined || cp.hideWhenAny !== undefined;
                    if (!hasConditions) {
                      return (SET_STATUSES as readonly string[]).includes(statuses[cp.id]);
                    }
                    const matchesConditionSet = (condSet: Record<string, string>) =>
                      Object.entries(condSet).every(
                        ([checkpointId, expectedStatus]) => statuses[checkpointId] === expectedStatus,
                      );
                    if (cp.hideWhenAny?.some(matchesConditionSet)) return false;
                    if (cp.showWhenAny && cp.showWhenAny.length > 0) {
                      return cp.showWhenAny.some(matchesConditionSet);
                    }
                    return true;
                  });
                  if (setCps.length === 0) continue;

                  // Gruppiere nach actionCategory.
                  const order = ["PREPARATION", "PROCESS", "NEXT_STEP", "INFO"] as const;
                  const byCategory = new Map<string, M3BoundActionData[]>();
                  for (const cp of setCps) {
                    const cat = cp.actionCategory ?? "INFO";
                    if (!byCategory.has(cat)) byCategory.set(cat, []);
                    byCategory.get(cat)!.push(cp);
                  }
                  const catGroups = order
                    .map((cat) => ({ cat, cps: byCategory.get(cat) ?? [] }))
                    .filter(({ cps }) => cps.length > 0);

                  groupElements.push(
                    <div key={`bound-${sec.inquiryId}`} style={{ marginTop: "0.75rem" }}>
                      <div
                        className="text-muted text-small"
                        style={{ fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                      >
                        {sec.label}
                      </div>
                      {catGroups.map(({ cat, cps }) => (
                        <div key={cat}>
                          <div
                            className="text-muted text-small"
                            style={{ marginTop: "0.5rem", marginBottom: "0.15rem", fontStyle: "italic" }}
                          >
                            {ACTION_CATEGORY_LABELS[cat] ?? cat}
                          </div>
                          {cps.map((cp) => (
                            <div
                              key={cp.id}
                              style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                            >
                              <div style={{ fontWeight: 500 }}>{cp.label}</div>
                              {cp.questions && cp.questions.length > 0 && (
                                <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
                                  {cp.questions.map((q) => (
                                    <div key={q.id}>{q.text}</div>
                                  ))}
                                </div>
                              )}
                              <StatusButtons
                                checkpointId={cp.id}
                                options={ACTION_OPTIONS}
                                value={statuses[cp.id]}
                                onChange={setStatus}
                                disabled={false}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>,
                  );
                }

                return groupElements;
              })()}
            </section>
          )}

          {/* Live preview */}
          {livePreview && (
            <OutputView output={livePreview} heading="Vorschau" />
          )}

          {error && (
            <p style={{ color: "var(--destructive)", margin: "1rem 0 0.5rem" }}>{error}</p>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              style={{ fontWeight: 500 }}
            >
              {submitting ? "Wird bestätigt…" : "Anfrage bestätigen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
