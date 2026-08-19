import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { listCaseProfilesFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import InternalProtocolNewClient from "./InternalProtocolNewClient";

export default async function InternalProtocolNewPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const profiles = await listCaseProfilesFromLib();

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Neue Sitzung</h1>
        <p className="text-muted">
          Arbeitsprozess auswählen und Sitzung starten.
        </p>
      </section>
      <InternalProtocolNewClient profiles={profiles} />
    </main>
  );
}
