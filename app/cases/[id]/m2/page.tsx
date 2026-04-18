import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";
import { M2PrefillClient } from "./M2PrefillClient";

export default async function M2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m3Path = buildCaseM3Path(id);

  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: { active_checkpoints: true, ctx_prefill: true },
  });

  const checkpoints = Array.isArray(session?.active_checkpoints)
    ? (session.active_checkpoints as ActiveCheckpoint[])
    : [];

  const prefill =
    session?.ctx_prefill &&
    typeof session.ctx_prefill === "object" &&
    !Array.isArray(session.ctx_prefill)
      ? (session.ctx_prefill as M2PrefillData)
      : {};

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>M2 – Patienteninformationen</h1>
      <M2PrefillClient
        caseId={id}
        checkpoints={checkpoints}
        initialPrefill={prefill}
      />
      <a href={m3Path} style={{ display: "inline-block", marginTop: "1rem" }}>
        Ohne M2 direkt zur ärztlichen Checkliste
      </a>
    </main>
  );
}
