/**
 * Phase 3d: Minimaler Mail-Layer für die Bestätigungs-E-Mail eines
 * öffentlichen Website-Form-Submits.
 *
 * Eine einzige öffentliche Funktion: {@link sendWebsiteFormConfirmationEmail}.
 * Transport-Auswahl per ENV `MAIL_TRANSPORT`:
 *
 *   - `console` (Default, auch in Tests): loggt Empfänger, Subject und die
 *     Bestätigungs-URL über `console.info`. So lassen sich Submit-/Confirm-
 *     Flows lokal vollständig durchspielen, ohne externen Provider.
 *   - alle anderen Werte: gleiches Verhalten wie `console`, zusätzlich eine
 *     Warnung. Ein echter SMTP-/HTTP-Transport kann später ergänzt werden,
 *     ohne dass sich die Aufrufer ändern.
 *
 * Mailfehler dürfen **nicht** dazu führen, dass die bereits angelegte
 * Session gelöscht wird; der Aufrufer (Submit-Endpoint) loggt den Fehler
 * und liefert eine generische Antwort. Diese Funktion wirft daher nur in
 * tatsächlichen Implementierungs-/Programmierfehlern.
 */

export type MailTransport = "console";

export type WebsiteFormConfirmationMailInput = {
  to: string;
  /** Vollständige Bestätigungs-URL inkl. Klartext-Token. */
  confirmationUrl: string;
};

function selectTransport(): MailTransport {
  const raw = process.env.MAIL_TRANSPORT?.trim().toLowerCase();
  if (!raw || raw === "console") return "console";
  // Unbekannter Transport → defensives Fallback auf console.
  console.warn(
    `[mail] Unbekannter MAIL_TRANSPORT="${raw}" – fällt auf console zurück.`,
  );
  return "console";
}

export function buildConfirmationEmailBody(
  confirmationUrl: string,
): { subject: string; text: string } {
  return {
    subject: "Bitte bestätigen Sie Ihre Übermittlung",
    text:
      "Vielen Dank für Ihre Übermittlung.\n\n" +
      "Bitte bestätigen Sie sie über folgenden Link:\n" +
      `${confirmationUrl}\n\n` +
      "Der Link ist 48 Stunden gültig. Erst nach dieser Bestätigung\n" +
      "werden Ihre Angaben an die Praxis übermittelt.\n\n" +
      "Falls Sie dieses Formular nicht abgesendet haben, können Sie\n" +
      "diese E-Mail ignorieren – ohne Bestätigung passiert nichts.\n",
  };
}

export async function sendWebsiteFormConfirmationEmail(
  input: WebsiteFormConfirmationMailInput,
): Promise<void> {
  const transport = selectTransport();
  const { subject, text } = buildConfirmationEmailBody(input.confirmationUrl);

  if (transport === "console") {
    // Bewusst NUR die URL loggen, nicht die Antworten / nicht den DB-State.
    console.info("[mail:console] Bestätigungs-E-Mail", {
      to: input.to,
      subject,
      confirmationUrl: input.confirmationUrl,
      bodyPreview: text.slice(0, 80),
    });
    return;
  }

  // Sollte nicht erreichbar sein, da selectTransport() immer "console"
  // zurückgibt. Verhindert nur exhaustive-Lücken bei späteren Transporten.
  const exhaustive: never = transport;
  throw new Error(`Unsupported MAIL_TRANSPORT: ${String(exhaustive)}`);
}
