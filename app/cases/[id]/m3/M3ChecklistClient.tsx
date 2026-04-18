"use client";

import { useState } from "react";
import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";

type M3Checkpoint = Omit<ActiveCheckpoint, "status"> & {
  status: CheckpointStatus;
};

function normalizeStatus(checkpoint: ActiveCheckpoint): CheckpointStatus {
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

export function M3ChecklistClient({
  caseId,
  initialCheckpoints,
}: {
  caseId: string;
  initialCheckpoints: ActiveCheckpoint[];
}) {
  const [checkpoints, setCheckpoints] = useState<M3Checkpoint[]>(
    initialCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      status: normalizeStatus(checkpoint),
    })),
  );
  const [savingCheckpointId, setSavingCheckpointId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(checkpointId: string, status: CheckpointStatus) {
    const previous = checkpoints;

    setError(null);
    setSavingCheckpointId(checkpointId);
    setCheckpoints((current) =>
      current.map((checkpoint) =>
        checkpoint.id === checkpointId ? { ...checkpoint, status } : checkpoint,
      ),
    );

    try {
      const response = await fetch(`/api/cases/${caseId}/checkpoint/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkpoint_id: checkpointId,
          status,
        }),
      });

      if (!response.ok) {
        setCheckpoints(previous);
        setError("Status konnte nicht gespeichert werden.");
      }
    } catch {
      setCheckpoints(previous);
      setError("Status konnte nicht gespeichert werden.");
    } finally {
      setSavingCheckpointId(null);
    }
  }

  return (
    <section>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {checkpoints.map((checkpoint) => (
          <li
            key={checkpoint.id}
            data-checkpoint-item={checkpoint.id}
            style={{
              border: "1px solid #ddd",
              padding: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>{checkpoint.title}</div>
            <div style={{ marginBottom: "0.5rem" }}>
              Status: {checkpoint.status}
            </div>
            <div>
              {getStatusOptions(checkpoint.category).map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  data-status-button={`${checkpoint.id}:${statusOption}`}
                  onClick={() => void updateStatus(checkpoint.id, statusOption)}
                  disabled={savingCheckpointId === checkpoint.id}
                  style={{
                    marginRight: "0.5rem",
                    fontWeight:
                      checkpoint.status === statusOption ? "bold" : "normal",
                  }}
                >
                  {statusOption}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
