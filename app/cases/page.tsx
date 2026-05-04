import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import CaseListClient, { type CaseListItem } from "./CaseListClient";

const MAX_CASES_PER_PAGE = 50;

type CaseListSession = {
  id: string;
  createdAt: Date;
  query_raw: string | null;
  patient_reference: string | null;
  doctor_confirmed: boolean;
  clinical_status: string | null;
  ctx_prefill: unknown;
};

/**
 * Prüft, ob `ctx_prefill` tatsächlich gespeicherte Antworten enthält.
 *
 * Beim Fallanlage-Flow wird `ctx_prefill` initial als leeres Array (`[]`)
 * gesetzt; erst beim Speichern (MFA-Vorbereitung, Patientengespräch oder
 * zurückgekommener Patientenfragebogen) wird ein Objekt mit Block-Antworten
 * abgelegt. Nur in diesem Fall gilt die Vorbereitung als abgeschlossen.
 */
function hasSavedPrefill(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).length > 0;
}

/**
 * Statusberechnung der Fallübersicht.
 *
 * Der sichtbare Status leitet sich ausschließlich aus dem ärztlichen
 * Workflow-Status (`clinical_status` / `doctor_confirmed`) und dem tatsächlich
 * gespeicherten Prefill (`ctx_prefill`) ab. Bloßes Öffnen von M2/M3, das
 * Erzeugen eines Patientenlinks oder das Umschalten des Vorbereitungswegs
 * verändert den Status bewusst nicht (`m2_status` / `preparation_mode` werden
 * dafür nicht mehr ausgewertet).
 *
 * Mapping (in Auswertungsreihenfolge):
 *   1. doctor_confirmed = true ODER clinical_status = "confirmed" → "Ärztlich bestätigt"
 *   2. clinical_status = "prepared"                               → "Ärztlich vorbereitet"
 *   3. ctx_prefill enthält gespeicherte Antworten                 → "Vorbereitung abgeschlossen"
 *   4. sonst                                                      → "Fall geöffnet"
 */
function deriveCaseStatus(session: CaseListSession): string {
  if (session.doctor_confirmed || session.clinical_status === "confirmed") {
    return "Ärztlich bestätigt";
  }

  if (session.clinical_status === "prepared") {
    return "Ärztlich vorbereitet";
  }

  if (hasSavedPrefill(session.ctx_prefill)) {
    return "Vorbereitung abgeschlossen";
  }

  return "Fall geöffnet";
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
      doctor_confirmed: true,
      clinical_status: true,
      ctx_prefill: true,
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
      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <CaseListClient cases={cases} />
      </div>
    </main>
  );
}
