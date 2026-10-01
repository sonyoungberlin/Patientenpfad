import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import DraftM2Client from "./DraftM2Client";

export default async function DraftM2Page() {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <DraftM2Client />
    </main>
  );
}
