import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import { listPracticeDocumentationTemplates } from "@/lib/practice/documentationTemplates";
import { listPracticeDocumentationBlocks } from "@/lib/practice/documentationBlocks";
import DocumentationTemplatesClient from "./DocumentationTemplatesClient";

export default async function PracticeDocumentationTemplatesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  const allowed = await requirePracticeRoleFromCookies([PracticeRole.OWNER, PracticeRole.ADMIN]);
  if (!allowed || !account.current_practice) notFound();
  const [templates, blocks] = await Promise.all([
    listPracticeDocumentationTemplates(account.current_practice.id),
    listPracticeDocumentationBlocks(account.current_practice.id, true),
  ]);

  return (
    <main style={{ display: "grid", gap: "1.5rem", maxWidth: "64rem" }}>
      <header>
        <h1>Dokumentationsvorlagen</h1>
        <p className="text-muted">Zusammenstellungen vorhandener Dokumentationsbausteine.</p>
      </header>
      <DocumentationTemplatesClient
        initialTemplates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          isActive: template.is_active,
          blockLayout: template.block_layout,
          outputFormat: template.output_format,
          documentTitleOption: template.document_title_option,
        }))}
        availableBlocks={blocks.map((block) => ({
          id: block.id,
          title: block.title,
        }))}
      />
    </main>
  );
}