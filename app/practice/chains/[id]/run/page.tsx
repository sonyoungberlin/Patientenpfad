import { notFound, redirect } from "next/navigation";
import { requirePracticeChainRunnerAccessFromCookies } from "@/lib/authz";
import { getReadyPracticeChainRunner } from "@/lib/practiceChains/service";
import Runner from "../../Runner";

export default async function PracticeChainRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requirePracticeChainRunnerAccessFromCookies();
  if (!account?.current_practice) redirect("/dashboard");
  const { id } = await params;
  const runner = await getReadyPracticeChainRunner(id, account.current_practice.id);
  if (!runner) notFound();
  return <Runner runner={runner} />;
}