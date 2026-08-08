"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { PracticeCheckpointAnchor } from "@/lib/practiceProcesses";
import { toLibraryId } from "@/lib/practiceProcesses";

type CheckpointDraft = {
  title: string;
  description: string;
  orientationHint: string;
  orientationAnchors: PracticeCheckpointAnchor[];
};

// finds the lowest free anchor slot id within the current checkpoint
function nextAnchorId(existing: string[]): string {
  const taken = new Set(existing);
  let n = 1;
  while (taken.has(`a${n}`)) n++;
  return `a${n}`;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

const textareaStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "inherit",
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--background)",
  padding: "0.25rem 0.5rem",
  resize: "vertical",
};

export default function CheckpointDetailClient({
  initialDraft,
  fixedId,
  existingIds = [],
  existingTitles = [],
}: {
  initialDraft: CheckpointDraft;
  fixedId?: string;
  existingIds?: string[];
  existingTitles?: string[];
}) {
  const [draft, setDraft] = useState(initialDraft);
  const pendingFocusIndex = useRef<number | null>(null);

  const displayId = fixedId ?? toLibraryId(draft.title);
  const isNew = fixedId === undefined;
  const titleFilled = draft.title.trim() !== "";
  const isDuplicateId = isNew && titleFilled && existingIds.includes(displayId);
  const isDuplicateTitle =
    isNew &&
    titleFilled &&
    existingTitles.some((t) => t.trim().toLowerCase() === draft.title.trim().toLowerCase());

  return (
    <main style={{ display: "grid", gap: "1.5rem", maxWidth: "var(--main-max-width)" }}>
      <section style={{ display: "grid", gap: "0.5rem" }}>
        <Link href="/admin/practice-processes/checkpoints" className="text-small text-muted">
          ← Checkpoint-Bibliothek
        </Link>
        {fixedId && (
          <Link
            href={`/admin/practice-processes/checkpoints/new?copyFrom=${fixedId}`}
            className="text-small text-muted"
            style={{ justifySelf: "end" }}
          >
            Duplizieren
          </Link>
        )}

        {/* Titel */}
        <input
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            fontFamily: "inherit",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.25rem 0.5rem",
            width: "100%",
            background: "var(--background)",
            color: "var(--foreground)",
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

        {/* Orientierungshinweis — kein fachlicher Definitionsbestandteil */}
        <div style={{ marginTop: "0.5rem" }}>
          <span className="text-small text-muted">Orientierungshinweis</span>
          <textarea
            className="text-muted"
            value={draft.orientationHint}
            onChange={(e) => setDraft((prev) => ({ ...prev, orientationHint: e.target.value }))}
            rows={2}
            style={{ ...textareaStyle, marginTop: "0.25rem" }}
          />
        </div>

        {/* Beschreibung */}
        <div>
          <span className="text-small text-muted">Beschreibung</span>
          <textarea
            className="text-muted"
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            style={{ ...textareaStyle, marginTop: "0.25rem" }}
          />
        </div>
      </section>

      {/* Orientierungsfragen (Feld: orientationAnchors) */}
      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginBottom: 0 }}>
          Orientierungsfragen ({draft.orientationAnchors.length})
        </h2>
        {draft.orientationAnchors.map((anchor, index) => (
          // key includes index so defaultValue resets after any array mutation
          <div key={`${anchor.id}-${index}`} style={{ display: "grid", gap: "0.2rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="text"
                inputMode="numeric"
                defaultValue={index + 1}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  const max = draft.orientationAnchors.length;
                  if (isNaN(parsed) || parsed < 1 || parsed > max || parsed === index + 1) return;
                  setDraft((prev) => ({
                    ...prev,
                    orientationAnchors: moveItem(prev.orientationAnchors, index, parsed - 1),
                  }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                style={{
                  width: "2.5rem",
                  textAlign: "center",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.25rem 0.25rem",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  flexShrink: 0,
                }}
              />
              <input
                value={anchor.text}
                ref={(el) => {
                  if (el && pendingFocusIndex.current === index) {
                    el.focus();
                    pendingFocusIndex.current = null;
                  }
                }}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    orientationAnchors: prev.orientationAnchors.map((a, i) =>
                      i === index ? { ...a, text: e.target.value } : a
                    ),
                  }))
                }
                style={{
                  flex: 1,
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.25rem 0.5rem",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                className="text-small text-muted"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    orientationAnchors: prev.orientationAnchors.filter((_, i) => i !== index),
                  }))
                }
                style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}
              >
                Löschen
              </button>
            </div>
            <span className="text-small text-muted">ID: {anchor.id}</span>
          </div>
        ))}
        {draft.orientationAnchors.length === 0 && (
          <p className="text-small text-error" style={{ margin: 0 }}>
            Mindestens eine Orientierungsfrage ist erforderlich.
          </p>
        )}
        <button
          type="button"
          className="text-small"
          onClick={() => {
            pendingFocusIndex.current = draft.orientationAnchors.length;
            setDraft((prev) => ({
              ...prev,
              orientationAnchors: [
                ...prev.orientationAnchors,
                { id: nextAnchorId(prev.orientationAnchors.map((a) => a.id)), text: "" },
              ],
            }));
          }}
        >
          + Orientierungsfrage
        </button>
      </section>
    </main>
  );
}
