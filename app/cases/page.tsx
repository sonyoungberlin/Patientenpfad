import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import SignatureSection from "./SignatureSection";
import CaseListClient, { type CaseListItem } from "./CaseListClient";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";
const MAX_CASES_PER_PAGE = 50;

type CaseListSession = {
  id: string;
  createdAt: Date;
  query_raw: string | null;
  patient_reference: string | null;
  stage_status: "INTAKE" | "PREFILL" | "REVIEW" | "READY" | "CLOSED";
  active_checkpoints: unknown;
  ctx_prefill: unknown;
  m2_status: string | null;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  }
  return false;
}

function deriveCaseStatus(session: CaseListSession): string {
  if (session.stage_status === "CLOSED") {
    return "Abgeschlossen";
  }

  if (session.m2_status === "waiting_for_patient") {
    return "Wartet auf Patientenantworten";
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
    take: MAX_CASES_PER_PAGE,
    select: {
      id: true,
      createdAt: true,
      query_raw: true,
      patient_reference: true,
      stage_status: true,
      active_checkpoints: true,
      ctx_prefill: true,
      m2_status: true,
    },
  });

  const cases: CaseListItem[] = sessions.map((session) => ({
    id: session.id,
    title: deriveCaseTitle(session),
    patient_reference: session.patient_reference,
    statusLabel: deriveCaseStatus(session),
  }));

  return (
    <main>
      <h1>Fälle</h1>
      <SignatureSection />
      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <CaseListClient cases={cases} />
      </div>
    </main>
  );
}
