/**
 * Tests für lib/workflow/internalProtocol/catalog.ts
 */

import {
  listInternalProtocolTopics,
  getInternalProtocolTopic,
  isInternalProtocolTopicId,
} from "@/lib/workflow/internalProtocol/catalog";

// ---------------------------------------------------------------------------
// isInternalProtocolTopicId
// ---------------------------------------------------------------------------

describe("isInternalProtocolTopicId", () => {
  it("akzeptiert die gültige Pilot-ID", () => {
    expect(isInternalProtocolTopicId("patienten-ohne-termin")).toBe(true);
  });

  it("lehnt bestehende klinische Topic-ID ab", () => {
    expect(isInternalProtocolTopicId("au-musterprozess")).toBe(false);
    expect(isInternalProtocolTopicId("rezept-musterprozess")).toBe(false);
    expect(isInternalProtocolTopicId("ueberweisung-musterprozess")).toBe(false);
  });

  it("lehnt leeren String ab", () => {
    expect(isInternalProtocolTopicId("")).toBe(false);
  });

  it("lehnt null ab", () => {
    expect(isInternalProtocolTopicId(null)).toBe(false);
  });

  it("lehnt undefined ab", () => {
    expect(isInternalProtocolTopicId(undefined)).toBe(false);
  });

  it("lehnt Zahl ab", () => {
    expect(isInternalProtocolTopicId(42)).toBe(false);
  });

  it("lehnt Array ab", () => {
    expect(isInternalProtocolTopicId(["patienten-ohne-termin"])).toBe(false);
  });

  it("lehnt Objekt ab", () => {
    expect(isInternalProtocolTopicId({ id: "patienten-ohne-termin" })).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// listInternalProtocolTopics
// ---------------------------------------------------------------------------

describe("listInternalProtocolTopics", () => {
  it("enthält genau das Pilot-Thema", () => {
    const topics = listInternalProtocolTopics();
    expect(topics.length).toBe(1);
  });

  it("Pilot-Thema hat korrekte id und title", () => {
    const topics = listInternalProtocolTopics();
    expect(topics[0].id).toBe("patienten-ohne-termin");
    expect(topics[0].title).toBe("Umgang mit Patienten ohne Termin");
  });

  it("gibt eine defensive Kopie zurück – Mutation des Arrays verändert den Katalog nicht", () => {
    const first = listInternalProtocolTopics();
    // Array leeren
    first.splice(0, first.length);

    const second = listInternalProtocolTopics();
    expect(second.length).toBe(1);
  });

  it("gibt eine defensive Kopie der Objekte zurück – Mutation eines Themas verändert den Katalog nicht", () => {
    const first = listInternalProtocolTopics();
    const original = first[0].title;
    // Mutation des zurückgegebenen Objekts
    (first[0] as { title: string }).title = "MANIPULIERT";

    const second = listInternalProtocolTopics();
    expect(second[0].title).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// getInternalProtocolTopic
// ---------------------------------------------------------------------------

describe("getInternalProtocolTopic", () => {
  it("liefert das Pilot-Thema für die korrekte ID", () => {
    const topic = getInternalProtocolTopic("patienten-ohne-termin");
    expect(topic).toBeDefined();
    expect(topic!.id).toBe("patienten-ohne-termin");
    expect(topic!.title).toBe("Umgang mit Patienten ohne Termin");
  });

  it("liefert undefined für eine unbekannte ID", () => {
    // Cast nötig, da TypeScript die Union prüft; wir testen das Laufzeitverhalten
    const topic = getInternalProtocolTopic(
      "unbekanntes-thema" as "patienten-ohne-termin",
    );
    expect(topic).toBeUndefined();
  });

  it("gibt eine defensive Kopie zurück – Mutation verändert den Katalog nicht", () => {
    const topic = getInternalProtocolTopic("patienten-ohne-termin");
    const original = topic!.title;
    (topic as { title: string }).title = "MANIPULIERT";

    const fresh = getInternalProtocolTopic("patienten-ohne-termin");
    expect(fresh!.title).toBe(original);
  });
});
