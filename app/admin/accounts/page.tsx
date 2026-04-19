import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";

export default async function AdminAccountsPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const accounts = await prisma.account.findMany({
    select: { id: true, email: true, is_approved: true, is_admin: true, createdAt: true },
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
              <td>{acc.createdAt.toISOString().slice(0, 10)}</td>
              <td>
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
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                Keine Accounts vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
