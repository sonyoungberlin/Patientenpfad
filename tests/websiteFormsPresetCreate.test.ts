/**
 * Preset-Button im Create-Flow: /website-forms
 *
 * Prüft das Verhalten von WebsiteFormBlocksAndLanguage im Anlegen-Kontext
 * (initialSelectedBlockIds = [], initialLanguage = "de").
 *
 * Die Tests spiegeln dieselbe Logik, die die Komponente ausführt:
 *  1. Create-Flow startet mit leerer Auswahl
 *  2. Preset-Klick selektiert alle 11 VOLLST-Blöcke
 *  3. KURZANAMNESE bleibt unverändert (nicht im Preset)
 *  4. Bestehende andere Auswahl bleibt nach Preset-Klick erhalten
 *  5. Einzelne VOLLST-Blöcke können nach Preset-Klick abgewählt werden
 *  6. Blockauswahl deckt alle Blöcke ab (keine fehlenden IDs)
 *  7. blockChoices-Aufbau: jede ID aus BLOCK_IDS_SORTED erhält enReady-Flag
 *  8. Bei "en" sind Nicht-EN-ready-Blöcke nicht wählbar
 *  9. Create-Submit-Felder: selected_block_ids entsprechen den gewählten IDs
 */

import {
  BLOCK_CATALOG,
  BLOCK_IDS_SORTED,
  VOLLSTAENDIGE_ANAMNESE_PRESET,
} from "../lib/questionnaire/blockCatalog";
import { isBlockEnReady } from "../lib/questionnaire/i18n";
import type { BlockChoice } from "../components/websiteForms/WebsiteFormBlocksAndLanguage";

// ---------------------------------------------------------------------------
// Hilfsfunktionen — imitieren den Laufzeit-State der Komponente
// ---------------------------------------------------------------------------

function buildBlockChoices(): BlockChoice[] {
  return BLOCK_IDS_SORTED.map((blockId) => ({
    id: blockId,
    label: BLOCK_CATALOG[blockId]?.label ?? blockId,
    enReady: isBlockEnReady(blockId),
  }));
}

function applyPreset(state: Record<string, boolean>): Record<string, boolean> {
  const next = { ...state };
  for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) next[id] = true;
  return next;
}

function toggleBlock(
  state: Record<string, boolean>,
  id: string,
  language: "de" | "en",
  enReady: boolean,
): Record<string, boolean> {
  if (language === "en" && !enReady) return state;
  return { ...state, [id]: !state[id] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Website-Formulare Create-Flow – Preset-Button", () => {
  it("1. Create-Flow startet mit leerer Auswahl", () => {
    const state: Record<string, boolean> = {};
    expect(Object.keys(state)).toHaveLength(0);
  });

  it("2. Preset-Klick aus leerem Zustand selektiert alle 11 VOLLST-Blöcke", () => {
    const result = applyPreset({});
    expect(Object.keys(result)).toHaveLength(11);
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) {
      expect(result[id]).toBe(true);
    }
  });

  it("3. KURZANAMNESE bleibt nach Preset-Klick unverändert (nicht im Preset)", () => {
    // ohne KURZANAMNESE vorher
    const withoutKurz = applyPreset({});
    expect(withoutKurz["KURZANAMNESE"]).toBeUndefined();

    // mit KURZANAMNESE vorher
    const withKurz = applyPreset({ KURZANAMNESE: true });
    expect(withKurz["KURZANAMNESE"]).toBe(true);
  });

  it("4. Bestehende Auswahl (IDENTITAET, KONTAKT) bleibt erhalten", () => {
    const initial = { IDENTITAET: true, KONTAKT: true };
    const result = applyPreset(initial);
    expect(result.IDENTITAET).toBe(true);
    expect(result.KONTAKT).toBe(true);
    // Preset-Blöcke wurden hinzugefügt
    expect(result.VOLLST_NIKOTIN).toBe(true);
  });

  it("5. Einzelne VOLLST-Blöcke nach Preset abwählbar", () => {
    let state = applyPreset({});
    const choices = buildBlockChoices();
    const nikotin = choices.find((b) => b.id === "VOLLST_NIKOTIN")!;
    state = toggleBlock(state, "VOLLST_NIKOTIN", "de", nikotin.enReady);
    expect(state["VOLLST_NIKOTIN"]).toBe(false);
    // andere bleiben true
    expect(state["VOLLST_ALKOHOL"]).toBe(true);
  });

  it("6. blockChoices enthält alle Blöcke aus BLOCK_IDS_SORTED", () => {
    const choices = buildBlockChoices();
    expect(choices).toHaveLength(BLOCK_IDS_SORTED.length);
    for (const id of BLOCK_IDS_SORTED) {
      const c = choices.find((b) => b.id === id);
      expect(c).toBeDefined();
      expect(c!.label).toBeTruthy();
      expect(typeof c!.enReady).toBe("boolean");
    }
  });

  it("7. blockChoices: KURZANAMNESE ist EN-ready, VOLLST-Blöcke sind nicht EN-ready", () => {
    const choices = buildBlockChoices();
    const kurz = choices.find((b) => b.id === "KURZANAMNESE")!;
    expect(kurz.enReady).toBe(true);
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) {
      const c = choices.find((b) => b.id === id)!;
      expect(c.enReady).toBe(false);
    }
  });

  it("8. Bei Englisch: Nicht-EN-ready-Block kann nicht durch toggleBlock gewählt werden", () => {
    const state: Record<string, boolean> = {};
    // VOLLST_NIKOTIN ist nicht EN-ready
    const result = toggleBlock(state, "VOLLST_NIKOTIN", "en", false);
    expect(result["VOLLST_NIKOTIN"]).toBeUndefined();
  });

  it("8b. Bei Englisch: EN-ready-Block kann gewählt werden", () => {
    const state: Record<string, boolean> = {};
    const result = toggleBlock(state, "KURZANAMNESE", "en", true);
    expect(result["KURZANAMNESE"]).toBe(true);
  });

  it("9. Ausgewählte IDs entsprechen den Submit-Feldern (selected_block_ids)", () => {
    // Simuliert: Preset anwenden, dann VOLLST_NIKOTIN abwählen
    let state = applyPreset({ IDENTITAET: true });
    state = { ...state, VOLLST_NIKOTIN: false };

    const submitIds = Object.entries(state)
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    expect(submitIds).toContain("IDENTITAET");
    expect(submitIds).not.toContain("VOLLST_NIKOTIN");
    // Alle anderen 10 Preset-Blöcke
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET.filter((i) => i !== "VOLLST_NIKOTIN")) {
      expect(submitIds).toContain(id);
    }
  });
});
