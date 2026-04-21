import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { M2PrefillClient } from "./M2PrefillClient";
import { M2LinkGeneratorClient } from "./M2LinkGeneratorClient";
import { M2SkipButtonClient } from "./M2SkipButtonClient";
import { M2PatientConversationClient } from "./M2PatientConversationClient";

export default async function M2Page({
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
    select: { active_checkpoints: true, ctx_prefill: true, owner_account_id: true, doctor_confirmed: true },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  // Bei bereits ärztlich bestätigtem (eingefrorenem) Fall niemals zurück
  // in M2 routen – immer direkt auf M3 umleiten.
  if (session.doctor_confirmed) {
    redirect(`/cases/${id}/m3`);
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
    <main>
      <h1 style={{ marginBottom: "1.5rem" }}>Vorbereitung durch MFA / Praxis</h1>

      {/* Aktionsbereich oben: ruhige vertikale Rhythmik, klare Gruppen */}
      <section
        data-m2-actions
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "2.5rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Erste Zeile: Skip-Aktion als dezente Textaktion */}
        <M2SkipButtonClient caseId={id} />

        {/* Zweite Zeile: Fragebogen-Link und Patientengespräch als stabile Gruppe */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <M2LinkGeneratorClient caseId={id} />
          <M2PatientConversationClient />
        </div>
      </section>

      {/* Formularbereich – beginnt klar als neuer Abschnitt */}
      <M2PrefillClient
        caseId={id}
        checkpoints={checkpoints}
        initialPrefill={prefill}
      />
    </main>
  );
}
