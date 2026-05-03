/**
 * Plattform-Admin: POST /api/admin/practices/[id]/mail
 *
 * Verwaltet die Practice-spezifische SMTP-Konfiguration für die
 * Bestätigungs-E-Mails der Website-Formulare.
 *
 * Quelle der Wahrheit: schreibt **ausschließlich** auf `Practice.smtp_*`.
 * Es gibt keine Account-Spalten für SMTP — bewusste Entscheidung.
 *
 * Berechtigung: nur Plattform-Admin (`requireAdmin`). Es gibt **keinen**
 * Membership-Bypass und keinen Self-Service-Pfad — Praxis-User dürfen die
 * SMTP-Konfig nicht selbst setzen.
 *
 * Aktionen (`action`-Feld):
 *   - `save`   — Felder Host/Port/Secure/User/From-Email/From-Name
 *                aktualisieren. Optionales Passwort: leer = unverändert,
 *                gesetzt = neu verschlüsseln.
 *   - `delete` — alle SMTP-Felder auf `null` setzen.
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Passwort wird NIEMALS geloggt, NIEMALS persistiert,
 *     NIEMALS in einer Antwort zurückgegeben.
 *   - Nur Form-Submit (Redirect-Antwort) — kein JSON-API, damit keine
 *     versehentliche Programmkopplung mit Klartext-Passwort entsteht.
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import {
  encryptSmtpPassword,
  isMailSecretConfigured,
  SmtpPasswordCipherError,
} from "@/lib/mail/smtpSecret";

const ACTION_VALUES = ["save", "delete"] as const;
type Action = (typeof ACTION_VALUES)[number];

function isAction(v: unknown): v is Action {
  return typeof v === "string" && (ACTION_VALUES as readonly string[]).includes(v);
}

function trimOrNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseBool(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "on" || s === "yes";
}

function redirectToDetail(
  req: NextRequest,
  id: string,
  query: { mailError?: string; mailSaved?: string; mailDeleted?: string },
): NextResponse {
  const url = new URL(`/admin/practices/${id}`, req.url);
  if (query.mailError !== undefined)
    url.searchParams.set("mailError", query.mailError);
  if (query.mailSaved !== undefined)
    url.searchParams.set("mailSaved", query.mailSaved);
  if (query.mailDeleted !== undefined)
    url.searchParams.set("mailDeleted", query.mailDeleted);
  return NextResponse.redirect(url, 303);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1) Auth: nur Plattform-Admin.
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;

  // 2) Eingabe lesen — ausschließlich Form-Submit.
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return redirectToDetail(req, id, { mailError: "Ungültige Anfrage." });
  }

  const action = fd.get("action");
  if (!isAction(action)) {
    return redirectToDetail(req, id, { mailError: "Ungültige Aktion." });
  }

  if (action === "delete") {
    try {
      await prisma.practice.update({
        where: { id },
        data: {
          smtp_host: null,
          smtp_port: null,
          smtp_secure: null,
          smtp_user: null,
          smtp_pass_encrypted: null,
          smtp_from_email: null,
          smtp_from_name: null,
          smtp_updated_at: new Date(),
        },
      });
      return redirectToDetail(req, id, { mailDeleted: "1" });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return redirectToDetail(req, id, {
          mailError: "Practice nicht gefunden.",
        });
      }
      console.error("[admin/practice/mail] delete failed", {
        practiceId: id,
        detail: err instanceof Error ? err.message : "unknown",
      });
      return redirectToDetail(req, id, {
        mailError: "Mail-Konfiguration konnte nicht gelöscht werden.",
      });
    }
  }

  // action === "save"
  const host = trimOrNull(fd.get("smtp_host"));
  const portRaw = trimOrNull(fd.get("smtp_port"));
  const user = trimOrNull(fd.get("smtp_user"));
  const fromEmail = trimOrNull(fd.get("smtp_from_email"));
  const fromName = trimOrNull(fd.get("smtp_from_name"));
  const secure = parseBool(fd.get("smtp_secure"));
  const passInput = fd.get("smtp_pass");
  const passPlain = typeof passInput === "string" ? passInput : "";

  // Pflichtfelder.
  const missing: string[] = [];
  if (!host) missing.push("Host");
  if (!portRaw) missing.push("Port");
  if (!user) missing.push("Benutzer");
  if (!fromEmail) missing.push("Absender-E-Mail");
  if (missing.length > 0) {
    return redirectToDetail(req, id, {
      mailError: `Pflichtfelder fehlen: ${missing.join(", ")}.`,
    });
  }

  const port = Number.parseInt(portRaw as string, 10);
  if (
    !Number.isInteger(port) ||
    String(port) !== portRaw ||
    port < 1 ||
    port > 65535
  ) {
    return redirectToDetail(req, id, {
      mailError: "Port muss eine Ganzzahl zwischen 1 und 65535 sein.",
    });
  }

  if (!EMAIL_RE.test(fromEmail as string)) {
    return redirectToDetail(req, id, {
      mailError: "Absender-E-Mail ist ungültig.",
    });
  }

  // Passwort-Logik:
  //   - leer + bestehender Cipher in DB → unverändert lassen.
  //   - leer + KEIN bestehender Cipher  → Fehler (Konfig wäre unvollständig).
  //   - gesetzt                          → neu verschlüsseln.
  let nextPassCipher: string | undefined; // undefined = nicht ändern
  if (passPlain.length > 0) {
    if (!isMailSecretConfigured()) {
      return redirectToDetail(req, id, {
        mailError:
          "MAIL_SECRET_KEY ist serverseitig nicht konfiguriert — Passwort kann nicht verschlüsselt werden.",
      });
    }
    try {
      nextPassCipher = encryptSmtpPassword(passPlain);
    } catch (err) {
      const detail =
        err instanceof SmtpPasswordCipherError ? err.message : "unbekannt";
      return redirectToDetail(req, id, {
        mailError: `Passwort konnte nicht verschlüsselt werden: ${detail}`,
      });
    }
  }

  try {
    if (nextPassCipher === undefined) {
      // Bestehenden Cipher prüfen — sonst ist die Konfig unvollständig.
      const existing = await prisma.practice.findUnique({
        where: { id },
        select: { smtp_pass_encrypted: true },
      });
      if (!existing) {
        return redirectToDetail(req, id, {
          mailError: "Practice nicht gefunden.",
        });
      }
      if (!existing.smtp_pass_encrypted) {
        return redirectToDetail(req, id, {
          mailError:
            "Passwort fehlt — bitte beim Anlegen der Konfiguration auch das SMTP-Passwort setzen.",
        });
      }
    }

    await prisma.practice.update({
      where: { id },
      data: {
        smtp_host: host,
        smtp_port: port,
        smtp_secure: secure,
        smtp_user: user,
        smtp_from_email: fromEmail,
        smtp_from_name: fromName, // null erlaubt
        smtp_updated_at: new Date(),
        ...(nextPassCipher !== undefined
          ? { smtp_pass_encrypted: nextPassCipher }
          : {}),
      },
    });

    return redirectToDetail(req, id, { mailSaved: "1" });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return redirectToDetail(req, id, {
        mailError: "Practice nicht gefunden.",
      });
    }
    console.error("[admin/practice/mail] save failed", {
      practiceId: id,
      detail: err instanceof Error ? err.message : "unknown",
    });
    return redirectToDetail(req, id, {
      mailError: "Mail-Konfiguration konnte nicht gespeichert werden.",
    });
  }
}
