import { redirect } from "next/navigation";
import { buildOfficeCaseM1Path } from "@/lib/office/navigation";
import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";

export default async function OfficeCaseContinuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireOfficeCasesManagementAccessFromCookies();
  if (!account) redirect("/");

  const { id } = await params;

  // S1-Basisrouting: startet immer in M1.
  redirect(buildOfficeCaseM1Path(id));
}
