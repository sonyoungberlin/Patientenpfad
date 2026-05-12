"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteAccountBlocker = {
  model: string;
  count: number;
  reason: string;
  practiceId?: string;
};

type DeleteAccountResponse =
  | {
      ok: true;
      deleted: true;
      message: string;
      accountId: string;
      email: string;
    }
  | {
      ok: false;
      deleted: false;
      code: string;
      error: string;
      blockers?: DeleteAccountBlocker[];
    };

function isDeleteFailure(
  json: DeleteAccountResponse | null,
): json is Extract<DeleteAccountResponse, { ok: false }> {
  return Boolean(json && json.ok === false);
}

export function DeleteAccountButton({ email }: { email: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<DeleteAccountBlocker[]>([]);

  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = confirmEmail.trim().toLowerCase() === normalizedEmail;

  async function handleDelete() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setBlockers([]);

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          confirmEmail,
          action: "delete_account",
        }),
      });
      const json = (await response.json().catch(() => null)) as DeleteAccountResponse | null;
      const failure = isDeleteFailure(json) ? json : null;

      if (!response.ok || !json || !json.ok) {
        setError(failure?.error ?? "Löschen fehlgeschlagen.");
        setBlockers(Array.isArray(failure?.blockers) ? failure.blockers : []);
        return;
      }

      setIsOpen(false);
      setConfirmEmail("");
      router.refresh();
    } catch {
      setError("Löschen fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setConfirmEmail("");
          setError(null);
          setBlockers([]);
        }}
        data-delete-account-toggle={email}
        style={{
          border: "1px solid #b91c1c",
          borderRadius: "var(--radius)",
          padding: "0.5rem 1rem",
          background: "#fff5f5",
          color: "#991b1b",
          fontWeight: 600,
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
        }}
      >
        Endgültig löschen
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-box card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-account-title-${email}`}
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "32rem" }}
          >
            <p id={`delete-account-title-${email}`} style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Account wirklich löschen?
            </p>
            <p className="text-muted text-small" style={{ marginBottom: "1rem" }}>
              Zum Bestätigen bitte die E-Mail-Adresse exakt eingeben.
            </p>
            <label style={{ display: "grid", gap: "0.35rem", marginBottom: "1rem" }}>
              <span>E-Mail bestätigen</span>
              <input
                type="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder={email}
                autoComplete="off"
                data-delete-account-confirm-input={email}
              />
            </label>
            {error && (
              <div role="alert" style={{ color: "#991b1b", marginBottom: "1rem" }} data-delete-account-error={email}>
                <div>{error}</div>
                {blockers.length > 0 && (
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                    {blockers.map((blocker, index) => (
                      <li key={`${blocker.model}-${index}`} data-delete-account-blocker={blocker.model}>
                        {blocker.model}: {blocker.count}
                        {blocker.practiceId ? ` (${blocker.practiceId})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setIsOpen(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-destructive"
                disabled={!canSubmit || isSubmitting}
                onClick={() => void handleDelete()}
                data-delete-account-submit={email}
              >
                {isSubmitting ? "Lösche…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}