import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import DraftSaveClient from "./DraftSaveClient";

export default async function DraftSavePage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  if (!canAccessWorkflowCases(account)) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Arbeitsprozess speichern</h1>
        <p className="text-muted">
          Vergeben Sie einen Titel und speichern Sie den Arbeitsprozess.
        </p>
      </section>
      <DraftSaveClient />
    </main>
  );
}
