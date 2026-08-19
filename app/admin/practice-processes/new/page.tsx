import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getCaseProfileFromLib, listCaseProfilesFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import { listCheckpointsFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import CaseProfileDetailClient from "../[profileId]/CaseProfileDetailClient";

export default async function AdminNewCaseProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { copyFrom } = await searchParams;
  const [source, allCheckpoints, allProfiles] = await Promise.all([
    copyFrom ? getCaseProfileFromLib(copyFrom) : Promise.resolve(null),
    listCheckpointsFromLib(),
    listCaseProfilesFromLib(),
  ]);

  const initialDraft = source
    ? {
        title: `${source.title} (Kopie)`,
        description: source.description ?? "",
        checkpointRefs: source.checkpointRefs.map((r) => ({
          checkpointId: r.checkpointId,
          group: r.group ?? "",
        })),
      }
    : { title: "", description: "", checkpointRefs: [] };

  return (
    <CaseProfileDetailClient
      initialDraft={initialDraft}
      availableCheckpoints={allCheckpoints.map((cp) => ({ id: cp.id, title: cp.title }))}
      existingIds={allProfiles.map((p) => p.id)}
      existingTitles={allProfiles.map((p) => p.title)}
    />
  );
}
