"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

type OfficeCaseData = {
  id: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpoint_snapshot: {
    topicId: string | null;
    checkpoints: OfficeCheckpointSnapshot[];
  };
};

type Props = {
  officeCase: OfficeCaseData;
  mode: "m2" | "m3";
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

export default function OfficeCaseEditorClient({ officeCase, mode }: Props) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<OfficeCheckpointSnapshot[]>(
    cloneCheckpoints(officeCase.checkpoint_snapshot.checkpoints),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summaryText = useMemo(
    () =>
      buildOfficeSummaryText({
        topicTitle: officeCase.topicTitle ?? officeCase.title ?? "Office-Snapshot",
        checkpoints,
      }),
    [checkpoints, officeCase.title, officeCase.topicTitle],
  );

  function updateCheckpoint(id: string, patch: Partial<OfficeCheckpointSnapshot>) {
    setCheckpoints((prev) =>
      prev.map((checkpoint) => (checkpoint.id === id ? { ...checkpoint, ...patch } : checkpoint)),
    );
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
              known_note: checkpoint.known_note ?? "",
              missing_note: checkpoint.missing_note ?? "",
              answer_source: checkpoint.answer_source ?? "",
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        setStatus("M2 gespeichert.");
      } else {
        for (const checkpoint of checkpoints) {
          const res = await fetch(`/api/office-cases/${officeCase.id}/checkpoint/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkpoint_id: checkpoint.id,
              state: checkpoint.state,
              known_note: checkpoint.known_note ?? "",
              missing_note: checkpoint.missing_note ?? "",
              answer_source: checkpoint.answer_source ?? "",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            setError(data.error ?? `Checkpoint ${checkpoint.id} konnte nicht gespeichert werden.`);
            return;
          }
        }
        setStatus("M3 gespeichert.");
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

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {checkpoints.map((checkpoint) => {
          const isOpen = checkpoint.state === OfficeCheckpointState.OPEN;
          const showMissing = mode === "m3" && isOpen;

          return (
            <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <strong>{checkpoint.title}</strong>
                  <div className="text-small text-muted">{kindLabel(checkpoint.kind)} · {checkpoint.id}</div>
                </div>
                {mode === "m3" ? (
                  <select
                    value={checkpoint.state}
                    onChange={(e) =>
                      updateCheckpoint(checkpoint.id, {
                        state: e.target.value as OfficeCheckpointState,
                        missing_note:
                          e.target.value === OfficeCheckpointState.OPEN
                            ? checkpoint.missing_note
                            : checkpoint.missing_note,
                        answer_source:
                          e.target.value === OfficeCheckpointState.OPEN
                            ? checkpoint.answer_source
                            : checkpoint.answer_source,
                      })
                    }
                  >
                    <option value={OfficeCheckpointState.YES}>YES</option>
                    <option value={OfficeCheckpointState.NO}>NO</option>
                    <option value={OfficeCheckpointState.OPEN}>OPEN</option>
                  </select>
                ) : null}
              </div>

              {mode === "m2" ? (
                <>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>known_note</span>
                    <textarea
                      value={checkpoint.known_note ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { known_note: e.target.value })}
                      rows={2}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>missing_note</span>
                    <textarea
                      value={checkpoint.missing_note ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { missing_note: e.target.value })}
                      rows={2}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>answer_source</span>
                    <input
                      type="text"
                      value={checkpoint.answer_source ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { answer_source: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>known_note</span>
                    <textarea
                      value={checkpoint.known_note ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { known_note: e.target.value })}
                      rows={2}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>
                      missing_note{showMissing ? " *" : ""}
                    </span>
                    <textarea
                      value={checkpoint.missing_note ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { missing_note: e.target.value })}
                      rows={2}
                      required={isOpen}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>
                      answer_source{showMissing ? " *" : ""}
                    </span>
                    <input
                      type="text"
                      value={checkpoint.answer_source ?? ""}
                      onChange={(e) => updateCheckpoint(checkpoint.id, { answer_source: e.target.value })}
                      required={isOpen}
                    />
                  </label>
                </>
              )}
            </article>
          );
        })}
      </div>

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summaryText}</pre>
          <CopyTextButton label="Summary kopieren" text={summaryText} />
        </section>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {status ? <span className="text-muted">{status}</span> : null}
        {error ? <span className="text-muted">{error}</span> : null}
      </div>
    </section>
  );
}