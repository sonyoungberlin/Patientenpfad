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
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Admin – Accounts</h1>
      <p style={{ color: "#666" }}>
        {accounts.length} Account{accounts.length !== 1 ? "s" : ""} gesamt
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={thStyle}>E-Mail</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Admin</th>
            <th style={thStyle}>Angelegt</th>
            <th style={thStyle}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.id}>
              <td style={tdStyle}>{acc.email}</td>
              <td style={tdStyle}>{acc.is_approved ? "✓ freigeschaltet" : "✗ gesperrt"}</td>
              <td style={tdStyle}>{acc.is_admin ? "Admin" : "–"}</td>
              <td style={tdStyle}>{acc.createdAt.toISOString().slice(0, 10)}</td>
              <td style={tdStyle}>
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
              <td colSpan={5} style={{ ...tdStyle, color: "#999" }}>
                Keine Accounts vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #ccc",
  padding: "0.5rem 1rem",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "0.5rem 1rem",
};
