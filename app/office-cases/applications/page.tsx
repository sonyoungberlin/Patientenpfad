import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccessFromCookies } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { applicationRoleLabel } from "@/lib/digitalRequests/applicationRoles";

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

export default async function OfficeApplicationsPage() {
  const account = await requireOfficeQuestionnaireAccessFromCookies();
  if (!account) redirect("/");

  const applications = await prisma.digitalRequest.findMany({
    where: {
      ...getOfficeOwnershipFilter(account),
      request_type: "office",
      deleted_at: null,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      submitter_name: true,
      submitter_email: true,
      requested_topics: true,
      status: true,
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Bewerbungsanfragen</h1>

      {applications.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Bewerbungsanfragen eingegangen.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Eingegangen</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Bewirbt sich als</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const roles = Array.isArray(app.requested_topics)
                  ? (app.requested_topics as string[]).map(applicationRoleLabel).join(", ")
                  : "—";
                return (
                  <tr key={app.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{app.submitter_name}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(app.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(app.status)}`}
                      >
                        {STATUS_LABEL[app.status] ?? app.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{roles}</td>
                    <td className="py-3">
                      <Link
                        href={`/office-cases/applications/${app.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Öffnen →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
