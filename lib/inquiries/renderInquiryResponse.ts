import {
  InquiryCheckpointStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  InquiryCheckpointPlacement,
  ActionStatus,
  ExplanationStatus,
  ExplanationOutputStatus,
  DecisionStatus,
  ResponseKind,
  type Audience,
  type AudienceText,
  type ConfirmedInquiryCheckpoint,
  type InquiryCheckpoint,
  type InquiryOutput,
  type InquiryProfile,
  type InquirySection,
  type InquirySectionOutput,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { INQUIRY_CHECKPOINT_CATALOG_V2, INTRO_CHECKPOINT_IDS, SECTION_INTRO_CHECKPOINT_IDS } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

/**
 * Erzeugt deterministisch den Antworttext und die Dokumentation
 * aus einem bestätigten Satz von Klärpunkten.
 *
 * Invarianten:
 * - Akzeptiert ausschließlich ConfirmedInquiryCheckpoints (kein UNGEKLAERT möglich).
 * - Wirft einen Fehler, wenn ein Checkpoint den Status UNGEKLAERT trägt
 *   (defensiv gegen fehlerhafte Aufrufe mit falschem Typ).
 * - Keine LLM-Logik, kein Netzwerk, keine Seiteneffekte.
 * - Bausteine erscheinen in der Reihenfolge der übergebenen Checkpoints.
 *
 * Hinweis-Auflösung:
 * - HINWEIS         → hintText (notwendig)
 * - HINWEIS_OPTIONAL → hintTextOptional ?? hintText (empfohlen, weicher Hinweis)
 * - GEKLAERT         → kein Hinweis
 *
 * Dokumentations-Auflösung:
 * - HINWEIS_OPTIONAL ohne eigenen docText-Eintrag fällt auf docText.HINWEIS zurück.
 *
 * @param profile   - Statisches Anfrageprofil (Kernantwort + Checkpoint-Reihenfolge).
 * @param confirmed - Bestätigte Klärpunkte (GEKLAERT, HINWEIS oder HINWEIS_OPTIONAL).
 * @returns InquiryOutput mit coreAnswer, hints und documentation.
 */
export function renderInquiryResponse(
  profile: InquiryProfile,
  confirmed: ConfirmedInquiryCheckpoint[],
): InquiryOutput {
  // Defensiv-Guard: ConfirmedInquiryCheckpoint schließt UNGEKLAERT typseitig aus,
  // aber wir validieren zur Laufzeit, um Fehler bei unsicheren Casts früh zu fangen.
  for (const cp of confirmed) {
    if ((cp.status as InquiryCheckpointStatus) === InquiryCheckpointStatus.UNGEKLAERT) {
      throw new Error(
        `renderInquiryResponse: Checkpoint "${cp.id}" hat Status UNGEKLAERT. ` +
          `Nur bestätigte Checkpoints (GEKLAERT, HINWEIS oder HINWEIS_OPTIONAL) sind zulässig.`,
      );
    }
  }

  const hints: string[] = confirmed
    .filter(
      (cp) =>
        cp.status === InquiryCheckpointStatus.HINWEIS ||
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL,
    )
    .map((cp) => {
      if (cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL) {
        return cp.hintTextOptional ?? cp.hintText;
      }
      return cp.hintText;
    });

  // Grouped hints: each hint is placed into the bucket matching its responseKind.
  // For HINWEIS_OPTIONAL, responseKindOptional takes precedence if defined.
  const groupedHints: InquiryOutput["groupedHints"] = {
    voraussetzungen: [],
    aktionen: [],
    vorbereitungen: [],
    infos: [],
    ablehnungen: [],
  };

  confirmed
    .filter(
      (cp) =>
        cp.status === InquiryCheckpointStatus.HINWEIS ||
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL,
    )
    .forEach((cp) => {
      const hintText =
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL
          ? (cp.hintTextOptional ?? cp.hintText)
          : cp.hintText;
      const kind =
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL
          ? (cp.responseKindOptional ?? cp.responseKind)
          : cp.responseKind;

      switch (kind) {
        case ResponseKind.VORAUSSETZUNG:
          groupedHints.voraussetzungen.push(hintText);
          break;
        case ResponseKind.AKTION:
          groupedHints.aktionen.push(hintText);
          break;
        case ResponseKind.VORBEREITUNG:
          groupedHints.vorbereitungen.push(hintText);
          break;
        case ResponseKind.ABLEHNUNG_ALTERNATIVE:
          groupedHints.ablehnungen.push(hintText);
          break;
        case ResponseKind.INFO:
        case ResponseKind.AKTENNOTIZ:
        default:
          groupedHints.infos.push(hintText);
          break;
      }
    });

  // paragraphs: flat sorted list – Voraussetzungen → Aktionen → Vorbereitungen → Infos → Ablehnungen.
  const paragraphs: string[] = [
    ...groupedHints.voraussetzungen,
    ...groupedHints.aktionen,
    ...groupedHints.vorbereitungen,
    ...groupedHints.infos,
    ...groupedHints.ablehnungen,
  ];

  const documentation: string[] = [
    `${profile.label} angefragt.`,
    ...confirmed.map((cp) => {
      // HINWEIS_OPTIONAL may not have its own docText entry – fall back to HINWEIS.
      return (
        cp.docText[cp.status] ??
        cp.docText[InquiryCheckpointStatus.HINWEIS]
      );
    }),
  ];

  return {
    coreAnswer: profile.coreAnswer,
    hints,
    groupedHints,
    paragraphs,
    documentation,
  };
}

// ---------------------------------------------------------------------------
// Neue Architektur – renderInquiryResponseFromSections
// ---------------------------------------------------------------------------

/** Sortierreihenfolge für actionCategory. Einträge ohne Kategorie landen am Ende. */
const ACTION_CATEGORY_ORDER: Record<string, number> = {
  NEXT_STEP: 0,
  PREPARATION: 1,
  PROCESS: 2,
  INFO: 3,
};

function actionCategoryRank(category?: string): number {
  return category !== undefined ? (ACTION_CATEGORY_ORDER[category] ?? 4) : 4;
}

/**
 * Optionen für renderInquiryResponseFromSections.
 *
 * audience – Zielgruppe der Textausgabe.
 *            Beeinflusst die Textauflösung: textByAudience?.[audience] ?? textByStatus[status].
 *            Default: "patient".
 */
export type RenderOptions = {
  audience?: Audience;
};

/**
 * Löst den Ausgabetext eines Checkpoints für einen Status auf.
 *
 * Fallback-Kette:
 *   audienceOverride = textByAudience?.[audience]
 *   string  → gilt für alle Statuses (ersetzt textByStatus[status])
 *   Record  → audienceOverride[status] ?? textByStatus[status]
 *   missing → textByStatus[status]
 *
 * @param checkpoint - Checkpoint-Definition aus dem Katalog.
 * @param status     - Aktueller Statuswert.
 * @param audience   - Zielgruppe ("patient" | "contact_person"). Default: "patient".
 */
function resolveCheckpointText(
  checkpoint: InquiryCheckpoint,
  status: string,
  audience: Audience,
): string | undefined {
  const statusText = checkpoint.textByStatus[status as keyof typeof checkpoint.textByStatus];
  const override: AudienceText | undefined = checkpoint.textByAudience?.[audience];
  if (override === undefined) {
    return statusText;
  }
  if (typeof override === "string") {
    return override;
  }
  // Per-status Record: fehlende Einträge fallen auf textByStatus zurück.
  return override[status] ?? statusText;
}

/**
 * Erzeugt deterministisch den strukturierten Antworttext und die Dokumentation
 * aus einem oder mehreren Anliegen-Abschnitten (Sections) nach der neuen Architektur.
 *
 * Regeln:
 * - DECISION-Checkpoint liefert mainDecision (wird NICHT in attachedParagraphs aufgeführt).
 * - SPECIFIC/ATTACHED-Checkpoints werden pro Abschnitt in attachedParagraphs ausgegeben.
 * - GLOBAL/EXPLANATION-Checkpoints sind reine M2-Schalter:
 *   - Status YES  → Hinweistext aus profile.globalHints[checkpointId] → attachedParagraphs.
 *   - Status NO / fehlend → kein Output, kein Text aus checkpoint.textByStatus.
 * - SPECIFIC EXPLANATION-Checkpoints folgen der factStatus/outputStatus-Regel (§18):
 *   - explanationOutputStatuses vorhanden: nur SHOW erzeugt Output.
 *   - explanationOutputStatuses fehlt (Backward-Compat): factStatus YES → wie SHOW.
 * - OUTCOME-Checkpoints (classification = "OUTCOME") folgen nicht der EXPLANATION-Regel (§19):
 *   - werden nur gerendert, wenn decisionStatus = POSSIBLE.
 * - SHARED_BOTTOM-Checkpoints (ACTION) werden gesammelt und einmal dedupliziert unten ausgegeben.
 * - Keine LLM-Logik, kein Netzwerk, keine Seiteneffekte.
 *
 * @param sections – Eine Section pro Anliegen mit Entscheidungsstatus und Checkpoint-Statuses.
 * @returns InquiryResponseV2Output mit sections, sharedBottom und documentation.
 */
export function renderInquiryResponseFromSections(
  sections: InquirySection[],
  options?: RenderOptions,
): InquiryResponseV2Output {
  const audience: Audience = options?.audience ?? "patient";
  const sectionOutputs: InquirySectionOutput[] = [];
  const sharedBottomEntries: Array<{ text: string; category?: string }> = [];
  const sharedBottomSeen = new Set<string>();
  const allDocumentation: string[] = [];
  // Track which GLOBAL checkpoints have already contributed a M5 doc entry.
  // GLOBAL docs must appear exactly once across all sections (not per-anliegen).
  const globalDocSeen = new Set<string>();
  // Track GLOBAL EXPLANATION-Checkpoints, die bereits in einer früheren Section
  // in attachedParagraphs gerendert wurden. Derselbe globale Baustein soll im
  // finalen Patiententext nur einmal erscheinen – erste Vorkommensstelle gewinnt.
  const globalAttachedSeen = new Set<string>();
  // Track ACTION-Checkpoints, die schon in einer früheren Section in
  // attachedParagraphs gerendert wurden. Wenn dieselbe Action-ID an mehrere
  // Profile gebunden ist (z. B. ACUTE_OPEN_CONSULTATION_ACTION, BOOK_APPOINTMENT),
  // soll sie im Patiententext und in der Dokumentation trotzdem nur einmal
  // erscheinen – erste Vorkommensstelle gewinnt, Reihenfolge bleibt stabil.
  // Betrifft nur Actions in `boundActionCheckpointIds` mit placement ≠ SHARED_BOTTOM
  // (SHARED_BOTTOM-Actions sind über `sharedBottomSeen` bereits dedupliziert.)
  const attachedActionSeen = new Set<string>();
  // Track SPECIFIC EXPLANATION-Checkpoints, die bereits in einer früheren
  // Section im Patiententext gerendert wurden. Wenn dieselbe Checkpoint-ID in
  // mehreren Profilen wiederverwendet wird (z. B. TECH_UPLOAD_FAILED), soll der
  // Text samt Dokumentation nur einmal erscheinen – erste sichtbare Vorkommensstelle
  // gewinnt. Der Guard greift erst nach Status-/SHOW-Prüfung und tatsächlicher
  // Textauflösung, damit HIDE oder fehlender Text eine spätere sichtbare Section
  // nicht blockieren.
  const specificExplanationSeen = new Set<string>();

  for (const section of sections) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[section.inquiryId];
    if (!profile) {
      throw new Error(
        `renderInquiryResponseFromSections: Kein Profil für Anliegen "${section.inquiryId}" gefunden.`,
      );
    }

    const attachedParagraphs: string[] = [];
    const sectionDocumentation: string[] = [];

    // ---- A) Decision-Checkpoint → mainDecision ----
    let mainDecision: string | null = null;
    const decisionCheckpoint = INQUIRY_CHECKPOINT_CATALOG_V2[profile.decisionCheckpointId];
    if (decisionCheckpoint) {
      const text = resolveCheckpointText(decisionCheckpoint, section.decisionStatus, audience) ?? null;
      mainDecision = text;
      if (text) {
        const docText = decisionCheckpoint.docByStatus?.[section.decisionStatus] ?? text;
        sectionDocumentation.push(`${decisionCheckpoint.label}: ${docText}`);
      }
    }

    // ---- B) Specific Checkpoints → attachedParagraphs ----
    for (const checkpointId of profile.specificCheckpointIds) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId];
      if (!checkpoint) continue;

      const status = section.checkpointStatuses[checkpointId];
      if (status === undefined) continue;
      if (status === ActionStatus.INACTIVE) continue;

      // OUTCOME-Guard: OUTCOME-Checkpoints beschreiben das Ergebnis einer positiven
      // Hauptentscheidung und dürfen nur gerendert werden, wenn decisionStatus = POSSIBLE.
      // → docs/architecture/anfrage-assistent.md §19
      if (checkpoint.classification === "OUTCOME" && section.decisionStatus !== DecisionStatus.POSSIBLE) continue;

      // EXPLANATION-Regel (factStatus / outputStatus, gilt nur für Nicht-OUTCOME):
      // OUTCOME-Checkpoints nutzen weiterhin textByStatus direkt und folgen dieser Regel nicht.
      if (
        checkpoint.kind === InquiryCheckpointKind.EXPLANATION &&
        checkpoint.scope === InquiryCheckpointScope.SPECIFIC &&
        checkpoint.classification !== "OUTCOME"
      ) {
        if (section.explanationOutputStatuses) {
          // Neue Regel (§18): M4 rendert nur, wenn M3 outputStatus = SHOW gesetzt hat.
          if (section.explanationOutputStatuses[checkpointId] !== ExplanationOutputStatus.SHOW) continue;
        } else {
          // Übergangsableitung (Backward-Compat): factStatus YES → wie SHOW, sonst kein Output.
          // Gilt für ältere Sessions ohne gespeichertes explanationOutputStatuses.
          if (status !== ExplanationStatus.YES) continue;
        }
      }

      const text = resolveCheckpointText(checkpoint, status, audience);
      if (!text) continue;

      if (
        checkpoint.kind === InquiryCheckpointKind.EXPLANATION &&
        checkpoint.scope === InquiryCheckpointScope.SPECIFIC
      ) {
        if (specificExplanationSeen.has(checkpointId)) continue;
        specificExplanationSeen.add(checkpointId);
      }

      const docText = checkpoint.docByStatus?.[status] ?? text;
      attachedParagraphs.push(text);
      sectionDocumentation.push(`${checkpoint.label}: ${docText}`);
    }

    // ---- C) Global EXPLANATION Checkpoints → YES + SHOW → globalHints oder textByStatus[YES] ----
    for (const checkpointId of profile.boundGlobalCheckpointIds) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId];
      if (!checkpoint) continue;
      if (checkpoint.scope !== InquiryCheckpointScope.GLOBAL) continue;
      if (checkpoint.kind !== InquiryCheckpointKind.EXPLANATION) continue;

      const status = section.checkpointStatuses[checkpointId];
      if (status !== ExplanationStatus.YES) continue;

      // M3 SHOW/HIDE-Gate: nur für MODULAR-Checkpoints anwenden.
      // GLOBAL_STATE-Checkpoints erscheinen nie in M3 und haben daher keinen SHOW/HIDE-Status.
      // Sie werden ausschließlich durch M2 YES gesteuert und dürfen nicht durch ein fehlendes
      // explanationOutputStatuses-Entry blockiert werden.
      if (checkpoint.classification === "MODULAR" && section.explanationOutputStatuses) {
        if (section.explanationOutputStatuses[checkpointId] !== ExplanationOutputStatus.SHOW) continue;
      }

      // Texthierarchie: profilspezifischer Override hat Vorrang, dann zielgruppenspezifischer
      // Checkpoint-Text, schließlich textByStatus.
      const text =
        profile.globalHints?.[checkpointId] ?? resolveCheckpointText(checkpoint, status, audience);
      if (!text) continue;

      // M4: Globaler Hinweistext erscheint profilübergreifend nur einmal.
      if (!globalAttachedSeen.has(checkpointId)) {
        globalAttachedSeen.add(checkpointId);
        attachedParagraphs.push(text);
      }

      // M5: Dokumentationsmarke erscheint genau einmal über alle Anliegen hinweg.
      if (!globalDocSeen.has(checkpointId)) {
        globalDocSeen.add(checkpointId);
        sectionDocumentation.push(checkpoint.label);
      }
    }

    // ---- D) ACTION/SHARED_BOTTOM (availableActionIds) – unverändert ----
    for (const actionId of profile.availableActionIds) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[actionId];
      if (!checkpoint) continue;
      if (checkpoint.kind !== InquiryCheckpointKind.ACTION) continue;
      if (checkpoint.placement !== InquiryCheckpointPlacement.SHARED_BOTTOM) continue;

      const status = section.checkpointStatuses[actionId];
      if (status === undefined || status === ActionStatus.INACTIVE) continue;

      const text = resolveCheckpointText(checkpoint, status, audience);
      if (!text) continue;

      if (!sharedBottomSeen.has(actionId)) {
        sharedBottomSeen.add(actionId);
        sharedBottomEntries.push({ text, category: checkpoint.actionCategory });
      }
    }

    // ---- E) Profil-spezifische ACTION-Checkpoints (boundActionCheckpointIds) ----
    const attachedActionEntries: Array<{ text: string; docText: string; label: string; category?: string }> = [];
    for (const actionId of profile.boundActionCheckpointIds ?? []) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[actionId];
      if (!checkpoint) continue;
      if (checkpoint.kind !== InquiryCheckpointKind.ACTION) continue;

      const status = section.checkpointStatuses[actionId];
      if (status === undefined || status === ActionStatus.INACTIVE) continue;

      const text = resolveCheckpointText(checkpoint, status, audience);
      if (!text) continue;

      if (checkpoint.placement === InquiryCheckpointPlacement.SHARED_BOTTOM) {
        if (!sharedBottomSeen.has(actionId)) {
          sharedBottomSeen.add(actionId);
          sharedBottomEntries.push({ text, category: checkpoint.actionCategory });
        }
      } else {
        // Cross-Section-Dedup: gleiche Action-ID nur in der ersten Section
        // rendern, in der sie aktiv ist. Schützt vor Doppelrendering bei
        // kombinierten Anliegen (z. B. AU + APPOINTMENT teilen
        // ACUTE_OPEN_CONSULTATION_ACTION oder BOOK_APPOINTMENT).
        if (attachedActionSeen.has(actionId)) continue;
        attachedActionSeen.add(actionId);
        const docText = checkpoint.docByStatus?.[status] ?? text;
        attachedActionEntries.push({ text, docText, label: checkpoint.label, category: checkpoint.actionCategory });
      }
    }
    attachedActionEntries.sort((a, b) => actionCategoryRank(a.category) - actionCategoryRank(b.category));
    for (const entry of attachedActionEntries) {
      attachedParagraphs.push(entry.text);
      sectionDocumentation.push(`${entry.label}: ${entry.docText}`);
    }

    sectionOutputs.push({
      inquiryId: section.inquiryId,
      label: profile.label,
      mainDecision,
      attachedParagraphs,
      documentation: sectionDocumentation,
    });

    allDocumentation.push(...sectionDocumentation);
  }

  // ---- F) Intro-Baustein – erster aktiver INTRO-Checkpoint → output.intro ----
  // Intro-Checkpoints sind keine profile-gebundenen Actions. Sie werden separat
  // aus den checkpointStatuses der ersten Section (alle Sections teilen dieselbe
  // Statuses-Map) in der definierten INTRO_CHECKPOINT_IDS-Reihenfolge gesucht.
  // Nur der erste aktive Intro wird verwendet; weitere aktive INTROs werden ignoriert.
  // Intro-Texte erscheinen NICHT in sharedBottom.
  let intro: string | undefined;
  let activeIntroId: string | undefined;
  const firstSectionStatuses = sections[0]?.checkpointStatuses ?? {};
  for (const introId of INTRO_CHECKPOINT_IDS) {
    const status = firstSectionStatuses[introId];
    if (status !== ActionStatus.ACTIVE) continue;
    const introCp = INQUIRY_CHECKPOINT_CATALOG_V2[introId];
    if (!introCp) continue;
    const text = resolveCheckpointText(introCp, ActionStatus.ACTIVE, audience);
    if (text) { intro = text; activeIntroId = introId; break; }
  }

  // ---- G) Section-Intro – nur an Message-Intros E1/E2/E3 anhängen ----
  // Section-Intros (M2 „Schubladen") sind die zweite Intro-Ebene. Sie werden
  // ausschließlich als Anschlussform an die Nominalphrasen E1/E2/E3 gehängt.
  // Hinter E4/E5 (vollständige Sätze) wird kein Section-Intro gerendert.
  // SECTION_INTRO_CHECKPOINT_IDS bleibt strikt getrennt von INTRO_CHECKPOINT_IDS;
  // Section-Intros erscheinen ebenfalls NICHT in sharedBottom.
  const SECTION_INTRO_COMPATIBLE_MESSAGE_INTROS = new Set<string>([
    "MESSAGE_INTRO_PRACTICE_FOLLOWUP",      // E1
    "MESSAGE_INTRO_MISSING_INFO",           // E2
    "MESSAGE_INTRO_APPOINTMENT_PREPARATION", // E3
  ]);
  if (intro !== undefined && activeIntroId && SECTION_INTRO_COMPATIBLE_MESSAGE_INTROS.has(activeIntroId)) {
    for (const sectionIntroId of SECTION_INTRO_CHECKPOINT_IDS) {
      const status = firstSectionStatuses[sectionIntroId];
      if (status !== ActionStatus.ACTIVE) continue;
      const sectionIntroCp = INQUIRY_CHECKPOINT_CATALOG_V2[sectionIntroId];
      if (!sectionIntroCp) continue;
      const sectionText = resolveCheckpointText(sectionIntroCp, ActionStatus.ACTIVE, audience);
      if (sectionText) {
        intro = `${intro} ${sectionText}`;
        break;
      }
    }
  }

  return {
    ...(intro !== undefined ? { intro } : {}),
    sections: sectionOutputs,
    sharedBottom: sharedBottomEntries
      .sort((a, b) => actionCategoryRank(a.category) - actionCategoryRank(b.category))
      .map((e) => e.text),
    documentation: allDocumentation,
  };
}
