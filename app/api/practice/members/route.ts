/**
 * Phase P4b: POST /api/practice/members
 *
 * Fügt einen **bestehenden** Account per E-Mail zur aktuellen Practice des
 * eingeloggten Aufrufers hinzu.
 *
 * Berechtigung: nur OWNER oder ADMIN der aktuellen Practice. Es gibt
 * **keinen** Plattform-Admin-Bypass.
 *
 * Scope (P4b):
 *   - Nur bestehende Accounts. Kein Account-Anlegen, keine Einladungs-Mail,
 *     kein SMTP, keine Schemaänderung.
 *   - Rolle "ADMIN" oder "USER" — "OWNER" wird in der Validierung explizit
 *     verworfen (auch für OWNER-Aufrufer).
 *   - Keine Rollenänderung bestehender Mitglieder, kein Entfernen.
 *
 * Sicherheitsgarantien:
 *   - `practice_id` wird **immer** aus der Session genommen
 *     (`account.current_practice.id`); Werte aus dem Request-Body werden
 *     ignoriert.
 *   - Bei Validierungs- oder Lookup-Fehlern wird **keine** Prisma-Schreib-
 *     Operation ausgeführt.
 *   - Eindeutigkeitskonflikte (`@@unique([account_id, practice_id])`,
 *     Prisma `P2002`) werden sauber als 409 zurückgegeben.
 *
 * Unterstützt zwei Content-Types — analog zu `/api/website-forms`:
 *   - `application/json`                  → JSON-Antwort
 *                                           `{ ok, membership: { id, account_id, email, role } }`
 *                                           (`201` bei Erfolg)
 *   - `application/x-www-form-urlencoded` → `303`-Redirect auf
 *                                           `/practice/members?added=<email>` (Erfolg)
 *                                           bzw. `?error=<msg>` (Fehler)
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma, PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";
import {
  firstAddMemberFieldError,
  validateAddMemberInput,
  type RawAddMemberInput,
} from "@/lib/practiceMembers/validateAddInput";

const IS_DEV = process.env.NODE_ENV === "development";

const ERR_ACCOUNT_NOT_FOUND = "Kein Account mit dieser E-Mail vorhanden.";
const ERR_ALREADY_MEMBER = "Account ist bereits Mitglied dieser Praxis.";
const ERR_SELF = "Du bist bereits Mitglied dieser Praxis.";

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

async function readRawInput(
  req: NextRequest,
): Promise<RawAddMemberInput | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    return {
      email:
        typeof fd.get("email") === "string"
          ? (fd.get("email") as string)
          : undefined,
      role:
        typeof fd.get("role") === "string"
          ? (fd.get("role") as string)
          : undefined,
    };
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return body as RawAddMemberInput;
  } catch {
    return null;
  }
}

function redirectToMembers(
  req: NextRequest,
  query: { error?: string; added?: string },
): NextResponse {
  const url = new URL("/practice/members", req.url);
  if (query.error !== undefined) {
    url.searchParams.set("error", query.error);
  }
  if (query.added !== undefined) {
    url.searchParams.set("added", query.added);
  }
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  // 1) Auth-Gate: nur OWNER/ADMIN der aktuellen Practice. Kein Plattform-
  //    Admin-Bypass. `requirePracticeRole` verwendet ohne `opts.practiceId`
  //    automatisch `account.current_practice.id` als Quelle der Wahrheit.
  const auth = await requirePracticeRole(req, [
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (auth.error) return auth.error;
  const account = auth.account;

  const formMode = isFormSubmit(req);

  // `practice_id` IMMER aus Session — niemals aus dem Body.
  const practice = account.current_practice;
  if (!practice) {
    // Defensiver TypeScript-Guard: `requirePracticeRole` hat oben bereits
    // 403 geliefert, wenn keine Practice da war. Trotzdem absichern, damit
    // wir niemals ohne practice_id schreiben.
    if (formMode) {
      return redirectToMembers(req, { error: "Kein Praxiszugriff." });
    }
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }
  const practiceId = practice.id;

  // 2) Body lesen + validieren. Bei Fehlern: keine Prisma-Operation.
  const raw = await readRawInput(req);
  if (raw === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  const result = validateAddMemberInput(raw);
  if (!result.ok) {
    if (formMode) {
      return redirectToMembers(req, {
        error: firstAddMemberFieldError(result.fieldErrors),
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: firstAddMemberFieldError(result.fieldErrors),
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  // 3) Existenz-Lookup. Nur bestehende Accounts dürfen hinzugefügt werden;
  //    kein Account-Create, keine Einladung. Erst NACH bestandener
  //    Validierung — bei ungültiger Eingabe wird Prisma nicht angefasst.
  const target = await prisma.account.findUnique({
    where: { email: result.value.email },
    select: { id: true, email: true },
  });
  if (!target) {
    if (formMode) {
      return redirectToMembers(req, { error: ERR_ACCOUNT_NOT_FOUND });
    }
    return NextResponse.json(
      { ok: false, error: ERR_ACCOUNT_NOT_FOUND },
      { status: 404 },
    );
  }

  // 4) Frühzeitig "Du bist schon drin" abfangen, damit die Meldung sinnvoll
  //    ist (sonst würde unten ebenfalls P2002 greifen, aber mit weniger
  //    sprechender Meldung).
  if (target.id === account.id) {
    if (formMode) {
      return redirectToMembers(req, { error: ERR_SELF });
    }
    return NextResponse.json(
      { ok: false, error: ERR_SELF },
      { status: 409 },
    );
  }

  // 5) Schreiben. `practice_id` aus Session, Rolle aus validierter Eingabe.
  try {
    const created = await prisma.practiceMembership.create({
      data: {
        account_id: target.id,
        practice_id: practiceId,
        role: result.value.role,
      },
      select: { id: true, account_id: true, role: true },
    });

    if (formMode) {
      return redirectToMembers(req, { added: target.email });
    }
    return NextResponse.json(
      {
        ok: true,
        membership: {
          id: created.id,
          account_id: created.account_id,
          email: target.email,
          role: created.role,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if (formMode) {
        return redirectToMembers(req, { error: ERR_ALREADY_MEMBER });
      }
      return NextResponse.json(
        { ok: false, error: ERR_ALREADY_MEMBER },
        { status: 409 },
      );
    }
    console.error("practice members add failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          IS_DEV && err instanceof Error
            ? err.message
            : "Mitglied konnte nicht hinzugefügt werden.",
      },
      { status: 500 },
    );
  }
}
