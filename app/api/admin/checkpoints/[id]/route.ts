/**
 * PUT /api/admin/checkpoints/[id]
 *
 * Speichert einen Checkpoint in der Bibliothek (Upsert).
 * Nur Plattform-Admins dürfen diese Route verwenden.
 *
 * Request body (JSON):
 *   { title, description, orientationHint, orientationAnchors: [{ id, text }] }
 *
 * Response (JSON):
 *   { ok: true, checkpoint } | { ok: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { deleteLibraryCheckpoint, upsertLibraryCheckpoint, getCheckpointFromLib } from "@/lib/practiceProcesses";
import type { PracticeCheckpointAnchor } from "@/lib/practiceProcesses";

function isAnchorArray(v: unknown): v is PracticeCheckpointAnchor[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (a) =>
      a !== null &&
      typeof a === "object" &&
      typeof (a as Record<string, unknown>).id === "string" &&
      (a as Record<string, unknown>).id !== "" &&
      typeof (a as Record<string, unknown>).text === "string",
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
  const orientationHint = typeof b.orientationHint === "string" ? b.orientationHint : "";
  const orientationAnchors = b.orientationAnchors;

  if (!title) {
    return NextResponse.json({ ok: false, error: "Titel ist erforderlich." }, { status: 422 });
  }
  if (!isAnchorArray(orientationAnchors)) {
    return NextResponse.json(
      { ok: false, error: "orientationAnchors muss ein Array aus { id, text }-Objekten sein." },
      { status: 422 },
    );
  }
  if (orientationAnchors.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Mindestens eine Orientierungsfrage ist erforderlich." },
      { status: 422 },
    );
  }

  const current = await getCheckpointFromLib(id);
  const currentIds = new Set((current?.orientationAnchors ?? []).map((anchor) => anchor.id));
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const normalizedAnchors = orientationAnchors.map((anchor) => ({
    ...anchor,
    id: currentIds.has(anchor.id) || uuidPattern.test(anchor.id) ? anchor.id : crypto.randomUUID(),
  }));

  const checkpoint = await upsertLibraryCheckpoint({
    id,
    title,
    description,
    orientationHint,
    orientationAnchors: normalizedAnchors,
  }).catch(() => null);

  if (!checkpoint) {
    return NextResponse.json(
      { ok: false, error: "Speichern fehlgeschlagen. Bitte erneut versuchen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, checkpoint });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await deleteLibraryCheckpoint((await params).id);
  if (result.status === "not_found") {
    return NextResponse.json({ ok: false, error: "Checkpoint nicht gefunden." }, { status: 404 });
  }
  if (result.status === "conflict") {
    return NextResponse.json({ ok: false, error: result.error, dependencies: result.dependencies }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
