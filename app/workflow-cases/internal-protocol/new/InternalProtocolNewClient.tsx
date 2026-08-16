"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listCaseProfiles, getCheckpoint } from "@/lib/practiceProcesses";
import type { PracticeCaseProfile } from "@/lib/practiceProcesses";
import { buildInitialPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import {
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";

export default function InternalProtocolNewClient() {
  const router = useRouter();
  const profiles = useMemo(() => listCaseProfiles(), []);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [profiles, searchTerm]);

  function handleStart(profile: PracticeCaseProfile) {
    const snapshot = buildInitialPracticeWorkflowSnapshot(profile, getCheckpoint);
    sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(snapshot));
    sessionStorage.removeItem(DRAFT_SOURCE_ID_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_TITLE_KEY);
    router.push("/workflow-cases/internal-protocol/draft/m2");
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Welchen Praxisfall möchten Sie bearbeiten?</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          Wählen Sie den Ablauf, für den Sie eine Prozessdokumentation erstellen möchten.
        </p>
      </div>

      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Praxisfall suchen …"
        aria-label="Praxisfall suchen"
        style={{ width: "min(100%, 20rem)", maxWidth: "100%" }}
      />

      {filtered.length === 0 ? (
        <p className="text-muted" style={{ margin: 0 }}>
          Keine passenden Praxisfälle gefunden.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {filtered.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="card"
              onClick={() => handleStart(profile)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                whiteSpace: "normal",
              }}
            >
              <div style={{ fontWeight: 600 }}>{profile.title}</div>
              {profile.description && (
                <div className="text-small text-muted" style={{ marginTop: "0.2rem" }}>
                  {profile.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

