import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import DraftM2Client from "./DraftM2Client";

export default async function DraftM2Page() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  if (!canAccessWorkflowCases(account)) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <DraftM2Client />
    </main>
  );
}
