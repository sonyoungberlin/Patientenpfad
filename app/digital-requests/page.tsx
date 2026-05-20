/**
 * Phase A: Interne Praxis-Übersicht für Digitale Anfragen.
 *
 * Zugriff: requirePatientCommunicationAccessFromCookies + kein INBOX_ONLY.
 * INBOX_ONLY-Accounts werden zu `/questionnaires` weitergeleitet.
 *
 * Zeigt maximal 100 Anfragen (neuste zuerst), jeweils mit:
 * Name, Eingang, Status-Badge, Anliegen-Auszug (max. 80 Zeichen).
 *
 * Phase A: Kein „Bearbeiten"-Button, kein Pagination.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  requirePatientCommunicationAccessFromCookies,
  isInboxOnlyAccount,
} from "@/lib/authz";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";

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

export default async function DigitalRequestsPage() {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // INBOX_ONLY hat keinen Zugriff auf Digitale Anfragen.
  if (isInboxOnlyAccount(account)) {
    redirect("/questionnaires");
  }

  const requests = await prisma.digitalRequest.findMany({
    where: {
      ...getOwnershipFilter(account),
      deleted_at: null,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      submitter_name: true,
      status: true,
      concern_text: true,
    },
  });

  const activeRequests = requests.filter(
    (r) => r.status !== "sent" && r.status !== "closed",
  );
  const sentRequests = requests.filter(
    (r) => r.status === "sent" || r.status === "closed",
  );

  function renderTable(rows: typeof requests, label: string) {
    if (rows.length === 0) return null;
    return (
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Eingegangen</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Anliegen</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((req) => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">
                    {req.submitter_name}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(req.status)}`}
                    >
                      {STATUS_LABEL[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {req.concern_text
                      ? req.concern_text.length > 80
                        ? `${req.concern_text.slice(0, 80)}…`
                        : req.concern_text
                      : <span className="text-gray-400">–</span>}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/digital-requests/${req.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {req.status === "sent" || req.status === "closed"
                        ? "Ansehen"
                        : "Bearbeiten"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Digitale Anfragen</h1>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-500">
          Noch keine Anfragen eingegangen.
        </p>
      ) : (
        <>
          {renderTable(activeRequests, "Offen")}
          {renderTable(sentRequests, "Versendet / Abgeschlossen")}
        </>
      )}
    </main>
  );
}
