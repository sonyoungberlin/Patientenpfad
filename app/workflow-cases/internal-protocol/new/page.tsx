import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import InternalProtocolNewClient from "./InternalProtocolNewClient";

export default async function InternalProtocolNewPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Praxisinternes Regelungsdokument</h1>
        <p className="text-muted">
          Internen Prozess erfassen und als Regelungsdokument festhalten.
        </p>
      </section>
      <InternalProtocolNewClient />
    </main>
  );
}
