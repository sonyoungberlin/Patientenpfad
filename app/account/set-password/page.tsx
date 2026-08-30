import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/auth/passwordReset";
import { SetPasswordFormClient } from "./SetPasswordFormClient";

// Per-Request rendern: Token-Gültigkeit muss live geprüft werden, damit
// nach Konsum oder Ablauf nicht versehentlich ein gecachtes Formular
// ausgeliefert wird.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const INVALID_MESSAGE =
  "Dieser Link ist nicht (mehr) gültig. Bitte fordern Sie einen neuen Link an.";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawToken = sp?.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  if (!token) {
    return (
      <main>
        <p data-set-password-invalid>{INVALID_MESSAGE}</p>
      </main>
    );
  }

  // Defensiv: Klartext-Token wird NUR zur Existenz-/Ablaufprüfung selektiert
  // und nicht zurück ins Markup geschrieben (außer in das versteckte Form-
  // Feld, was unvermeidbar ist, da das Client-Submit den Token wieder an
  // die API zurückgibt).
  const resetRequest = await prisma.passwordResetRequest.findUnique({
    where: { token_hash: hashPasswordResetToken(token) },
    select: { expires_at: true, used_at: true },
  });

  if (
    !resetRequest ||
    resetRequest.used_at ||
    resetRequest.expires_at < new Date()
  ) {
    return (
      <main>
        <p data-set-password-invalid>{INVALID_MESSAGE}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Passwort setzen</h1>
      <SetPasswordFormClient token={token} />
    </main>
  );
}
