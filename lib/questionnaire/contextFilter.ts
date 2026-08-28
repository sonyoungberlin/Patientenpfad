/**
 * Positiver Context-Filter für patientenseitige Abfragen.
 *
 * Alle Prisma-Queries und per-ID-Zugriffe des Patienten-Flows müssen diesen
 * Filter in ihrem AND-Array verwenden. So wird sichergestellt, dass
 * Office-Sessions (context = "office") niemals im Patientenbereich erscheinen –
 * auch dann nicht, wenn künftig weitere Context-Werte hinzukommen.
 *
 * Bewusst positiv formuliert ("context = 'patient'") statt negativem Ausschluss
 * ("context != 'office'"), damit jeder neue Context explizit freigeschaltet
 * werden muss.
 */

import type { Prisma } from "@prisma/client";

export const PATIENT_CONTEXT_FILTER: Prisma.PatientQuestionnaireSessionWhereInput =
  { context: "patient" };

export function isPatientSession(session: { context: string }): boolean {
  return session.context === "patient";
}
