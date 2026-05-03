/**
 * Phase 3b: Praxis-UI für öffentliche Website-Fragebögen.
 *
 * Diese Seite ist nur für Praxis-Accounts sichtbar, die **beide**
 * Feature-Flags besitzen (`patient_communication_enabled` +
 * `website_forms_enabled`). Andere Aufrufer werden nach `/` umgeleitet
 * (kein Admin-Bypass).
 *
 * Phase-3b-Scope:
 *   - Liste eigener `PracticeQuestionnaireForm`-Einträge (strikt gefiltert
 *     auf `owner_account_id = account.id`).
 *   - Inline-Anlege-Formular (HTML-`<form method="POST">`).
 *   - **Kein** Löschen.
 *   - **Keine** Admin-Gesamtübersicht.
 *
 * Die öffentliche Route `/p/[slug]` existiert noch nicht — Phase 3b erzeugt
 * den Link nur als Vorschau.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireWebsiteFormsManagementAccessFromCookies } from "@/lib/authz";
import { BLOCK_CATALOG, BLOCK_IDS_SORTED } from "@/lib/questionnaire/blockCatalog";

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function WebsiteFormsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const account = await requireWebsiteFormsManagementAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  const sp = (await searchParams) ?? {};
  const errorMsg = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const forms = await prisma.practiceQuestionnaireForm.findMany({
    where: { owner_account_id: account.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      title: true,
      slug: true,
      is_active: true,
      selected_block_ids: true,
    },
  });

  return (
    <main>
      <h1>Website-Formulare</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Öffentliche Fragebögen, die Sie auf Ihrer Praxis-Website verlinken
        können. Hinweis: die öffentliche Aufruf-Seite wird in einer späteren
        Phase aktiviert; angelegte Formulare sind aktuell noch nicht über den
        Link erreichbar.
      </p>

      {errorMsg && (
        <p
          role="alert"
          style={{ color: "#a00", marginBottom: "1rem" }}
        >
          {errorMsg}
        </p>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2>Bestehende Formulare</h2>
        <p className="text-muted" style={{ marginBottom: "1rem" }}>
          {forms.length} Formular{forms.length === 1 ? "" : "e"}
        </p>
        {forms.length === 0 ? (
          <p className="text-muted">Noch keine Website-Formulare angelegt.</p>
        ) : (
          <ul style={{ display: "grid", gap: "0.75rem", padding: 0, listStyle: "none" }}>
            {forms.map((f) => {
              const blockIds = Array.isArray(f.selected_block_ids)
                ? (f.selected_block_ids as string[])
                : [];
              return (
                <li
                  key={f.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "0.25rem",
                    padding: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <strong>{f.title}</strong>{" "}
                      <span className="text-muted">/p/{f.slug}</span>
                    </div>
                    <div>
                      {f.is_active ? (
                        <span>aktiv</span>
                      ) : (
                        <span className="text-muted">inaktiv</span>
                      )}
                    </div>
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.875rem" }}>
                    {blockIds.length} Block{blockIds.length === 1 ? "" : "s"} ·
                    angelegt {new Date(f.createdAt).toLocaleDateString("de-DE")}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <Link href={`/website-forms/${f.id}`}>Bearbeiten</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Neues Formular anlegen</h2>
        <form
          method="POST"
          action="/api/website-forms"
          style={{ display: "grid", gap: "0.75rem", maxWidth: "40rem" }}
        >
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Titel</span>
            <input type="text" name="title" required maxLength={120} />
          </label>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Slug (Teil der öffentlichen URL: /p/[slug])</span>
            <input
              type="text"
              name="slug"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]([a-z0-9]|-(?!-))*[a-z0-9]"
              placeholder="praxis-mueller"
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Intro-Text (optional)</span>
            <textarea name="intro_text" rows={3} maxLength={2000} />
          </label>
          <fieldset style={{ display: "grid", gap: "0.25rem" }}>
            <legend>Fragebogen-Blöcke</legend>
            {BLOCK_IDS_SORTED.map((id) => (
              <label key={id} style={{ display: "flex", gap: "0.5rem" }}>
                <input type="checkbox" name="selected_block_ids" value={id} />
                <span>{BLOCK_CATALOG[id]?.label ?? id}</span>
              </label>
            ))}
          </fieldset>
          <label style={{ display: "flex", gap: "0.5rem" }}>
            <input type="checkbox" name="is_active" value="true" defaultChecked />
            <span>Aktiv</span>
          </label>
          <div>
            <button type="submit">Anlegen</button>
          </div>
        </form>
      </section>
    </main>
  );
}
