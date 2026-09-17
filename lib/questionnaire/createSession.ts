/**
 * Phase B Schritt 1: Gemeinsame Service-Funktion zum Erstellen einer
 * `PatientQuestionnaireSession`.
 *
 * Ausgelagert aus `app/api/questionnaire/route.ts`, damit dieselbe Logik
 * später auch vom DigitalRequest-Flow (Phase B Schritt 2) genutzt werden
 * kann, ohne Code zu duplizieren.
 *
 * Verantwortlichkeiten dieser Funktion:
 *   - Token generieren (UUID) + TTL berechnen.
 *   - `deduplicated_questions` via `buildQuestionnaireQuestions` einfrieren.
 *   - `PatientQuestionnaireSession` in der DB anlegen.
 *   - `sessionId`, `token` (Klartext) und den vollständigen `tokenLink`
 *     zurückgeben.
 *
 * NICHT in dieser Funktion:
 *   - HTTP-Request/Response-Verarbeitung (bleibt in der Route).
 *   - Authentifizierung / Authorisierung.
 *   - Eingabevalidierung der Block-IDs (bleibt im Aufrufer, da route und
 *     zukünftige Aufrufer unterschiedliche Fehlerformate brauchen).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildFrozenBlocks,
  buildInternalDocumentationSnapshot,
} from "@/lib/questionnaire/frozenBlocks";
import { OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import {
  buildInternalDocumentationFrozenBlocks,
  getInternalWorkflow,
  type InternalWorkflowId,
} from "@/lib/questionnaire/internalWorkflowRegistry";
import type { ConditionalRule } from "@/lib/questionnaire/conditionalLogic";
import type { InternalBlockPlacement } from "@/lib/questionnaire/internalBlockLayout";
import type { InternalDocumentTitleMetadata } from "@/lib/questionnaire/internalDocumentTitle";
import {
  buildPracticeConfirmationsFrozenBlock,
  type PracticeConfirmationSlot,
} from "@/lib/questionnaire/confirmation";
import { hasExactKioskCheckInBlocks } from "@/lib/questionnaire/kioskCheckIn";
import { hasExactPublicCheckInBlocks } from "@/lib/questionnaire/publicCheckIn";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 Stunden

type AccountSessionCreator = {
  ownerAccountId: string;
  ownerPracticeId?: string | null;
  createdByKioskDeviceId?: never;
};

type KioskSessionCreator = {
  ownerAccountId?: never;
  ownerPracticeId: string;
  createdByKioskDeviceId: string;
  inquirySessionId?: never;
  source: "kiosk_direct";
};

type PublicCheckInCreator = {
  ownerAccountId?: never;
  ownerPracticeId: string;
  createdByKioskDeviceId?: never;
  inquirySessionId?: never;
  source: "public_check_in";
};

type DigitalRequestFollowUpCreator = {
  ownerAccountId: string;
  ownerPracticeId: string;
  createdByKioskDeviceId?: never;
  source: "digital_request_follow_up";
};

export type CreateSessionInput = {
  /** Bereits validierte und gefilterte Block-IDs (min. 1 Eintrag). */
  selectedBlockIds: string[];
  /** Interne Patientenreferenz; null ist nur bei explizit erlaubten Sonderpfaden zulässig. */
  patientReference: string | null;
  allowUnassignedKioskCheckIn?: boolean;
  allowUnassignedPublicCheckIn?: boolean;
  allowUnassignedDigitalRequestFollowUp?: boolean;
  /** "de" | "en", nach `normalizeQuestionnaireLanguage` normalisiert. */
  patientLanguage: string;
  /** Optionale Verknüpfung zur auslösenden InquirySession. */
  inquirySessionId?: string | null;
  /** Optionaler SHA-256-Hash des Geburtsdatums (kein Klartext). */
  birthDateHash?: string | null;
  /**
   * Ursprungs-URL für den Token-Link (z. B. `req.nextUrl.origin`).
   * Wird für den zurückgegebenen `tokenLink` verwendet.
   */
  origin: string;
  /** "patient" (Default) | "office". Bestimmt den genutzten Blockkatalog. */
  context?: "patient" | "office";
  /** Ansprache für Bewerbungsanamnese. Nur im Bewerbungsflow gesetzt; sonst null. */
  salutation?: "du" | "sie";
  /** Bereits serverseitig aufgelöste Practice-Texte für den Session-Snapshot. */
  practiceConfirmations?: PracticeConfirmationSlot[];
  patientCopyReturnEmail?: string | null;
  /** Herkunft der Session; Default bleibt der bisherige Link-Workflow. */
  source?: "internal_link" | "practice_direct" | "kiosk_direct" | "public_check_in" | "digital_request_follow_up";
  sessionKind?: "patient_communication" | "internal_documentation";
  internalWorkflowId?: InternalWorkflowId | null;
  internalBlockLayout?: InternalBlockPlacement[];
  internalDocumentTitle?: InternalDocumentTitleMetadata;
  databaseClient?: Pick<Prisma.TransactionClient, "patientQuestionnaireSession">;
} & (
  | AccountSessionCreator
  | KioskSessionCreator
  | PublicCheckInCreator
  | DigitalRequestFollowUpCreator
);

export type CreateSessionResult = {
  sessionId: string;
  /** Klartext-Token (UUID). Wird nur einmalig zurückgegeben, nie erneut ausgelesen. */
  token: string;
  /** Vollständige URL für den Patienten: `${origin}/q/${token}`. */
  tokenLink: string;
};

/**
 * Legt eine neue `PatientQuestionnaireSession` an und gibt Session-ID,
 * Token (Klartext) und Token-Link zurück.
 *
 * Wirft bei DB-Fehlern — der Aufrufer ist verantwortlich für Fehlerbehandlung.
 */
export async function createQuestionnaireSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const {
    selectedBlockIds,
    patientReference,
    allowUnassignedKioskCheckIn = false,
    allowUnassignedPublicCheckIn = false,
    allowUnassignedDigitalRequestFollowUp = false,
    patientLanguage,
    ownerAccountId,
    ownerPracticeId,
    createdByKioskDeviceId,
    inquirySessionId,
    birthDateHash,
    origin,
    context = "patient",
    salutation,
    practiceConfirmations = [],
    patientCopyReturnEmail,
    source,
    sessionKind = "patient_communication",
    internalWorkflowId,
    internalBlockLayout,
    internalDocumentTitle,
    databaseClient = prisma,
  } = input;

  const isUnassignedKioskCheckIn = patientReference === null &&
    allowUnassignedKioskCheckIn &&
    source === "kiosk_direct" &&
    context === "patient" &&
    sessionKind === "patient_communication" &&
    Boolean(ownerPracticeId) &&
    Boolean(createdByKioskDeviceId) &&
    hasExactKioskCheckInBlocks(selectedBlockIds);
  const isUnassignedPublicCheckIn = patientReference === null &&
    allowUnassignedPublicCheckIn &&
    source === "public_check_in" &&
    context === "patient" &&
    sessionKind === "patient_communication" &&
    Boolean(ownerPracticeId) &&
    !createdByKioskDeviceId &&
    hasExactPublicCheckInBlocks(selectedBlockIds);
  const isUnassignedDigitalRequestFollowUp = patientReference === null &&
    allowUnassignedDigitalRequestFollowUp &&
    source === "digital_request_follow_up" &&
    context === "patient" &&
    sessionKind === "patient_communication" &&
    Boolean(ownerAccountId) &&
    Boolean(ownerPracticeId) &&
    !createdByKioskDeviceId;
  if (source === "public_check_in" && (ownerAccountId || !ownerPracticeId || createdByKioskDeviceId)) {
    throw new Error("Public-Check-in benötigt eine Praxis ohne Account oder Kioskgerät.");
  }
  if (
    patientReference === null &&
    !isUnassignedKioskCheckIn &&
    !isUnassignedPublicCheckIn &&
    !isUnassignedDigitalRequestFollowUp
  ) {
    throw new Error("Patientenreferenz ist erforderlich.");
  }
  if (typeof patientReference === "string" && patientReference.trim() === "") {
    throw new Error("Patientenreferenz ist erforderlich.");
  }

  const internalSelectedBlockIds = sessionKind === "internal_documentation" &&
    internalWorkflowId && selectedBlockIds.length === 0
    ? getInternalWorkflow(internalWorkflowId)?.blockIds ?? selectedBlockIds
    : selectedBlockIds;

  if (sessionKind === "internal_documentation" && internalSelectedBlockIds.length === 0) {
    throw new Error("Interne Blocks fehlen.");
  }
  const token = sessionKind === "internal_documentation" ? null : crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  const frozenBlocks =
    sessionKind === "internal_documentation"
      ? buildInternalDocumentationFrozenBlocks(
          Array.from(internalSelectedBlockIds),
          internalBlockLayout,
        )
      : context === "office"
      ? buildFrozenBlocks(selectedBlockIds, OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG)
      : buildFrozenBlocks(selectedBlockIds);
  if (context === "patient") {
    const confirmationBlock =
      buildPracticeConfirmationsFrozenBlock(practiceConfirmations);
    if (confirmationBlock) {
      const existingQuestionIds = new Set(
        frozenBlocks.flatMap((block) => block.questions.map((question) => question.id)),
      );
      if (
        confirmationBlock.questions.some((question) =>
          existingQuestionIds.has(question.id),
        )
      ) {
        throw new Error("Practice-Confirmation-ID kollidiert mit Fragebogenfrage.");
      }
      frozenBlocks.push(confirmationBlock);
    }
  }
  const deduplicatedQuestions = frozenBlocks.flatMap((b) => b.questions);
  const conditionalRules: ConditionalRule[] = frozenBlocks.flatMap(
    (b) => b.conditionalRules,
  );
  const persistedSelectedBlockIds = sessionKind === "internal_documentation"
    ? frozenBlocks.filter((block) => block.initiallyVisible).map((block) => block.id)
    : internalSelectedBlockIds;
  const frozenBlocksSnapshot = sessionKind === "internal_documentation" &&
    internalWorkflowId == null && internalDocumentTitle
    ? buildInternalDocumentationSnapshot(frozenBlocks, internalDocumentTitle)
    : frozenBlocks;

  const session = await databaseClient.patientQuestionnaireSession.create({
    data: {
      token,
      token_expires_at: sessionKind === "internal_documentation" ? null : expiresAt,
      owner_account_id: ownerAccountId ?? null,
      ...(ownerPracticeId ? { owner_practice_id: ownerPracticeId } : {}),
      ...(createdByKioskDeviceId
        ? { created_by_kiosk_device_id: createdByKioskDeviceId }
        : {}),
      patient_reference: patientReference,
      kiosk_handoff_status: isUnassignedKioskCheckIn ? "waiting" : null,
      inquiry_session_id: inquirySessionId ?? null,
      selected_block_ids: persistedSelectedBlockIds as Prisma.InputJsonValue,
      deduplicated_questions:
        deduplicatedQuestions as unknown as Prisma.InputJsonValue,
      frozen_conditional_rules:
        conditionalRules.length > 0
          ? (conditionalRules as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      frozen_blocks: frozenBlocks.length > 0
        ? (frozenBlocksSnapshot as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      patient_language: patientLanguage,
      context,
      status: "pending",
      ...(sessionKind === "internal_documentation"
        ? { auto_xml_download_claimed_at: null }
        : {}),
      source: source ?? "internal_link",
      session_kind: sessionKind,
      ...(sessionKind === "internal_documentation" && internalWorkflowId
        ? { internal_workflow_id: internalWorkflowId! }
        : {}),
      ...(salutation ? { salutation } : {}),
      ...(birthDateHash ? { birth_date_hash: birthDateHash } : {}),
      patient_copy_return_email: patientCopyReturnEmail ?? null,
    },
    select: { id: true },
  });

  const tokenLink = sessionKind === "internal_documentation"
    ? `${origin}/questionnaire-kiosk/internal/${session.id}`
    : `${origin}/q/${token}`;

  return { sessionId: session.id, token: token ?? "", tokenLink };
}
