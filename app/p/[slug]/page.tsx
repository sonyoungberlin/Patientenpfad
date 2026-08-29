/**
 * Phase 3c: Öffentliche Formularseite `/p/[slug]`.
 *
 * Rein lesend. Ziel ist die Validierung von Slug-Routing,
 * Mandantenzuordnung und Formular-Rendering. Es gibt **keinen**
 * Submit-Endpoint, **keine** Speicherung von Antworten, **keinen**
 * Mailversand und **keinen** Eintrag in `/questionnaires`.
 *
 * Sichtbarkeits-Cascade — alle negativen Fälle ergeben einheitlich
 * `notFound()` (404), nie 403, damit weder Slug-Existenz noch
 * Account-Status enumerierbar sind:
 *   1. Slug-Format ungültig (siehe `validateSlug`)
 *   2. Slug existiert nicht
 *   3. Formular ist nicht aktiv
 *   4. Owner-Account ist nicht freigegeben (`is_approved = false`)
 *   5. Owner-Account hat Patientenkommunikation deaktiviert
 *      (`patient_communication_enabled = false`)
 *   6. Owner-Account hat Website-Forms-Feature deaktiviert
 *      (`website_forms_enabled = false`)
 *
 * `dynamic = "force-dynamic"` + `revalidate = 0`, damit deaktivierte
 * Formulare nicht aus dem Full Route Cache ausgeliefert werden — analog
 * zum Token-Flow `app/q/[token]/page.tsx`.
 */

import { renderPublicFormPage } from "@/app/p/PublicFormContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderPublicFormPage(slug);
}
