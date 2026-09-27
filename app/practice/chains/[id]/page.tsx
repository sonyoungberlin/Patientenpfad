import { notFound, redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { listPublishedCatalogEntries } from "@/lib/practiceCatalog/query";
import { discoverPracticeChainConnections, getPracticeChain, listPracticeChainApprovals } from "@/lib/practiceChains/service";
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
  const [discovery, approvals] = await Promise.all([
    discoverPracticeChainConnections(account.current_practice.id, chain.id),
    listPracticeChainApprovals(account.current_practice.id, chain.id),
  ]);
  return <ChainEditor chain={chain} entries={entries} discovery={discovery} approvals={approvals} />;
}