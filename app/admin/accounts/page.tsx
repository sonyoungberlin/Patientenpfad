import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";

export default async function AdminAccountsPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      email: true,
      is_approved: true,
      is_admin: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      createdAt: true,
    },
    orderBy: [{ is_approved: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <h1>Admin – Accounts</h1>
      <p className="text-muted">
        {accounts.length} Account{accounts.length !== 1 ? "s" : ""} gesamt
      </p>
      <table>
        <thead>
          <tr>
            <th>E-Mail</th>
            <th>Status</th>
            <th>Admin</th>
            <th>Anfrage-Assistent</th>
            <th>Patientenkommunikation</th>
            <th>Website-Formulare</th>
            <th>Angelegt</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.id}>
              <td>{acc.email}</td>
              <td>{acc.is_approved ? "✓ freigeschaltet" : "✗ gesperrt"}</td>
              <td>{acc.is_admin ? "Admin" : "–"}</td>
              <td>{acc.inquiry_assistant_enabled ? "✓ aktiv" : "–"}</td>
              <td data-pc={acc.email}>
                {acc.patient_communication_enabled ? "✓ aktiv" : "–"}
              </td>
              <td data-wf={acc.email}>
                {acc.website_forms_enabled ? "✓ aktiv" : "–"}
              </td>
              <td>{acc.createdAt.toISOString().slice(0, 10)}</td>
              <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <form method="POST" action="/api/admin/accounts">
                  <input type="hidden" name="email" value={acc.email} />
                  <input
                    type="hidden"
                    name="action"
                    value={acc.is_approved ? "revoke" : "approve"}
                  />
                  <button type="submit">
                    {acc.is_approved ? "Sperren" : "Freischalten"}
                  </button>
                </form>
                <form method="POST" action="/api/admin/accounts">
                  <input type="hidden" name="email" value={acc.email} />
                  <input
                    type="hidden"
                    name="action"
                    value={acc.inquiry_assistant_enabled ? "disable_inquiry" : "enable_inquiry"}
                  />
                  <button type="submit">
                    {acc.inquiry_assistant_enabled ? "Anfrage deaktivieren" : "Anfrage aktivieren"}
                  </button>
                </form>
                <form method="POST" action="/api/admin/accounts">
                  <input type="hidden" name="email" value={acc.email} />
                  <input
                    type="hidden"
                    name="action"
                    value={
                      acc.patient_communication_enabled
                        ? "disable_patient_communication"
                        : "enable_patient_communication"
                    }
                  />
                  <button type="submit" data-pc-toggle={acc.email}>
                    {acc.patient_communication_enabled
                      ? "Patientenkommunikation deaktivieren"
                      : "Patientenkommunikation aktivieren"}
                  </button>
                </form>
                <form method="POST" action="/api/admin/accounts">
                  <input type="hidden" name="email" value={acc.email} />
                  <input
                    type="hidden"
                    name="action"
                    value={
                      acc.website_forms_enabled
                        ? "disable_website_forms"
                        : "enable_website_forms"
                    }
                  />
                  <button type="submit" data-wf-toggle={acc.email}>
                    {acc.website_forms_enabled
                      ? "Website-Formulare deaktivieren"
                      : "Website-Formulare aktivieren"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={8} className="text-muted">
                Keine Accounts vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
