"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeletePracticeBlocker = {
  model:
    | "PatientQuestionnaireSession"
    | "InquirySession"
    | "CaseSession"
    | "OfficeCaseSession"
    | "PracticeQuestionnaireForm";
  count: number;
  reason: "not_empty";
};

type DeletePracticeResponse =
  | {
      ok: true;
      deleted: true;
      code: "practice_deleted";
      practiceId: string;
      name: string;
    }
  | {
      ok: false;
      deleted: false;
      code: "confirm_name_mismatch" | "practice_not_found" | "practice_not_empty";
      error: string;
      blockers?: DeletePracticeBlocker[];
    };

const BLOCKER_LABEL: Record<DeletePracticeBlocker["model"], string> = {
  PatientQuestionnaireSession: "Fragebögen",
  InquirySession: "Nachrichten",
  CaseSession: "Fälle",
  OfficeCaseSession: "Office-Fälle",
  PracticeQuestionnaireForm: "Website-Formulare",
};

function asFailure(
  payload: DeletePracticeResponse | null,
): Extract<DeletePracticeResponse, { ok: false }> | null {
  return payload && payload.ok === false ? payload : null;
}

export function DeletePracticeButton({
  practiceId,
  practiceName,
}: {
  practiceId: string;
  practiceName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<DeletePracticeBlocker[]>([]);

  const canSubmit = confirmName === practiceName;

  async function onDelete() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setBlockers([]);

    try {
      const res = await fetch(`/api/admin/practices/${practiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_practice", confirmName }),
      });
      const payload = (await res.json().catch(() => null)) as DeletePracticeResponse | null;
      const failure = asFailure(payload);

      if (!res.ok || !payload || !payload.ok) {
        setError(
          failure?.error ??
            "Praxis kann nicht gelöscht werden, solange noch Daten vorhanden sind.",
        );
        setBlockers(Array.isArray(failure?.blockers) ? failure.blockers : []);
        return;
      }

      setOpen(false);
      setConfirmName("");
      router.push("/admin/practices");
      router.refresh();
    } catch {
      setError("Löschen fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-delete-practice-toggle={practiceId}
        onClick={() => {
          setOpen(true);
          setConfirmName("");
          setError(null);
          setBlockers([]);
        }}
        style={{
          border: "1px solid #b91c1c",
          borderRadius: "var(--radius)",
          padding: "0.5rem 1rem",
          background: "#fff5f5",
          color: "#991b1b",
          fontWeight: 600,
        }}
      >
        Praxis endgültig löschen
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-box card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "32rem" }}
          >
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Praxis wirklich löschen?
            </p>
            <p className="text-muted text-small" style={{ marginBottom: "0.75rem" }}>
              Zum Bestätigen den Praxisnamen exakt eingeben: <strong>{practiceName}</strong>
            </p>
            <label style={{ display: "grid", gap: "0.35rem", marginBottom: "1rem" }}>
              <span>Praxisname bestätigen</span>
              <input
                type="text"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={practiceName}
                data-delete-practice-confirm-input={practiceId}
              />
            </label>

            {error && (
              <div
                role="alert"
                style={{ color: "#991b1b", marginBottom: "1rem" }}
                data-delete-practice-error={practiceId}
              >
                <div>{error}</div>
                {blockers.length > 0 && (
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                    {blockers.map((blocker, idx) => (
                      <li key={`${blocker.model}-${idx}`}>
                        {BLOCKER_LABEL[blocker.model]}: {blocker.count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-destructive"
                disabled={!canSubmit || submitting}
                onClick={() => void onDelete()}
                data-delete-practice-submit={practiceId}
              >
                {submitting ? "Lösche…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}