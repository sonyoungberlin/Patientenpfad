/**
 * Statische Registry zustaendiger externer Stellen (Bund / Land Berlin),
 * die im Office-/Compliance-Pfad referenziert werden.
 *
 * IDs sind code-, JSON-, URL- und testfreundlich (nur [A-Z0-9_]).
 * `sourceUrl` verweist ausschliesslich auf offizielle Webauftritte.
 */

import type { LegalSourceId } from "@/lib/office/legalSources";

export type AuthorityKind =
  | "KV"
  | "AERZTEKAMMER"
  | "ZULASSUNGSAUSSCHUSS"
  | "DATENSCHUTZ"
  | "BERUFSGENOSSENSCHAFT"
  | "SOZIALVERSICHERUNG"
  | "FINANZ"
  | "BEHOERDE"
  | "KAMMER"
  | "SONSTIGE";

export type AuthorityScope = "BUND" | "BERLIN";

export type Authority = {
  /** Stabile ID, z. B. "KV_BERLIN". */
  id: string;
  /** Vollstaendiger amtlicher Name. */
  name: string;
  kind: AuthorityKind;
  scope: AuthorityScope;
  /** Offizielle Webpraesenz der Stelle. */
  sourceUrl?: string;
  /** Optional verknuepfte Rechtsgrundlagen (z. B. Errichtungsgesetz). */
  legalBasis?: readonly LegalSourceId[];
  note?: string;
};

export const AUTHORITIES: readonly Authority[] = [
  // ---------- KV / Vertragsarztrecht ----------
  {
    id: "KV_BERLIN",
    name: "Kassenaerztliche Vereinigung Berlin",
    kind: "KV",
    scope: "BERLIN",
    sourceUrl: "https://www.kvberlin.de/",
    legalBasis: ["SGB_V_PAR_95", "BMV_AE"],
  },
  {
    id: "ZULASSUNGSAUSSCHUSS_BERLIN",
    name: "Zulassungsausschuss Aerzte Berlin",
    kind: "ZULASSUNGSAUSSCHUSS",
    scope: "BERLIN",
    sourceUrl: "https://www.kvberlin.de/fuer-die-praxis/zulassung",
    legalBasis: ["AERZTE_ZV_PAR_32B", "SGB_V_PAR_95"],
  },

  // ---------- Aerztekammer ----------
  {
    id: "AERZTEKAMMER_BERLIN",
    name: "Aerztekammer Berlin",
    kind: "AERZTEKAMMER",
    scope: "BERLIN",
    sourceUrl: "https://www.aekb.de/",
    legalBasis: ["HEILBERG_BLN"],
  },

  // ---------- Datenschutz ----------
  {
    id: "BERLIN_DATENSCHUTZBEAUFTRAGTE",
    name: "Berliner Beauftragte fuer Datenschutz und Informationsfreiheit",
    kind: "DATENSCHUTZ",
    scope: "BERLIN",
    sourceUrl: "https://www.datenschutz-berlin.de/",
    legalBasis: ["DSGVO_ART_33", "BLN_DSG"],
    note: "Zustaendige Aufsichtsbehoerde fuer nicht-oeffentliche Stellen in Berlin.",
  },

  // ---------- Unfallversicherung / Arbeitsschutz ----------
  {
    id: "BG_BGW",
    name: "Berufsgenossenschaft fuer Gesundheitsdienst und Wohlfahrtspflege",
    kind: "BERUFSGENOSSENSCHAFT",
    scope: "BUND",
    sourceUrl: "https://www.bgw-online.de/",
  },

  // ---------- Sozialversicherung ----------
  {
    id: "MINIJOB_ZENTRALE",
    name: "Minijob-Zentrale (Deutsche Rentenversicherung Knappschaft-Bahn-See)",
    kind: "SOZIALVERSICHERUNG",
    scope: "BUND",
    sourceUrl: "https://www.minijob-zentrale.de/",
  },
  {
    id: "KRANKENKASSE_EINZUGSSTELLE",
    name: "Krankenkasse als Einzugsstelle der Gesamtsozialversicherungsbeitraege",
    kind: "SOZIALVERSICHERUNG",
    scope: "BUND",
  },

  // ---------- Finanzen / Land ----------
  {
    id: "FINANZAMT_BERLIN",
    name: "Finanzamt (zustaendiges Berliner Finanzamt)",
    kind: "FINANZ",
    scope: "BERLIN",
    sourceUrl: "https://www.berlin.de/sen/finanzen/",
    note: "Aktuell von keinem Checkpoint referenziert. ELStAM-Bezug in MF-03 laeuft ueber EStG § 39e ohne unmittelbaren Behoerden-Bezug; Eintrag bleibt fuer kuenftige Topics (z. B. Praxisform-/Steuerverfahren) vorgehalten.",
  },

  // ---------- Arbeitsschutz Land Berlin ----------
  {
    id: "LAGETSI_BERLIN",
    name: "Landesamt fuer Arbeitsschutz, Gesundheitsschutz und technische Sicherheit Berlin (LAGetSi)",
    kind: "BEHOERDE",
    scope: "BERLIN",
    sourceUrl: "https://www.berlin.de/lagetsi/",
    note: "Kanonische Berliner Aufsicht fuer Jugend-/Arbeitsschutz, technische Sicherheit sowie Betreiberueberwachung Medizinprodukte (MPBetreibV). Nicht zu verwechseln mit LAGeSo (Landesamt fuer Gesundheit und Soziales).",
  },

  // ---------- Wirtschaftlichkeitspruefung Berlin ----------
  {
    id: "PRUEFUNGSSTELLE_BERLIN",
    name: "Gemeinsame Pruefungseinrichtungen der Aerzte und Krankenkassen Berlin (Pruefungsstelle und Beschwerdeausschuss)",
    kind: "BEHOERDE",
    scope: "BERLIN",
    legalBasis: ["SGB_V_PAR_106", "SGB_V_PAR_106C"],
    note: "Eigenstaendige gemeinsame Einrichtung der KV Berlin und der Landesverbaende der Krankenkassen nach § 106c SGB V; entscheidet ueber Wirtschaftlichkeits- und Verordnungspruefungen.",
  },

  // ---------- Gesundheitsamt / Infektionsschutz ----------
  {
    id: "GESUNDHEITSAMT_BERLIN",
    name: "Bezirkliches Gesundheitsamt Berlin (zustaendig nach Praxissitz)",
    kind: "BEHOERDE",
    scope: "BERLIN",
    legalBasis: ["IFSG_PAR_8", "IFSG_PAR_9"],
    note: "Berlin fuehrt 12 bezirkliche Gesundheitsaemter; zustaendig ist das Amt am Sitz der Arztpraxis. Meldungen nach §§ 6, 7, 9 IfSG grundsaetzlich elektronisch ueber DEMIS.",
  },
  {
    id: "BFARM",
    name: "Bundesinstitut fuer Arzneimittel und Medizinprodukte (BfArM)",
    kind: "BEHOERDE",
    scope: "BUND",
    sourceUrl: "https://www.bfarm.de/",
    note: "Zentrale Bundesbehoerde fuer Medizinprodukte-Vorkommnisse (Abgrenzung zum eigenen Topic Medizinprodukte; nicht im Topic Meldepflichten doppelt modellieren).",
  },
] as const satisfies readonly Authority[];

export type AuthorityId = (typeof AUTHORITIES)[number]["id"];

const AUTHORITY_INDEX: ReadonlyMap<string, Authority> = new Map(
  AUTHORITIES.map((entry) => [entry.id, entry]),
);

export function listAuthorities(): readonly Authority[] {
  return AUTHORITIES;
}

export function isAuthorityId(value: string): value is AuthorityId {
  return AUTHORITY_INDEX.has(value);
}

export function getAuthority(id: AuthorityId): Authority {
  const entry = AUTHORITY_INDEX.get(id);
  if (!entry) {
    throw new Error(`Unknown authority id: ${id}`);
  }
  return entry;
}
