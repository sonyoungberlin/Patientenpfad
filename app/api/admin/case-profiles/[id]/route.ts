/**
 * PUT /api/admin/case-profiles/[id]
 *
 * Speichert einen Praxisfall in der Bibliothek (Upsert).
 * Nur Plattform-Admins dürfen diese Route verwenden.
 *
 * Request body (JSON):
 *   { title, description, checkpointRefs: [{ checkpointId, group? }] }
 *
 * Response (JSON):
 *   { ok: true, profile } | { ok: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { upsertLibraryCaseProfile } from "@/lib/practiceProcesses";

function isRefArray(v: unknown): v is Array<{ checkpointId: string; group?: string }> {
  if (!Array.isArray(v)) return false;
  return v.every(
    (r) =>
      r !== null &&
      typeof r === "object" &&
      typeof (r as Record<string, unknown>).checkpointId === "string" &&
      (r as Record<string, unknown>).checkpointId !== "",
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Leerer Request-Body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description : "";
  const checkpointRefs = b.checkpointRefs;

  if (!title) {
    return NextResponse.json({ ok: false, error: "Titel ist erforderlich." }, { status: 422 });
  }

  if (!isRefArray(checkpointRefs) || checkpointRefs.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Mindestens ein Checkpoint ist erforderlich." },
      { status: 422 },
    );
  }

  const cpIds = checkpointRefs.map((r) => r.checkpointId);
  if (new Set(cpIds).size !== cpIds.length) {
    return NextResponse.json(
      { ok: false, error: "Jeder Checkpoint darf nur einmal im Praxisfall vorkommen." },
      { status: 422 },
    );
  }

  try {
    const profile = await upsertLibraryCaseProfile({ id, title, description, checkpointRefs });
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("[PUT /api/admin/case-profiles/[id]]", err);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
