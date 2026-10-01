import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import PracticeWorkflowM4Client from "./PracticeWorkflowM4Client";

export default async function DraftM4Page() {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <PracticeWorkflowM4Client />
    </main>
  );
}
