/**
 * POST /api/admin/checkpoints
 *
 * Erstellt einen neuen Checkpoint in der Bibliothek.
 * Nur Plattform-Admins dürfen diese Route verwenden.
 *
 * Request body (JSON):
 *   { id, title, description, orientationHint, orientationAnchors: [{ id, text }] }
 *
 * Response (JSON):
 *   { ok: true, checkpoint } | { ok: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { upsertLibraryCheckpoint, getCheckpointFromLib } from "@/lib/practiceProcesses";
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

const VALID_ID = /^[a-z0-9-]+$/;

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

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
  const id = typeof b.id === "string" ? b.id.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description : "";
  const orientationHint = typeof b.orientationHint === "string" ? b.orientationHint : "";
  const orientationAnchors = b.orientationAnchors;

  if (!id || !VALID_ID.test(id)) {
    return NextResponse.json(
      { ok: false, error: "ID darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten." },
      { status: 422 },
    );
  }
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

  // Prüfen ob ID bereits vergeben (DB oder Katalog)
  const existing = await getCheckpointFromLib(id);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: `ID "${id}" existiert bereits in der Bibliothek.` },
      { status: 409 },
    );
  }

  const checkpoint = await upsertLibraryCheckpoint({
    id,
    title,
    description,
    orientationHint,
    orientationAnchors,
  });

  return NextResponse.json({ ok: true, checkpoint }, { status: 201 });
}
