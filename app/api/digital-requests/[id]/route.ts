/**
 * Phase B Schritt 2: PATCH /api/digital-requests/[id]
 *
 * Speichert `patient_reference` und `selected_block_ids` einer DigitalRequest.
 * Optional kann `status: "in_review"` mitgeschickt werden; der Server setzt
 * ihn nur, wenn der aktuelle Status dies erlaubt (nicht "sent" / "closed").
 *
 * Rechte: OWNER / ADMIN / USER (via requireQuestionnaireSendAccess).
 * INBOX_ONLY → 403. Nicht freigeschaltet → 403. Nicht eingeloggt → 401.
 *
 * Eigentum: Fremde / gelöschte IDs → 404 (kein 403, Konvention Praxis-Pfade).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireSendAccess } from "@/lib/authz";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";

/** Status-Werte, die über diesen Endpoint nicht verlassen werden dürfen. */
const TERMINAL_STATUSES = new Set(["sent", "closed"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireQuestionnaireSendAccess(req);
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

  // --- Validierung patient_reference ---
  // undefined = Feld nicht in Body → nicht aktualisieren
  // null / "" = Feld leeren
  // string   = speichern (getrimmt)
  let patientReference: string | null | undefined = undefined;
  if ("patient_reference" in body) {
    const raw = body.patient_reference;
    if (raw === null || raw === "") {
      patientReference = null;
    } else if (typeof raw === "string" && raw.trim() !== "") {
      patientReference = raw.trim();
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "patient_reference muss ein nicht-leerer String oder null sein.",
        },
        { status: 400 },
      );
    }
  }

  // --- Validierung selected_block_ids ---
  let selectedBlockIds: string[] | undefined = undefined;
  if ("selected_block_ids" in body) {
    const raw = body.selected_block_ids;
    if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string")) {
      return NextResponse.json(
        { ok: false, error: "selected_block_ids muss ein Array von Strings sein." },
        { status: 400 },
      );
    }
    const invalidIds = (raw as string[]).filter((bid) => !(bid in BLOCK_CATALOG));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ungültige Block-IDs.",
          invalid_ids: invalidIds,
        },
        { status: 400 },
      );
    }
    selectedBlockIds = raw as string[];
  }

  // --- Validierung status ---
  let requestedStatus: string | undefined = undefined;
  if ("status" in body) {
    const raw = body.status;
    if (raw !== "in_review") {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Status. Erlaubt: in_review." },
        { status: 400 },
      );
    }
    requestedStatus = raw as string;
  }

  // --- Eigentum + Existenz prüfen ---
  const existing = await prisma.digitalRequest.findFirst({
    where: { id, ...getOwnershipFilter(account), deleted_at: null },
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
  if (patientReference !== undefined) {
    data.patient_reference = patientReference;
  }
  if (selectedBlockIds !== undefined) {
    data.selected_block_ids = selectedBlockIds as unknown as Prisma.InputJsonValue;
  }
  // Status nur setzen, wenn nicht bereits in einem Terminal-State.
  if (requestedStatus === "in_review" && !TERMINAL_STATUSES.has(existing.status)) {
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
