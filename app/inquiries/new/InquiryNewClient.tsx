"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { id: string; label: string };

export default function InquiryNewClient({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Bitte mindestens ein Anliegen auswählen.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Anfrage konnte nicht erstellt werden.");
        return;
      }
      router.push(`/inquiries/${data.inquiryId}/m2`);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", maxWidth: "30rem" }}>
      {profiles.map((p) => (
        <label
          key={p.id}
          className="card"
          style={{ display: "flex", gap: "0.75rem", alignItems: "center", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => toggle(p.id)}
          />
          <span style={{ fontWeight: 500 }}>{p.label}</span>
        </label>
      ))}

      {error && (
        <p style={{ color: "var(--destructive)", margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || selected.size === 0}
        style={{ maxWidth: "fit-content" }}
      >
        {submitting ? "Wird erstellt…" : "Weiter →"}
      </button>
    </form>
  );
}
