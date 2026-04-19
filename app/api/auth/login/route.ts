import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw: unknown = (body as Record<string, unknown>).email;
    const email =
      typeof raw === "string" ? raw.trim().toLowerCase() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    console.log("[auth/login] looking up account", { email });
    const account = await prisma.account.findUnique({
      where: { email },
      select: { id: true, email: true, is_approved: true },
    });

    if (!account) {
      console.log("[auth/login] account not found", { email });
      return NextResponse.json(
        { ok: false, error: "Kein Account mit dieser E-Mail-Adresse gefunden. Bitte registrieren Sie sich zuerst." },
        { status: 404 },
      );
    }

    if (!account.is_approved) {
      console.log("[auth/login] account not approved", { email, id: account.id });
      return NextResponse.json(
        { ok: false, error: "Ihr Account ist noch nicht freigeschaltet." },
        { status: 403 },
      );
    }

    console.log("[auth/login] account approved, creating session", { email, id: account.id });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: { token, account_id: account.id, expiresAt },
    });

    const response = NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        email: account.email,
        is_approved: account.is_approved,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] FEHLER:", detail, err);
    return NextResponse.json(
      { ok: false, error: `Login fehlgeschlagen: ${detail}` },
      { status: 500 },
    );
  }
}
