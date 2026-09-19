import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import {
  listPracticeDocumentationBlocks,
  parsePracticeDocumentationBlockDefinition,
} from "@/lib/practice/documentationBlocks";
import DocumentationLibraryClient from "./DocumentationLibraryClient";

export default async function PracticeDocumentationLibraryPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed || !account.current_practice) notFound();

  const blocks = await listPracticeDocumentationBlocks(
    account.current_practice.id,
  );
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
        }))}
      />
    </main>
  );
}