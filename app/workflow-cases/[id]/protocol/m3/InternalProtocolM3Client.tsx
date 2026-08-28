"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolWorkflowCheckpoint,
  ProtocolClarificationJudgement,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPracticeProcessMode } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import {
  synthesizeCheckpoint,
  clarificationJudgementLabel,
  type SynthesisItem,
} from "@/lib/workflow/internalProtocol/synthesis";

type Props = {
  sessionId: string;
  snapshot: InternalProtocolWorkflowSnapshot;
};

// Drei fachlich korrekte Urteilsoptionen (M3-Urteil, separat von checkpoint.status)
const JUDGMENT_OPTIONS: { value: ProtocolClarificationJudgement; label: string }[] = [
  { value: "SUFFICIENTLY_CLARIFIED", label: "Ausreichend geklärt" },
  { value: "OPEN", label: "Noch offen" },
  { value: "NOT_RELEVANT", label: "Nicht relevant" },
];

// ---------------------------------------------------------------------------
// Synthese-Karte pro Aspekt
// ---------------------------------------------------------------------------

function SynthesisCard({
  checkpoint,
  items,
  judgement,
  onJudgment,
  isJudged,
}: {
  checkpoint: ProtocolWorkflowCheckpoint;
  items: SynthesisItem[];
  judgement: ProtocolClarificationJudgement | undefined;
  onJudgment: (id: string, j: ProtocolClarificationJudgement) => void;
  isJudged: boolean;
}) {
  const confirmedItems = items.filter((i) => i.status === "confirmed");
  const unclearItems = items.filter((i) => i.status === "unclear");
  const openItems = items.filter((i) => i.status === "open");

  return (
    <article
      style={{
        border: `1px solid ${isJudged ? "#c0e0c0" : "#d8e0ea"}`,
        borderRadius: "0.5rem",
        padding: "1rem",
        display: "grid",
        gap: "0.75rem",
        background: isJudged ? "#f8fff8" : "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "0.35rem",
        }}
      >
        <strong>{checkpoint.title}</strong>
        {isJudged && judgement && (
          <span
            className="text-small"
            style={{
              color:
                judgement === "SUFFICIENTLY_CLARIFIED"
                  ? "#1a6"
                  : judgement === "NOT_RELEVANT"
                    ? "#777"
                    : "#c44",
              fontWeight: 600,
            }}
          >
            {clarificationJudgementLabel(judgement)}
          </span>
        )}
      </div>

      {/* Synthese-Einträge */}
      <div style={{ display: "grid", gap: "0.3rem" }}>
        {confirmedItems.map((item, i) => (
          <div key={i} className="text-small" style={{ display: "flex", gap: "0.4rem" }}>
            <span style={{ color: "#1a6", flexShrink: 0 }}>✓</span>
            <span>{item.text}</span>
          </div>
        ))}
        {unclearItems.map((item, i) => (
          <div key={i} className="text-small" style={{ display: "flex", gap: "0.4rem" }}>
            <span style={{ color: "#c88", flexShrink: 0 }}>?</span>
            <span style={{ color: "#666" }}>{item.text}</span>
          </div>
        ))}
        {openItems.map((item, i) => (
          <div key={i} className="text-small" style={{ display: "flex", gap: "0.4rem" }}>
            <span style={{ color: "#c44", flexShrink: 0 }}>○</span>
            <span style={{ color: "#c44" }}>{item.text}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-small text-muted" style={{ margin: 0, fontStyle: "italic" }}>
            Keine Antworten aus M2 vorhanden.
          </p>
        )}
      </div>

      {/* Urteil */}
      <div
        style={{
          display: "grid",
          gap: "0.35rem",
          borderTop: "1px solid #eee",
          paddingTop: "0.6rem",
        }}
      >
        <span className="text-small text-muted" style={{ fontWeight: 600 }}>
          Klärungsstand
        </span>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {JUDGMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onJudgment(checkpoint.id, opt.value)}
              style={{
                fontWeight: judgement === opt.value ? 700 : 400,
                outline:
                  judgement === opt.value
                    ? "2px solid currentColor"
                    : undefined,
                padding: "0.25rem 0.75rem",
                fontSize: "0.875rem",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function InternalProtocolM3Client({
  sessionId,
  snapshot,
}: Props) {
  const router = useRouter();
  const allSections = useMemo(() => getPatientWithoutAppointmentSections(), []);
  const mode = getPracticeProcessMode(snapshot);

  const m3Description =
    mode === "TARGET_STATE"
      ? "Beurteilen Sie für jeden Aspekt, ob für den zukünftigen Ablauf klar festgelegt ist, wie Ihre Praxis in diesem Bereich vorgehen soll."
      : "Beurteilen Sie für jeden Aspekt, ob Ihr Team heute klar weiß, wie in dieser Situation vorgegangen wird. Offene Punkte erscheinen in der Zusammenfassung.";

  // Separate Urteilsabbildung: nur clarificationJudgement, KEIN Eingriff in checkpoint.status
  const [judgements, setJudgements] = useState<
    Map<string, ProtocolClarificationJudgement>
  >(() => {
    const m = new Map<string, ProtocolClarificationJudgement>();
    for (const cp of snapshot.checkpoints) {
      if (cp.clarificationJudgement !== undefined) {
        m.set(cp.id, cp.clarificationJudgement);
      }
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleJudgment = useCallback(
    (checkpointId: string, j: ProtocolClarificationJudgement) => {
      setJudgements((prev) => new Map(prev).set(checkpointId, j));
    },
    [],
  );

  async function handleSaveAndResult() {
    setSaving(true);
    setSaveError(null);
    try {
      // Nur clarificationJudgement aus der Map speichern – status UNVERÄNDERT
      const checkpointsToSave = snapshot.checkpoints.map((cp) => ({
        ...cp,
        clarificationJudgement: judgements.get(cp.id),
      }));
      const res = await fetch(`/api/workflow-cases/${sessionId}/protocol/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints: checkpointsToSave }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setSaveError(
          (data as { error?: string }).error ?? "Speichern fehlgeschlagen.",
        );
        return;
      }
      router.push(`/workflow-cases/${sessionId}/protocol/result`);
    } catch {
      setSaveError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // Synthese-Daten für alle Checkpoints berechnen
  const synthesisData = snapshot.checkpoints.map((cp) => {
    const section = allSections.find((s) => s.id === cp.id);
    const items = section ? synthesizeCheckpoint(section, cp) : [];
    return { cp, items };
  });

  const allJudged = snapshot.checkpoints.every((cp) => judgements.has(cp.id));

  const suffClarCount = [...judgements.values()].filter(
    (j) => j === "SUFFICIENTLY_CLARIFIED",
  ).length;
  const openCount = [...judgements.values()].filter(
    (j) => j === "OPEN",
  ).length;
  const notRelevantCount = [...judgements.values()].filter(
    (j) => j === "NOT_RELEVANT",
  ).length;

  return (
    <section className="card" style={{ display: "grid", gap: "1.25rem" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <div className="text-small text-muted">Patienten ohne Termin</div>
        <h1 style={{ margin: 0 }}>Klärungsstand</h1>
        <p className="text-small text-muted" style={{ margin: 0 }}>
          {m3Description}
        </p>
      </header>

      {/* Zusammenfassung */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          flexWrap: "wrap",
          padding: "0.6rem 0.9rem",
          background: "#f5f7fa",
          borderRadius: "0.35rem",
          alignItems: "center",
        }}
      >
        {judgements.size === 0 ? (
          <span className="text-small text-muted">
            Noch kein Aspekt beurteilt.
          </span>
        ) : (
          <>
            {suffClarCount > 0 && (
              <span className="text-small">
                <strong style={{ color: "#1a6" }}>
                  {suffClarCount} ausreichend geklärt
                </strong>
              </span>
            )}
            {openCount > 0 && (
              <span className="text-small">
                <strong style={{ color: "#c44" }}>{openCount} noch offen</strong>
              </span>
            )}
            {notRelevantCount > 0 && (
              <span className="text-small">{notRelevantCount} nicht relevant</span>
            )}
          </>
        )}
        {allJudged && (
          <span className="text-small text-muted" style={{ marginLeft: "auto" }}>
            Alle {snapshot.checkpoints.length} Aspekte beurteilt
          </span>
        )}
      </div>

      {/* Synthese-Karten */}
      {synthesisData.map(({ cp, items }) => (
        <SynthesisCard
          key={cp.id}
          checkpoint={cp}
          items={items}
          judgement={judgements.get(cp.id)}
          onJudgment={handleJudgment}
          isJudged={judgements.has(cp.id)}
        />
      ))}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          borderTop: "1px solid #e0e0e0",
          paddingTop: "0.75rem",
        }}
      >
        <Link
          href={`/workflow-cases/${sessionId}/protocol/m2/5`}
          className="text-small"
        >
          ← Zu den Klärungsfragen
        </Link>
        <button
          type="button"
          onClick={() => void handleSaveAndResult()}
          disabled={saving || !allJudged}
          style={{ marginLeft: "auto" }}
          title={
            !allJudged
              ? "Bitte beurteilen Sie alle Aspekte, bevor Sie die Zusammenfassung erstellen."
              : undefined
          }
        >
          {saving ? "Speichert…" : "Zusammenfassung erstellen →"}
        </button>
      </div>
      {!allJudged && (
        <p className="text-small text-muted" style={{ margin: 0 }}>
          Bitte beurteilen Sie alle {snapshot.checkpoints.length} Aspekte, um das
          Ergebnis zu erstellen.
        </p>
      )}
      {saveError && (
        <p className="text-small" style={{ margin: 0, color: "#c44" }}>
          {saveError}
        </p>
      )}
    </section>
  );
}
