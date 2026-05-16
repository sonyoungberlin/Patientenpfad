/**
 * Statische Registry der Nachweis-/Dokumenttypen, die im Office-/Compliance-
 * Pfad als requiredEvidenceKeys oder optionalEvidenceKeys referenziert werden.
 *
 * IDs sind code-, JSON-, URL- und testfreundlich (nur [A-Z0-9_]).
 */

export type EvidenceCategory =
  | "QUALIFIKATIONSNACHWEIS"
  | "VERTRAG"
  | "VERSICHERUNG"
  | "BEHOERDLICHE_BESTAETIGUNG"
  | "INTERNES_DOKUMENT"
  | "MELDUNG"
  | "PROTOKOLL"
  | "AUSHANG"
  | "AUSWERTUNG"
  | "SONSTIGES";

export type Evidence = {
  /** Stabile ID, z. B. "APPROBATIONSURKUNDE". */
  id: string;
  /** Lesbarer Titel des Dokuments. */
  label: string;
  category: EvidenceCategory;
  /** Hinweis auf Form (Original, beglaubigte Kopie, Export). */
  formatHint?: string;
  /** Aufbewahrungshinweis (kein verbindlicher Rechtsrat). */
  retentionHint?: string;
  note?: string;
  /** Wie lange ist der Nachweis ab issuedAt/performedAt gültig? */
  validityMonths?: number;
  /** Wie oft muss der Nachweis ab performedAt erneuert werden? */
  recurrenceMonths?: number;
  /** Welches Datum ist fachlich relevant? */
  dateType?: "issuedAt" | "performedAt" | "receivedAt" | "detectedAt";
};

export const EVIDENCES = [
  // ---------- Qualifikation ----------
  {
    id: "APPROBATIONSURKUNDE",
    label: "Approbationsurkunde",
    category: "QUALIFIKATIONSNACHWEIS",
    formatHint: "Original oder beglaubigte Kopie",
  },
  {
    id: "FACHARZTURKUNDE",
    label: "Facharzturkunde",
    category: "QUALIFIKATIONSNACHWEIS",
    formatHint: "Original oder beglaubigte Kopie",
  },
  {
    id: "REGISTERAUSZUG_AERZTE",
    label: "Auszug aus dem Aerzteregister",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "MFA_BERUFSABSCHLUSS",
    label: "Berufsabschlusszeugnis Medizinische Fachangestellte",
    category: "QUALIFIKATIONSNACHWEIS",
  },

  // ---------- Versicherung ----------
  {
    id: "BERUFSHAFTPFLICHT_NACHWEIS",
    label: "Nachweis der Berufshaftpflichtversicherung",
    category: "VERSICHERUNG",
  },

  // ---------- Vertraege ----------
  {
    id: "ARBEITSVERTRAG",
    label: "Arbeitsvertrag",
    category: "VERTRAG",
  },
  {
    id: "VERTRETUNGSREGELUNG",
    label: "Schriftliche Vertretungsregelung",
    category: "VERTRAG",
  },

  // ---------- Behoerdliche Bestaetigungen ----------
  {
    id: "ANSTELLUNGSGENEHMIGUNG_ZA",
    label: "Anstellungsgenehmigung des Zulassungsausschusses",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "ZULASSUNGSBESCHEID_ZA",
    label: "Zulassungsbescheid des Zulassungsausschusses (§ 95 SGB V, Aerzte-ZV)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Originalbescheid mit Wirkungszeitpunkt der Zulassung und Bindung an den Vertragsarztsitz.",
  },
  {
    id: "ANTRAG_ZULASSUNG_ZA",
    label: "Antrag auf Zulassung an den Zulassungsausschuss (§ 18 Aerzte-ZV)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Schriftlicher Antrag mit Pflichtangaben und Anlagenverzeichnis.",
  },
  {
    id: "GENEHMIGUNGSANTRAG_KV",
    label: "Genehmigungsantrag fuer genehmigungspflichtige Leistung an die KV",
    category: "INTERNES_DOKUMENT",
    formatHint: "Antrag an die KV Berlin gemaess der jeweils einschlaegigen Qualitaetssicherungs-/Genehmigungsvereinbarung.",
  },
  {
    id: "LANR_BSNR_BESTAETIGUNG",
    label: "Bestaetigung der LANR/BSNR-Zuordnung",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "GENEHMIGUNG_LEISTUNG_KV",
    label: "Leistungsgenehmigung der KV",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },

  // ---------- Personal / interne Dokumente ----------
  {
    id: "PERSONALAKTE_GRUNDDATEN",
    label: "Personalakte Grunddaten",
    category: "INTERNES_DOKUMENT",
  },
  {
    id: "LOHNSTEUERMERKMALE_ELSTAM",
    label: "Lohnsteuermerkmale (ELStAM)",
    category: "INTERNES_DOKUMENT",
  },
  {
    id: "EINARBEITUNGSPLAN",
    label: "Einarbeitungsplan / Einarbeitungsprotokoll",
    category: "INTERNES_DOKUMENT",
  },

  // ---------- Meldungen ----------
  {
    id: "SV_ANMELDUNG",
    label: "Sozialversicherungs-Anmeldung",
    category: "MELDUNG",
  },
  {
    id: "DS_MELDUNG_AUFSICHT",
    label: "Datenschutz-Meldung an die Aufsichtsbehoerde (Art. 33 DSGVO)",
    category: "MELDUNG",
  },
  {
    id: "DS_BETROFFENEN_INFO",
    label: "Information der betroffenen Person (Art. 34 DSGVO)",
    category: "MELDUNG",
  },

  // ---------- Protokolle ----------
  {
    id: "DS_VORFALL_PROTOKOLL",
    label: "Datenschutz-Vorfallprotokoll",
    category: "PROTOKOLL",
  },
  {
    id: "DS_RISIKOBEWERTUNG",
    label: "Datenschutz-Risikobewertung des Vorfalls (Art. 33 Abs. 3 lit. b DSGVO)",
    category: "PROTOKOLL",
  },
  {
    id: "DS_TOM_DOKU",
    label: "Dokumentation der technisch-organisatorischen Massnahmen",
    category: "INTERNES_DOKUMENT",
  },
  {
    id: "DS_MASSNAHMENPLAN",
    label: "Massnahmenplan zur Schadensbegrenzung und Folgevermeidung nach Datenschutzvorfall",
    category: "INTERNES_DOKUMENT",
  },

  // ---------- Aushaenge / Patienteninformation ----------
  {
    id: "PATIENTENINFO_AUSHANG",
    label: "Patienteninformation (Aushang/Website) zur Schliessung/Vertretung",
    category: "AUSHANG",
  },
  {
    id: "PATIENTENINFO_SPRECHZEITEN",
    label: "Patienteninformation zu Sprechstundenzeiten (Aushang/Website/Telefonansage)",
    category: "AUSHANG",
    formatHint: "Aktuelle Sprechzeiten inkl. offener Sprechstunden, soweit nach § 19a Aerzte-ZV einschlaegig.",
  },
  {
    id: "SPRECHZEITEN_MELDUNG_KV",
    label: "Meldung der Sprechstundenzeiten an die KV (§ 19a Aerzte-ZV)",
    category: "MELDUNG",
    formatHint: "Aktualisierung des KV-Praxisprofils mit neuen Sprechstunden- und offenen Sprechstundenzeiten.",
  },
  {
    // Spezifisch fuer das Topic Oeffnungszeiten/Sprechstundenplanung (OE).
    // Abgrenzung zu DIENSTPLAN (allg. Termin-/Vertretungsplan im UV-Topic).
    id: "DIENSTPLAN_PRAXIS",
    label: "Interner Dienst-/Schichtplan der Praxis (Sprechstunden-/Oeffnungszeiten)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Personalverfuegbarkeit fuer die geaenderten Sprechstundenzeiten dokumentiert.",
    note: "Spezifisch fuer Topic oeffnungszeiten-erweiterung-praxis; fuer Vertretungs-/Terminplanung im UV-Topic wird DIENSTPLAN verwendet.",
  },
  {
    id: "IFSG_MELDUNG",
    label: "Meldung nach IfSG (§§ 6, 7, 9) an das zustaendige Gesundheitsamt",
    category: "MELDUNG",
    formatHint: "Grundsaetzlich elektronisch ueber DEMIS; ersatzweise auf dem vom Gesundheitsamt vorgesehenen Meldeweg. Frist: unverzueglich, spaetestens 24 Stunden nach Kenntniserlangung.",
  },
  {
    id: "NOTFALL_RUFNUMMERN",
    label: "Notfall-Rufnummern und Verweisinformationen",
    category: "AUSHANG",
  },

  // ---------- Planung / Auswertungen ----------
  {
    // Generischer Termin-/Vertretungsplan (UV-Topic).
    // Abgrenzung zu DIENSTPLAN_PRAXIS (Sprechstunden-/Oeffnungszeitenplan im OE-Topic).
    id: "DIENSTPLAN",
    label: "Termin- und Vertretungsplan der Praxis",
    category: "INTERNES_DOKUMENT",
    note: "Generisch fuer Vertretungs-/Terminplanung im UV-Topic; fuer Sprechstunden-/Oeffnungszeitenplanung wird DIENSTPLAN_PRAXIS verwendet.",
  },
  {
    id: "QUARTALSPROFIL_PVS",
    label: "Quartalsprofil-Auswertung aus dem Praxisverwaltungssystem",
    category: "AUSWERTUNG",
  },
  {
    id: "TAGESPROFIL_PVS",
    label: "Tagesprofil-Auswertung aus dem Praxisverwaltungssystem",
    category: "AUSWERTUNG",
  },
  {
    id: "ZEITPROFIL_PVS",
    label: "Zeitprofil-Auswertung aus dem Praxisverwaltungssystem (§ 106d SGB V)",
    category: "AUSWERTUNG",
  },
  {
    id: "ABRECHNUNGSDATENEXPORT",
    label: "Abrechnungsdatenexport (KBV-konform)",
    category: "AUSWERTUNG",
  },
  {
    // ID aus Bestandsgruenden beibehalten; Label deckt sowohl Plausibilitaets- als auch sonstige
    // Abrechnungsrueckfragen ab (§ 106d SGB V umfasst sachlich-rechnerische Richtigstellung und Plausi).
    id: "STELLUNGNAHME_KV_PLAUSIBILITAET",
    label: "Stellungnahme der Praxis gegenueber der KV im Abrechnungs-/Plausibilitaetsverfahren (§ 106d SGB V)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Schriftliche Stellungnahme an die KV, einschliesslich Anlagen (PVS-Auswertungen, Genehmigungen, Erlaeuterungen).",
    note: "Wird sowohl im KV-Plausibilitaetsverfahren (PL) als auch bei allgemeinen KV-Abrechnungsrueckfragen (KV-Topic) verwendet.",
  },
  {
    id: "FREIGABE_ABRECHNUNG_INTERN",
    label: "Interne Freigabevermerkung Quartalsabrechnung",
    category: "PROTOKOLL",
    formatHint: "Vier-Augen-Freigabe vor Versand der Abrechnung an die KV, mit Datum und freigebender Person.",
  },
  {
    id: "HONORARBESCHEID_KV",
    label: "Honorarbescheid der KV (Quartalsabrechnung)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Originalbescheid (PDF/Papier) mit Bekanntgabedatum als Fristanker (§ 84 SGG).",
  },
  {
    id: "RLV_QZV_MITTEILUNG_KV",
    label: "Mitteilung der KV zu Regelleistungsvolumen (RLV) und qualifikationsgebundenen Zusatzvolumina (QZV) (§ 87b SGB V)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "WIDERSPRUCH_KV",
    label: "Widerspruch gegen Honorarbescheid der KV (§ 84 SGG)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Schriftlich oder zur Niederschrift bei der erlassenden KV; Eingang innerhalb eines Monats nach Bekanntgabe.",
  },
  {
    id: "VERORDNUNGSDATEN_PVS",
    label: "Verordnungsdaten-Auswertung aus dem Praxisverwaltungssystem",
    category: "AUSWERTUNG",
    formatHint: "Arzneimittel-, Heilmittel- oder Hilfsmittelverordnungen je Quartal und Patient (Grundlage § 106b SGB V).",
  },
  {
    id: "PRAXISBESONDERHEITEN_DOKU",
    label: "Dokumentation der Praxisbesonderheiten (§ 106b SGB V)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Strukturierte Beschreibung von Patientenklientel, Schwerpunkten und besonderen Versorgungsauftraegen.",
  },
  {
    id: "MEDIZINISCHE_BEGRUENDUNG",
    label: "Medizinische Begruendung zu Verordnungen / Leistungen",
    category: "INTERNES_DOKUMENT",
    formatHint: "Aerztliche Einzelfallbegruendung, idealerweise im PVS dokumentiert und exportierbar.",
  },
  {
    id: "PRUEFBESCHEID_PRUEFUNGSSTELLE",
    label: "Pruefbescheid der Pruefungsstelle (§ 106 / § 106b SGB V)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Originalbescheid mit Bekanntgabedatum als Fristanker (§ 84 SGG).",
  },
  {
    id: "ANHOERUNG_PRUEFUNGSSTELLE",
    label: "Anhoerungsschreiben der Pruefungsstelle",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "STELLUNGNAHME_PRUEFUNGSSTELLE",
    label: "Stellungnahme der Praxis gegenueber der Pruefungsstelle (§ 106 / § 106b SGB V)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Schriftliche Stellungnahme inkl. Verordnungsdaten, Praxisbesonderheiten und medizinischer Begruendungen.",
  },
  {
    id: "WIDERSPRUCH_PRUEFUNGSSTELLE",
    label: "Widerspruch gegen Pruefbescheid (§ 84 SGG, Beschwerdeausschuss nach § 106c SGB V)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Eingang innerhalb eines Monats nach Bekanntgabe; geht an die Pruefungsstelle, Entscheidung trifft der Beschwerdeausschuss.",
  },

  // ---------- Ausbildung / Jugendarbeitsschutz ----------
  {
    id: "AUSBILDUNGSVERTRAG_MFA",
    label: "Berufsausbildungsvertrag MFA (§§ 10, 11 BBiG)",
    category: "VERTRAG",
  },
  {
    id: "JARBSCHG_ERSTUNTERSUCHUNG",
    label: "Aerztliche Bescheinigung Erstuntersuchung (§ 32 JArbSchG)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "JARBSCHG_NACHUNTERSUCHUNG",
    label: "Aerztliche Bescheinigung Erste Nachuntersuchung (§ 33 JArbSchG)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "EINWILLIGUNG_ERZIEHUNGSBERECHTIGTE",
    label: "Einwilligung der Erziehungsberechtigten bei minderjaehrigen Beschaeftigten",
    category: "INTERNES_DOKUMENT",
  },
  {
    id: "JUGEND_UNTERWEISUNG_DOKU",
    label: "Dokumentation der Unterweisung ueber Gefahren (§ 29 JArbSchG)",
    category: "PROTOKOLL",
  },

  // ---------- Fortbildung ----------
  {
    id: "FORTBILDUNGSZERTIFIKAT",
    label: "Fortbildungszertifikat der Aerztekammer (§ 95d SGB V)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
  },
  {
    id: "FORTBILDUNGSPUNKTEKONTO_AUSZUG",
    label: "Auszug Fortbildungspunktekonto (EIV/Aerztekammer)",
    category: "AUSWERTUNG",
  },
  {
    id: "FORTBILDUNGS_AUFHOLPLAN",
    label: "Aufholplan Fortbildungspunkte (Zwei-Jahres-Nachholfrist nach § 95d Abs. 3 SGB V)",
    category: "INTERNES_DOKUMENT",
  },

  // ---------- Medizinprodukte (MPBetreibV) ----------
  {
    id: "MP_EINWEISUNGSPROTOKOLL",
    label: "Einweisungsprotokoll Medizinprodukt (§ 4 Abs. 3, § 11 Abs. 1 Nr. 2, Abs. 2 MPBetreibV)",
    category: "PROTOKOLL",
    formatHint: "Schriftlich oder elektronisch, mit Datum, Geraet/Seriennummer, Einweisende(r), eingewiesene Person, Unterschriften.",
  },
  {
    id: "MP_FUNKTIONS_PRUEFUNG",
    label: "Nachweis Funktionspruefung am Betriebsort (§ 11 Abs. 1 Nr. 1, Abs. 3 MPBetreibV)",
    category: "PROTOKOLL",
    formatHint: "Eintrag im Medizinproduktebuch vor erster Anwendung.",
  },
  {
    id: "MEDIZINPRODUKTEBUCH",
    label: "Medizinproduktebuch (§ 13 MPBetreibV)",
    category: "INTERNES_DOKUMENT",
    retentionHint: "Aufbewahrung bis fuenf Jahre nach Ausserbetriebnahme (§ 13 Abs. 2 MPBetreibV).",
  },
  {
    id: "MP_BESTANDSVERZEICHNIS",
    label: "Bestandsverzeichnis aktiver nichtimplantierbarer Medizinprodukte (§ 14 MPBetreibV)",
    category: "INTERNES_DOKUMENT",
  },
  {
    id: "MP_STK_PROTOKOLL",
    label: "STK-Protokoll Sicherheitstechnische Kontrolle (§ 12 MPBetreibV)",
    category: "PROTOKOLL",
    formatHint: "Datum, Ergebnisse, Messwerte/Messverfahren, Kennzeichnung der naechsten Kontrolle.",
  },
  {
    id: "MP_MTK_PROTOKOLL",
    label: "MTK-Protokoll Messtechnische Kontrolle (§ 15 MPBetreibV, Anlage 2)",
    category: "PROTOKOLL",
    formatHint: "Datum, Ergebnis, Kennzeichnung der naechsten Kontrolle (§ 15 Abs. 7).",
  },
  {
    id: "MP_WARTUNGSNACHWEIS",
    label: "Wartungs-/Instandhaltungsnachweis (§ 7 MPBetreibV)",
    category: "PROTOKOLL",
    formatHint: "Auftrag, Pruefumfang, durchfuehrende Stelle, ggf. Eintrag im Medizinproduktebuch.",
  },
  {
    id: "MP_NAECHSTE_KONTROLLE_KENNZEICHNUNG",
    label: "Kennzeichnung der naechsten STK/MTK am Medizinprodukt (§ 12 Abs. 3, § 15 Abs. 7 MPBetreibV)",
    category: "SONSTIGES",
    formatHint: "Plakette/Aufkleber am Geraet mit Faelligkeitsdatum der naechsten Kontrolle.",
  },
  {
    id: "KV_SCHREIBEN_ABRECHNUNG",
    label: "Abrechnungsbezogenes Schreiben/Rueckfrage der KV (§ 106d SGB V)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Eingangsdokument der KV mit Bezugsquartal, beanstandetem Sachverhalt und gesetzter Rueckmeldefrist; Posteingangsdatum als Fristanker.",
  },
  {
    id: "ANTRAG_EXTERNE_STELLE",
    label: "Antrag an externe Stelle (generisch, Antragsmanagement)",
    category: "INTERNES_DOKUMENT",
    formatHint: "Vollstaendiger Antrag mit Antragsteller, Antragstyp, Adressat und Datum; Versandnachweis empfohlen.",
  },
  {
    id: "EINGANGSBESTAETIGUNG_EXTERNE_STELLE",
    label: "Eingangsbestaetigung der externen Stelle zum Antrag",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Schreiben/E-Mail der adressierten Stelle mit Aktenzeichen und Eingangsdatum als Fristanker fuer die Bearbeitungsdauer.",
  },
  {
    id: "BESCHEID_EXTERNE_STELLE",
    label: "Bescheid einer externen Stelle (generisch, Antragsmanagement)",
    category: "BEHOERDLICHE_BESTAETIGUNG",
    formatHint: "Bescheid mit Bekanntgabedatum und Rechtsbehelfsbelehrung; Bekanntgabedatum als Fristanker fuer Widerspruchsfrist (§ 84 SGG).",
  },
] as const satisfies readonly Evidence[];

export type EvidenceId = (typeof EVIDENCES)[number]["id"];

const EVIDENCE_INDEX: ReadonlyMap<string, Evidence> = new Map(
  EVIDENCES.map((entry) => [entry.id, entry]),
);

export function listEvidences(): readonly Evidence[] {
  return EVIDENCES;
}

export function isEvidenceId(value: string): value is EvidenceId {
  return EVIDENCE_INDEX.has(value);
}

export function getEvidence(id: EvidenceId): Evidence {
  const entry = EVIDENCE_INDEX.get(id);
  if (!entry) {
    throw new Error(`Unknown evidence id: ${id}`);
  }
  return entry;
}
