import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { M3ChecklistClient } from "./M3ChecklistClient";
import { M2LinkGeneratorClient } from "./M2LinkGeneratorClient";

export default async function M3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const { id } = await params;
  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: {
      active_checkpoints: true,
      ctx_prefill: true,
      owner_account_id: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  const checkpoints = Array.isArray(session.active_checkpoints)
    ? (session.active_checkpoints as ActiveCheckpoint[])
    : [];

  const prefill =
    session.ctx_prefill &&
    typeof session.ctx_prefill === "object" &&
    !Array.isArray(session.ctx_prefill)
      ? (session.ctx_prefill as M2PrefillData)
      : {};

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>Ärztliche Checkliste</h1>
      <M2LinkGeneratorClient caseId={id} />
      <M3ChecklistClient caseId={id} initialCheckpoints={checkpoints} prefill={prefill} />
    </main>
  );
}
