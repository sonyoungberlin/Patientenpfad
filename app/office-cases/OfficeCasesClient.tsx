"use client";

import Link from "next/link";

export type OfficeCaseListItem = {
  id: string;
  createdAt: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpointCount: number;
};

type Props = {
  items: OfficeCaseListItem[];
};

export default function OfficeCasesClient({ items }: Props) {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <Link href="/office-cases/new">
          <button type="button">Neuen Officefall erstellen</button>
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Noch keine Officefälle vorhanden.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {items.map((item) => (
            <article key={item.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <strong>{item.title ?? item.topicTitle ?? "Officefall"}</strong>
                  <div className="text-small text-muted">{item.topicTitle ?? "Thema unbekannt"}</div>
                </div>
                <a href={`/office-cases/${item.id}/m2`}>Öffnen</a>
              </div>
              <div className="text-small text-muted">
                {item.checkpointCount} Checkpoints · {new Date(item.createdAt).toLocaleDateString("de-DE")}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
