import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import DraftM3Client from "./DraftM3Client";

export default async function DraftM3Page() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  if (!canAccessWorkflowCases(account)) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <DraftM3Client />
    </main>
  );
}
