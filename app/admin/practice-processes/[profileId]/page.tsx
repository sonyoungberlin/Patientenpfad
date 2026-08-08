import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import {
  getCaseProfile,
  getCheckpoint,
  type PracticeCheckpoint,
  type PracticeCheckpointRef,
} from "@/lib/practiceProcesses";

type CheckpointGroup = {
  group: string | undefined;
  checkpoints: PracticeCheckpoint[];
};

function buildGroups(refs: readonly PracticeCheckpointRef[]): CheckpointGroup[] {
  const groups: CheckpointGroup[] = [];
  for (const ref of refs) {
    const cp = getCheckpoint(ref.checkpointId);
    if (!cp) continue;
    const last = groups[groups.length - 1];
    if (last && last.group === ref.group) {
      last.checkpoints.push(cp);
    } else {
      groups.push({ group: ref.group, checkpoints: [cp] });
    }
  }
  return groups;
}

export default async function AdminPracticeProcessDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { profileId } = await params;
  const profile = getCaseProfile(profileId);
  if (!profile) {
    notFound();
  }

  const groups = buildGroups(profile.checkpointRefs);

  return (
    <main style={{ display: "grid", gap: "1.5rem", maxWidth: "var(--main-max-width)" }}>
      <section>
        <Link href="/admin/practice-processes" className="text-small text-muted">
          ← Praxisprozesse
        </Link>
        <h1 style={{ marginBottom: 0 }}>{profile.title}</h1>
        {profile.description && (
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            {profile.description}
          </p>
        )}
        <p className="text-small text-muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          Arbeiten Sie die folgenden Checkpoints gemeinsam durch. Jeder Checkpoint ist eine
          Denkhilfe — die Orientierungsanker helfen, ihn im Team zu beurteilen.
        </p>
      </section>

      {groups.map((group, gi) => (
        <section key={gi} style={{ display: "grid", gap: "0.75rem" }}>
          {group.group && <h2 style={{ marginBottom: 0 }}>{group.group}</h2>}
          {group.checkpoints.map((cp) => (
            <article key={cp.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
              <strong>{cp.title}</strong>
              {cp.description && (
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  {cp.description}
                </p>
              )}
              {cp.orientationAnchors && cp.orientationAnchors.length > 0 && (
                <details style={{ marginTop: "0.25rem" }}>
                  <summary className="text-small">
                    Orientierungsanker ({cp.orientationAnchors.length})
                  </summary>
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                    {cp.orientationAnchors.map((anchor) => (
                      <li key={anchor.id} className="text-small" style={{ marginBottom: "0.25rem" }}>
                        {anchor.text}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </section>
      ))}

      <aside
        className="text-small text-muted"
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "1rem",
          marginTop: "0.5rem",
        }}
      >
        Fehlt für diesen Praxisfall ein Checkpoint? Prüfe zunächst, ob er bereits in der
        Bibliothek existiert. Falls ja, wird er in diesen Praxisfall aufgenommen.
        Falls nein, wird die Bibliothek anschließend redaktionell erweitert.
      </aside>
    </main>
  );
}
