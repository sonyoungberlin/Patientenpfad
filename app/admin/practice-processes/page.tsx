import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listCheckpoints, listCaseProfiles } from "@/lib/practiceProcesses";

export default async function AdminPracticeProcessesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const checkpoints = listCheckpoints();
  const profiles = listCaseProfiles();

  return (
    <main style={{ display: "grid", gap: "2rem", maxWidth: "var(--main-max-width)" }}>
      <section>
        <h1>Praxisprozesse</h1>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Interne Redaktionsbibliothek. Checkpoints und Praxisfälle werden ausschließlich
          redaktionell durch den Administrator gepflegt.
        </p>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginBottom: 0 }}>Checkpoint-Bibliothek</h2>
        <Link
          href="/admin/practice-processes/checkpoints"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <article className="card" style={{ display: "grid", gap: "0.4rem" }}>
            <strong>Alle Checkpoints</strong>
            <span className="text-small text-muted">
              {checkpoints.length} {checkpoints.length === 1 ? "Checkpoint" : "Checkpoints"} in der Bibliothek
            </span>
          </article>
        </Link>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginBottom: 0 }}>Praxisfall-Bibliothek</h2>
        {profiles.map((profile) => (
          <Link
            key={profile.id}
            href={`/admin/practice-processes/${profile.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <article className="card" style={{ display: "grid", gap: "0.4rem" }}>
              <strong>{profile.title}</strong>
              {profile.description && (
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  {profile.description}
                </p>
              )}
              <span className="text-small text-muted">
                {profile.checkpointRefs.length}{" "}
                {profile.checkpointRefs.length === 1 ? "Checkpoint" : "Checkpoints"}
              </span>
            </article>
          </Link>
        ))}

        {profiles.length === 0 && (
          <p className="text-muted">Noch keine Praxisfälle definiert.</p>
        )}
      </section>
    </main>
  );
}

