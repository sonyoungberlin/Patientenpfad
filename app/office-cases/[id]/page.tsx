import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { buildOfficeCaseM1Path } from "@/lib/office/navigation";

export default async function OfficeCaseContinuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const { id } = await params;

  // S1-Basisrouting: startet immer in M1.
  redirect(buildOfficeCaseM1Path(id));
}
