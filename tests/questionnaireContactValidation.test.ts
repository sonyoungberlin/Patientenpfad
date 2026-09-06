import { BLOCK_CATALOG, QUESTION_CATALOG } from "@/lib/questionnaire/blockCatalog";
import {
  isValidContactPhone,
  validateContactAnswers,
} from "@/lib/questionnaire/contactValidation";

const contactQuestions = BLOCK_CATALOG.KONTAKT.questionIds.map(
  (questionId) => QUESTION_CATALOG[questionId],
);

describe("KONTAKT-Validierung", () => {
  it("enthält genau die drei Kontaktfelder und macht alle verpflichtend", () => {
    expect(BLOCK_CATALOG.KONTAKT.questionIds).toEqual([
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "CONTACT_DOCTOLIB",
    ]);
    expect(contactQuestions.every((question) => question.required)).toBe(true);
  });

  it.each(["01701234567", "+491701234567"])(
    "akzeptiert gültige Telefonnummer %s",
    (phone) => {
      expect(isValidContactPhone(phone)).toBe(true);
    },
  );

  it.each([
    "",
    "0170 1234567",
    "0170-1234567",
    "0170/1234567",
    "(0170)1234567",
    "49+1701234567",
    "++491701234567",
    "0170123456a",
  ])("lehnt ungültige Telefonnummer %s ab", (phone) => {
    expect(isValidContactPhone(phone)).toBe(false);
  });

  it.each(["max@example.de", "max.mustermann@example.com"])(
    "akzeptiert gültige E-Mail %s",
    (email) => {
      expect(
        validateContactAnswers(
          { CONTACT_PHONE: "01701234567", CONTACT_EMAIL: email, CONTACT_DOCTOLIB: "true" },
          contactQuestions,
        ),
      ).toEqual([]);
    },
  );

  it.each(["max", "max@", "@example.de", "max@example", "max @example.de", " max@example.de "])(
    "lehnt ungültige E-Mail %s ab",
    (email) => {
      expect(
        validateContactAnswers(
          { CONTACT_PHONE: "01701234567", CONTACT_EMAIL: email, CONTACT_DOCTOLIB: "true" },
          contactQuestions,
        ).map((error) => error.questionId),
      ).toContain("CONTACT_EMAIL");
    },
  );

  it("verlangt jedes Kontaktfeld und prüft auch einen vorausgefüllten Wert", () => {
    const errors = validateContactAnswers(
      { CONTACT_PHONE: "", CONTACT_EMAIL: "invalid", CONTACT_DOCTOLIB: "" },
      contactQuestions,
    );

    expect(errors.map((error) => error.questionId)).toEqual([
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "CONTACT_DOCTOLIB",
    ]);
  });

  it("akzeptiert ein gültiges vorausgefülltes E-Mail-Feld", () => {
    expect(
      validateContactAnswers(
        {
          CONTACT_PHONE: "01701234567",
          CONTACT_EMAIL: "max@example.de",
          CONTACT_DOCTOLIB: "false",
        },
        contactQuestions,
      ),
    ).toEqual([]);
  });

  it("beeinflusst Fragen außerhalb von KONTAKT nicht", () => {
    expect(
      validateContactAnswers(
        { AU_SYMPTOMS: "Husten" },
        [QUESTION_CATALOG.AU_SYMPTOMS],
      ),
    ).toEqual([]);
  });
});