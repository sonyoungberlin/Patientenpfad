import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;
    const rawPassword: unknown = (body as Record<string, unknown>).password;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const password = typeof rawPassword === "string" ? rawPassword : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    const password_hash = await hashPassword(password);

    await prisma.account.create({
      data: { email, is_approved: false, password_hash },
    });

    return NextResponse.json({
      ok: true,
      message: "Registrierung erfolgreich. Ihr Zugang wird manuell freigeschaltet.",
    });
  } catch (err) {
    // Klartext-Passwoerter und E-Mails niemals loggen.
    const detail = err instanceof Error ? err.message : "unknown";
    console.error("[auth/register] FEHLER:", detail);
    return NextResponse.json(
      { ok: false, error: "Registrierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
