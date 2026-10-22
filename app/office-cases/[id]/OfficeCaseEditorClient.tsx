"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import { deriveTopicActions, type DerivedActionStatus } from "@/lib/office/derivedActions";
import {
  buildOfficeBlocks,
  getPrimaryOpenTextForBlock,
  getTopNextSteps,
} from "@/lib/office/officeBlocks";
import {
  isOfficeTopicId,
  inferOfficeTopicIdFromCheckpoints,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  supportsOfficeCaseFinalReview,
} from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import type { CheckpointComplianceView } from "@/lib/office/checkpointCompliance";
import { getCheckpointDueStatus, subtractCalendarMonths, subtractDays } from "@/lib/office/deadlines";
import { isFinalReviewOutdated } from "@/lib/office/finalReview";
import OfficeComplianceFooter from "@/components/office/OfficeComplianceFooter";
import OfficeWritePanel from "@/components/office/OfficeWritePanel";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type M2AnswerValue,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import { isOfficePersonalStatusOnlyCheckpoint } from "@/lib/office/privacy";

type OfficeCaseData = {
  id: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpoint_snapshot: {
    topicId: string | null;
    templateVersion?: number;
    plannedStartDate?: string;
    plannedEventDate?: string;
    decisionRevision?: number;
    finalReview?: Record<string, unknown> | null;
    finalReviewHistory?: Record<string, unknown>[];
    checkpoints: OfficeCheckpointSnapshot[];
  };
};

type Props = {
  officeCase: OfficeCaseData;
  mode: "m2" | "m3";
  /**
   * Optional: Map von Checkpoint-ID zu Compliance-View fuer den M3-Footer.
   * Wird ausschliesslich im M3-Modus gerendert. Fehlt der Prop oder ein
   * Eintrag, wird kein Footer fuer den betroffenen Checkpoint angezeigt.
   */
  complianceByCheckpointId?: Record<string, CheckpointComplianceView>;
};

function cloneCheckpoints(checkpoints: OfficeCheckpointSnapshot[]) {
  return checkpoints.map((checkpoint) => ({ ...checkpoint }));
}

function kindLabel(kind: OfficeCheckpointKind) {
  switch (kind) {
    case OfficeCheckpointKind.FACT:
      return "FACT";
    case OfficeCheckpointKind.RULE:
      return "RULE";
    case OfficeCheckpointKind.ASSESSMENT:
      return "ASSESSMENT";
    case OfficeCheckpointKind.DECISION:
      return "DECISION";
    case OfficeCheckpointKind.SOURCE:
      return "SOURCE";
    case OfficeCheckpointKind.DEPENDENCY:
      return "DEPENDENCY";
  }
}

function getQuestionsForCheckpoint(
  topicId: string | null,
  checkpointId: string,
  templateVersion: number,
): readonly OfficeM2Question[] {
  if (!topicId || !isOfficeTopicId(topicId)) return [];
  return getM2QuestionsForCheckpoint(topicId, checkpointId, templateVersion);
}

function m2AnswerLabel(value: M2AnswerValue | null | undefined): string {
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  if (value === "UNCLEAR") return "Unklar";
  return "—";
}

function compactQuestionLabel(text: string, maxLength = 42): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function getCompactPrefillItems(
  topicId: string | null,
  checkpoint: OfficeCheckpointSnapshot,
  templateVersion: number,
): Array<{ question: string; answer: M2AnswerValue | null }> {
  const questions = getQuestionsForCheckpoint(topicId, checkpoint.id, templateVersion);
  const answers = checkpoint.m2_answers;
  if (questions.length === 0 || !answers) return [];

  const answered = questions
    .map((question) => {
      const answer = answers[question.id] ?? null;
      return {
        question: question.text,
        answer,
      };
    })
    .filter((item) => item.answer !== null);

  if (answered.length === 0) return [];

  const highPriority = answered.filter(
    (item) => item.answer === "NO" || item.answer === "UNCLEAR",
  );
  if (highPriority.length > 0) return highPriority.slice(0, 2);

  return answered.filter((item) => item.answer === "YES").slice(0, 2);
}

function statusLabel(status: DerivedActionStatus | OfficeCheckpointState): string {
  if (status === "geklaert" || status === OfficeCheckpointState.YES) return "geklaert";
  if (status === "offen" || status === OfficeCheckpointState.OPEN) return "offen";
  if (status === OfficeCheckpointState.NOT_REQUIRED) return "nicht erforderlich";
  return "nicht vollstaendig";
}

const FINAL_REVIEW_GUIDANCE: Record<string, { title: string; items: string[] }> = {
  [OFFICE_TOPIC_HIRING_REPLACEMENT]: {
    title: "Vor dem ärztlichen Einsatz fallbezogen bewerten",
    items: [
      "Approbation und erforderliche Qualifikation",
      "Arztregisterstatus und wirksame Anstellungsgenehmigung",
      "Berufshaftpflicht und einschlägige Zusatzgenehmigungen",
      "LANR-/BSNR-Zuordnung sowie eHBA und technische Vorbereitung",
      "Personalverwaltung und Bedeutung aller offenen Punkte für den Arbeitsbeginn",
    ],
  },
  [OFFICE_TOPIC_MFA_HIRING]: {
    title: "Bearbeitungsstand vor dem Eintritt organisatorisch einordnen",
    items: [
      "Arbeitsvertrag und Beschäftigungsart prüfen; klären, ob daraus Meldungen folgen",
      "Qualifikations- und Versicherungsfragen für die vorgesehenen Aufgaben einordnen",
      "Datenschutz, Zugänge und erforderliche Einarbeitung nachverfolgen",
      "Offene Punkte und ihre Auswirkungen auf den geplanten Ablauf festhalten",
    ],
  },
  [OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION]: {
    title: "Bearbeitungsstand zum Austritt organisatorisch einordnen",
    items: [
      "Vertragsbeendigung und Personalabschluss nachverfolgen",
      "Prüfen, ob Meldungen oder Anpassungen bei externen Stellen erforderlich sind",
      "Mögliche Auswirkungen auf Arztstelle, Abrechnung und Versorgung klären",
      "Systemzugänge, Praxiseigentum und offene Aufgaben organisatorisch bearbeiten",
    ],
  },
  [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING]: {
    title: "Bearbeitungsstand vor Ausbildungsbeginn organisatorisch einordnen",
    items: [
      "Ausbildungsvertrag, Kammerverfahren und Ausbilderzuständigkeit nachverfolgen",
      "Prüfen, ob Untersuchungen oder Schutzmaßnahmen für die vorgesehenen Aufgaben erforderlich sind",
      "Berufsschule, Personalabrechnung und mögliche Meldungen organisatorisch klären",
      "Datenschutz, Systemzugänge und offene Punkte für den Ausbildungsstart einordnen",
    ],
  },
};

export default function OfficeCaseEditorClient({
  officeCase,
  mode,
  complianceByCheckpointId,
}: Props) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<OfficeCheckpointSnapshot[]>(
    cloneCheckpoints(officeCase.checkpoint_snapshot.checkpoints),
  );
  const templateVersion = officeCase.checkpoint_snapshot.templateVersion ?? 1;
  const [plannedStartDate, setPlannedStartDate] = useState(
    officeCase.checkpoint_snapshot.plannedStartDate ?? "",
  );
  const [plannedEventDate, setPlannedEventDate] = useState(
    officeCase.checkpoint_snapshot.plannedEventDate ?? "",
  );
  const [finalReview, setFinalReview] = useState(officeCase.checkpoint_snapshot.finalReview ?? null);
  const [finalReviewHistory, setFinalReviewHistory] = useState(
    officeCase.checkpoint_snapshot.finalReviewHistory ?? [],
  );
  const [reviewNote, setReviewNote] = useState("");
  const [decisionRevision, setDecisionRevision] = useState(
    officeCase.checkpoint_snapshot.decisionRevision ?? 0,
  );

  // Fallback: Topic aus Checkpoint-IDs ableiten, falls snapshot.topicId fehlt
  // (ältere Fälle ohne gespeichertes topicId).
  const effectiveTopicId =
    officeCase.topicId ?? inferOfficeTopicIdFromCheckpoints(checkpoints);
  const isHiringV2 =
    effectiveTopicId === OFFICE_TOPIC_HIRING_REPLACEMENT &&
    templateVersion === 2;
  const isPersonnelV2 =
    templateVersion === 2 &&
    (effectiveTopicId === OFFICE_TOPIC_MFA_HIRING ||
      effectiveTopicId === OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION ||
      effectiveTopicId === OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING);
  const hasVersionedFields = isHiringV2 || isPersonnelV2;
  const hasFinalReview =
    effectiveTopicId !== null &&
    isOfficeTopicId(effectiveTopicId) &&
    supportsOfficeCaseFinalReview(effectiveTopicId, templateVersion);
  const approvalIsStale = isFinalReviewOutdated(finalReview, decisionRevision);
  const overdueCount = checkpoints.filter(
    (checkpoint) => getCheckpointDueStatus(checkpoint) === "overdue",
  ).length;
  const dueSoonCount = checkpoints.filter(
    (checkpoint) => getCheckpointDueStatus(checkpoint) === "due_soon",
  ).length;
  const m2Sections = useMemo(() => {
    if (!hasVersionedFields) {
      return [{ title: null as string | null, checkpoints }];
    }
    const sections = new Map<string, OfficeCheckpointSnapshot[]>();
    for (const checkpoint of checkpoints) {
      const title = checkpoint.section ?? "Weitere Prüfpunkte";
      sections.set(title, [...(sections.get(title) ?? []), checkpoint]);
    }
    return Array.from(sections, ([title, items]) => ({ title, checkpoints: items }));
  }, [checkpoints, hasVersionedFields]);
  const finalReviewGuidance =
    effectiveTopicId ? FINAL_REVIEW_GUIDANCE[effectiveTopicId] : undefined;

  function finalReviewDecisionLabel(decision: unknown) {
    if (isPersonnelV2) {
      return decision === "APPROVED"
        ? "Organisatorischer Abschluss dokumentiert"
        : "Organisatorischer Abschluss nicht bestätigt";
    }
    return decision === "APPROVED" ? "Manuell freigegeben" : "Nicht freigegeben";
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summaryText = useMemo(
    () =>
      buildOfficeSummaryText({
        topicTitle: officeCase.topicTitle ?? officeCase.title ?? "Office-Snapshot",
        topicId: officeCase.topicId,
        templateVersion,
        checkpoints,
      }),
    [checkpoints, templateVersion, officeCase.title, officeCase.topicId, officeCase.topicTitle],
  );

  const actionsByCheckpoint = useMemo(() => {
    const actions = deriveTopicActions({
      topicId: officeCase.topicId,
      templateVersion,
      checkpoints,
    });

    const grouped = new Map<string, typeof actions>();
    for (const action of actions) {
      const list = grouped.get(action.checkpointId) ?? [];
      list.push(action);
      grouped.set(action.checkpointId, list);
    }
    return grouped;
  }, [checkpoints, templateVersion, officeCase.topicId]);

  const blocks = useMemo(
    () =>
      buildOfficeBlocks({
        topicId: officeCase.topicId,
        templateVersion,
        checkpoints,
      }),
    [checkpoints, templateVersion, officeCase.topicId],
  );

  const topNextSteps = useMemo(() => getTopNextSteps(blocks, 5), [blocks]);

  function updateCheckpoint(id: string, patch: Partial<OfficeCheckpointSnapshot>) {
    setCheckpoints((prev) =>
      prev.map((checkpoint) => (checkpoint.id === id ? { ...checkpoint, ...patch } : checkpoint)),
    );
  }

  function updatePlannedStartDate(value: string) {
    setPlannedStartDate(value);
    const fourMonthsBefore = subtractCalendarMonths(value, 4) ?? "";
    const fourWeeksBefore = subtractDays(value, 28) ?? "";
    setCheckpoints((previous) =>
      previous.map((checkpoint) => {
        if (checkpoint.deadline_is_manual) return checkpoint;
        if (checkpoint.deadline_kind !== "INTERNAL_CONTROL") return checkpoint;
        if (checkpoint.id === "NC-KONTROLLE_4M") return { ...checkpoint, deadline: fourMonthsBefore };
        if (checkpoint.id === "NC-KONTROLLE_4W") return { ...checkpoint, deadline: fourWeeksBefore };
        return checkpoint;
      }),
    );
  }

  function updatePlannedEventDate(value: string) {
    setPlannedEventDate(value);
  }

  async function handleFinalReview(decision: "APPROVED" | "NOT_APPROVED") {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/office-cases/${officeCase.id}/final-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: reviewNote }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(
          data.error ??
            (isPersonnelV2
              ? "Organisatorischer Abschluss konnte nicht gespeichert werden."
              : "Freigabe konnte nicht gespeichert werden."),
        );
        return;
      }
      setFinalReview(data.checkpoint_snapshot.final_review);
      setFinalReviewHistory(data.checkpoint_snapshot.final_review_history);
      setReviewNote("");
      setStatus("Abschlussentscheidung gespeichert.");
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Speichern der Abschlussentscheidung.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      if (mode === "m2") {
        const res = await fetch(`/api/office-cases/${officeCase.id}/m2/prefill`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkpoints: checkpoints.map((checkpoint) => ({
              id: checkpoint.id,
              m2_answers: checkpoint.m2_answers ?? {},
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        setDecisionRevision(data.office_case?.checkpoint_snapshot?.decisionRevision ?? decisionRevision);
        setStatus("Operative Prüfung gespeichert.");
      } else {
        const invalidNotRequired = checkpoints.find(
          (checkpoint) =>
            checkpoint.state === OfficeCheckpointState.NOT_REQUIRED &&
            !checkpoint.not_required_reason?.trim(),
        );
        if (invalidNotRequired) {
          setError(`Bitte begründen Sie „Nicht erforderlich“ bei „${invalidNotRequired.title}“.`);
          return;
        }
        const missingAuthoritySource = checkpoints.find(
          (checkpoint) =>
            checkpoint.deadline_kind === "AUTHORITY" &&
            checkpoint.deadline &&
            !checkpoint.authority?.trim(),
        );
        if (missingAuthoritySource) {
          setError(`Bitte dokumentieren Sie die offizielle Quelle der Frist bei „${missingAuthoritySource.title}“.`);
          return;
        }
        for (const checkpoint of checkpoints) {
          const res = await fetch(`/api/office-cases/${officeCase.id}/checkpoint/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkpoint_id: checkpoint.id,
              state: checkpoint.state,
              known_note: checkpoint.known_note ?? "",
              ...(hasVersionedFields
                ? {
                    missing_note: checkpoint.missing_note ?? "",
                    answer_source: checkpoint.answer_source ?? "",
                    deadline: checkpoint.deadline ?? "",
                    deadline_kind: checkpoint.deadline_kind ?? "TASK",
                    deadline_is_manual: checkpoint.deadline_is_manual ?? false,
                    responsible_role: checkpoint.responsible_role ?? "",
                    authority: checkpoint.authority ?? "",
                    not_required_reason: checkpoint.not_required_reason ?? "",
                    ...(isHiringV2 ? { planned_start_date: plannedStartDate } : {}),
                    ...(isPersonnelV2 ? { planned_event_date: plannedEventDate } : {}),
                  }
                : {}),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            setError(data.error ?? `Checkpoint ${checkpoint.id} konnte nicht gespeichert werden.`);
            return;
          }
          setDecisionRevision(
            data.office_case?.checkpoint_snapshot?.decisionRevision ?? decisionRevision,
          );
        }
        setStatus("Klärungsstand gespeichert.");
      }

      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">{officeCase.topicTitle ?? "Officefall"}</div>
        <h1 style={{ margin: 0 }}>{officeCase.title ?? officeCase.topicTitle ?? "Officefall"}</h1>
        {officeCase.trigger_note ? <p style={{ margin: 0 }}>{officeCase.trigger_note}</p> : null}
      </header>

      {mode === "m3" ? (
        hasFinalReview ? (
          <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ marginTop: 0 }}>
              {isPersonnelV2 ? "Organisatorischer Abschluss" : "Abschlusskontrolle der Praxisleitung"}
            </h2>
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {isPersonnelV2
                ? "Mit dem organisatorischen Abschluss dokumentiert die Praxisleitung den Bearbeitungsstand dieses Falls. Dies ist keine rechtliche Genehmigung und keine Bestätigung, dass sämtliche gesetzlichen Anforderungen erfüllt sind. Dokumentieren können den Abschluss nur Praxis-OWNER und Praxis-ADMIN."
                : "Checkpoint-Status ersetzen keine rechtliche oder fachliche Einzelfallprüfung. OWNER oder ADMIN entscheidet manuell und dokumentiert die eigene Einschätzung. Nicht verifizierte Behörden- und Kammeranforderungen sind fallbezogen zu prüfen."}
            </p>
            {finalReviewGuidance ? (
              <div>
              <strong>{finalReviewGuidance.title}:</strong>
              <ul className="text-small">
                {finalReviewGuidance.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="text-small text-muted">
                Interne Aufgaben, bedingte Schritte und tatsächliche Voraussetzungen getrennt bewerten. Eine
                Behördenfrist gilt nur, wenn sie aus einer konkreten, verifizierten Quelle hervorgeht.
              </p>
            </div>
            ) : null}
            {approvalIsStale ? (
              <strong role="status" style={{ color: "#a15c00" }}>
                {isPersonnelV2
                  ? "Erneute organisatorische Prüfung erforderlich"
                  : "Erneute Prüfung erforderlich"}
              </strong>
            ) : null}
            {finalReviewHistory.length > 0 ? (
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <strong>{isPersonnelV2 ? "Abschlusshistorie" : "Freigabehistorie"}</strong>
                {[...finalReviewHistory].reverse().map((review, index) => (
                  <div
                    key={`${String(review.reviewed_at ?? "review")}-${index}`}
                    className="text-small"
                    style={{ borderLeft: "3px solid #d8e0ea", paddingLeft: "0.6rem" }}
                  >
                    <strong>{finalReviewDecisionLabel(review.decision)}</strong>
                    {typeof review.reviewer_email === "string" ? ` von ${review.reviewer_email}` : ""}
                    {typeof review.reviewer_role === "string" ? ` (${review.reviewer_role})` : ""}
                    {typeof review.reviewed_at === "string"
                      ? ` am ${new Date(review.reviewed_at).toLocaleString("de-DE")}`
                      : ""}
                    {typeof review.note === "string" && review.note ? (
                      <div>Begründung / offene Punkte: {review.note}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : finalReview ? (
              <div className="text-small">
                <strong>{finalReviewDecisionLabel(finalReview.decision)}</strong>
                {typeof finalReview.reviewer_email === "string" ? ` von ${finalReview.reviewer_email}` : ""}
                {typeof finalReview.reviewed_at === "string"
                  ? ` am ${new Date(finalReview.reviewed_at).toLocaleString("de-DE")}`
                  : ""}
              </div>
            ) : (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                {isPersonnelV2
                  ? "Noch kein organisatorischer Abschluss dokumentiert."
                  : "Noch keine manuelle Abschlussentscheidung dokumentiert."}
              </p>
            )}
            <label style={{ display: "grid", gap: "0.25rem" }}>
              {isPersonnelV2
                ? "Notiz zum Bearbeitungsstand oder zu offenen Punkten"
                : "Begründung oder Einordnung offener Punkte"}
              <textarea
                value={reviewNote}
                maxLength={1000}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" disabled={saving} onClick={() => void handleFinalReview("APPROVED")}>
                {isPersonnelV2 ? "Organisatorischen Abschluss dokumentieren" : "Manuell freigeben"}
              </button>
              <button type="button" disabled={saving} onClick={() => void handleFinalReview("NOT_APPROVED")}>
                {isPersonnelV2 ? "Keinen organisatorischen Abschluss dokumentieren" : "Nicht freigeben"}
              </button>
            </div>
          </section>
        ) : null
      ) : null}

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>
            {isPersonnelV2 ? "Organisatorischer Bearbeitungsstand" : "Klärungsstand je Bereich"}
          </h2>
          {hasVersionedFields ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {isHiringV2 ? (
                <label style={{ display: "grid", gap: "0.25rem", maxWidth: "24rem" }}>
                  Geplanter Arbeitsbeginn
                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={(event) => updatePlannedStartDate(event.target.value)}
                  />
                </label>
              ) : isPersonnelV2 ? (
                <label style={{ display: "grid", gap: "0.25rem", maxWidth: "24rem" }}>
                  {effectiveTopicId === OFFICE_TOPIC_MFA_HIRING
                    ? "Geplanter Eintritt"
                    : effectiveTopicId === OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION
                      ? "Geplantes Austrittsdatum"
                      : "Geplanter Ausbildungsbeginn"}
                  <input
                    type="date"
                    value={plannedEventDate}
                    onChange={(event) => updatePlannedEventDate(event.target.value)}
                  />
                </label>
              ) : null}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong>Fristenübersicht:</strong>
                <span>{overdueCount} überfällig</span>
                <span>{dueSoonCount} innerhalb von 30 Tagen fällig</span>
              </div>
              {isHiringV2 ? (
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  Interne Kontrolltermine werden ungefähr vier Monate und vier Wochen vor dem Arbeitsbeginn vorgeschlagen.
                  Sie sind keine KV- oder Behördenfristen und können pro Aufgabe angepasst werden.
                </p>
              ) : (
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  Aufgabenfristen werden individuell gepflegt. Behördenfristen nicht aus dem Falldatum ableiten;
                  nur mit konkreter Quelle dokumentieren.
                </p>
              )}
            </div>
          ) : null}
          {blocks.length > 0 ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {blocks.map((block) => {
                const primaryText = getPrimaryOpenTextForBlock(block);

                return (
                  <article
                    key={block.id}
                    style={{
                      border: "1px solid #d8e0ea",
                      borderRadius: "0.4rem",
                      padding: "0.7rem",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <strong>{block.title}</strong>
                      <span className="text-small" style={{ fontWeight: 600 }}>
                        {isPersonnelV2
                          ? block.status === "offen"
                            ? "Offene Bearbeitung"
                            : block.status === "nicht_erforderlich"
                              ? "Als nicht erforderlich dokumentiert"
                              : block.status === "mit_nicht_erforderlich"
                                ? "Bearbeitung dokumentiert, teilweise nicht erforderlich"
                                : "Bearbeitung dokumentiert"
                          : block.status === "offen"
                            ? "Offen"
                            : block.status === "nicht_erforderlich"
                              ? "Nicht erforderlich"
                              : block.status === "mit_nicht_erforderlich"
                                ? "Geklärt, teilweise nicht erforderlich"
                                : "Geklärt"}
                      </span>
                    </div>
                    {primaryText ? (
                      <div className="text-small text-muted">Offen: {primaryText}</div>
                    ) : (
                      <div className="text-small text-muted">
                        {isPersonnelV2
                          ? "Für diesen Bereich sind keine offenen Bearbeitungspunkte markiert."
                          : "Bereich ist geklärt."}
                      </div>
                    )}
                    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.2rem" }}>
                      {block.checkpoints.map((checkpoint) => {
                        const checkpointActions = actionsByCheckpoint.get(checkpoint.id) ?? [];
                        const shortStatus = isPersonnelV2
                          ? checkpoint.state === OfficeCheckpointState.YES
                            ? "Bearbeitung als erledigt markiert"
                            : checkpoint.state === OfficeCheckpointState.NO
                              ? "Nicht vollständig bearbeitet"
                              : checkpoint.state === OfficeCheckpointState.NOT_REQUIRED
                                ? "Mit Begründung als nicht erforderlich markiert"
                                : checkpointActions[0]?.text ?? "Offen"
                          : checkpointActions[0]?.text ?? statusLabel(checkpoint.state);
                        const compactPrefill = getCompactPrefillItems(
                          officeCase.topicId,
                          checkpoint,
                          templateVersion,
                        );
                        const dueStatus = getCheckpointDueStatus(checkpoint);

                        return (
                          <div
                            key={checkpoint.id}
                            style={{
                              border: "1px solid #e3e8ef",
                              borderRadius: "0.35rem",
                              padding: "0.55rem",
                              display: "grid",
                              gap: "0.45rem",
                              backgroundColor: "#fbfcfd",
                            }}
                          >
                            <div style={{ display: "grid", gap: "0.2rem" }}>
                              <strong>{checkpoint.title}</strong>
                              {checkpoint.description ? (
                                <div className="text-small text-muted">{checkpoint.description}</div>
                              ) : null}
                              <div className="text-small text-muted">Klärungsstand: {shortStatus}</div>
                              {dueStatus !== "none" ? (
                                <strong
                                  className="text-small"
                                  style={{ color: dueStatus === "overdue" ? "#b42318" : dueStatus === "due_soon" ? "#a15c00" : undefined }}
                                >
                                  {dueStatus === "overdue"
                                    ? `Überfällig · ${checkpoint.deadline}`
                                    : dueStatus === "due_soon"
                                      ? `Fällig innerhalb von 30 Tagen · ${checkpoint.deadline}`
                                      : `Fällig am ${checkpoint.deadline}`}
                                </strong>
                              ) : null}
                              <div className="text-small text-muted">
                                Vorbereitung:{" "}
                                {compactPrefill.length > 0
                                  ? compactPrefill
                                      .map(
                                        (item) =>
                                          `${compactQuestionLabel(item.question)}: ${m2AnswerLabel(item.answer)}`,
                                      )
                                      .join(" | ")
                                  : "Keine Vorbereitung erfasst."}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.YES,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.YES ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.YES
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                {isPersonnelV2 ? "Bearbeitet" : "Geklärt"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.NO,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.NO ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.NO
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                {isPersonnelV2 ? "Nicht vollständig bearbeitet" : "Nicht vollständig"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.OPEN,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.OPEN ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.OPEN
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                Offen
                              </button>
                              {checkpoint.not_required_allowed ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCheckpoint(checkpoint.id, {
                                      state: OfficeCheckpointState.NOT_REQUIRED,
                                    })
                                  }
                                  style={{
                                    fontWeight: checkpoint.state === OfficeCheckpointState.NOT_REQUIRED ? 700 : 400,
                                    outline:
                                      checkpoint.state === OfficeCheckpointState.NOT_REQUIRED
                                        ? "2px solid currentColor"
                                        : undefined,
                                  }}
                                >
                                  Nicht erforderlich
                                </button>
                              ) : null}
                            </div>
                            {checkpoint.state === OfficeCheckpointState.NOT_REQUIRED ? (
                              <label style={{ display: "grid", gap: "0.25rem" }}>
                                Begründung (erforderlich)
                                <textarea
                                  value={checkpoint.not_required_reason ?? ""}
                                  maxLength={500}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, {
                                      not_required_reason: event.target.value,
                                    })
                                  }
                                />
                              </label>
                            ) : null}
                            {hasVersionedFields ? (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.5rem" }}>
                              <label style={{ display: "grid", gap: "0.2rem" }}>
                                Verantwortlich
                                <input
                                  type="text"
                                  maxLength={120}
                                  value={checkpoint.responsible_role ?? ""}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, {
                                      responsible_role: event.target.value,
                                    })
                                  }
                                  placeholder="Name oder Funktion"
                                />
                              </label>
                              <label style={{ display: "grid", gap: "0.2rem" }}>
                                Fristenart
                                <select
                                  value={checkpoint.deadline_kind ?? "TASK"}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, {
                                      deadline_kind: event.target.value as OfficeCheckpointSnapshot["deadline_kind"],
                                    })
                                  }
                                >
                                  <option value="TASK">Individuelle Aufgabenfrist</option>
                                  <option value="INTERNAL_CONTROL">Interner Kontrolltermin</option>
                                  <option value="AUTHORITY">KV-/Behördenfrist</option>
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: "0.2rem" }}>
                                Fällig am
                                <input
                                  type="date"
                                  value={checkpoint.deadline ?? ""}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, {
                                      deadline: event.target.value,
                                      deadline_is_manual:
                                        checkpoint.deadline_kind === "INTERNAL_CONTROL"
                                          ? true
                                          : checkpoint.deadline_is_manual,
                                    })
                                  }
                                />
                              </label>
                              </div>
                            ) : null}
                            {hasVersionedFields && checkpoint.deadline_kind === "AUTHORITY" ? (
                              <label style={{ display: "grid", gap: "0.2rem" }}>
                                Quelle der verbindlichen Frist (z. B. Bescheid oder offizielle Mitteilung)
                                <input
                                  type="text"
                                  maxLength={300}
                                  value={checkpoint.authority ?? ""}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, { authority: event.target.value })
                                  }
                                />
                              </label>
                            ) : null}
                            {!(
                              hasVersionedFields &&
                              isOfficePersonalStatusOnlyCheckpoint(checkpoint.id)
                            ) ? (
                              <label style={{ display: "grid", gap: "0.2rem" }}>
                                Notiz / offener Punkt
                                <textarea
                                  value={checkpoint.known_note ?? ""}
                                  onChange={(event) =>
                                    updateCheckpoint(checkpoint.id, { known_note: event.target.value })
                                  }
                                />
                              </label>
                            ) : (
                              <p className="text-small text-muted" style={{ margin: 0 }}>
                                Hier nur den Bearbeitungsstatus dokumentieren, keine persönlichen Identifikations-
                                oder Abrechnungsdaten.
                              </p>
                            )}
                            {complianceByCheckpointId?.[checkpoint.id] ? (
                              <OfficeComplianceFooter
                                compliance={complianceByCheckpointId[checkpoint.id]}
                                checkpointId={checkpoint.id}
                              />
                            ) : null}
                            {(() => {
                              const questions = getQuestionsForCheckpoint(
                                officeCase.topicId,
                                checkpoint.id,
                                templateVersion,
                              );
                              const answers = checkpoint.m2_answers;
                              return questions.length > 0 && answers ? (
                                <details style={{ opacity: 0.82 }}>
                                  <summary className="text-small text-muted" style={{ cursor: "pointer", fontWeight: 600 }}>
                                    Vorbereitung (M2)
                                  </summary>
                                  <div style={{ display: "grid", gap: "0.35rem", padding: "0.6rem", backgroundColor: "#f5f7fa", borderRadius: "0.25rem", marginTop: "0.35rem" }}>
                                    {questions.map((q) => {
                                      const val = answers[q.id];
                                      const labels: Record<string, string> = { YES: "Ja", NO: "Nein", UNCLEAR: "Unklar" };
                                      return (
                                        <div key={q.id} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                                          <span className="text-small">{q.text}</span>
                                          {val ? (
                                            <span className="text-small" style={{ fontWeight: 700, marginLeft: "auto", whiteSpace: "nowrap" }}>{labels[val] ?? val}</span>
                                          ) : (
                                            <span className="text-small text-muted" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>—</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              ) : null;
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Keine Blockzuordnung verfuegbar.
            </p>
          )}
        </section>
      ) : null}

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Offene Punkte & nächste Schritte</h2>
          {topNextSteps.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
              {topNextSteps.map((step) => (
                <li key={step} className="text-small">{step}</li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {isPersonnelV2
                ? "Keine offenen Bearbeitungsschritte markiert."
                : "Keine offenen Schritte erkennbar."}
            </p>
          )}
        </section>
      ) : null}

      {mode === "m3" ? (
        <OfficeWritePanel
          topicId={effectiveTopicId}
          checkpoints={checkpoints}
        />
      ) : null}

      {mode !== "m3" ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {m2Sections.map((section) => (
            <section key={section.title ?? "unsectioned"} style={{ display: "grid", gap: "0.75rem" }}>
              {section.title ? <h2 style={{ margin: 0 }}>{section.title}</h2> : null}
              {section.checkpoints.map((checkpoint) => {
                const questions = getQuestionsForCheckpoint(
                  officeCase.topicId,
                  checkpoint.id,
                  templateVersion,
                );

                return (
                  <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <strong>{checkpoint.title}</strong>
                  </div>
                </div>

                <>
                  {(() => {
                    return questions.length > 0 ? (
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        {questions.map((q) => {
                          const answer = checkpoint.m2_answers?.[q.id] ?? null;
                          return (
                            <div key={q.id} style={{ display: "grid", gap: "0.35rem" }}>
                              <div className="text-small" style={{ fontWeight: 500 }}>{q.text}</div>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                {(["YES", "NO", "UNCLEAR"] as M2AnswerValue[]).map((val) => {
                                  const labels: Record<M2AnswerValue, string> = { YES: "Ja", NO: "Nein", UNCLEAR: "Unklar" };
                                  const isActive = answer === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        const next = { ...(checkpoint.m2_answers ?? {}), [q.id]: val };
                                        updateCheckpoint(checkpoint.id, { m2_answers: next });
                                      }}
                                      style={{
                                        fontWeight: isActive ? 700 : 400,
                                        outline: isActive ? "2px solid currentColor" : undefined,
                                      }}
                                    >
                                      {labels[val]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                </>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {mode === "m2" && status === "Operative Prüfung gespeichert." ? (
          <button type="button" onClick={() => router.push(`/office-cases/${officeCase.id}/m3`)}>
            Weiter zu Klärung & nächste Schritte
          </button>
        ) : null}
        {status && status !== "Operative Prüfung gespeichert." ? <span className="text-muted">{status}</span> : null}
        {error ? <span className="text-muted">{error}</span> : null}
      </div>
    </section>
  );
}