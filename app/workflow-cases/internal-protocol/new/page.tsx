import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { listCaseProfilesFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import InternalProtocolNewClient from "./InternalProtocolNewClient";

export default async function InternalProtocolNewPage() {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) {
    redirect("/dashboard");
  }

  const profiles = await listCaseProfilesFromLib();

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Praxisfälle verwalten</h1>
        <p className="text-muted">
          Praxisfall auswählen, Praxisstandards konfigurieren und zur Veröffentlichung vorbereiten.
        </p>
      </section>
      <InternalProtocolNewClient profiles={profiles} />
    </main>
  );
}
