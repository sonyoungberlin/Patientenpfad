"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowTopic } from "@/lib/workflow/processCatalog";
import type { WorkflowRole } from "@/lib/workflow/types";

type Props = {
  topics: readonly WorkflowTopic[];
};

const ROLE_OPTIONS: { value: WorkflowRole; label: string }[] = [
  { value: "MFA", label: "MFA" },
  { value: "ARZT", label: "Arzt / Ärztin" },
];

export default function WorkflowNewClient({ topics }: Props) {
  const router = useRouter();
  const [topicId, setTopicId] = useState<string>(topics[0]?.id ?? "");
  const [role, setRole] = useState<WorkflowRole | "">("");
  const [title, setTitle] = useState("");

  const canSubmit = topicId !== "" && role !== "";

  function handleCreate() {
    if (!canSubmit) return;
    const params = new URLSearchParams({ topicId, role });
    if (title.trim()) params.set("title", title.trim());
    router.push(`/workflow-cases/draft?${params.toString()}`);
  }

  return (
    <section style={{ display: "grid", gap: "1.5rem", maxWidth: "480px" }}>
      {/* Musterprozess */}
      <div>
        <h2 style={{ marginBottom: "0.5rem" }}>Musterprozess</h2>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {topics.map((topic) => (
            <label
              key={topic.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                border: topicId === topic.id ? "2px solid #0070f3" : "1px solid #ccc",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="topicId"
                value={topic.id}
                checked={topicId === topic.id}
                onChange={() => setTopicId(topic.id)}
              />
              {topic.title}
            </label>
          ))}
        </div>
      </div>

      {/* Rolle */}
      <div>
        <h2 style={{ marginBottom: "0.5rem" }}>Rolle</h2>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                border: role === opt.value ? "2px solid #0070f3" : "1px solid #ccc",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="role"
                value={opt.value}
                checked={role === opt.value}
                onChange={() => setRole(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Optionaler Titel */}
      <div>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Bezeichnung (optional)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Patientenkürzel, Datum"
            maxLength={120}
            style={{ padding: "0.4rem", border: "1px solid #ccc", borderRadius: "0.25rem" }}
          />
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
        >
          Sitzung starten
        </button>
      </div>
    </section>
  );
}
