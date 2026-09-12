import iconv from "iconv-lite";
import { buildQuestionnaireGdtBytes } from "@/lib/questionnaire/gdtRenderer";
import { normalizeXComfortPatientReference } from "@/lib/questionnaire/patientReference";

describe("questionnaire GDT renderer", () => {
  it("erzeugt den getesteten 6310-Minimaldatensatz bytegenau", () => {
    const bytes = buildQuestionnaireGdtBytes({
      patientReference: "79383",
      documentationText: "TEST GDT SYSTEMEINTRAG",
    });
    expect(iconv.decode(Buffer.from(bytes), "cp850")).toBe(
      "01380006310\r\n014810000100\r\n014921802.10\r\n014300079383\r\n0148402ALL00\r\n0316227TEST GDT SYSTEMEINTRAG\r\n",
    );
    expect(bytes).toHaveLength(100);
  });

  it("berechnet jede Zeilenlänge und 8100 aus finalen CP850-Bytes", () => {
    const bytes = buildQuestionnaireGdtBytes({
      patientReference: "79383",
      documentationText: "Ärztliche Prüfung für Jörg eingegangen",
    });
    const text = iconv.decode(Buffer.from(bytes), "cp850");
    expect(text).toContain("Ärztliche Prüfung für Jörg eingegangen");
    expect(text.match(/\r\n/g)).toHaveLength(6);
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
    for (const line of text.split("\r\n").filter(Boolean)) {
      expect(iconv.encode(`${line}\r\n`, "cp850")).toHaveLength(Number(line.slice(0, 3)));
    }
    expect(text).toContain(`8100${String(bytes.length).padStart(5, "0")}`);
    expect(Buffer.from(bytes)).toContain(0x8e);
    expect(Buffer.from(bytes)).toContain(0x81);
    expect(Buffer.from(bytes)).toContain(0x94);
  });

  it("akzeptiert ausschließlich getrimmte Ziffernfolgen", () => {
    expect(normalizeXComfortPatientReference(" 004711 ")).toBe("004711");
    expect(normalizeXComfortPatientReference(4711)).toBeNull();
    expect(normalizeXComfortPatientReference(" ")).toBeNull();
    expect(normalizeXComfortPatientReference("47A11")).toBeNull();
    expect(normalizeXComfortPatientReference("47-11")).toBeNull();
    expect(() => buildQuestionnaireGdtBytes({ patientReference: "47A11", documentationText: "Test" })).toThrow();
  });
});