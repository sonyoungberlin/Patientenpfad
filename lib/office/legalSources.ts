/**
 * Statische Registry der Rechtsquellen, die im Office-/Compliance-Pfad
 * referenziert werden.
 *
 * Grundsaetze:
 * - IDs sind code-, JSON-, URL- und testfreundlich (nur [A-Z0-9_], keine §,
 *   keine Umlaute).
 * - Paragraphen werden mit Suffix `PAR_<n>` kodiert (z. B. `SGB_V_PAR_95`).
 * - `sourceUrl` verweist ausschliesslich auf offizielle Primaerquellen
 *   (gesetze-im-internet.de, EUR-Lex, landesrecht.berlin.de, Aerztekammer
 *   Berlin, KV Berlin, Berliner Datenschutzbeauftragte).
 * - Eintraege duerfen ohne `sourceUrl` existieren, wenn keine offizielle URL
 *   verifiziert wurde. Sie duerfen dennoch referenziert werden.
 */

export type LegalJurisdiction = "BUND" | "BERLIN" | "EU";

export type LegalSource = {
  /** Stabile ID, z. B. "DSGVO_ART_33". */
  id: string;
  /** Kurztitel mit Paragraphen-/Artikelangabe. */
  title: string;
  /** Paragraphen-/Artikelreferenz in lesbarer Form, z. B. "Art. 33", "§ 95". */
  paragraph?: string;
  /** Abkuerzendes Werk, z. B. "DSGVO", "SGB V". */
  shortName: string;
  jurisdiction: LegalJurisdiction;
  /** Offizielle Primaerquelle (kein dejure / kein Sekundaerportal). */
  sourceUrl?: string;
  /** Einzeiliger Hinweis zur fachlichen Bedeutung. */
  note?: string;
};

export const LEGAL_SOURCES: readonly LegalSource[] = [
  // ---------- EU / DSGVO ----------
  {
    id: "DSGVO_ART_5",
    title: "DSGVO Art. 5 Grundsaetze fuer die Verarbeitung personenbezogener Daten",
    paragraph: "Art. 5",
    shortName: "DSGVO",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    note: "Rechenschaftspflicht (Abs. 2): Verantwortlicher muss Einhaltung nachweisen.",
  },
  {
    id: "DSGVO_ART_32",
    title: "DSGVO Art. 32 Sicherheit der Verarbeitung",
    paragraph: "Art. 32",
    shortName: "DSGVO",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    note: "Technisch-organisatorische Massnahmen zur Gewaehrleistung eines angemessenen Schutzniveaus.",
  },
  {
    id: "DSGVO_ART_33",
    title: "DSGVO Art. 33 Meldung von Verletzungen an die Aufsichtsbehoerde",
    paragraph: "Art. 33",
    shortName: "DSGVO",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    note: "72-Stunden-Meldepflicht an die zustaendige Aufsichtsbehoerde.",
  },
  {
    id: "DSGVO_ART_34",
    title: "DSGVO Art. 34 Benachrichtigung der betroffenen Person",
    paragraph: "Art. 34",
    shortName: "DSGVO",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
  },

  // ---------- Bundesdatenschutz ----------
  {
    // Legacy-Pauschalquelle ohne Paragraph. Nicht neu verwenden:
    // konkrete Anwendungsfaelle werden ueber DSGVO_ART_* und BLN_DSG abgedeckt.
    // Eintrag bleibt fuer Transparenz/Historie erhalten; siehe officeLegalSourcesRegistry.test.
    id: "BDSG",
    title: "Bundesdatenschutzgesetz",
    shortName: "BDSG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/bdsg_2018/",
    note: "Legacy-Pauschalquelle ohne Paragraph. Nicht neu verwenden; konkrete Faelle ueber DSGVO_ART_* und BLN_DSG modellieren.",
  },

  // ---------- Berliner Landesrecht ----------
  {
    id: "BLN_DSG",
    title: "Berliner Datenschutzgesetz",
    shortName: "BlnDSG",
    jurisdiction: "BERLIN",
    sourceUrl: "https://gesetze.berlin.de/perma?d=jlr-DSGBE2018rahmen",
  },
  {
    id: "HEILBERG_BLN",
    title: "Berliner Kammergesetz (Heilberufekammergesetz)",
    shortName: "BlnKammerG",
    jurisdiction: "BERLIN",
    sourceUrl: "https://gesetze.berlin.de/perma?d=jlr-HeilBerKaGBE2006rahmen",
    note: "Grundlage fuer Aerztekammer Berlin (Pflichtmitgliedschaft, Berufsaufsicht).",
  },

  // ---------- Berufsordnung Aerztekammer Berlin ----------
  {
    // Legacy-Pauschalquelle ohne Paragraph. Nicht neu verwenden:
    // BO-spezifische Pflichten sind, soweit sie tragfaehig hergeleitet werden koennen,
    // ueber HEILBERG_BLN bzw. konkrete §§ einzubinden.
    id: "BERUFSO_AERZTE_BERLIN",
    title: "Berufsordnung der Aerztekammer Berlin",
    shortName: "BO Aerztekammer Berlin",
    jurisdiction: "BERLIN",
    sourceUrl: "https://www.aekb.de/aerzte/recht/berufsordnung",
    note: "Legacy-Pauschalquelle ohne Paragraph. Nicht neu verwenden; BO-Pflichten sind ueber HEILBERG_BLN oder konkrete §§ zu modellieren.",
  },

  // ---------- Vertragsarztrecht / SGB V ----------
  {
    id: "BAEO_PAR_3",
    title: "BAeO § 3 Approbation als Arzt",
    paragraph: "§ 3",
    shortName: "BAeO",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/b_o/__3.html",
    note: "Voraussetzungen der Erteilung der Approbation als Arzt.",
  },
  {
    id: "BAEO_PAR_21",
    title: "BAeO § 21 Berufshaftpflichtversicherung",
    paragraph: "§ 21",
    shortName: "BAeO",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/b_o/__21.html",
    note: "Pflicht zum Abschluss und zur Aufrechterhaltung einer Berufshaftpflichtversicherung.",
  },
  {
    id: "SGB_V_PAR_95",
    title: "SGB V § 95 Teilnahme an der vertragsaerztlichen Versorgung",
    paragraph: "§ 95",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__95.html",
    note: "Zulassung, Anstellungsgenehmigung, MVZ-Strukturen.",
  },
  {
    id: "SGB_V_PAR_95D",
    title: "SGB V § 95d Pflicht zur fachlichen Fortbildung",
    paragraph: "§ 95d",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__95d.html",
    note: "5-jaehriger Nachweiszeitraum gegenueber der KV; bei Nichtnachweis Honorarkuerzung und ggf. Zulassungsentziehung.",
  },
  {
    id: "SGB_V_PAR_106A",
    title: "SGB V § 106a Plausibilitaetspruefung der Abrechnung",
    paragraph: "§ 106a",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106a.html",
    note: "Historische Norm der Plausibilitaetspruefung. Mit Wirkung der GKV-Reform (HHVG 2017) wurden die Pflichten zur Abrechnungs-/Plausibilitaetspruefung in § 106d SGB V verlagert; fuer aktuelle Verweise daher SGB_V_PAR_106D verwenden.",
  },
  {
    id: "SGB_V_PAR_106D",
    title: "SGB V § 106d Abrechnungspruefung durch die Krankenkassen und Kassenaerztlichen Vereinigungen",
    paragraph: "§ 106d",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106d.html",
    note: "Aktuelle Rechtsgrundlage der KV-Plausibilitaetspruefung (Tages-/Quartalsprofile, Zeitprofile, sachlich-rechnerische Richtigstellung); Abs. 6 verweist auf KBV-/GKV-SV-Richtlinien zu Inhalt und Durchfuehrung.",
  },
  {
    id: "SGB_V_PAR_87B",
    title: "SGB V § 87b Vergutung der Aerzte (Honorarverteilung); Verordnungsermaechtigung",
    paragraph: "§ 87b",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__87b.html",
    note: "Grundlage des Honorarverteilungsmassstabs (HVM) der KV, einschliesslich Regelleistungsvolumen (RLV) und qualifikationsgebundener Zusatzvolumina (QZV).",
  },
  {
    id: "SGG_PAR_84",
    title: "SGG § 84 Frist und Form des Widerspruchs",
    paragraph: "§ 84",
    shortName: "SGG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgg/__84.html",
    note: "Widerspruchsfrist von einem Monat nach Bekanntgabe des Verwaltungsaktes; schriftlich oder zur Niederschrift bei der erlassenden Stelle.",
  },
  {
    id: "SGB_V_PAR_106",
    title: "SGB V § 106 Wirtschaftlichkeitspruefung",
    paragraph: "§ 106",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106.html",
    note: "Grundnorm der Wirtschaftlichkeitspruefung aerztlicher Leistungen; KV und Krankenkassen pruefen anhand vereinbarter Auffaelligkeits-/Zufaelligkeits- und Stichprobenpruefungen.",
  },
  {
    id: "SGB_V_PAR_106B",
    title: "SGB V § 106b Wirtschaftlichkeitspruefung aerztlich verordneter Leistungen",
    paragraph: "§ 106b",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106b.html",
    note: "Pruefung der Wirtschaftlichkeit aerztlich verordneter Leistungen (z. B. Arzneimittel, Heil- und Hilfsmittel) auf Grundlage einer Pruefvereinbarung; Praxisbesonderheiten sind zu beruecksichtigen.",
  },
  {
    id: "SGB_V_PAR_106C",
    title: "SGB V § 106c Pruefungsstelle und Beschwerdeausschuss",
    paragraph: "§ 106c",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106c.html",
    note: "Gemeinsame Einrichtungen der KV und der Landesverbaende der Krankenkassen; entscheiden ueber Wirtschaftlichkeitspruefung und Beschwerde.",
  },
  {
    id: "SGB_V_PAR_295",
    title: "SGB V § 295 Abrechnung aerztlicher Leistungen",
    paragraph: "§ 295",
    shortName: "SGB V",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__295.html",
    note: "Pflicht zur Angabe der lebenslangen Arztnummer (LANR) und der Betriebsstaettennummer (BSNR) bei der Abrechnung.",
  },
  {
    id: "AERZTE_ZV_PAR_32",
    title: "Aerzte-ZV § 32 Vertretung des Vertragsarztes",
    paragraph: "§ 32",
    shortName: "Aerzte-ZV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/_rzte-zv/__32.html",
  },
  {
    id: "AERZTE_ZV_PAR_18",
    title: "Aerzte-ZV § 18 Antrag auf Zulassung",
    paragraph: "§ 18",
    shortName: "Aerzte-ZV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/_rzte-zv/__18.html",
    note: "Zulassungsantrag ist beim Zulassungsausschuss schriftlich zu stellen; enthaelt Pflichtangaben und vorzulegende Nachweise (u. a. Approbation, Facharztanerkennung, Eintragung im Arztregister).",
  },
  {
    id: "AERZTE_ZV_PAR_24",
    title: "Aerzte-ZV § 24 Vertragsarztsitz",
    paragraph: "§ 24",
    shortName: "Aerzte-ZV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/_rzte-zv/__24.html",
    note: "Bindung der Zulassung an den Vertragsarztsitz; Genehmigungspflicht fuer Verlegung, Nebenbetriebsstaette und uebrige Sitzaenderungen durch den Zulassungsausschuss.",
  },
  {
    id: "AERZTE_ZV_PAR_19A",
    title: "Aerzte-ZV § 19a Umfang der Teilnahme an der vertragsaerztlichen Versorgung (Sprechstunden)",
    paragraph: "§ 19a",
    shortName: "Aerzte-ZV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/_rzte-zv/__19a.html",
    note: "Mindestsprechstundenpflicht (25 Stunden je Woche bei vollem Versorgungsauftrag, halbierter Umfang bei halbem Versorgungsauftrag); fuer bestimmte grundversorgende Facharztgruppen zusaetzlich offene Sprechstunden (eingefuehrt durch TSVG). Bekanntgabe und Einhaltung gegenueber der KV.",
  },
  {
    id: "IFSG_PAR_6",
    title: "IfSG § 6 Meldepflichtige Krankheiten",
    paragraph: "§ 6",
    shortName: "IfSG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/ifsg/__6.html",
    note: "Katalog namentlich meldepflichtiger Krankheiten (Verdacht, Erkrankung, Tod) sowie nichtnamentliche Meldungen.",
  },
  {
    id: "IFSG_PAR_7",
    title: "IfSG § 7 Meldepflichtige Nachweise von Krankheitserregern",
    paragraph: "§ 7",
    shortName: "IfSG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/ifsg/__7.html",
    note: "Erregernachweise: namentliche bzw. nichtnamentliche Meldung durch Leiter von Untersuchungsstellen.",
  },
  {
    id: "IFSG_PAR_8",
    title: "IfSG § 8 Zur Meldung verpflichtete Personen",
    paragraph: "§ 8",
    shortName: "IfSG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/ifsg/__8.html",
    note: "Aerzte gehoeren zu den meldepflichtigen Personen; weitere Verpflichtete (z. B. Leiter von Einrichtungen) sind dort aufgefuehrt.",
  },
  {
    id: "IFSG_PAR_9",
    title: "IfSG § 9 Namentliche Meldung",
    paragraph: "§ 9",
    shortName: "IfSG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/ifsg/__9.html",
    note: "Inhalt, Frist (unverzueglich, spaetestens 24 Stunden nach Kenntniserlangung) und Empfaenger (zustaendiges Gesundheitsamt) der namentlichen Meldung; Uebermittlung grundsaetzlich elektronisch ueber DEMIS.",
  },
  {
    id: "AERZTE_ZV_PAR_32B",
    title: "Aerzte-ZV § 32b Anstellung von Aerzten",
    paragraph: "§ 32b",
    shortName: "Aerzte-ZV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/_rzte-zv/__32b.html",
    note: "Genehmigung der Anstellung durch Zulassungsausschuss.",
  },
  {
    // Legacy-Pauschalquelle ohne Paragraph. Bestandsreferenzen (NC, PL, UV) bleiben erhalten,
    // da sie inhaltlich tragfaehig sind; neue Einbindungen sollen paragraphengenaue BMV-Ae-Vorschriften
    // verwenden, sobald sie in die Registry aufgenommen werden.
    id: "BMV_AE",
    title: "Bundesmantelvertrag-Aerzte",
    shortName: "BMV-Ae",
    jurisdiction: "BUND",
    sourceUrl: "https://www.kbv.de/html/bundesmantelvertrag.php",
    note: "Legacy-Pauschalquelle ohne Paragraph. Bestehende Referenzen bleiben; neue Einbindungen nur paragraphengenau.",
  },

  // ---------- Arbeits- und Ausbildungsrecht ----------
  {
    id: "NACHWG",
    title: "Nachweisgesetz",
    shortName: "NachwG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/nachwg/",
    note: "Schriftliche Niederlegung wesentlicher Arbeitsbedingungen.",
  },
  {
    id: "BBIG_PAR_10",
    title: "BBiG § 10 Vertrag",
    paragraph: "§ 10",
    shortName: "BBiG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/bbig_2005/__10.html",
  },
  {
    id: "BBIG_PAR_11",
    title: "BBiG § 11 Vertragsniederschrift",
    paragraph: "§ 11",
    shortName: "BBiG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/bbig_2005/__11.html",
  },
  {
    id: "BBIG_PAR_37",
    title: "BBiG § 37 Abschlusspruefung",
    paragraph: "§ 37",
    shortName: "BBiG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/bbig_2005/__37.html",
    note: "Pruefungszeugnis ueber die bestandene Abschlusspruefung in einem anerkannten Ausbildungsberuf.",
  },
  {
    id: "ESTG_PAR_39E",
    title: "EStG § 39e Elektronische Lohnsteuerabzugsmerkmale (ELStAM)",
    paragraph: "§ 39e",
    shortName: "EStG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/estg/__39e.html",
    note: "Abruf der ELStAM durch den Arbeitgeber beim Bundeszentralamt fuer Steuern.",
  },
  {
    id: "SGB_IV_PAR_8",
    title: "SGB IV § 8 Geringfuegige Beschaeftigung und geringfuegige selbstaendige Taetigkeit",
    paragraph: "§ 8",
    shortName: "SGB IV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_4/__8.html",
    note: "Abgrenzung Minijob/Midijob; Zustaendigkeit Minijob-Zentrale.",
  },
  {
    id: "SGB_IV_PAR_28A",
    title: "SGB IV § 28a Meldepflicht des Arbeitgebers",
    paragraph: "§ 28a",
    shortName: "SGB IV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/sgb_4/__28a.html",
    note: "An- und Abmeldung von Beschaeftigten bei der zustaendigen Einzugsstelle.",
  },
  {
    id: "JARBSCHG_PAR_32",
    title: "JArbSchG § 32 Erstuntersuchung",
    paragraph: "§ 32",
    shortName: "JArbSchG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/jarbschg/__32.html",
  },
  {
    id: "JARBSCHG_PAR_8",
    title: "JArbSchG § 8 Dauer der Arbeitszeit",
    paragraph: "§ 8",
    shortName: "JArbSchG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/jarbschg/__8.html",
  },
  {
    id: "JARBSCHG_PAR_11",
    title: "JArbSchG § 11 Ruhepausen, Aufenthaltsraeume",
    paragraph: "§ 11",
    shortName: "JArbSchG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/jarbschg/__11.html",
  },
  {
    id: "JARBSCHG_PAR_29",
    title: "JArbSchG § 29 Unterweisung ueber Gefahren",
    paragraph: "§ 29",
    shortName: "JArbSchG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/jarbschg/__29.html",
  },
  {
    id: "JARBSCHG_PAR_33",
    title: "JArbSchG § 33 Erste Nachuntersuchung",
    paragraph: "§ 33",
    shortName: "JArbSchG",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/jarbschg/__33.html",
    note: "Bereitgehalten als Komplementaer zu § 32 (Erstuntersuchung); aktuell nicht in MA eingebunden, da die Nachuntersuchungspflicht im bestehenden Checkpoint MA-02 als optional belassen wird.",
  },

  // ---------- MPBetreibV (Medizinprodukte-Betreiberverordnung) ----------
  {
    id: "MPBETREIBV_PAR_3",
    title: "MPBetreibV § 3 Allgemeine Anforderungen an das Betreiben und Anwenden (Betreiberverantwortung)",
    paragraph: "§ 3",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__3.html",
    note: "Abs. 1: Betreiber muss sicheren und ordnungsgemaessen Betrieb gewaehrleisten.",
  },
  {
    id: "MPBETREIBV_PAR_4",
    title: "MPBetreibV § 4 Allgemeine Anforderungen an das Errichten, Betreiben, Anwenden und Instandhalten",
    paragraph: "§ 4",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__4.html",
    note: "Abs. 3: Anwendung nur durch eingewiesene Personen.",
  },
  {
    id: "MPBETREIBV_PAR_7",
    title: "MPBetreibV § 7 Instandhaltung von Medizinprodukten",
    paragraph: "§ 7",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__7.html",
    note: "Abs. 1 und 2: Instandhaltung sach- und fachgerecht; Dokumentation der Wartung.",
  },
  {
    id: "MPBETREIBV_PAR_11",
    title: "MPBetreibV § 11 Besondere Anforderungen an das Betreiben und Anwenden aktiver Medizinprodukte (Anlage 1)",
    paragraph: "§ 11",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__11.html",
    note: "Abs. 1 Nr. 1 Funktionspruefung am Betriebsort; Nr. 2 und Abs. 2 Einweisung vor Erstanwendung; Abs. 3 Eintrag im Medizinproduktebuch.",
  },
  {
    id: "MPBETREIBV_PAR_12",
    title: "MPBetreibV § 12 Sicherheitstechnische Kontrollen (STK)",
    paragraph: "§ 12",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__12.html",
    note: "Abs. 1: STK fuer Produkte nach Anlage 1; Abs. 3: Frist spaetestens alle zwei Jahre, soweit keine andere Frist einschlaegig ist.",
  },
  {
    id: "MPBETREIBV_PAR_13",
    title: "MPBetreibV § 13 Medizinproduktebuch",
    paragraph: "§ 13",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__13.html",
    note: "Abs. 1 und 2: Fuehrung des Medizinproduktebuchs; Aufbewahrung bis fuenf Jahre nach Ausserbetriebnahme.",
  },
  {
    id: "MPBETREIBV_PAR_14",
    title: "MPBetreibV § 14 Bestandsverzeichnis",
    paragraph: "§ 14",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__14.html",
    note: "Abs. 1 und 2: Bestandsverzeichnis fuer aktive nichtimplantierbare Medizinprodukte.",
  },
  {
    id: "MPBETREIBV_PAR_15",
    title: "MPBetreibV § 15 Messtechnische Kontrollen (MTK)",
    paragraph: "§ 15",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/__15.html",
    note: "Abs. 1 und 5: MTK fuer Produkte nach Anlage 2; Abs. 7: Kennzeichnung der naechsten Kontrolle.",
  },
  {
    id: "MPBETREIBV_ANLAGE_2",
    title: "MPBetreibV Anlage 2 Messtechnische Kontrollen (Fristen je Produktart)",
    paragraph: "Anlage 2",
    shortName: "MPBetreibV",
    jurisdiction: "BUND",
    sourceUrl: "https://www.gesetze-im-internet.de/mpbetreibv/anlage_2.html",
    note: "Fristenkatalog, z. B. Blutdruckmessgeraete alle 2 Jahre.",
  },
] as const satisfies readonly LegalSource[];

export type LegalSourceId = (typeof LEGAL_SOURCES)[number]["id"];

const LEGAL_SOURCE_INDEX: ReadonlyMap<string, LegalSource> = new Map(
  LEGAL_SOURCES.map((entry) => [entry.id, entry]),
);

export function listLegalSources(): readonly LegalSource[] {
  return LEGAL_SOURCES;
}

export function isLegalSourceId(value: string): value is LegalSourceId {
  return LEGAL_SOURCE_INDEX.has(value);
}

export function getLegalSource(id: LegalSourceId): LegalSource {
  const entry = LEGAL_SOURCE_INDEX.get(id);
  if (!entry) {
    throw new Error(`Unknown legal source id: ${id}`);
  }
  return entry;
}
