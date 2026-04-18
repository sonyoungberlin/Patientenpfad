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

    const account = await prisma.account.upsert({
      where: { email },
      create: { email, is_approved: false },
      update: {},
    });

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
    console.error("[auth/login]", err);
    return NextResponse.json(
      { ok: false, error: "Login fehlgeschlagen." },
      { status: 500 },
    );
  }
}
