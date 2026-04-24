import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import type { ActiveCheckpoint, M1BlockId } from "@/lib/types";
import { CHECKPOINT_CATALOGUE } from "@/lib/logic/checkpointCatalog";
import M1ErgaenzungClient from "./M1ErgaenzungClient";

const M1_BLOCK_IDS: ReadonlyArray<M1BlockId> = [
  "kommunikation",
  "medizinische_lage",
  "versorgung_im_alltag",
  "pflegebeobachtung",
];

/**
 * Schritt B des Ergänzungs-Flows: Per-Case-M1-Einstieg.
 *
 * Diese Seite ist bewusst minimal:
 *   * Auth + Owner-Check wie in den übrigen `/cases/[id]/...`-Seiten.
 *   * Bestätigte Fälle (`doctor_confirmed === true` oder
 *     `clinical_status === "confirmed"`) werden direkt nach M3 umgeleitet.
 *   * Bereits aktive M1-Blöcke werden aus `active_checkpoints` abgeleitet
 *     (eindeutige `block_id`s, eingeschränkt auf die M1-Block-IDs)
 *     und an die Client-Komponente weitergegeben, die sie über die
 *     extrahierte `M1SelectionForm` als „bereits aktiv" markiert.
 *
 * Es gibt in diesem Schritt absichtlich noch keinen Schreibpfad und keine
 * Merge-Logik – die Seite bereitet ausschließlich den Ergänzungs-Einstieg
 * sichtbar/reviewbar vor.
 */
export default async function CaseM1Page({
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
      owner_account_id: true,
      active_checkpoints: true,
      doctor_confirmed: true,
      clinical_status: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  if (
    session.doctor_confirmed === true ||
    session.clinical_status === "confirmed"
  ) {
    redirect(`/cases/${id}/m3`);
  }

  const checkpoints = Array.isArray(session.active_checkpoints)
    ? (session.active_checkpoints as ActiveCheckpoint[])
    : [];

  // „bereits aktiv" darf ausschließlich aus Standard-Checkpoints (K01–K09, K12–K15)
  // abgeleitet werden, die wirklich aus einer früheren M1-Aktivierung
  // dieses Blocks stammen. Always-present MULTI_SELECT-Checkpoints (z. B.
  // K10/K11) tragen zwar eine `block_id`, werden aber unabhängig von der
  // M1-Auswahl angelegt und dürfen daher keinen Block als „bereits aktiv"
  // markieren.
  const activeBlockIds = new Set<M1BlockId>();
  for (const cp of checkpoints) {
    const cpId = cp?.id;
    if (typeof cpId !== "string") continue;
    if (!Object.prototype.hasOwnProperty.call(CHECKPOINT_CATALOGUE, cpId)) {
      continue;
    }
    const blockId = cp?.block_id;
    if (
      typeof blockId === "string" &&
      (M1_BLOCK_IDS as ReadonlyArray<string>).includes(blockId)
    ) {
      activeBlockIds.add(blockId as M1BlockId);
    }
  }

  return (
    <main>
      <p
        data-ergaenzung-hinweis
        className="text-muted text-small"
        style={{ marginBottom: "0.5rem" }}
      >
        Fallergänzung
      </p>
      <h1 style={{ marginBottom: "1.5rem" }}>
        Liegt genug Information vor, damit der Arzt direkt entscheiden kann?
      </h1>
      <M1ErgaenzungClient caseId={id} lockedBlocks={Array.from(activeBlockIds)} />
    </main>
  );
}
