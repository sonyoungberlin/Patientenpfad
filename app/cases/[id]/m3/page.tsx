import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import { M3ChecklistClient } from "./M3ChecklistClient";

export default async function M3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: {
      active_checkpoints: true,
      ctx_prefill: true,
    },
  });

  const checkpoints = Array.isArray(session?.active_checkpoints)
    ? (session.active_checkpoints as ActiveCheckpoint[])
    : [];

  const prefill =
    session?.ctx_prefill &&
    typeof session.ctx_prefill === "object" &&
    !Array.isArray(session.ctx_prefill)
      ? (session.ctx_prefill as Record<string, string>)
      : {};

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>Ärztliche Checkliste</h1>
      <M3ChecklistClient caseId={id} initialCheckpoints={checkpoints} prefill={prefill} />
    </main>
  );
}
