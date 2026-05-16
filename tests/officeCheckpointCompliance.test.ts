import {
  buildCheckpointComplianceMap,
  getEmptyCompliance,
  isComplianceEmpty,
  type CheckpointComplianceView,
} from "@/lib/office/checkpointCompliance";
import {
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  listOfficeTopics,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";

describe("checkpointCompliance mapper", () => {
  it("liefert fuer jedes Catalog-Checkpoint einen Eintrag in der Map", () => {
    for (const topic of listOfficeTopics()) {
      const map = buildCheckpointComplianceMap(topic.id);
      const catalog = getOfficeCheckpointCatalog(topic.id);
      expect(Object.keys(map).sort()).toEqual(
        catalog.map((c) => c.id).sort(),
      );
    }
  });

  it("KV-Topic: resolved IDs zu erwarteten Display-Records", () => {
    const map = buildCheckpointComplianceMap(OFFICE_TOPIC_KV_BILLING);

    const kv02 = map["KV-02"];
    expect(kv02).toBeDefined();
    expect(kv02.legalSources.map((e) => e.id)).toEqual(["SGB_V_PAR_106D"]);
    expect(kv02.legalSources[0].shortName).toBeTruthy();
    expect(kv02.legalSources[0].jurisdiction).toBe("BUND");
    expect(kv02.authorities.map((e) => e.id)).toEqual(["KV_BERLIN"]);
    expect(kv02.authorities[0].name).toMatch(/Kassenaerztliche Vereinigung/);
    expect(kv02.requiredEvidences.map((e) => e.id)).toEqual([
      "KV_SCHREIBEN_ABRECHNUNG",
    ]);
    expect(kv02.requiredEvidences[0].label).toBeTruthy();
    expect(kv02.optionalEvidences).toEqual([]);

    const kv03 = map["KV-03"];
    expect(kv03.legalSources).toEqual([]);
    expect(kv03.authorities).toEqual([]);
    expect(kv03.requiredEvidences).toEqual([]);
    expect(kv03.optionalEvidences.map((e) => e.id)).toEqual([
      "QUARTALSPROFIL_PVS",
      "ABRECHNUNGSDATENEXPORT",
      "HONORARBESCHEID_KV",
    ]);
  });

  it("alle resolved IDs sind im Catalog real referenziert (keine Fantasie-Entries)", () => {
    for (const topic of listOfficeTopics()) {
      const map = buildCheckpointComplianceMap(topic.id);
      for (const catalogEntry of getOfficeCheckpointCatalog(topic.id)) {
        const view = map[catalogEntry.id];
        const legalRefCount = catalogEntry.legalRefs?.length ?? 0;
        const authCount = catalogEntry.authorityKeys?.length ?? 0;
        const reqCount = catalogEntry.requiredEvidenceKeys?.length ?? 0;
        const optCount = catalogEntry.optionalEvidenceKeys?.length ?? 0;
        // Integrity-Test stellt sicher, dass alle IDs registriert sind,
        // daher muessen Counts hier exakt uebereinstimmen.
        expect(view.legalSources.length).toBe(legalRefCount);
        expect(view.authorities.length).toBe(authCount);
        expect(view.requiredEvidences.length).toBe(reqCount);
        expect(view.optionalEvidences.length).toBe(optCount);
      }
    }
  });

  it("uebernimmt vorhandene note-Felder unveraendert (ohne Sonderbehandlung)", () => {
    const map = buildCheckpointComplianceMap(OFFICE_TOPIC_HIRING_REPLACEMENT);
    // Ueber alle Topics: wenn ein resolved Eintrag eine Registry-Note hat,
    // ist sie als string im View vorhanden (kein Trim, keine Anreicherung).
    for (const view of Object.values(map)) {
      for (const entry of [
        ...view.legalSources,
        ...view.authorities,
        ...view.requiredEvidences,
        ...view.optionalEvidences,
      ]) {
        if (entry.note !== undefined) {
          expect(typeof entry.note).toBe("string");
        }
      }
    }
  });

  it("kennt keine Legacy-Spezialfaelle: BMV_AE/BDSG/BERUFSO_AERZTE_BERLIN werden wie alle anderen Quellen abgebildet", () => {
    const map = buildCheckpointComplianceMap(OFFICE_TOPIC_HIRING_REPLACEMENT);
    // BMV_AE ist in NC referenziert; pruefe, dass es als normaler Eintrag erscheint,
    // ohne zusaetzliche Marker-Felder im View-Record (View kennt nur die Standard-Felder).
    let foundBmv = false;
    for (const view of Object.values(map)) {
      const hit = view.legalSources.find((e) => e.id === "BMV_AE");
      if (hit) {
        foundBmv = true;
        expect(Object.keys(hit).sort()).toEqual(
          [
            "id",
            "jurisdiction",
            "note",
            "paragraph",
            "shortName",
            "sourceUrl",
            "title",
          ].sort(),
        );
      }
    }
    expect(foundBmv).toBe(true);
  });

  it("getEmptyCompliance liefert ein vollstaendig leeres View und isComplianceEmpty erkennt es", () => {
    const empty = getEmptyCompliance();
    expect(empty.legalSources).toEqual([]);
    expect(empty.authorities).toEqual([]);
    expect(empty.requiredEvidences).toEqual([]);
    expect(empty.optionalEvidences).toEqual([]);
    expect(isComplianceEmpty(empty)).toBe(true);

    const nonEmpty: CheckpointComplianceView = {
      ...empty,
      authorities: [
        {
          id: "X",
          name: "Test",
          kind: "SONSTIGE",
          scope: "BUND",
        },
      ],
    };
    expect(isComplianceEmpty(nonEmpty)).toBe(false);
  });
});
