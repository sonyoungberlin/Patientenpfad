/**
 * PATCH /api/office-cases/applications/[id]
 * DELETE /api/office-cases/applications/[id]
 *
 * Verwaltet eine einzelne Bewerbungsanfrage (request_type = "office").
 *
 * PATCH: Speichert selected_block_ids, setzt status → "in_review".
 * DELETE: Hard-Delete. Nur wenn status nicht "sent" oder "closed".
 *
 * Rechte: requireOfficeQuestionnaireAccess (OWNER/ADMIN, kein INBOX_ONLY).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { OFFICE_BLOCK_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";

const TERMINAL_STATUSES = new Set(["sent", "closed", "rejected"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeQuestionnaireAccess(req);
  if (error) return error;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  // --- Validierung selected_block_ids ---
  let selectedBlockIds: string[] | undefined = undefined;
  if ("selected_block_ids" in body) {
    const raw = body.selected_block_ids;
    if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string")) {
      return NextResponse.json(
        {
          ok: false,
          error: "selected_block_ids muss ein Array von Strings sein.",
        },
        { status: 400 },
      );
    }
    const invalidIds = (raw as string[]).filter(
      (bid) => !(bid in OFFICE_BLOCK_CATALOG),
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Block-IDs.", invalid_ids: invalidIds },
        { status: 400 },
      );
    }
    selectedBlockIds = raw as string[];
  }

  // --- Validierung status ---
  let requestedStatus: string | undefined = undefined;
  if ("status" in body) {
    if (body.status !== "in_review") {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Status. Erlaubt: in_review." },
        { status: 400 },
      );
    }
    requestedStatus = "in_review";
  }

  // --- Eigentum + Existenz prüfen ---
  const existing = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOfficeOwnershipFilter(account),
      request_type: "office",
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  // --- Update-Daten zusammenbauen ---
  const data: Prisma.DigitalRequestUpdateInput = {};
  if (selectedBlockIds !== undefined) {
    data.selected_block_ids =
      selectedBlockIds as unknown as Prisma.InputJsonValue;
  }
  if (
    requestedStatus === "in_review" &&
    !TERMINAL_STATUSES.has(existing.status)
  ) {
    data.status = "in_review";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.digitalRequest.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeQuestionnaireAccess(req);
  if (error) return error;

  const { id } = await ctx.params;

  const existing = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOfficeOwnershipFilter(account),
      request_type: "office",
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  if (existing.status === "sent" || existing.status === "closed") {
    return NextResponse.json(
      {
        ok: false,
        error: `Bewerbungsanfrage hat bereits den Status "${existing.status}" und kann nicht gelöscht werden.`,
      },
      { status: 409 },
    );
  }

  await prisma.digitalRequest.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
