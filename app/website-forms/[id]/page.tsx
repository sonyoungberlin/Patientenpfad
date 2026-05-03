/**
 * Phase 3b: Detail- und Bearbeitungsseite für ein
 * `PracticeQuestionnaireForm`.
 *
 * Doppeltes Feature-Gate via
 * `requireWebsiteFormsManagementAccessFromCookies`. Eigentum wird strikt
 * durchgesetzt: fremde IDs erzeugen `notFound()` (404), nicht 403, damit
 * IDs nicht enumeriert werden können.
 *
 * Phase-3b-Scope:
 *   - Bearbeiten (Titel, Slug, Intro, Block-Auswahl, Aktiv-Flag)
 *   - Aktiv-Toggle als separates Mini-Form (`action: "toggle_active"`)
 *   - Anzeige des öffentlichen Links inkl. Hinweis-Box, dass der Patient
 *     nach dem Absenden den Link in der Bestätigungs-E-Mail bestätigen
 *     muss, bevor der Eingang in der Fragebogenliste erscheint.
 *   - **Kein** Löschen.
 */

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requirePracticeRoleFromCookies,
  requireWebsiteFormsManagementAccessFromCookies,
} from "@/lib/authz";
import { BLOCK_CATALOG, BLOCK_IDS_SORTED } from "@/lib/questionnaire/blockCatalog";
import { ownsForm } from "@/lib/websiteForms/practiceScope";
import CopyPublicLinkButton from "@/components/websiteForms/CopyPublicLinkButton";

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function WebsiteFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: SearchParams;
}) {
  const account = await requireWebsiteFormsManagementAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // P4a: Zusätzlich zur Feature-Flag-Prüfung wird die Praxis-Rolle gegated.
  // Nur OWNER/ADMIN dürfen Website-Formulare verwalten; USER → notFound()
  // (kein 403, Konvention für Praxis-Pfade). Kein Plattform-Admin-Bypass.
  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed) {
    notFound();
  }

  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const errorMsg = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const form = await prisma.practiceQuestionnaireForm.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      slug: true,
      intro_text: true,
      is_active: true,
      selected_block_ids: true,
    },
  });

  // Nicht gefunden ODER nicht im Praxis-/Account-Scope des aktuellen
  // Accounts → 404. 404 statt 403, damit IDs nicht enumerierbar sind.
  if (!form || !ownsForm(account, form)) {
    notFound();
  }

  const selectedBlockIds = Array.isArray(form.selected_block_ids)
    ? (form.selected_block_ids as string[])
    : [];
  const selectedSet = new Set(selectedBlockIds);

  // Origin für den öffentlichen Link bestimmen.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const publicLink = `${origin}/p/${form.slug}`;

  return (
    <main>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link href="/website-forms">← Zurück zur Übersicht</Link>
      </p>
      <h1>{form.title}</h1>

      {errorMsg && (
        <p role="alert" style={{ color: "#a00", marginBottom: "1rem" }}>
          {errorMsg}
        </p>
      )}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Öffentlicher Link</h2>
        <p
          style={{
            background: "#fff8e0",
            border: "1px solid #e0c060",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.25rem",
            marginBottom: "0.5rem",
          }}
        >
          Öffentliche Formularseite ist aktiv. Nach dem Absenden muss der
          Patient den Link in der Bestätigungs-E-Mail anklicken, erst dann
          erscheint der Eingang in der Fragebogenliste.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            readOnly
            value={publicLink}
            style={{ flexGrow: 1, fontFamily: "monospace" }}
            aria-label="Öffentlicher Link"
          />
          <CopyPublicLinkButton link={publicLink} />
        </div>
        <p className="text-muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Status: {form.is_active ? "aktiv" : "inaktiv"}
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Status ändern</h2>
        <form method="POST" action={`/api/website-forms/${form.id}`}>
          <input type="hidden" name="action" value="toggle_active" />
          <button type="submit">
            {form.is_active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </form>
      </section>

      <section>
        <h2>Bearbeiten</h2>
        <form
          method="POST"
          action={`/api/website-forms/${form.id}`}
          style={{ display: "grid", gap: "0.75rem", maxWidth: "40rem" }}
        >
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Titel</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              defaultValue={form.title}
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Slug</span>
            <input
              type="text"
              name="slug"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]([a-z0-9]|-(?!-))*[a-z0-9]"
              defaultValue={form.slug}
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Intro-Text (optional)</span>
            <textarea
              name="intro_text"
              rows={3}
              maxLength={2000}
              defaultValue={form.intro_text ?? ""}
            />
          </label>
          <fieldset style={{ display: "grid", gap: "0.25rem" }}>
            <legend>Fragebogen-Blöcke</legend>
            {BLOCK_IDS_SORTED.map((blockId) => (
              <label key={blockId} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="selected_block_ids"
                  value={blockId}
                  defaultChecked={selectedSet.has(blockId)}
                />
                <span>{BLOCK_CATALOG[blockId]?.label ?? blockId}</span>
              </label>
            ))}
          </fieldset>
          <label style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={form.is_active}
            />
            <span>Aktiv</span>
          </label>
          <div>
            <button type="submit">Speichern</button>
          </div>
        </form>
      </section>
    </main>
  );
}
