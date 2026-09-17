"use client";

import { useState } from "react";
import type { QuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";
import { buildDerivedValueLines } from "@/lib/questionnaire/formatAnswer";
import AnswersDisclosure from "./AnswersDisclosure";
import MedicalRecordNoteCopyButton from "./MedicalRecordNoteCopyButton";

type Props = {
  sessionId: string;
};

type DetailResponse =
  | { ok: true; detail: QuestionnaireInboxDetail }
  | { ok: false; error?: string };

export default function QuestionnaireDetailsDisclosure({ sessionId }: Props) {
  const [detail, setDetail] = useState<QuestionnaireInboxDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail() {
    if (detail || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/questionnaire/${sessionId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null) as DetailResponse | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body && !body.ok && body.error
          ? body.error
          : "Antworten konnten nicht geladen werden.");
      }
      setDetail(body.detail);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : "Antworten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  const derivedLines = detail ? buildDerivedValueLines(detail.derivedValues) : [];

  return (
    <details
      style={{ marginTop: "0.5rem" }}
      onToggle={(event) => {
        if (event.currentTarget.open) void loadDetail();
      }}
      data-q-details={sessionId}
    >
      <summary style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" }}>
        Antworten anzeigen
      </summary>

      {loading && (
        <div className="text-muted text-small" data-q-details-loading={sessionId}>
          Antworten werden geladen …
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="text-small"
          data-q-details-error={sessionId}
          style={{ color: "var(--danger-fg, #b91c1c)", marginTop: "0.4rem" }}
        >
          {error}
        </div>
      )}

      {detail && (
        <div data-q-details-loaded={sessionId}>
          {detail.digitalRequestContext && (
            <section
              data-q-digital-request-context={sessionId}
              style={{
                marginBottom: "0.75rem",
                padding: "0.6rem 0.75rem",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
                Ursprüngliche digitale Anfrage
              </div>
              {detail.digitalRequestContext.submitter_name && (
                <div>Name: {detail.digitalRequestContext.submitter_name}</div>
              )}
              {detail.digitalRequestContext.birth_date && (
                <div>Geburtsdatum: {detail.digitalRequestContext.birth_date}</div>
              )}
              {detail.digitalRequestContext.submitter_email && (
                <div>E-Mail: {detail.digitalRequestContext.submitter_email}</div>
              )}
              {detail.digitalRequestContext.patient_relationship_label && (
                <div>Patientenangabe: {detail.digitalRequestContext.patient_relationship_label}</div>
              )}
              {detail.digitalRequestContext.request_intent_label && (
                <div>Art der Anfrage: {detail.digitalRequestContext.request_intent_label}</div>
              )}
              {detail.digitalRequestContext.concern_text && (
                <div>Besuchsgrund: {detail.digitalRequestContext.concern_text}</div>
              )}
              {detail.digitalRequestContext.requested_topic_labels.length > 0 && (
                <div>
                  Anfragekategorien: {detail.digitalRequestContext.requested_topic_labels.join(", ")}
                </div>
              )}
            </section>
          )}
          <MedicalRecordNoteCopyButton
            sessionId={sessionId}
            noteText={detail.noteText}
          />
          {(derivedLines.length > 0 || detail.attentionHints.length > 0) && (
            <div
              data-q-derived-values={sessionId}
              style={{
                padding: "0.4rem 0.6rem",
                background: "var(--muted, #f1f5f9)",
                borderRadius: "var(--radius)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Berechnete Werte</div>
              {derivedLines.map((line) => <div key={line}>{line}</div>)}
              {detail.attentionHints.map((hint) => <div key={hint.id}>⚠ {hint.label}</div>)}
            </div>
          )}
          <AnswersDisclosure
            questions={detail.questions}
            answers={detail.answers}
            visibleQuestionIds={new Set(detail.visibleQuestionIds)}
            showSummary={false}
          />
        </div>
      )}
    </details>
  );
}
