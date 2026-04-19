import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { M3ChecklistClient } from "./M3ChecklistClient";

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
      m2_status: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  // Signatur accountbezogen laden (für „Nachricht kopieren"-Button)
  let messageSignature = "";
  try {
    const acct = await prisma.account.findUnique({
      where: { id: account.id },
      select: { message_signature: true },
    });
    messageSignature = acct?.message_signature ?? "";
  } catch {
    // column may not exist yet if migration has not been applied
    messageSignature = "";
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

  const m2Status = typeof session.m2_status === "string" ? session.m2_status : "none";

  return (
    <main>
      <h1>Ärztliche Checkliste</h1>
      <M3ChecklistClient caseId={id} initialCheckpoints={checkpoints} prefill={prefill} m2Status={m2Status} messageSignature={messageSignature} />
    </main>
  );
}
