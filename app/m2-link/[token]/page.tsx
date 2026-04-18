import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import { M2TokenFormClient } from "./M2TokenFormClient";

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
    },
  });

  const isValid =
    session !== null &&
    session.m2_token_expires_at !== null &&
    session.m2_token_expires_at >= new Date();

  if (!isValid) {
    return (
      <main
        style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}
      >
        <p data-m2-expired>{EXPIRED_MESSAGE}</p>
      </main>
    );
  }

  const checkpoints = Array.isArray(session.active_checkpoints)
    ? (session.active_checkpoints as ActiveCheckpoint[])
    : [];

  return (
    <main
      style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}
    >
      <h1>Patientenbefragung</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        Bitte beantworten Sie die folgenden Fragen und senden Sie das Formular
        ab. Ihre Angaben werden vertraulich behandelt.
      </p>
      <M2TokenFormClient token={token} checkpoints={checkpoints} />
    </main>
  );
}
