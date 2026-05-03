import { redirect } from "next/navigation";
import { requirePatientCommunicationAccessFromCookies } from "@/lib/authz";

/**
 * Phase 1b: Die Fragebogen-Übersicht wurde nach `/questionnaires` verschoben
 * und ist nun eine Praxis-Funktion. Diese Route bleibt als Redirect-Stub
 * erhalten, damit bestehende Bookmarks / Links weiterhin funktionieren.
 *
 * Es gibt bewusst **keine** administrative Gesamtübersicht: jeder Account
 * sieht ausschließlich seine eigene Fragebogenliste – auch Admins, sofern
 * sie für Patientenkommunikation freigeschaltet sind. Daher wird hier ohne
 * Sonderbehandlung dieselbe Berechtigungs-Helper-Funktion verwendet wie auf
 * `/questionnaires` selbst, und im Erfolgsfall lediglich umgeleitet.
 */
export default async function AdminQuestionnairesRedirectPage() {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) {
    redirect("/");
  }
  redirect("/questionnaires");
}
