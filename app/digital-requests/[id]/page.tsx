/**
 * Phase B Schritt 2: Detailseite für eine einzelne DigitalRequest.
 *
 * Guard:
 *   - requirePatientCommunicationAccessFromCookies
 *   - INBOX_ONLY → redirect /questionnaires (analog Listenseite)
 *
 * Zeigt: Name, E-Mail, Eingangsdatum, Anliegen, Status.
 * Formular: patient_reference, Block-Auswahl (BLOCK_CATALOG), Speichern.
 *
 * Fremde / gelöschte Anfragen → notFound().
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  requirePatientCommunicationAccessFromCookies,
  isInboxOnlyAccount,
} from "@/lib/authz";
import {
  BLOCK_CATALOG,
  BLOCK_IDS_SORTED,
} from "@/lib/questionnaire/blockCatalog";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";
import { DigitalRequestDetailClient } from "@/components/DigitalRequestDetailClient";
import { topicLabel } from "@/lib/digitalRequests/topics";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "Neu",
  in_review: "In Bearbeitung",
  sent: "Versendet",
  closed: "Abgeschlossen",
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "in_review":
      return "bg-orange-100 text-orange-800";
    case "sent":
      return "bg-yellow-100 text-yellow-800";
    case "closed":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DigitalRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  if (isInboxOnlyAccount(account)) {
    redirect("/questionnaires");
  }

  const { id } = await params;

  const request = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOwnershipFilter(account),
      deleted_at: null,
    },
    select: {
      id: true,
      createdAt: true,
      submitter_name: true,
      submitter_email: true,
      requested_topics: true,
      status: true,
      patient_reference: true,
      selected_block_ids: true,
      questionnaire_session_id: true,
      sent_at: true,
    },
  });

  if (!request) {
    notFound();
  }

  const isSent = request.status === "sent" || request.status === "closed";

  // selected_block_ids ist Json? – wir caste auf string[] (leer falls null)
  const savedBlockIds: string[] = Array.isArray(request.selected_block_ids)
    ? (request.selected_block_ids as string[])
    : [];

  const blocks = BLOCK_IDS_SORTED.map((bid) => ({
    id: bid,
    label: BLOCK_CATALOG[bid]?.label ?? bid,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Zurück-Link */}
      <div className="mb-6">
        <Link
          href="/digital-requests"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Alle Anfragen
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-semibold">
        {isSent ? "Anfrage (versendet)" : "Anfrage bearbeiten"}
      </h1>

      {/* Versand-Hinweis (sent / closed) */}
      {isSent && (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          data-testid="sent-notice"
        >
          <p className="font-medium">Fragebogen wurde versendet.</p>
          {request.sent_at && (
            <p className="mt-1 text-green-700">
              Versandzeitpunkt: {formatDate(request.sent_at)}
            </p>
          )}
          {request.questionnaire_session_id && (
            <p className="mt-2">
              <Link
                href={`/questionnaires/${request.questionnaire_session_id}`}
                className="font-medium text-green-700 underline hover:text-green-900"
                data-testid="questionnaire-link"
              >
                Zum erzeugten Fragebogen →
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Anfrage-Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-medium text-gray-500">Name</dt>
          <dd className="text-gray-900">{request.submitter_name}</dd>

          <dt className="font-medium text-gray-500">E-Mail</dt>
          <dd className="text-gray-900">{request.submitter_email}</dd>

          <dt className="font-medium text-gray-500">Eingegangen</dt>
          <dd className="text-gray-900">{formatDate(request.createdAt)}</dd>

          <dt className="font-medium text-gray-500">Status</dt>
          <dd>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(request.status)}`}
            >
              {STATUS_LABEL[request.status] ?? request.status}
            </span>
          </dd>

          {Array.isArray(request.requested_topics) &&
            request.requested_topics.length > 0 && (
              <>
                <dt className="font-medium text-gray-500">Angefragte Anliegen</dt>
                <dd className="text-gray-900">
                  {(request.requested_topics as string[])
                    .map(topicLabel)
                    .join(", ")}
                </dd>
              </>
            )}
        </dl>
      </div>

      {/* Interaktives Formular (deaktiviert wenn versendet) */}
      <DigitalRequestDetailClient
        requestId={request.id}
        initialPatientReference={request.patient_reference ?? null}
        initialSelectedBlockIds={savedBlockIds}
        blocks={blocks}
        isSent={isSent}
      />
    </main>
  );
}
