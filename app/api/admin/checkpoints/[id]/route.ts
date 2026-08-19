/**
 * PUT /api/admin/checkpoints/[id]
 *
 * Speichert einen Checkpoint in der Bibliothek (Upsert).
 * Nur Plattform-Admins dürfen diese Route verwenden.
 *
 * Löschschutz: Anker-IDs, die in gespeicherten WorkflowSession-Snapshots
 * referenziert sind, dürfen nicht entfernt werden.
 *
 * Request body (JSON):
 *   { title, description, orientationHint, orientationAnchors: [{ id, text }] }
 *
 * Response (JSON):
 *   { ok: true, checkpoint } | { ok: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { upsertLibraryCheckpoint, getCheckpointFromLib } from "@/lib/practiceProcesses";
import { prisma } from "@/lib/prisma";
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

/** Prüft ob eine Anchor-ID in einem gespeicherten WorkflowSession-Snapshot vorkommt. */
async function isAnchorReferenced(anchorId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "WorkflowSession"
      WHERE process_snapshot IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(process_snapshot->'checkpoints') AS cp
          WHERE cp->'selectedAnchorIds' @> ${JSON.stringify([anchorId])}::jsonb
        )
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
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

  // Löschschutz: gelöschte Anker prüfen
  const current = await getCheckpointFromLib(id);
  if (current?.orientationAnchors) {
    const incomingIds = new Set(orientationAnchors.map((a) => a.id));
    const removedAnchors = current.orientationAnchors.filter((a) => !incomingIds.has(a.id));
    for (const anchor of removedAnchors) {
      const referenced = await isAnchorReferenced(anchor.id);
      if (referenced) {
        return NextResponse.json(
          {
            ok: false,
            error: `Orientierungsanker „${anchor.text || anchor.id}" wird in gespeicherten Praxisprozessen verwendet und kann nicht gelöscht werden.`,
          },
          { status: 409 },
        );
      }
    }
  }

  const checkpoint = await upsertLibraryCheckpoint({
    id,
    title,
    description,
    orientationHint,
    orientationAnchors,
  }).catch(() => null);

  if (!checkpoint) {
    return NextResponse.json(
      { ok: false, error: "Speichern fehlgeschlagen. Bitte erneut versuchen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, checkpoint });
}
