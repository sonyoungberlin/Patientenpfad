import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import DraftM3Client from "./DraftM3Client";

export default async function DraftM3Page() {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <DraftM3Client />
    </main>
  );
}
