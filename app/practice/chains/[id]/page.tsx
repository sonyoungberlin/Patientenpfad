import { notFound, redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { listPublishedCatalogEntries } from "@/lib/practiceCatalog/query";
import { getPracticeChain } from "@/lib/practiceChains/service";
import ChainEditor from "../ChainEditor";

export default async function PracticeChainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account || !account.current_practice) redirect("/dashboard");
  const { id } = await params;
  const [chain, entries] = await Promise.all([
    getPracticeChain(id, account.current_practice.id),
    listPublishedCatalogEntries(account.current_practice.id),
  ]);
  if (!chain) notFound();
  return <ChainEditor chain={chain} entries={entries} />;
}