/**
 * Prozessdefinition: Umgang mit Patienten ohne Termin
 *
 * Pilotprozess für den Bereich „Arbeitsprozesse" (praxisinterne Prozessregelungen).
 *
 * Drei Ebenen:
 *  1. Prozessziel – durch Abschnittstitel und Fragestellungen beschrieben
 *  2. Offizielle Leitplanken – OfficialRule[] mit nachvollziehbaren Quellen
 *  3. Praxisinterne Klärung – ProtocolQuestion[] für gemeinsame Teamentscheidungen
 *
 * Kein Import aus bestehenden klinischen Workflow-Modulen.
 * Keine Snapshot-Anbindung, keine API, keine UI.
 */

import type { ProtocolSection, ProtocolQuestion } from "./questions";
import type { OfficialRule, OfficialSource } from "./officialContent";

// ---------------------------------------------------------------------------
// Tiefe defensive Kopierfunktionen (nicht exportiert)
// ---------------------------------------------------------------------------

function cloneSource(s: OfficialSource): OfficialSource {
  return { ...s };
}

function cloneRule(r: OfficialRule): OfficialRule {
  return {
    id: r.id,
    ...(r.title !== undefined ? { title: r.title } : {}),
    text: r.text,
    bindingLevel: r.bindingLevel,
    source: cloneSource(r.source),
    ...(r.note !== undefined ? { note: r.note } : {}),
  };
}

function cloneQuestion(q: ProtocolQuestion): ProtocolQuestion {
  switch (q.kind) {
    case "YES_NO_UNCLEAR":
      return {
        id: q.id,
        text: q.text,
        kind: "YES_NO_UNCLEAR",
        ...(q.hint !== undefined ? { hint: q.hint } : {}),
        ...(q.required !== undefined ? { required: q.required } : {}),
      };
    case "FREE_TEXT":
      return {
        id: q.id,
        text: q.text,
        kind: "FREE_TEXT",
        ...(q.hint !== undefined ? { hint: q.hint } : {}),
        ...(q.required !== undefined ? { required: q.required } : {}),
        ...(q.placeholder !== undefined ? { placeholder: q.placeholder } : {}),
      };
    case "SINGLE_SELECT":
      return {
        id: q.id,
        text: q.text,
        kind: "SINGLE_SELECT",
        ...(q.hint !== undefined ? { hint: q.hint } : {}),
        ...(q.required !== undefined ? { required: q.required } : {}),
        options: q.options.map((o) => ({ ...o })),
      };
    case "MULTI_SELECT":
      return {
        id: q.id,
        text: q.text,
        kind: "MULTI_SELECT",
        ...(q.hint !== undefined ? { hint: q.hint } : {}),
        ...(q.required !== undefined ? { required: q.required } : {}),
        options: q.options.map((o) => ({ ...o })),
      };
  }
}

function cloneSection(s: ProtocolSection): ProtocolSection {
  return {
    id: s.id,
    title: s.title,
    officialRules: s.officialRules.map(cloneRule),
    questions: s.questions.map(cloneQuestion),
  };
}

// ---------------------------------------------------------------------------
// Interne Quellenangaben
// ---------------------------------------------------------------------------

const SRC_MBOA: OfficialSource = {
  id: "MBOA-2-4",
  author: "Bundesärztekammer",
  title:
    "Musterberufsordnung für Ärztinnen und Ärzte (MBO-Ä) – Beschluss des 124. Deutschen Ärztetages 2021",
  reviewedAt: "2026-07-26",
  publicationDate: "2021",
  url: "https://www.bundesaerztekammer.de/fileadmin/user_upload/BAEK/Themen/Berufsrecht/Musterberufsordnung_17.AE_2021_final.pdf",
  reference: "§2 Abs. 4 MBO-Ä",
};

/** G-BA QM-RL – §4: Grundsätzliche Anforderungen */
const SRC_GBA_QMRL_4: OfficialSource = {
  id: "GBA-QMRL",
  author: "Gemeinsamer Bundesausschuss (G-BA)",
  title:
    "Richtlinie über grundsätzliche Anforderungen an ein einrichtungsinternes Qualitätsmanagement für Vertragsärzte, Vertragspsychotherapeuten und medizinische Versorgungszentren (QM-RL)",
  reviewedAt: "2026-07-26",
  url: "https://www.g-ba.de/richtlinien/87/",
  reference: "§4 QM-RL i. V. m. §135a Abs. 2 Nr. 2 SGB V",
};

/** G-BA QM-RL – §5: Instrumente und Methoden (Prozessbeschreibungen) */
const SRC_GBA_QMRL_5: OfficialSource = {
  id: "GBA-QMRL-5",
  author: "Gemeinsamer Bundesausschuss (G-BA)",
  title:
    "Richtlinie über grundsätzliche Anforderungen an ein einrichtungsinternes Qualitätsmanagement für Vertragsärzte, Vertragspsychotherapeuten und medizinische Versorgungszentren (QM-RL)",
  reviewedAt: "2026-07-26",
  url: "https://www.g-ba.de/richtlinien/87/",
  reference: "§5 QM-RL",
};

const SRC_BAEK_DELEGATION: OfficialSource = {
  id: "BAEK-DELEGATION",
  author: "Bundesärztekammer",
  title:
    "Persönliche Leistungserbringung – Möglichkeiten und Grenzen der Delegation ärztlicher Leistungen",
  reviewedAt: "2026-07-26",
  publicationDate: "2019",
  url: "https://www.bundesaerztekammer.de/fileadmin/user_upload/downloads/Delegation_2019.pdf",
  reference: "Abschnitt Organisatorische Aufgaben / nichtärztliche Tätigkeiten",
};

const SRC_SGBV_75: OfficialSource = {
  id: "SGBV-75",
  author: "Bundesministerium der Justiz (BMJ)",
  title: "Sozialgesetzbuch Fünftes Buch (SGB V) – Gesetzliche Krankenversicherung",
  reviewedAt: "2026-07-26",
  url: "https://www.gesetze-im-internet.de/sgbv/__75.html",
  reference: "§75 Abs. 1b SGB V",
};

const SRC_BGB_630F: OfficialSource = {
  id: "BGB-630F",
  author: "Bundesministerium der Justiz (BMJ)",
  title: "Bürgerliches Gesetzbuch (BGB)",
  reviewedAt: "2026-07-26",
  url: "https://www.gesetze-im-internet.de/bgb/__630f.html",
  reference: "§630f Abs. 1 BGB",
};

// ---------------------------------------------------------------------------
// PC-C01 – Geltungsbereich
// ---------------------------------------------------------------------------

const SECTION_C01: ProtocolSection = {
  id: "PC-C01",
  title: "Geltungsbereich",
  officialRules: [
    {
      id: "POT-R-C01-01",
      text: "Patienten, die sich mit einem akuten medizinischen Anliegen vorstellen, müssen einer zumindest orientierenden ärztlichen Einschätzung zugeführt werden – unabhängig davon, ob ein Termin vereinbart wurde.",
      bindingLevel: "ORIENTATION",
      source: SRC_MBOA,
      note: "Maßgeblich ist die Berufsordnung der zuständigen Landesärztekammer. Die Einschätzungspflicht gilt für Notfallsituationen; die organisatorische Einplanung ohne Termin in die reguläre Sprechstunde ist davon zu unterscheiden.",
    },
    {
      id: "POT-R-C01-02",
      text: "Vertragsärztliche Praxen sind verpflichtet, ein einrichtungsinternes Qualitätsmanagementsystem zu betreiben; dazu gehören dokumentierte Regelungen für relevante Ablaufprozesse, einschließlich des Umgangs mit Patienten ohne Termin.",
      bindingLevel: "MANDATORY",
      source: SRC_GBA_QMRL_4,
      note: "Gilt für Vertragsärzte und medizinische Versorgungszentren nach SGB V. Für rein privatärztlich tätige Praxen besteht diese Verpflichtung nicht aus der QM-RL.",
    },
  ],
  questions: [
    {
      id: "POT-Q-C01-01",
      text: "Wann erscheinen bei Ihnen Patienten ohne Termin?",
      kind: "MULTI_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C01-01-A",
          label: "Während regulärer Sprechzeiten",
          outputText:
            "Dieser Prozess gilt für Patienten ohne Termin, die während regulärer Sprechzeiten in der Praxis erscheinen.",
        },
        {
          id: "POT-Q-C01-01-B",
          label: "Bei akuten Beschwerden außerhalb der Sprechzeiten",
          outputText:
            "Dieser Prozess gilt auch bei Patienten mit akuten Beschwerden, die außerhalb regulärer Sprechzeiten in der Praxis erscheinen.",
        },
        {
          id: "POT-Q-C01-01-C",
          label: "Bei telefonischen Notfallanfragen",
          outputText:
            "Dieser Prozess schließt telefonische Notfallanfragen ohne Terminvereinbarung ein.",
        },
        {
          id: "POT-Q-C01-01-D",
          label: "In allen genannten Situationen",
          outputText:
            "Dieser Prozess gilt in allen Situationen, in denen Patienten ohne Termin Kontakt zur Praxis aufnehmen.",
        },
      ],
    },
    {
      id: "POT-Q-C01-02",
      text: "Gilt dieser Ablauf für alle Mitarbeitenden in der Praxis?",
      kind: "YES_NO_UNCLEAR",
      required: true,
    },
    {
      id: "POT-Q-C01-03",
      text: "Gibt es Ausnahmen, die schriftlich festgehalten sind?",
      kind: "YES_NO_UNCLEAR",
    },
  ],
};

// ---------------------------------------------------------------------------
// PC-C02 – Zuständigkeit und Entscheidungsbefugnis
// ---------------------------------------------------------------------------

const SECTION_C02: ProtocolSection = {
  id: "PC-C02",
  title: "Zuständigkeit und Entscheidungsbefugnis",
  officialRules: [
    {
      id: "POT-R-C02-01",
      text: "Organisatorische Aufgaben wie die Erstaufnahme und Weiterleitung von Patienten können an nichtärztliches Personal delegiert werden; die Verantwortung für medizinische Entscheidungen verbleibt ausschließlich bei der Ärztin oder dem Arzt.",
      bindingLevel: "ORIENTATION",
      source: SRC_BAEK_DELEGATION,
      note: "Maßgeblich sind die Regelungen der zuständigen Landesärztekammer sowie ggf. Anforderungen der Kassenärztlichen Vereinigung zur persönlichen Leistungserbringung. URL und Abschnittsreferenz vor Produktiveinsatz gegen aktuelle BAEK-Veröffentlichung verifizieren.",
    },
    {
      id: "POT-R-C02-02",
      text: "Die internen Zuständigkeiten einer vertragsärztlichen Praxis, insbesondere bei der Patientenaufnahme und -weiterleitung, müssen im Rahmen des Qualitätsmanagements beschrieben und dem Praxisteam bekannt sein.",
      bindingLevel: "MANDATORY",
      source: SRC_GBA_QMRL_4,
      note: "Die QM-RL schreibt keine konkrete Aufgabenverteilung vor; sie verlangt, dass Abläufe beschrieben und dem Team bekannt sind.",
    },
  ],
  questions: [
    {
      id: "POT-Q-C02-01",
      text: "Wer kümmert sich als Erste Person um einen Patienten ohne Termin?",
      kind: "SINGLE_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C02-01-A",
          label: "MFA am Empfang",
          outputText:
            "Die primäre Zuständigkeit für die Erstaufnahme liegt bei der MFA am Empfang.",
        },
        {
          id: "POT-Q-C02-01-B",
          label: "Erfahrene MFA oder Teamlead",
          outputText:
            "Die primäre Zuständigkeit für die Erstaufnahme liegt bei der erfahrenen MFA oder dem Teamlead.",
        },
        {
          id: "POT-Q-C02-01-C",
          label: "Arzt direkt",
          outputText:
            "Patienten ohne Termin werden direkt dem Arzt vorgestellt.",
        },
      ],
    },
    {
      id: "POT-Q-C02-02",
      text: "Wenn die Dringlichkeit unklar ist – wer entscheidet dann?",
      kind: "SINGLE_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C02-02-A",
          label: "Arzt nach kurzer Schilderung des Anliegens",
          outputText:
            "Bei Dringlichkeitsunklarheit entscheidet der Arzt nach einer kurzen Schilderung des Anliegens.",
        },
        {
          id: "POT-Q-C02-02-B",
          label: "Erfahrene MFA nach Schema, bei Unklarheit Rücksprache mit Arzt",
          outputText:
            "Die erfahrene MFA entscheidet nach internem Schema; bei Unklarheit wird der Arzt hinzugezogen.",
        },
        {
          id: "POT-Q-C02-02-C",
          label: "Arzt in jedem Fall direkt",
          outputText:
            "Die Dringlichkeitsentscheidung trifft in jedem Fall der Arzt.",
        },
      ],
    },
    {
      id: "POT-Q-C02-03",
      text: "Weiß das Team, wer wofür zuständig ist, und ist das schriftlich festgehalten?",
      kind: "YES_NO_UNCLEAR",
      required: true,
    },
    {
      id: "POT-Q-C02-04",
      text: "Gibt es eine Regelung für den Fall, dass die zuständige Person nicht da ist?",
      kind: "YES_NO_UNCLEAR",
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// PC-C03 – Standardablauf
// ---------------------------------------------------------------------------

const SECTION_C03: ProtocolSection = {
  id: "PC-C03",
  title: "Standardablauf",
  officialRules: [
    {
      id: "POT-R-C03-01",
      text: "Interne Ablaufprozesse einer vertragsärztlichen Praxis müssen schriftlich beschrieben und für alle Mitarbeitenden zugänglich sein.",
      bindingLevel: "MANDATORY",
      source: SRC_GBA_QMRL_5,
      note: "Die QM-RL gibt Anforderungen an das QM-System, nicht an die konkrete Ausgestaltung des Ablaufs. Die Ausgestaltung des Standardablaufs liegt im Ermessen der Praxis.",
    },
    {
      id: "POT-R-C03-02",
      text: "Im Sinne einer patientenorientierten Praxisführung soll der Patient verständlich über Wartezeiten, Verweisungen oder Rückrufmöglichkeiten informiert werden.",
      bindingLevel: "ORIENTATION",
      source: SRC_GBA_QMRL_4,
      note: "Patientenorientierung ist ein Grundprinzip der QM-RL; die konkrete Ausgestaltung der Patienteninformation liegt im Ermessen der Praxis.",
    },
  ],
  questions: [
    {
      id: "POT-Q-C03-01",
      text: "Was erfasst die Praxis standardmäßig, wenn jemand ohne Termin kommt?",
      kind: "MULTI_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C03-01-A",
          label: "Name und Geburtsdatum",
          outputText:
            "Bei der Erstaufnahme werden Name und Geburtsdatum erhoben.",
        },
        {
          id: "POT-Q-C03-01-B",
          label: "Art und Schwere der Beschwerden",
          outputText:
            "Art und Schwere der Beschwerden werden bei der Erstaufnahme erfasst.",
        },
        {
          id: "POT-Q-C03-01-C",
          label: "Dringlichkeits-Selbsteinschätzung des Patienten",
          outputText:
            "Die Dringlichkeits-Selbsteinschätzung des Patienten wird in die Erstaufnahme einbezogen.",
        },
        {
          id: "POT-Q-C03-01-D",
          label: "Versicherungsstatus",
          outputText:
            "Der Versicherungsstatus wird bei der Erstaufnahme erfasst.",
        },
      ],
    },
    {
      id: "POT-Q-C03-02",
      text: "Wie geht es in der Regel weiter – welches Vorgehen hat sich bei Ihnen eingespielt?",
      kind: "SINGLE_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C03-02-A",
          label: "Wartezeit und Einplanung in die laufende Sprechstunde",
          outputText:
            "Als Standard wird eine Wartezeit mit anschließender Einplanung in die laufende Sprechstunde angeboten.",
        },
        {
          id: "POT-Q-C03-02-B",
          label: "Kurzfristiger Termin am selben oder nächsten Werktag",
          outputText:
            "Als Standard wird ein kurzfristiger Termin am selben oder nächsten Werktag angeboten.",
        },
        {
          id: "POT-Q-C03-02-C",
          label: "Verweis an KV-Bereitschaftsdienst (116 117) bei nicht dringlichen Anliegen",
          outputText:
            "Als Standard werden Patienten mit nicht dringlichen Anliegen an den KV-Bereitschaftsdienst (116 117) verwiesen.",
        },
        {
          id: "POT-Q-C03-02-D",
          label: "Situationsabhängige Entscheidung nach Einschätzung des Anliegens",
          outputText:
            "Die Maßnahme wird situationsabhängig nach Einschätzung des konkreten Anliegens festgelegt.",
        },
      ],
    },
    {
      id: "POT-Q-C03-03",
      text: "Wird das Anliegen des Patienten festgehalten, bevor entschieden wird, wie es weitergeht?",
      kind: "YES_NO_UNCLEAR",
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// PC-C04 – Ausnahmen und Eskalation
// ---------------------------------------------------------------------------

const SECTION_C04: ProtocolSection = {
  id: "PC-C04",
  title: "Ausnahmen und Eskalation",
  officialRules: [
    {
      id: "POT-R-C04-01",
      text: "Bei Vorliegen oder begründetem Verdacht auf einen medizinischen Notfall ist unverzüglich ärztliche Hilfe zu leisten; diese Verpflichtung gilt unabhängig von Terminabsprachen oder Kapazitätsplanung.",
      bindingLevel: "ORIENTATION",
      source: SRC_MBOA,
      note: "Maßgeblich ist die Berufsordnung der zuständigen Landesärztekammer. Bei lebensbedrohlicher Situation ist zusätzlich der Rettungsdienst (Notruf 112) zu alarmieren.",
    },
    {
      id: "POT-R-C04-02",
      text: "Der kassenärztliche Bereitschaftsdienst (Rufnummer 116 117) ist für nicht lebensbedrohliche, aber zeitnah klärungsbedürftige Beschwerden zuständig, wenn die Praxiskapazität erschöpft ist oder die regulären Praxiszeiten enden.",
      bindingLevel: "ORIENTATION",
      source: SRC_SGBV_75,
      note: "§75 Abs. 1b SGB V normiert den Sicherstellungsauftrag der KVen, nicht eine Verweisungspflicht der Einzelpraxis. Die Weiterverweisung an 116 117 ist eine organisatorische Empfehlung.",
    },
  ],
  questions: [
    {
      id: "POT-Q-C04-01",
      text: "Woran erkennt das Team, dass ein Patient sofort versorgt werden muss?",
      kind: "MULTI_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C04-01-A",
          label: "Abfrage definierter Warnsymptome (z. B. Brustschmerz, Atemnot, Bewusstlosigkeit)",
          outputText:
            "Mögliche Notfälle werden durch Abfrage definierter Warnsymptome erkannt.",
        },
        {
          id: "POT-Q-C04-01-B",
          label: "Einschätzung durch erfahrene MFA",
          outputText:
            "Mögliche Notfälle werden durch die Einschätzung der erfahrenen MFA erkannt.",
        },
        {
          id: "POT-Q-C04-01-C",
          label: "Sofortige Vorlage aller Patienten ohne Termin beim Arzt",
          outputText:
            "Jeder Patient ohne Termin wird direkt dem Arzt vorgestellt, der die Einschätzung vornimmt.",
        },
      ],
    },
    {
      id: "POT-Q-C04-02",
      text: "Was passiert, wenn der Verdacht besteht, dass es sich um einen Notfall handelt?",
      kind: "SINGLE_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C04-02-A",
          label: "Sofortige Benachrichtigung des Arztes, parallel Notruf 112 bei lebensbedrohlicher Situation",
          outputText:
            "Der Arzt wird sofort informiert; bei lebensbedrohlicher Situation wird parallel der Notruf 112 alarmiert.",
        },
        {
          id: "POT-Q-C04-02-B",
          label: "Direkte Einbestellung zum Arzt ohne Wartezeit",
          outputText:
            "Der Patient wird bei Notfallverdacht sofort und ohne Wartezeit zum Arzt gebracht.",
        },
        {
          id: "POT-Q-C04-02-C",
          label: "Arzt wird unmittelbar zum Patienten geholt",
          outputText:
            "Der Arzt wird bei Notfallverdacht unmittelbar zum Patienten in den Wartebereich geholt.",
        },
      ],
    },
    {
      id: "POT-Q-C04-03",
      text: "In welchen Situationen verweist die Praxis heute an den ärztlichen Bereitschaftsdienst (116 117)?",
      kind: "FREE_TEXT",
      placeholder:
        "z. B. bei nicht lebensbedrohlichen Beschwerden außerhalb der Sprechzeiten, wenn keine zeitnahe Versorgung in der Praxis möglich ist …",
    },
    {
      id: "POT-Q-C04-05",
      text: "Wie erfolgt die Weiterleitung heute?",
      kind: "MULTI_SELECT",
      options: [
        {
          id: "POT-Q-C04-05-A",
          label: "Telefonnummer 116 117 wird genannt",
          outputText:
            "Die Telefonnummer des ärztlichen Bereitschaftsdienstes (116 117) wird dem Patienten genannt.",
        },
        {
          id: "POT-Q-C04-05-B",
          label: "Patient ruft selbst an",
          outputText:
            "Der Patient ruft den ärztlichen Bereitschaftsdienst (116 117) selbst an.",
        },
        {
          id: "POT-Q-C04-05-C",
          label: "Praxis stellt telefonischen Kontakt her",
          outputText:
            "Die Praxis stellt für den Patienten den telefonischen Kontakt zum ärztlichen Bereitschaftsdienst (116 117) her.",
        },
        {
          id: "POT-Q-C04-05-D",
          label: "Schriftlicher Hinweis wird mitgegeben",
          outputText:
            "Dem Patienten wird ein schriftlicher Hinweis auf den ärztlichen Bereitschaftsdienst (116 117) mitgegeben.",
        },
        {
          id: "POT-Q-C04-05-E",
          label: "Anderes Vorgehen",
          outputText:
            "Die Art der Weiterleitung zum ärztlichen Bereitschaftsdienst folgt dem individuellen Praxisvorgehen.",
        },
      ],
    },
    {
      id: "POT-Q-C04-04",
      text: "Weiß das Team, wann der Arzt sofort dazu geholt werden muss und wann der Notruf (112) nötig ist?",
      kind: "YES_NO_UNCLEAR",
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// PC-C05 – Dokumentation und Überprüfung
// ---------------------------------------------------------------------------

const SECTION_C05: ProtocolSection = {
  id: "PC-C05",
  title: "Dokumentation und Überprüfung",
  officialRules: [
    {
      id: "POT-R-C05-01",
      text: "Für jeden Patienten, dem in der Praxis eine Behandlung erbracht wird, ist in unmittelbarem zeitlichem Zusammenhang eine Dokumentation in der Patientenakte zu führen.",
      bindingLevel: "MANDATORY",
      source: SRC_BGB_630F,
      note: "§630f BGB gilt für durchgeführte Behandlungen. Für nicht behandelte oder weiterverwiesene Patienten ohne Termin besteht keine explizite gesetzliche Dokumentationspflicht; eine kurze Dokumentation empfiehlt sich dennoch aus Haftungsgründen.",
    },
    {
      id: "POT-R-C05-02",
      text: "Das QM-System einer vertragsärztlichen Praxis ist regelmäßig auf seine Wirksamkeit zu überprüfen und bei Bedarf weiterzuentwickeln.",
      bindingLevel: "MANDATORY",
      source: SRC_GBA_QMRL_4,
      note: "Die Überprüfungspflicht gilt für das gesamte QM-System; der Umgang mit Patienten ohne Termin ist als Ablaufprozess einzuschließen. Eine konkrete Prüffrequenz gibt die QM-RL nicht vor.",
    },
  ],
  questions: [
    {
      id: "POT-Q-C05-01",
      text: "Hält die Praxis fest, wenn jemand ohne Termin weitergeleitet oder auf einen Termin verwiesen wird?",
      kind: "YES_NO_UNCLEAR",
      hint: "Bezieht sich auf die empfohlene Dokumentation von Nicht-Behandlungsentscheidungen. Durchgeführte Behandlungen sind nach §630f BGB gesetzlich immer zu dokumentieren.",
    },
    {
      id: "POT-Q-C05-02",
      text: "Wann prüft die Praxis, ob dieser Ablauf noch passt?",
      kind: "MULTI_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C05-02-A",
          label: "Jährlich im Rahmen des QM-Zyklus",
          outputText:
            "Dieser Prozess wird jährlich im Rahmen des QM-Zyklus überprüft und angepasst.",
        },
        {
          id: "POT-Q-C05-02-B",
          label: "Bei konkreten Auffälligkeiten oder Vorfällen",
          outputText:
            "Dieser Prozess wird anlassbezogen bei konkreten Auffälligkeiten oder Vorfällen überprüft.",
        },
        {
          id: "POT-Q-C05-02-C",
          label: "Bei Personalwechsel oder Strukturveränderungen",
          outputText:
            "Dieser Prozess wird bei Personalwechsel oder relevanten Strukturveränderungen überprüft.",
        },
        {
          id: "POT-Q-C05-02-D",
          label: "Anlassbezogen nach internen Rückmeldungen",
          outputText:
            "Dieser Prozess wird anlassbezogen auf Grundlage interner Rückmeldungen aus dem Praxisteam überprüft.",
        },
      ],
    },
    {
      id: "POT-Q-C05-03",
      text: "Wer ist dafür verantwortlich, dass dieser Ablauf aktuell bleibt?",
      kind: "SINGLE_SELECT",
      required: true,
      options: [
        {
          id: "POT-Q-C05-03-A",
          label: "Praxisinhaber / Ärztin oder Arzt",
          outputText:
            "Die Verantwortung für Überprüfung und Weiterentwicklung liegt bei der Praxisinhaberin oder dem Praxisinhaber.",
        },
        {
          id: "POT-Q-C05-03-B",
          label: "QM-Beauftragte oder QM-Beauftragter",
          outputText:
            "Die Verantwortung für Überprüfung und Weiterentwicklung liegt bei der oder dem QM-Beauftragten der Praxis.",
        },
        {
          id: "POT-Q-C05-03-C",
          label: "MFA-Teamlead",
          outputText:
            "Die operative Verantwortung für Überprüfung und Pflege liegt beim MFA-Teamlead.",
        },
        {
          id: "POT-Q-C05-03-D",
          label: "Gemeinsam im gesamten Praxisteam",
          outputText:
            "Überprüfung und Weiterentwicklung sind eine gemeinsame Aufgabe des gesamten Praxisteams.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Interner Prozess-Katalog
// ---------------------------------------------------------------------------

const PATIENT_WITHOUT_APPOINTMENT_SECTIONS: readonly ProtocolSection[] = [
  SECTION_C01,
  SECTION_C02,
  SECTION_C03,
  SECTION_C04,
  SECTION_C05,
];

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Gibt alle Abschnitte des Prozesses „Umgang mit Patienten ohne Termin" zurück.
 *
 * Jeder Aufruf liefert vollständig unabhängige Kopien aller verschachtelten Objekte
 * und Arrays (Sections, Rules, Sources, Questions, Options).
 */
export function getPatientWithoutAppointmentSections(): ProtocolSection[] {
  return PATIENT_WITHOUT_APPOINTMENT_SECTIONS.map(cloneSection);
}

/**
 * Gibt einen einzelnen Abschnitt anhand seiner ID zurück.
 *
 * Gibt eine vollständig unabhängige Kopie zurück oder undefined bei unbekannter ID.
 */
export function getPatientWithoutAppointmentSection(
  id: string,
): ProtocolSection | undefined {
  const found = PATIENT_WITHOUT_APPOINTMENT_SECTIONS.find((s) => s.id === id);
  return found !== undefined ? cloneSection(found) : undefined;
}

// ---------------------------------------------------------------------------
// Modusabhängige Fragetexte (TARGET_STATE-Perspektive)
// ---------------------------------------------------------------------------

/**
 * Überschreibungen der Fragetexte für den TARGET_STATE-Modus (Soll-Perspektive).
 * Fragen, die hier nicht aufgeführt sind, verwenden den Standard-Text (CURRENT_STATE).
 */
export const TARGET_STATE_QUESTION_TEXTS: Readonly<Record<string, string>> = {
  "POT-Q-C01-01": "Wann sollen Patienten ohne Termin künftig angenommen werden?",
  "POT-Q-C01-02": "Soll dieser Ablauf für alle Mitarbeitenden in der Praxis gelten?",
  "POT-Q-C01-03": "Soll es schriftlich festgehaltene Ausnahmen geben?",
  "POT-Q-C02-01": "Wer soll sich künftig als Erste Person um Patienten ohne Termin kümmern?",
  "POT-Q-C02-02": "Wenn die Dringlichkeit unklar ist – wer soll dann künftig entscheiden?",
  "POT-Q-C02-03": "Soll das Team wissen, wer wofür zuständig ist, und soll das schriftlich festgehalten werden?",
  "POT-Q-C02-04": "Soll es eine Regelung für den Fall geben, dass die zuständige Person nicht da ist?",
  "POT-Q-C03-01": "Was soll die Praxis künftig standardmäßig erfassen, wenn jemand ohne Termin kommt?",
  "POT-Q-C03-02": "Wie soll es künftig in der Regel weitergehen – welches Vorgehen soll verbindlich sein?",
  "POT-Q-C03-03": "Soll das Anliegen des Patienten künftig festgehalten werden, bevor entschieden wird, wie es weitergeht?",
  "POT-Q-C04-01": "Woran soll das Team künftig erkennen, dass ein Patient sofort versorgt werden muss?",
  "POT-Q-C04-02": "Was soll passieren, wenn der Verdacht besteht, dass es sich um einen Notfall handelt?",
  "POT-Q-C04-03": "In welchen Situationen soll die Praxis künftig an den ärztlichen Bereitschaftsdienst (116 117) verweisen?",
  "POT-Q-C04-04": "Soll das Team wissen, wann der Arzt sofort dazu geholt werden muss und wann der Notruf (112) nötig ist?",
  "POT-Q-C04-05": "Wie soll die Weiterleitung künftig erfolgen?",
  "POT-Q-C05-01": "Soll die Praxis künftig festhalten, wenn jemand ohne Termin weitergeleitet oder auf einen Termin verwiesen wird?",
  "POT-Q-C05-02": "Wann soll die Praxis prüfen, ob dieser Ablauf noch passt?",
  "POT-Q-C05-03": "Wer soll dafür verantwortlich sein, dass dieser Ablauf aktuell bleibt?",
};
