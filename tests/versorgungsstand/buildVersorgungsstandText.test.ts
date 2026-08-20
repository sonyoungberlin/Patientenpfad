import { buildVersorgungsstandText } from "@/lib/versorgungsstand/buildVersorgungsstandText";
import type { VersorgungsstandAnswers } from "@/lib/versorgungsstand/buildVersorgungsstandText";

function empty(): VersorgungsstandAnswers {
  return {};
}

describe("buildVersorgungsstandText", () => {
  describe("Header", () => {
    it("leere Answers → nur Header-Zeile", () => {
      expect(buildVersorgungsstandText(empty())).toBe("Versorgungsstand");
    });

    it("Stichtag vorhanden → Header mit deutschem Datum", () => {
      const result = buildVersorgungsstandText({ allg_stichtag: "2026-08-20" });
      expect(result.startsWith("Versorgungsstand vom 20.08.2026")).toBe(true);
    });

    it("ungültiges Datumsformat → unveränderter Wert im Header", () => {
      const result = buildVersorgungsstandText({ allg_stichtag: "20.08.2026" });
      expect(result).toBe("Versorgungsstand vom 20.08.2026");
    });
  });

  describe("Sektion Allgemeiner Stand", () => {
    it("keine Felder befüllt → Sektion wird ausgelassen", () => {
      const result = buildVersorgungsstandText(empty());
      expect(result).not.toContain("Allgemeiner Stand");
    });

    it("Anlass befüllt → Sektion erscheint", () => {
      const result = buildVersorgungsstandText({ allg_anlass: "Routinecheck" });
      expect(result).toContain("Allgemeiner Stand");
      expect(result).toContain("Anlass / Kontext: Routinecheck");
    });

    it("Informationsgrundlage-Checkboxen → kommagetrennte Liste", () => {
      const result = buildVersorgungsstandText({
        allg_info_gespraech: true,
        allg_info_mfa: true,
        allg_info_praxis: false,
      });
      expect(result).toContain("Informationsgrundlage: Patientengespräch, MFA-Erhebung");
      expect(result).not.toContain("Praxisdokumentation");
    });

    it("sonstige Informationsgrundlage → eigene Zeile", () => {
      const result = buildVersorgungsstandText({
        allg_info_sonstiges: true,
        allg_info_sonstiges_text: "Arztbrief vom Krankenhaus",
      });
      expect(result).toContain("Sonstige Informationsgrundlage / Hinweis: Arztbrief vom Krankenhaus");
    });

    it("sonstiger Hinweis ohne Checkbox → erscheint trotzdem", () => {
      const result = buildVersorgungsstandText({ allg_info_sonstiges_text: "Hinweis XY" });
      expect(result).toContain("Hinweis XY");
    });

    it("keine Checkbox aktiv → keine Informationsgrundlage-Zeile", () => {
      const result = buildVersorgungsstandText({ allg_anlass: "Test" });
      expect(result).not.toContain("Informationsgrundlage:");
    });
  });

  describe("rowGroup medizinisches Thema", () => {
    it("thema_1 teilweise befüllt → nur befüllte Felder mit Klärungsstand", () => {
      const result = buildVersorgungsstandText({
        thema_1_name: "Hypertonie",
        thema_1_klaerungsstand: "teilweise geklärt",
      });
      expect(result).toContain("Medizinisches Thema 1");
      expect(result).toContain("Thema / Diagnose: Hypertonie");
      expect(result).toContain("Klärungsstand: teilweise geklärt");
      expect(result).not.toContain("Letzte relevante Abklärung");
    });

    it("thema_1 Datum → deutsch formatiert", () => {
      const result = buildVersorgungsstandText({
        thema_1_name: "Diabetes",
        thema_1_datum: "2026-05-12",
      });
      expect(result).toContain("Letzte relevante Abklärung: 12.05.2026");
    });

    it("thema_1_offen mit Zeilenumbruch → eingerückte Ausgabe", () => {
      const result = buildVersorgungsstandText({
        thema_1_name: "Test",
        thema_1_offen: "Zeile 1\nZeile 2",
      });
      expect(result).toContain("Offen / zu klären:");
      expect(result).toContain("  Zeile 1");
      expect(result).toContain("  Zeile 2");
    });

    it("thema_1 komplett leer → Gruppe nicht im Output", () => {
      const result = buildVersorgungsstandText({ thema_2_name: "Herzinsuffizienz" });
      expect(result).not.toContain("Medizinisches Thema 1");
      expect(result).toContain("Medizinisches Thema 2");
    });

    it("thema_3 bis thema_6 leer → nicht im Output", () => {
      const result = buildVersorgungsstandText({ thema_1_name: "Hypertonie" });
      for (let n = 3; n <= 6; n++) {
        expect(result).not.toContain(`Medizinisches Thema ${n}`);
      }
    });
  });

  describe("rowGroup Facharzt", () => {
    it("fa_1 befüllt → erscheint korrekt", () => {
      const result = buildVersorgungsstandText({
        fa_1_fach: "Kardiologie – Dr. Müller",
        fa_1_kontakt: "2026-05-12",
        fa_1_befund: "ja",
      });
      expect(result).toContain("Facharzt 1");
      expect(result).toContain("Fachrichtung / Praxis: Kardiologie – Dr. Müller");
      expect(result).toContain("Letzter Kontakt: 12.05.2026");
      expect(result).toContain("Befund vorhanden: ja");
    });

    it("fa_1 komplett leer → nicht im Output", () => {
      const result = buildVersorgungsstandText({ fa_2_fach: "Neurologie" });
      expect(result).not.toContain("Facharzt 1");
      expect(result).toContain("Facharzt 2");
    });

    it("fa_3 bis fa_6 leer → nicht im Output", () => {
      const result = buildVersorgungsstandText({ fa_1_fach: "Kardiologie" });
      for (let n = 3; n <= 6; n++) {
        expect(result).not.toContain(`Facharzt ${n}`);
      }
    });
  });

  describe("Gesamtbewertung", () => {
    it("ges_versorgung_moeglich → erscheint im Output", () => {
      const result = buildVersorgungsstandText({
        ges_versorgung_moeglich: "ja, mit offenen Klärungspunkten",
      });
      expect(result).toContain(
        "Weitere hausärztliche Versorgung möglich: ja, mit offenen Klärungspunkten",
      );
    });

    it("ges_versorgung_moeglich leer → Zeile nicht im Output", () => {
      const result = buildVersorgungsstandText({ ges_status: "wesentlicher weiterer Klärungsbedarf" });
      expect(result).not.toContain("Weitere hausärztliche Versorgung möglich");
    });

    it("ges_status befüllt → erscheint", () => {
      const result = buildVersorgungsstandText({
        ges_status: "Versorgungsstand ausreichend geklärt",
      });
      expect(result).toContain("Gesamtstatus: Versorgungsstand ausreichend geklärt");
    });

    it("leere Gesamtbewertung → Sektion ausgelassen", () => {
      const result = buildVersorgungsstandText(empty());
      expect(result).not.toContain("Gesamtbewertung");
    });
  });

  describe("Sektionen", () => {
    it("Kommunikation leer → Sektion nicht im Output", () => {
      const result = buildVersorgungsstandText(empty());
      expect(result).not.toContain("Kommunikation");
    });

    it("Kommunikation befüllt → Sektion erscheint", () => {
      const result = buildVersorgungsstandText({ komm_status: "ungeklärt" });
      expect(result).toContain("Kommunikation");
      expect(result).toContain("Gesamtstatus Kommunikation: ungeklärt");
    });

    it("Versorgungssituation leer → Sektion nicht im Output", () => {
      const result = buildVersorgungsstandText(empty());
      expect(result).not.toContain("Versorgungssituation");
    });
  });

  describe("Textarea-Zeilenumbrüche", () => {
    it("einfache Textarea einzeilig → kompaktes Format", () => {
      const result = buildVersorgungsstandText({ komm_stand: "Stand ist gut" });
      expect(result).toContain("Relevanter aktueller Stand: Stand ist gut");
    });

    it("mehrzeilige Textarea → Label als Kopfzeile, Inhalt eingerückt", () => {
      const result = buildVersorgungsstandText({ komm_stand: "Zeile A\nZeile B" });
      expect(result).toContain("Relevanter aktueller Stand:");
      expect(result).toContain("  Zeile A");
      expect(result).toContain("  Zeile B");
    });
  });
});
