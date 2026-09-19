import { redirect } from "next/navigation";
import { requireInternalDocumentationAccessFromCookies } from "@/lib/authz";
import {
  listPracticeDocumentationBlocks,
  toPracticeDocumentationBlockSummary,
} from "@/lib/practice/documentationBlocks";
import { resolveActivePracticeDocumentationTemplates } from "@/lib/practice/documentationTemplates";
import InternalDocumentationLauncher from "./InternalDocumentationLauncher";

export default async function InternalDocumentationStartPage() {
  const account = await requireInternalDocumentationAccessFromCookies();
  if (!account) redirect("/");
  const practiceId = account.current_practice?.id;
  if (!practiceId) redirect("/");
  const [practiceTemplates, blocks] = await Promise.all([
    resolveActivePracticeDocumentationTemplates(practiceId),
    listPracticeDocumentationBlocks(practiceId, true),
  ]);

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Interne Dokumentation</h1>
        <p className="text-muted">Dokumentation vorbereiten und starten.</p>
      </section>
      <InternalDocumentationLauncher
        practiceTemplates={practiceTemplates}
        availableBlocks={blocks.map(toPracticeDocumentationBlockSummary)}
      />
    </main>
  );
}