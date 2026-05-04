"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { id: string; label: string };
type ProfileGroup = { label: string; profiles: Profile[] };

export default function InquiryNewClient({ groups }: { groups: ProfileGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gruppen, die ein ausgewähltes Profil enthalten, werden beim ersten Render geöffnet
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Alle Gruppen standardmäßig geöffnet
    for (const g of groups) {
      initial.add(g.label);
    }
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // Wenn ein Profil ausgewählt wird, dessen Gruppe zugeklappt ist → Gruppe öffnen
  function openGroupsWithSelectedProfiles(nextSelected: Set<string>) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      for (const g of groups) {
        if (g.profiles.some((p) => nextSelected.has(p.id))) {
          next.add(g.label);
        }
      }
      return next;
    });
  }

  function handleToggleProfile(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      openGroupsWithSelectedProfiles(next);
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
      {groups.map((group) => {
        const isOpen = openGroups.has(group.label);
        const hasSelected = group.profiles.some((p) => selected.has(p.id));
        return (
          <div
            key={group.label}
            className="card"
            data-group={group.label}
            style={{ padding: 0, overflow: "hidden" }}
          >
            <button
              type="button"
              data-group-toggle={group.label}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.label)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                textAlign: "left",
              }}
            >
              <span>
                {group.label}
                {hasSelected && !isOpen && (
                  <span
                    data-group-selection-indicator={group.label}
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--primary, #0070f3)",
                      fontWeight: 400,
                    }}
                  >
                    (Auswahl aktiv)
                  </span>
                )}
              </span>
              <span aria-hidden="true" style={{ fontSize: "0.8rem" }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <ul
                style={{ listStyle: "none", padding: "0 1rem 1rem", margin: 0, display: "grid", gap: "0.5rem" }}
              >
                {group.profiles.map((p) => (
                  <li key={p.id}>
                    <label
                      style={{ display: "flex", gap: "0.75rem", alignItems: "center", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => handleToggleProfile(p.id)}
                      />
                      <span style={{ fontWeight: 500 }}>{p.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {error && (
        <p style={{ color: "var(--destructive)", margin: 0 }}>{error}</p>
      )}

      {/*
        Vorlagen werden bewusst NICHT mehr in M1 gespeichert. Eine Vorlage
        bildet den fertig vorbereiteten Arbeitsstand bis M3 ab und wird
        ausschließlich in der M3-Arbeitsansicht über den Button
        „Aktuellen Stand als Vorlage speichern" erzeugt
        (POST /api/inquiries/[id]/save-as-template).
      */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={submitting || selected.size === 0}
          style={{ maxWidth: "fit-content" }}
        >
          {submitting ? "Wird erstellt…" : "Weiter →"}
        </button>
      </div>
    </form>
  );
}
