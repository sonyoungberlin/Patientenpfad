/**
 * Serverseitige Ladehilfe für die Ursprungssession eines TARGET_STATE-Snapshots.
 *
 * Wendet dieselbe Ownership-Prüfung an wie beim Laden der primären Session.
 * Gibt null zurück, wenn die Session nicht existiert, nicht zugänglich ist
 * oder kein gültiger InternalProtocol-Snapshot ist.
 */

import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isInternalProtocolWorkflowSnapshot,
  type InternalProtocolWorkflowSnapshot,
} from "./workflowAdapter";
import type { SessionAccount } from "@/lib/auth";

/**
 * Lädt den Snapshot der Ursprungssession unter Anwendung der Ownership-Prüfung.
 *
 * Gibt null zurück bei:
 * - nicht vorhandener Session
 * - Session aus fremder Praxis / fremdem Konto
 * - Snapshot mit falscher Prozess-ID (kein InternalProtocol-Format)
 */
export async function loadSourceSnapshot(
  sourceId: string,
  account: Pick<SessionAccount, "id" | "current_practice">,
): Promise<InternalProtocolWorkflowSnapshot | null> {
  const sourceSession = await prisma.workflowSession.findFirst({
    where: {
      id: sourceId,
      ...getWorkflowOwnershipFilter(account),
    },
    select: { process_snapshot: true },
  });

  if (!sourceSession) return null;
  if (!isInternalProtocolWorkflowSnapshot(sourceSession.process_snapshot)) return null;

  return sourceSession.process_snapshot;
}
