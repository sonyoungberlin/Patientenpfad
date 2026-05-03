/**
 * Plattform-Admin: Detailseite einer Practice.
 *
 * Funktionen:
 *   - Stammdaten (read-only): Name, Slug, angelegt am
 *   - Vier Feature-Flag-Toggles, die direkt auf `Practice.*` schreiben
 *   - Mitgliederliste (read-only)
 *   - Hinzufügen-Formular für bestehende Accounts (OWNER/ADMIN/USER)
 *
 * Berechtigung: nur eingeloggte, freigeschaltete Plattform-Admins. Sonst
 * Redirect nach `/`. Unbekannte ID → `notFound()` (404).
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";

const ROLE_LABEL: Record<PracticeRole, string> = {
  OWNER: "Inhaber",
  ADMIN: "Admin",
  USER: "Mitarbeiter",
};

const FLAG_LABEL: Record<string, string> = {
  is_approved: "freigeschaltet",
  inquiry_assistant_enabled: "Anfrage-Assistent",
  patient_communication_enabled: "Patientenkommunikation",
  website_forms_enabled: "Website-Formulare",
};

type SearchParams = Promise<{
  error?: string | string[];
  added?: string | string[];
  toggled?: string | string[];
  defaultSet?: string | string[];
  defaultCleared?: string | string[];
}>;

export default async function AdminPracticeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: SearchParams;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { id } = await params;

  const practice = await prisma.practice.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      created_at: true,
      memberships: {
        select: {
          id: true,
          role: true,
          created_at: true,
          account: {
            select: {
              id: true,
              email: true,
              default_practice_id: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { created_at: "asc" }],
      },
    },
  });
  if (!practice) {
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const errorMsg = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const addedEmail = Array.isArray(sp.added) ? sp.added[0] : sp.added;
  const toggledFlag = Array.isArray(sp.toggled) ? sp.toggled[0] : sp.toggled;
  const defaultSetEmail = Array.isArray(sp.defaultSet)
    ? sp.defaultSet[0]
    : sp.defaultSet;
  const defaultClearedEmail = Array.isArray(sp.defaultCleared)
    ? sp.defaultCleared[0]
    : sp.defaultCleared;

  const flags = [
    "is_approved",
    "inquiry_assistant_enabled",
    "patient_communication_enabled",
    "website_forms_enabled",
  ] as const;

  const toggleAction = `/api/admin/practices/${practice.id}`;
  const addMemberAction = `/api/admin/practices/${practice.id}/members`;

  return (
    <main>
      <p>
        <Link href="/admin/practices">← Zurück zur Praxenliste</Link>
      </p>
      <h1>Praxis: {practice.name}</h1>

      {errorMsg && (
        <p role="alert" style={{ color: "#a00", marginBottom: "1rem" }}>
          {errorMsg}
        </p>
      )}
      {addedEmail && (
        <p role="status" style={{ color: "#0a6", marginBottom: "1rem" }}>
          {addedEmail} wurde hinzugefügt.
        </p>
      )}
      {toggledFlag && (
        <p role="status" style={{ color: "#0a6", marginBottom: "1rem" }}>
          {FLAG_LABEL[toggledFlag] ?? toggledFlag} wurde aktualisiert.
        </p>
      )}
      {defaultSetEmail && (
        <p role="status" style={{ color: "#0a6", marginBottom: "1rem" }}>
          Standard-Praxis für {defaultSetEmail} wurde gesetzt.
        </p>
      )}
      {defaultClearedEmail && (
        <p role="status" style={{ color: "#0a6", marginBottom: "1rem" }}>
          Standard-Praxis für {defaultClearedEmail} wurde zurückgesetzt.
        </p>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2>Stammdaten</h2>
        <dl>
          <dt>Name</dt>
          <dd>{practice.name}</dd>
          <dt>Slug</dt>
          <dd>{practice.slug}</dd>
          <dt>Angelegt</dt>
          <dd>{practice.created_at.toISOString().slice(0, 10)}</dd>
        </dl>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Feature-Flags</h2>
        <p className="text-muted" style={{ fontSize: "0.85em" }}>
          Schreibt direkt auf die Praxis. Account-Flags werden hier nicht
          mitgeschrieben (Übergangs-Legacy).
        </p>
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Status</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => {
              const current = practice[flag];
              const next = !current;
              return (
                <tr key={flag}>
                  <td>{FLAG_LABEL[flag]}</td>
                  <td>{current ? "✓ aktiv" : "–"}</td>
                  <td>
                    <form method="POST" action={toggleAction}>
                      <input type="hidden" name="flag" value={flag} />
                      <input
                        type="hidden"
                        name="value"
                        value={next ? "true" : "false"}
                      />
                      <button type="submit">
                        {current ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Mitglieder</h2>
        <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
          {practice.memberships.length} Mitglied
          {practice.memberships.length === 1 ? "" : "er"}
        </p>
        <p
          role="note"
          style={{
            background: "#f0f4ff",
            border: "1px solid #c0d0e8",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.25rem",
            marginBottom: "1rem",
          }}
        >
          Rollenwechsel und Entfernen von Mitgliedern sind nicht möglich.
          „Standard-Praxis“ legt fest, in welche Praxis dieser Account beim
          Login springt — nur Practices, in denen der Account Mitglied ist,
          sind zulässig.
        </p>
        <table>
          <thead>
            <tr>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Beigetreten</th>
              <th>Standard-Praxis</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {practice.memberships.map((m) => {
              const isDefault = m.account.default_practice_id === practice.id;
              const hasOtherDefault =
                !isDefault && Boolean(m.account.default_practice_id);
              const setAction = `/api/admin/accounts/${m.account.id}/default-practice`;
              return (
                <tr key={m.id}>
                  <td>{m.account.email}</td>
                  <td>{ROLE_LABEL[m.role]}</td>
                  <td>{new Date(m.created_at).toLocaleDateString("de-DE")}</td>
                  <td data-default-practice={m.account.email}>
                    {isDefault ? (
                      <strong>✓ diese Praxis</strong>
                    ) : hasOtherDefault ? (
                      <span className="text-muted">andere Praxis</span>
                    ) : (
                      <span className="text-muted">nicht gesetzt</span>
                    )}
                  </td>
                  <td
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {isDefault ? (
                      <form method="POST" action={setAction}>
                        <input type="hidden" name="action" value="clear" />
                        <input
                          type="hidden"
                          name="redirect_practice_id"
                          value={practice.id}
                        />
                        <button
                          type="submit"
                          data-default-clear={m.account.email}
                        >
                          Standard zurücksetzen
                        </button>
                      </form>
                    ) : (
                      <form method="POST" action={setAction}>
                        <input type="hidden" name="action" value="set" />
                        <input
                          type="hidden"
                          name="practice_id"
                          value={practice.id}
                        />
                        <input
                          type="hidden"
                          name="redirect_practice_id"
                          value={practice.id}
                        />
                        <button
                          type="submit"
                          data-default-set={m.account.email}
                        >
                          Als Standard setzen
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {practice.memberships.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  Keine Mitglieder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Mitglied hinzufügen</h2>
        <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
          Nur bestehende Accounts können hinzugefügt werden. Es wird keine
          Einladungs-E-Mail verschickt.
        </p>
        <form
          method="POST"
          action={addMemberAction}
          style={{ display: "grid", gap: "0.5rem", maxWidth: "32rem" }}
        >
          <label>
            E-Mail
            <input
              type="email"
              name="email"
              required
              maxLength={200}
              autoComplete="off"
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Rolle
            <select
              name="role"
              defaultValue={PracticeRole.USER}
              required
              style={{ display: "block", width: "100%" }}
            >
              <option value={PracticeRole.USER}>
                {ROLE_LABEL[PracticeRole.USER]}
              </option>
              <option value={PracticeRole.ADMIN}>
                {ROLE_LABEL[PracticeRole.ADMIN]}
              </option>
              <option value={PracticeRole.OWNER}>
                {ROLE_LABEL[PracticeRole.OWNER]}
              </option>
            </select>
          </label>
          <div>
            <button type="submit">Hinzufügen</button>
          </div>
        </form>
      </section>
    </main>
  );
}
