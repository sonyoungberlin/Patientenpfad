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
  if (!account.office_cases_enabled && !account.is_admin) {
    redirect("/dashboard");
  }

  const { id } = await params;

  // S1-Basisrouting: startet immer in M1.
  redirect(buildOfficeCaseM1Path(id));
}
