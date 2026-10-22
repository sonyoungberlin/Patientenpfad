"use client";

export type OfficeCaseListItem = {
  id: string;
  createdAt: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpointCount: number;
  openCount: number;
  overdueTasks: string[];
  dueSoonTasks: string[];
};

type Props = {
  items: OfficeCaseListItem[];
};

export default function OfficeCasesClient({ items }: Props) {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
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
                {item.checkpointCount} Prüfpunkte · {item.openCount} offen · {new Date(item.createdAt).toLocaleDateString("de-DE")}
              </div>
              {item.overdueTasks.length > 0 ? (
                <div className="text-small" style={{ color: "#b42318" }}>
                  <strong>Überfällig:</strong> {item.overdueTasks.join("; ")}
                </div>
              ) : null}
              {item.dueSoonTasks.length > 0 ? (
                <div className="text-small" style={{ color: "#a15c00" }}>
                  <strong>Innerhalb von 30 Tagen fällig:</strong> {item.dueSoonTasks.join("; ")}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
