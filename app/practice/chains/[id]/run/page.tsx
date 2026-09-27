import { notFound, redirect } from "next/navigation";
import { requirePracticeChainRunnerAccessFromCookies } from "@/lib/authz";
import { getReadyPracticeChainRunner } from "@/lib/practiceChains/service";
import Runner from "../../Runner";

export default async function PracticeChainRunnerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ startStepId?: string }> }) {
  const account = await requirePracticeChainRunnerAccessFromCookies();
  if (!account?.current_practice) redirect("/dashboard");
  const { id } = await params;
  const { startStepId } = await searchParams;
  const runner = await getReadyPracticeChainRunner(id, account.current_practice.id, startStepId);
  if (!runner) notFound();
  return <Runner runner={runner} />;
}