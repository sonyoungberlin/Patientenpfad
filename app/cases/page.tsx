import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import SignatureSection from "./SignatureSection";
import CaseListClient, { type CaseListItem } from "./CaseListClient";

const MAX_CASES_PER_PAGE = 50;

type CaseListSession = {
  id: string;
  createdAt: Date;
  query_raw: string | null;
  patient_reference: string | null;
  m2_status: string | null;
  preparation_mode: string | null;
  doctor_confirmed: boolean;
};

/**
 * Statusberechnung der Fallübersicht.
 *
 * Der Status spiegelt den fachlichen Workflow wider (MFA / Patient / Arzt)
 * und basiert ausschließlich auf den fachlichen Feldern `doctor_confirmed`,
 * `m2_status` und `preparation_mode` – nicht auf Routing-/Checkpoint-Logik.
 *
 * Mapping (in Auswertungsreihenfolge):
 *   1. doctor_confirmed = true                                   → "Ärztlich bestätigt"
 *   2. m2_status = "waiting_for_patient"                         → "Wartet auf Patientenantwort"
 *   3. m2_status in ("completed", "skipped")                     → "Vorbereitung abgeschlossen"
 *      ODER preparation_mode in ("mfa", "skipped")
 *   4. sonst (M2 noch nicht abgeschlossen, MFA ist dran)         → "In Vorbereitung"
 */
function deriveCaseStatus(session: CaseListSession): string {
  if (session.doctor_confirmed) {
    return "Ärztlich bestätigt";
  }

  if (session.m2_status === "waiting_for_patient") {
    return "Wartet auf Patientenantwort";
  }

  const m2Completed =
    session.m2_status === "completed" || session.m2_status === "skipped";
  const preparationDone =
    session.preparation_mode === "mfa" || session.preparation_mode === "skipped";

  if (m2Completed || preparationDone) {
    return "Vorbereitung abgeschlossen";
  }

  return "In Vorbereitung";
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
      m2_status: true,
      preparation_mode: true,
      doctor_confirmed: true,
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
