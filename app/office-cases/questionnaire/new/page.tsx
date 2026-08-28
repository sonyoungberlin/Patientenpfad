import { redirect } from "next/navigation";
import { requireOfficeQuestionnaireAccessFromCookies } from "@/lib/authz";
import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "@/lib/questionnaire/officeBlockCatalog";
import OfficeQuestionnaireCreateClient from "@/components/office/OfficeQuestionnaireCreateClient";

export default async function OfficeQuestionnaireNewPage() {
  const account = await requireOfficeQuestionnaireAccessFromCookies();
  if (!account) redirect("/");

  const blocks = OFFICE_BLOCK_IDS_SORTED.map((id) => ({
    id,
    label: OFFICE_BLOCK_CATALOG[id]?.label ?? id,
  }));

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Neuen Bewerber-Fragebogen erstellen</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Wählen Sie die Abschnitte aus und geben Sie eine interne Referenz an.
        </p>
      </section>
      <OfficeQuestionnaireCreateClient blocks={blocks} />
    </main>
  );
}
