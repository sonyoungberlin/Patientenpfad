import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCaseM2Path, buildCaseM3Path } from "@/lib/flow/caseNavigation";
import { getSessionAccountFromCookies } from "@/lib/auth";

function hasPrefillData(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).length > 0;
}

export default async function CaseContinuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    return redirect("/");
  }

  const { id } = await params;
  const m2Path = buildCaseM2Path(id);
  const m3Path = buildCaseM3Path(id);

  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      ctx_prefill: true,
      stage_status: true,
      active_checkpoints: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    return redirect("/");
  }

  if (!hasPrefillData(session.ctx_prefill)) {
    return redirect(m2Path);
  }

  return redirect(m3Path);
}
