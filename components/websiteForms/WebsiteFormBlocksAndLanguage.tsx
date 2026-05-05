"use client";

/**
 * Client-Komponente für die Sprach- und Block-Auswahl in der
 * Website-Formularverwaltung (`/website-forms/[id]`).
 *
 * Verantwortlich für:
 *   - Dropdown „Sprache der Patientensicht" (DE / EN), Default DE
 *   - Block-Checkboxen analog zur Server-Variante
 *   - Wenn Englisch gewählt ist:
 *       * nicht EN-ready Blöcke werden disabled und sichtbar markiert
 *       * Auswahl nicht EN-ready Blöcke wird beim Wechsel auf EN bereinigt
 *
 * Server-seitig wird die EN-Readiness in `validateWebsiteFormInput`
 * zusätzlich geprüft, damit ein Bypass via direkten POST keinen
 * EN-Formulareintrag mit nicht-EN-ready Blöcken speichern kann.
 *
 * Wert wird über native Form-Felder (`name="patient_language"`,
 * `name="selected_block_ids"`) übermittelt — die umschließende
 * Server-Form postet weiter klassisch an `/api/website-forms[/id]`.
 */

import { useState } from "react";
import { isBlockEnReady, type QuestionnaireLanguage } from "@/lib/questionnaire/i18n";

export type BlockChoice = {
  id: string;
  label: string;
  enReady: boolean;
};

export function WebsiteFormBlocksAndLanguage({
  blocks,
  initialLanguage,
  initialSelectedBlockIds,
}: {
  blocks: BlockChoice[];
  initialLanguage: QuestionnaireLanguage;
  initialSelectedBlockIds: string[];
}) {
  const [language, setLanguage] = useState<QuestionnaireLanguage>(initialLanguage);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of initialSelectedBlockIds) init[id] = true;
    return init;
  });

  function handleLanguageChange(next: QuestionnaireLanguage) {
    setLanguage(next);
    if (next === "en") {
      // Auswahl bereinigen — nicht EN-ready Blöcke werden abgewählt.
      setSelected((prev) => {
        const cleaned: Record<string, boolean> = {};
        for (const id of Object.keys(prev)) {
          if (prev[id] && isBlockEnReady(id)) cleaned[id] = true;
        }
        return cleaned;
      });
    }
  }

  function toggleBlock(id: string, enReady: boolean) {
    if (language === "en" && !enReady) return;
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Sprache der Patientensicht</span>
        <select
          name="patient_language"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as QuestionnaireLanguage)}
          data-website-form-language-select
        >
          <option value="de">Deutsch</option>
          <option value="en">Englisch</option>
        </select>
        <span className="text-muted" style={{ fontSize: "0.8rem" }}>
          Bei Englisch dürfen nur vollständig übersetzte Blöcke ausgewählt
          werden. Praxisoutput und PDF bleiben deutsch.
        </span>
      </label>
      <fieldset style={{ display: "grid", gap: "0.25rem" }}>
        <legend>Fragebogen-Blöcke</legend>
        {blocks.map((b) => {
          const blockedByLanguage = language === "en" && !b.enReady;
          const checked = !!selected[b.id] && !blockedByLanguage;
          return (
            <label
              key={b.id}
              style={{
                display: "flex",
                gap: "0.5rem",
                opacity: blockedByLanguage ? 0.5 : 1,
              }}
              data-block-choice={b.id}
              data-block-en-ready={b.enReady ? "true" : "false"}
              data-block-blocked={blockedByLanguage ? "true" : "false"}
            >
              <input
                type="checkbox"
                name="selected_block_ids"
                value={b.id}
                checked={checked}
                disabled={blockedByLanguage}
                onChange={() => toggleBlock(b.id, b.enReady)}
              />
              <span>
                {b.label}
                {!b.enReady && (
                  <span
                    className="text-muted"
                    style={{ marginLeft: "0.4rem", fontSize: "0.8rem" }}
                  >
                    (nur Deutsch verfügbar)
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
    </>
  );
}
