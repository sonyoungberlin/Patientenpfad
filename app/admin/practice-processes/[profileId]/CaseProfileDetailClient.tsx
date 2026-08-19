"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toLibraryId } from "@/lib/practiceProcesses";

type CheckpointRef = {
  checkpointId: string;
  group: string;
};

type ProfileDraft = {
  title: string;
  description: string;
  checkpointRefs: CheckpointRef[];
};

type SaveState = "idle" | "saving" | "success" | "error";

export type AvailableCheckpoint = {
  id: string;
  title: string;
};

function draftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "inherit",
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--background)",
  color: "var(--foreground)",
  padding: "0.25rem 0.5rem",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

export default function CaseProfileDetailClient({
  initialDraft,
  fixedId,
  availableCheckpoints,
  existingIds = [],
  existingTitles = [],
}: {
  initialDraft: ProfileDraft;
  /** Gesetzt bei bestehendem Praxisfall; undefined bei Neuanlage. */
  fixedId?: string;
  availableCheckpoints: AvailableCheckpoint[];
  existingIds?: string[];
  existingTitles?: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const cpMap = new Map(availableCheckpoints.map((c) => [c.id, c.title]));

  const displayId = fixedId ?? toLibraryId(draft.title);
  const isNew = fixedId === undefined;
  const titleFilled = draft.title.trim() !== "";
  const isDuplicateId = isNew && titleFilled && existingIds.includes(displayId);
  const isDuplicateTitle =
    isNew &&
    titleFilled &&
    existingTitles.some((t) => t.trim().toLowerCase() === draft.title.trim().toLowerCase());

  const isDirty = !draftsEqual(draft, savedDraft);

  const canSave =
    titleFilled &&
    !isDuplicateId &&
    !isDuplicateTitle &&
    draft.checkpointRefs.length > 0 &&
    saveState !== "saving" &&
    isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Checkpoints die noch nicht im Praxisfall sind
  const usedIds = new Set(draft.checkpointRefs.map((r) => r.checkpointId));
  const addableCheckpoints = availableCheckpoints.filter((c) => !usedIds.has(c.id));

  async function handleSave() {
    if (!canSave) return;
    setSaveState("saving");
    setSaveError(null);

    const url = isNew ? "/api/admin/case-profiles" : `/api/admin/case-profiles/${fixedId}`;
    const method = isNew ? "POST" : "PUT";
    const payload = isNew
      ? { id: displayId, title: draft.title.trim(), description: draft.description, checkpointRefs: draft.checkpointRefs }
      : { title: draft.title.trim(), description: draft.description, checkpointRefs: draft.checkpointRefs };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        profile?: { id: string };
      };
      if (!res.ok || !json.ok) {
        setSaveState("error");
        setSaveError(json.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setSaveState("success");
      setSavedDraft(draft);
      if (isNew && json.profile) {
        router.push(`/admin/practice-processes/${json.profile.id}`);
      }
    } catch {
      setSaveState("error");
      setSaveError("Netzwerkfehler. Bitte erneut versuchen.");
    }
  }

  function addCheckpoint(checkpointId: string) {
    setDraft((prev) => ({
      ...prev,
      checkpointRefs: [...prev.checkpointRefs, { checkpointId, group: "" }],
    }));
  }

  function removeCheckpoint(index: number) {
    setDraft((prev) => ({
      ...prev,
      checkpointRefs: prev.checkpointRefs.filter((_, i) => i !== index),
    }));
  }

  function updateGroup(index: number, group: string) {
    setDraft((prev) => {
      const refs = [...prev.checkpointRefs];
      refs[index] = { ...refs[index], group };
      return { ...prev, checkpointRefs: refs };
    });
  }

  function moveRef(index: number, direction: "up" | "down") {
    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= draft.checkpointRefs.length) return;
    setDraft((prev) => ({
      ...prev,
      checkpointRefs: moveItem(prev.checkpointRefs, index, to),
    }));
  }

  return (
    <main style={{ display: "grid", gap: "1.5rem", maxWidth: "var(--main-max-width)" }}>
      <section style={{ display: "grid", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/admin/practice-processes" className="text-small text-muted">
            ← Praxisfälle
          </Link>
          {fixedId && (
            <Link
              href={`/admin/practice-processes/new?copyFrom=${fixedId}`}
              className="text-small text-muted"
            >
              Duplizieren
            </Link>
          )}
        </div>

        {/* Titel */}
        <input
          value={draft.title}
          onChange={(e) => {
            setDraft((prev) => ({ ...prev, title: e.target.value }));
            setSaveState("idle");
          }}
          placeholder="Titel des Praxisfalls"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            ...inputStyle,
          }}
        />

        {/* ID */}
        <p className="text-small text-muted" style={{ margin: 0 }}>
          ID: <code>{displayId}</code>
        </p>
        {(isDuplicateId || isDuplicateTitle) && (
          <p className="text-small text-error" style={{ margin: 0 }}>
            {isDuplicateId && isDuplicateTitle
              ? "Titel und ID existieren bereits in der Bibliothek."
              : isDuplicateId
              ? "Diese ID existiert bereits in der Bibliothek."
              : "Dieser Titel existiert bereits in der Bibliothek."}
          </p>
        )}

        {/* Beschreibung */}
        <div style={{ marginTop: "0.5rem" }}>
          <span className="text-small text-muted">Beschreibung</span>
          <textarea
            className="text-muted"
            value={draft.description}
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, description: e.target.value }));
              setSaveState("idle");
            }}
            rows={3}
            placeholder="Kurze Beschreibung des Praxisfalls"
            style={{ ...textareaStyle, marginTop: "0.25rem" }}
          />
        </div>
      </section>

      {/* Checkpoints */}
      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginBottom: 0 }}>Checkpoints</h2>

        {draft.checkpointRefs.length === 0 && (
          <p className="text-muted text-small">Noch keine Checkpoints zugeordnet.</p>
        )}

        {draft.checkpointRefs.map((ref, i) => (
          <article
            key={`${ref.checkpointId}-${i}`}
            className="card"
            style={{ display: "grid", gap: "0.5rem" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
              <div style={{ display: "grid", gap: "0.2rem", flex: 1 }}>
                <strong className="text-small">
                  {cpMap.get(ref.checkpointId) ?? ref.checkpointId}
                </strong>
                <code className="text-small text-muted">{ref.checkpointId}</code>
              </div>
              <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => moveRef(i, "up")}
                  disabled={i === 0}
                  style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1 }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveRef(i, "down")}
                  disabled={i === draft.checkpointRefs.length - 1}
                  style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem", cursor: i === draft.checkpointRefs.length - 1 ? "default" : "pointer", opacity: i === draft.checkpointRefs.length - 1 ? 0.3 : 1 }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeCheckpoint(i)}
                  style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem", color: "var(--text-error, red)", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div>
              <span className="text-small text-muted">Gruppe</span>
              <input
                value={ref.group}
                onChange={(e) => updateGroup(i, e.target.value)}
                placeholder="z.B. Patientenstatus"
                style={{ ...inputStyle, marginTop: "0.2rem", fontSize: "0.85rem" }}
              />
            </div>
          </article>
        ))}

        {/* Checkpoint hinzufügen */}
        {addableCheckpoints.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select
              id="add-checkpoint-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addCheckpoint(e.target.value);
                  e.target.value = "";
                }
              }}
              style={{ ...inputStyle, width: "auto", flex: 1 }}
            >
              <option value="">+ Checkpoint hinzufügen …</option>
              {addableCheckpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.title} ({cp.id})
                </option>
              ))}
            </select>
          </div>
        )}
        {addableCheckpoints.length === 0 && availableCheckpoints.length > 0 && (
          <p className="text-small text-muted">Alle verfügbaren Checkpoints sind bereits zugeordnet.</p>
        )}
      </section>

      {/* Speichern */}
      <section style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={!canSave}
          style={{ padding: "0.5rem 1.25rem" }}
        >
          {saveState === "saving" ? "Speichern …" : "Speichern"}
        </button>
        {isDirty && saveState !== "saving" && (
          <span className="text-small text-muted">Ungespeicherte Änderungen.</span>
        )}
        {saveState === "success" && !isDirty && (
          <span className="text-small" style={{ color: "var(--text-success, green)" }}>
            Erfolgreich gespeichert.
          </span>
        )}
        {saveState === "error" && (
          <span className="text-small text-error">{saveError}</span>
        )}
      </section>
    </main>
  );
}
