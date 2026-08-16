import { redirect } from "next/navigation";

// Rückwärtskompatibilität: /draft/m2/[step] → neue Gesamtseite /draft/m2
export default async function DraftM2StepPage() {
  redirect("/workflow-cases/internal-protocol/draft/m2");
}
