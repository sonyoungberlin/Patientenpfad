import { redirect } from "next/navigation";
import { listOfficeTopics } from "@/lib/office/checkpointCatalog";
import OfficeCaseNewClient from "./OfficeCaseNewClient";
import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";

export default async function OfficeCaseNewPage() {
  const account = await requireOfficeCasesManagementAccessFromCookies();
  if (!account) redirect("/");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Neuen Officefall erstellen</h1>
      </section>
      <OfficeCaseNewClient topics={listOfficeTopics()} />
    </main>
  );
}
