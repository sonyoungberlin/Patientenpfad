import { PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePracticeRole } from "@/lib/authz";
import {
  AUTO_DOWNLOAD_ENROLLMENT_DURATION_MS,
  createAutoDownloadEnrollmentCode,
  hashAutoDownloadEnrollmentCode,
} from "@/lib/autoDownloadDevices/enrollment";
import { prisma } from "@/lib/prisma";
import { isPracticeActive } from "@/lib/practice/lifecycle";

const MANAGE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function GET(req: NextRequest) {
  const { account, error } = await requirePracticeRole(req, MANAGE_ROLES);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice || !isPracticeActive(practice)) {
    return NextResponse.json(
      { ok: false, error: "Praxis nicht aktiv." },
      { status: 403 },
    );
  }

  const devices = await prisma.practiceAutoDownloadDevice.findMany({
    where: { practice_id: practice.id },
    select: {
      id: true,
      name: true,
      is_active: true,
      revoked_at: true,
      last_seen_at: true,
      created_at: true,
      enrollment_expires_at: true,
      credential_hash: true,
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    ok: true,
    devices: devices.map(({ credential_hash, ...device }) => ({
      ...device,
      enrolled: credential_hash !== null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { account, error } = await requirePracticeRole(req, MANAGE_ROLES);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice || !isPracticeActive(practice)) {
    return NextResponse.json(
      { ok: false, error: "Praxis nicht aktiv." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json(
      { ok: false, error: "Ein Gerätename mit maximal 100 Zeichen ist erforderlich." },
      { status: 400 },
    );
  }

  const enrollmentCode = createAutoDownloadEnrollmentCode();
  const enrollmentExpiresAt = new Date(
    Date.now() + AUTO_DOWNLOAD_ENROLLMENT_DURATION_MS,
  );
  const device = await prisma.practiceAutoDownloadDevice.create({
    data: {
      practice_id: practice.id,
      name,
      enrollment_token_hash: hashAutoDownloadEnrollmentCode(enrollmentCode),
      enrollment_expires_at: enrollmentExpiresAt,
      created_by_account_id: account.id,
    },
    select: { id: true, name: true, is_active: true, created_at: true },
  });

  return NextResponse.json(
    { ok: true, device, enrollmentCode, enrollmentExpiresAt },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
