import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listOfficeTopics } from "@/lib/office/checkpointCatalog";
import OfficeCaseNewClient from "./OfficeCaseNewClient";

export default async function OfficeCaseNewPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!account.office_cases_enabled && !account.is_admin) {
    redirect("/dashboard");
  }

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Neuen Officefall erstellen</h1>
      </section>
      <OfficeCaseNewClient topics={listOfficeTopics()} />
    </main>
  );
}
