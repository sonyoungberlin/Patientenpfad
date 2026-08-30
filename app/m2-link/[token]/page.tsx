import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import { backfillPerspectives, ensureSelectionConditionalCheckpoints } from "@/lib/logic/checkpointCatalog";
import { M2TokenFormClient } from "./M2TokenFormClient";
import { PUBLIC_IDENTITY_SELECT } from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";
import { isPracticeActive, PRACTICE_SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/practice/lifecycle";

const EXPIRED_MESSAGE = "Dieser Link ist abgelaufen. Bitte wenden Sie sich an die Praxis.";

export default async function M2TokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await prisma.caseSession.findUnique({
    where: { m2_token: token },
    select: {
      active_checkpoints: true,
      m2_token_expires_at: true,
      owner_practice: { select: PUBLIC_IDENTITY_SELECT },
    },
  });

  const isValid =
    session !== null &&
    session.m2_token_expires_at !== null &&
    session.m2_token_expires_at >= new Date() &&
    (!session.owner_practice ||
      typeof session.owner_practice.is_approved !== "boolean" ||
      isPracticeActive(session.owner_practice));
  const publicPractice = session?.owner_practice ?? null;

  if (!isValid) {
    return (
      <main>
        <p data-m2-expired>{session?.owner_practice && typeof session.owner_practice.is_approved === "boolean" && !isPracticeActive(session.owner_practice) ? PRACTICE_SERVICE_UNAVAILABLE_MESSAGE : EXPIRED_MESSAGE}</p>
        {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
      </main>
    );
  }

  const checkpoints = backfillPerspectives(
    ensureSelectionConditionalCheckpoints(
      Array.isArray(session.active_checkpoints)
        ? (session.active_checkpoints as ActiveCheckpoint[])
        : [],
    ),
  );

  return (
    <main>
      <h1>Patientenbefragung</h1>
      <M2TokenFormClient token={token} checkpoints={checkpoints} />
      {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
    </main>
  );
}
