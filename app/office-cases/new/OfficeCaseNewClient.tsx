"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OfficeTopic } from "@/lib/office/checkpointCatalog";

type Props = {
  topics: readonly OfficeTopic[];
};

type CategoryDef = {
  label: string;
  topicIds: readonly string[];
};

const TOPIC_CATEGORIES: CategoryDef[] = [
  {
    label: "Personal & Ärzte",
    topicIds: [
      "arzt-anstellen-nachbesetzung",
      "arzt-austritt-praxisorganisation",
      "mfa-einstellung",
      "mfa-azubi-unter-18-einstellung",
      "mfa-austritt",
      "arbeitszeit-aenderung-praxisorganisation",
      "urlaub-teamkoordination-praxisorganisation",
      "rollen-und-zustaendigkeiten-praxis",
      "fortbildung-schulung-praxisorganisation",
    ],
  },
  {
    label: "KV / Abrechnung / Wirtschaftlichkeit",
    topicIds: [
      "kv-schreiben-abrechnungsrueckfrage",
      "plausibilitaetspruefung-abrechnung",
      "honorarbescheid-pruefung",
      "regress-wirtschaftlichkeitspruefung",
      "antragsmanagement-fristen-zustaendigkeiten",
    ],
  },
  {
    label: "Zulassung / Genehmigungen",
    topicIds: [
      "arztsitz-zulassung-genehmigungen",
      "weiterbildung-fortbildungspunkte-nachweise",
      "fortbildungspunkte-allgemeinmedizin",
      "meldepflichten-zustaendige-stellen",
    ],
  },
  {
    label: "Praxisbetrieb & Organisation",
    topicIds: [
      "praxisschliessung-urlaubsvertretung",
      "oeffnungszeiten-erweiterung-praxis",
      "medizinisches-geraet-anschaffung",
    ],
  },
  {
    label: "Datenschutz & IT",
    topicIds: [
      "datenschutzvorfall",
      "digitale-systemumstellung-praxisorganisation",
    ],
  },
];

type TopicGroup = { label: string; topics: OfficeTopic[] };

function buildCategoryGroups(topics: readonly OfficeTopic[]): TopicGroup[] {
  const topicMap = new Map<string, OfficeTopic>(topics.map((t) => [t.id, t]));
  const assignedIds = new Set<string>();

  const groups: TopicGroup[] = TOPIC_CATEGORIES.map((cat) => {
    const items = cat.topicIds
      .map((id) => topicMap.get(id))
      .filter((t): t is OfficeTopic => t !== undefined);
    for (const item of items) assignedIds.add(item.id);
    return { label: cat.label, topics: items };
  }).filter((g) => g.topics.length > 0);

  const remaining = topics.filter((t) => !assignedIds.has(t.id));
  if (remaining.length > 0) {
    groups.push({ label: "Weitere Themen", topics: remaining });
  }

  return groups;
}

export default function OfficeCaseNewClient({ topics }: Props) {
  const router = useRouter();
  const groups = buildCategoryGroups(topics);

  const [topicId, setTopicId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of groups) initial.add(g.label);
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

  async function handleCreate() {
    if (!topicId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/office-cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: title.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Officefall konnte nicht angelegt werden.");
        return;
      }

      router.push(`/office-cases/${data.office_case.id}/m2`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Anlegen des Officefalls.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "42rem" }}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {groups.map((group) => {
          const isOpen = openGroups.has(group.label);
          const hasSelected = group.topics.some((t) => t.id === topicId);
          return (
            <div
              key={group.label}
              className="card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <button
                type="button"
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
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--primary, #0070f3)",
                        fontWeight: 400,
                      }}
                    >
                      (ausgewählt)
                    </span>
                  )}
                </span>
                <span aria-hidden="true" style={{ fontSize: "0.8rem" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <ul
                  style={{
                    listStyle: "none",
                    padding: "0 1rem 1rem",
                    margin: 0,
                    display: "grid",
                    gap: "0.5rem",
                  }}
                >
                  {group.topics.map((t) => (
                    <li key={t.id}>
                      <label
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="topicId"
                          value={t.id}
                          checked={topicId === t.id}
                          onChange={() => setTopicId(t.id)}
                        />
                        <span style={{ fontWeight: 500 }}>{t.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Titel optional</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" />
        </label>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={pending || !topicId}
          >
            {pending ? "Wird erstellt…" : "Officefall erstellen"}
          </button>
          {error ? <span className="text-muted">{error}</span> : null}
        </div>
      </div>
    </section>
  );
}

