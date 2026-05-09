import { redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { SendPasswordLinkButton } from "./SendPasswordLinkButton";

type FlagKey =
  | "is_approved"
  | "patient_communication_enabled"
  | "website_forms_enabled"
  | "inquiry_assistant_enabled"
  | "office_cases_enabled";

const FLAG_LABEL: Record<FlagKey, string> = {
  is_approved: "freigeschaltet",
  patient_communication_enabled: "Patientenkommunikation",
  website_forms_enabled: "Website-Formulare",
  inquiry_assistant_enabled: "Anfrage-Assistent",
  office_cases_enabled: "Officepfad",
};

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
      office_cases_enabled: true,
      createdAt: true,
      memberships: {
        where: { role: PracticeRole.OWNER },
        select: {
          practice: {
            select: {
              id: true,
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
              office_cases_enabled: true,
            },
          },
        },
      },
    },
    orderBy: [{ is_approved: "asc" }, { createdAt: "desc" }],
  });

  /**
   * Hotfix-Hinweis (PR 1): Quelle der Wahrheit für die Feature-Flags der App
   * ist seit Phase P2 die `Practice` (OWNER-Membership des Logins). Die
   * Toggles unten schreiben deshalb seit diesem PR zusätzlich auf alle
   * OWNER-Practices des Accounts. Wir berechnen pro Account, ob Account-
   * und Practice-Stand auseinanderlaufen, und zeigen das als kompakten
   * Drift-Hinweis an — keine zusätzliche UI, nur eine sichtbare Warnung.
   * Drift verschwindet automatisch, sobald der jeweilige Toggle erneut
   * betätigt wurde (siehe `lib/adminActions.ts`).
   */
  function computeDrift(acc: (typeof accounts)[number]): FlagKey[] {
    const drifted: FlagKey[] = [];
    for (const m of acc.memberships) {
      const p = m.practice;
      const keys: FlagKey[] = [
        "is_approved",
        "patient_communication_enabled",
        "website_forms_enabled",
        "inquiry_assistant_enabled",
        "office_cases_enabled",
      ];
      for (const k of keys) {
        if (acc[k] !== p[k] && !drifted.includes(k)) {
          drifted.push(k);
        }
      }
    }
    return drifted;
  }


  return (
    <main>
      <h1>Admin – Accounts</h1>
      <p
        role="note"
        style={{
          background: "#fff7e0",
          border: "1px solid #e0c060",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.25rem",
          marginBottom: "1rem",
        }}
      >
        Legacy-Ansicht. Quelle der Wahrheit für Feature-Flags ist die Praxis
        — bitte unter <a href="/admin/practices">/admin/practices</a>{" "}
        verwalten. Diese Seite bleibt vorerst bestehen.
      </p>
      <p className="text-muted">
        {accounts.length} Account{accounts.length !== 1 ? "s" : ""} gesamt
      </p>
      <p className="text-muted" style={{ fontSize: "0.85em" }}>
        Hinweis: Quelle der Wahrheit für die App-Sichtbarkeit ist die Praxis
        (OWNER-Membership). Toggles synchronisieren Account und Praxis
        automatisch; verbleibende Abweichungen aus der Übergangsphase werden
        unter „Drift" angezeigt und durch erneutes Toggeln behoben.
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
            <th>Officepfad</th>
            <th>Drift (Account ≠ Praxis)</th>
            <th>Angelegt</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => {
            const drift = computeDrift(acc);
            return (
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
              <td data-oc={acc.email}>
                {acc.office_cases_enabled ? "✓ aktiv" : "–"}
              </td>
              <td data-drift={acc.email}>
                {acc.memberships.length === 0 ? (
                  <span className="text-muted">keine Praxis</span>
                ) : drift.length === 0 ? (
                  "–"
                ) : (
                  <span style={{ color: "#a00" }}>
                    ⚠ {drift.map((k) => FLAG_LABEL[k]).join(", ")}
                  </span>
                )}
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
                <form method="POST" action="/api/admin/accounts">
                  <input type="hidden" name="email" value={acc.email} />
                  <input
                    type="hidden"
                    name="action"
                    value={
                      acc.office_cases_enabled
                        ? "disable_office_cases"
                        : "enable_office_cases"
                    }
                  />
                  <button type="submit" data-oc-toggle={acc.email}>
                    {acc.office_cases_enabled
                      ? "Officepfad deaktivieren"
                      : "Officepfad aktivieren"}
                  </button>
                </form>
                <SendPasswordLinkButton email={acc.email} />
              </td>
            </tr>
            );
          })}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={10} className="text-muted">
                Keine Accounts vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
