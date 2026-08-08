"use client";

import { useState } from "react";
import Link from "next/link";
import type { PracticeCheckpoint } from "@/lib/practiceProcesses";

export default function CheckpointsListClient({
  checkpoints,
}: {
  checkpoints: PracticeCheckpoint[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered =
    normalizedQuery.length < 3
      ? checkpoints
      : checkpoints.filter((cp) => cp.title.toLowerCase().includes(normalizedQuery));

  return (
    <>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Checkpoint suchen"
        style={{
          fontFamily: "inherit",
          fontSize: "inherit",
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0.25rem 0.5rem",
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      />

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {filtered.length === 0 && (
          <p className="text-muted" style={{ margin: 0 }}>
            Keine Checkpoints gefunden.
          </p>
        )}
        {filtered.map((cp) => (
          <Link
            key={cp.id}
            href={`/admin/practice-processes/checkpoints/${cp.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <article className="card" style={{ display: "grid", gap: "0.4rem" }}>
              <strong>{cp.title}</strong>
              {cp.description && (
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  {cp.description}
                </p>
              )}
              <span className="text-small text-muted">
                {cp.orientationAnchors?.length ?? 0} Orientierungsanker
              </span>
            </article>
          </Link>
        ))}
      </div>
    </>
  );
}
