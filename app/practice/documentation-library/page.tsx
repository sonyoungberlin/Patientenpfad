import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import {
  listPracticeDocumentationBlocks,
  parsePracticeDocumentationBlockDefinition,
} from "@/lib/practice/documentationBlocks";
import { listPracticeDocumentationTemplates } from "@/lib/practice/documentationTemplates";
import DocumentationLibraryClient from "./DocumentationLibraryClient";

export default async function PracticeDocumentationLibraryPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed || !account.current_practice) notFound();

  const [blocks, templates] = await Promise.all([
    listPracticeDocumentationBlocks(account.current_practice.id),
    listPracticeDocumentationTemplates(account.current_practice.id),
  ]);
  const activeTemplates = templates.filter((template) => template.is_active);
  const templateUsages = new Map(
    blocks.map((block) => [
      block.id,
      activeTemplates
        .filter((template) => Array.isArray(template.block_layout) && template.block_layout.some((placement) => (
          placement && typeof placement === "object" && !Array.isArray(placement) && "blockId" in placement && placement.blockId === block.id
        )))
        .map((template) => ({ id: template.id, name: template.name })),
    ]),
  );
  const templateRows: Array<{
    id: string;
    name: string;
    placements: Array<{ blockId: string; section: 1 | 2 | 3; order: number }>;
  }> = activeTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    placements: (Array.isArray(template.block_layout) ? template.block_layout : [])
      .flatMap((placement) => {
        if (!placement || typeof placement !== "object" || Array.isArray(placement)) return [];
        const candidate = placement as { blockId?: unknown; section?: unknown; order?: unknown };
        const section = candidate.section;
        return typeof candidate.blockId === "string" &&
          (section === 1 || section === 2 || section === 3) &&
          typeof candidate.order === "number"
          ? [{ blockId: candidate.blockId, section: section as 1 | 2 | 3, order: candidate.order }]
          : [];
      })
      .sort((left, right) => left.section - right.section || left.order - right.order),
  }));
  return (
    <main style={{ display: "grid", gap: "1rem", maxWidth: "48rem" }}>
      <header>
        <h1>Dokumentationsbibliothek</h1>
        <p className="text-muted">
          Eigene wiederverwendbare Inhalte für die interne Dokumentation der Praxis.
        </p>
      </header>
      <DocumentationLibraryClient
        initialBlocks={blocks.map((block) => ({
          id: block.id,
          title: block.title,
          definition: parsePracticeDocumentationBlockDefinition(block.definition),
          isActive: block.is_active,
          usedInTemplates: templateUsages.get(block.id) ?? [],
        }))}
        initialTemplates={templateRows}
      />
    </main>
  );
}