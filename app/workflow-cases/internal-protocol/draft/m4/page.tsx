import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import PracticeWorkflowM4Client from "./PracticeWorkflowM4Client";

export default async function DraftM4Page() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  if (!canAccessWorkflowCases(account)) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <PracticeWorkflowM4Client />
    </main>
  );
}
