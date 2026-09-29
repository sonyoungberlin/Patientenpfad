import { NextRequest, NextResponse } from "next/server";
import { requirePracticeRole } from "@/lib/authz";
import { PracticeRole } from "@prisma/client";
import { listPracticeCheckpointDefinitions } from "@/lib/practiceProcesses";

const READ_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER, PracticeRole.INBOX_ONLY];

export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, READ_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  const ids = req.nextUrl.searchParams.getAll("checkpointId");
  return NextResponse.json({ ok: true, definitions: await listPracticeCheckpointDefinitions(practice.id, ids.length ? ids : undefined) });
}