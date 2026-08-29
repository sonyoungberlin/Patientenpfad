import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOfficeApplicationsAccessFromCookies, getCurrentPracticeRole } from "@/lib/authz";
import { PracticeRole } from "@prisma/client";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "@/lib/questionnaire/officeBlockCatalog";
import { applicationRoleLabel } from "@/lib/digitalRequests/applicationRoles";
import { OfficeApplicationDetailClient } from "@/components/office/OfficeApplicationDetailClient";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "Neu",
  in_review: "In Bearbeitung",
  sent: "Versendet",
  closed: "Abgeschlossen",
  rejected: "Abgelehnt",
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
    case "rejected":
      return "bg-red-100 text-red-700";
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

export default async function OfficeApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireOfficeApplicationsAccessFromCookies();
  if (!account) redirect("/");

  const { id } = await params;

  const application = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOfficeOwnershipFilter(account),
      request_type: "office",
      deleted_at: null,
    },
    select: {
      id: true,
      createdAt: true,
      submitter_name: true,
      submitter_email: true,
      requested_topics: true,
      concern_text: true,
      status: true,
      selected_block_ids: true,
      questionnaire_session_id: true,
      sent_at: true,
    },
  });

  if (!application) {
    notFound();
  }

  const isSent =
    application.status === "sent" || application.status === "closed";
  const isRejected = application.status === "rejected";

  const role = getCurrentPracticeRole(account);
  const isOwnerOrAdmin =
    role === PracticeRole.OWNER || role === PracticeRole.ADMIN;
  // USER darf nicht löschen
  const canDelete = !isSent && isOwnerOrAdmin;

  const savedBlockIds: string[] = Array.isArray(application.selected_block_ids)
    ? (application.selected_block_ids as string[])
    : [];

  const blocks = OFFICE_BLOCK_IDS_SORTED.map((bid) => ({
    id: bid,
    label: OFFICE_BLOCK_CATALOG[bid]?.label ?? bid,
  }));

  const roleLabels = Array.isArray(application.requested_topics)
    ? (application.requested_topics as string[]).map(applicationRoleLabel)
    : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/office-cases/applications"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Alle Bewerbungsanfragen
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold">
        {isSent
          ? "Bewerbung (versendet)"
          : isRejected
            ? "Bewerbung (abgelehnt)"
            : "Bewerbung bearbeiten"}
      </h1>

      {/* Meta-Info */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>{application.submitter_email}</span>
        <span>·</span>
        <span>{formatDate(application.createdAt)}</span>
        <span>·</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(application.status)}`}
        >
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      </div>

      {/* Versand-Hinweis */}
      {isSent && (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          data-testid="sent-notice"
        >
          <p className="font-medium">Fragebogen wurde versendet.</p>
          {application.sent_at && (
            <p className="mt-1 text-green-700">
              Versandzeitpunkt: {formatDate(application.sent_at)}
            </p>
          )}
          {application.questionnaire_session_id && isOwnerOrAdmin && (
            <p className="mt-2">
              <Link
                href={`/office-cases/questionnaire/${application.questionnaire_session_id}`}
                className="font-medium text-green-700 underline hover:text-green-900"
                data-testid="questionnaire-link"
              >
                Zum erzeugten Fragebogen →
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Ablehnungs-Hinweis */}
      {isRejected && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          data-testid="rejected-notice"
        >
          <p className="font-medium">Bewerbung wurde abgelehnt.</p>
          <p className="mt-1 text-red-700">
            Der Bewerber wurde per E-Mail über die Ablehnung informiert.
          </p>
        </div>
      )}

      <OfficeApplicationDetailClient
        applicationId={application.id}
        submitterName={application.submitter_name}
        roleLabels={roleLabels}
        concernText={application.concern_text}
        initialSelectedBlockIds={savedBlockIds}
        blocks={blocks}
        isSent={isSent}
        isRejected={isRejected}
        canDelete={canDelete}
      />
    </main>
  );
}
