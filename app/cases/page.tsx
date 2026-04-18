import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCaseM2Path } from "@/lib/flow/caseNavigation";
import { getSessionAccountFromCookies } from "@/lib/auth";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";

type CaseListSession = {
  id: string;
  createdAt: Date;
  query_raw: string | null;
  patient_reference: string | null;
  stage_status: "INTAKE" | "PREFILL" | "REVIEW" | "READY" | "CLOSED";
  active_checkpoints: unknown;
  ctx_prefill: unknown;
};

function isCheckpointStatus(value: unknown): value is CheckpointStatus {
  return value === "OK" || value === "TO_DO" || value === "ZURÜCKSTELLEN";
}

function getCheckpointStatuses(value: unknown): CheckpointStatus[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const status = (item as { status?: unknown }).status;
      return isCheckpointStatus(status) ? status : null;
    })
    .filter((status): status is CheckpointStatus => status !== null);
}

function hasPrefillData(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

function deriveCaseStatus(session: CaseListSession): string {
  if (session.stage_status === "CLOSED") {
    return "Abgeschlossen";
  }

  const checkpointStatuses = getCheckpointStatuses(session.active_checkpoints);
  const hasOpenTodos = checkpointStatuses.some((status) => status === "TO_DO");
  const hasM3Started = checkpointStatuses.some(
    (status) => status === "OK" || status === "ZURÜCKSTELLEN",
  );

  if (hasM3Started && !hasOpenTodos) {
    return "Abgeschlossen";
  }

  if (hasM3Started) {
    return "In Bearbeitung";
  }

  if (hasPrefillData(session.ctx_prefill) || session.stage_status === "PREFILL") {
    return "M3 offen";
  }

  return "M2 offen";
}

function deriveCaseTitle(session: CaseListSession): string {
  if (session.query_raw && session.query_raw.trim() !== "") {
    return session.query_raw.trim();
  }
  return `Fall vom ${session.createdAt.toLocaleDateString("de-DE")}`;
}

export default async function CasesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const sessions = await prisma.caseSession.findMany({
    where: { owner_account_id: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      query_raw: true,
      patient_reference: true,
      stage_status: true,
      active_checkpoints: true,
      ctx_prefill: true,
    },
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "820px" }}>
      <h1>Fälle</h1>
      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        {sessions.length === 0 ? (
          <p style={{ color: "#777" }}>Keine Fälle vorhanden.</p>
        ) : (
          sessions.map((session) => (
            <article
              key={session.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "0.9rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{deriveCaseTitle(session)}</div>
                {session.patient_reference ? (
                  <div style={{ marginTop: "0.25rem", color: "#666", fontSize: "0.9rem" }}>
                    Patienten-Referenz: {session.patient_reference}
                  </div>
                ) : null}
                <div style={{ marginTop: "0.3rem", color: "#111" }}>
                  Status: {deriveCaseStatus(session)}
                </div>
              </div>
              <a
                href={buildCaseM2Path(session.id)}
                style={{
                  whiteSpace: "nowrap",
                  border: "1px solid #bbb",
                  borderRadius: "6px",
                  padding: "0.45rem 0.75rem",
                  textDecoration: "none",
                  color: "#111",
                  background: "#fff",
                }}
              >
                Weiterbearbeiten
              </a>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
