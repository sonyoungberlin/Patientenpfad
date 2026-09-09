import { redirect } from "next/navigation";
import { requireInternalDocumentationAccessFromCookies } from "@/lib/authz";
import InternalDocumentationLauncher from "./InternalDocumentationLauncher";

export default async function InternalDocumentationStartPage() {
  const account = await requireInternalDocumentationAccessFromCookies();
  if (!account) redirect("/");

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Interne Dokumentation</h1>
        <p className="text-muted">Abschnitte auswählen und Dokumentation starten.</p>
      </section>
      <InternalDocumentationLauncher />
    </main>
  );
}