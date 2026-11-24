import { describe, expect, it } from "vitest";
import catalog from "./interface-catalog.json";
import {
  OPERATOR,
  OPERATOR_ABOUT_NOTE,
  OPERATOR_CONTACT_LABEL,
  OPERATOR_PURPOSE,
  OPERATOR_PURPOSE_LABEL,
  OPERATOR_RECEIPT_NOTE,
  OPERATOR_SETTINGS_SUMMARY,
  operatorDetailsComplete,
} from "./operator";

// Concrete values taken from the operator's own words: the published contact address
// and the purpose statement must stay word-for-word, and must be translatable.
describe("published operator details", () => {
  it("names Whispers as a private company and publishes no CEO line", () => {
    expect(OPERATOR.organisation).toBe("Whispers");
    expect(OPERATOR.legalForm).toBe("private company");
    expect("ceo" in OPERATOR).toBe(false);
    for (const sentence of [OPERATOR_RECEIPT_NOTE, OPERATOR_ABOUT_NOTE, OPERATOR_SETTINGS_SUMMARY]) {
      expect(sentence).not.toContain("CEO");
      expect(sentence).not.toContain("Arsh Ahmed");
    }
  });

  it("publishes the contact address the operator gave", () => {
    expect(OPERATOR.contact).toBe("arshahem@gmail.com");
    expect(OPERATOR_RECEIPT_NOTE).toContain("Contact: arshahem@gmail.com.");
    expect(OPERATOR_SETTINGS_SUMMARY).toContain("Contact: arshahem@gmail.com.");
  });

  it("publishes the purpose statement word for word", () => {
    expect(OPERATOR_PURPOSE).toBe(
      "Whispers helps people affected by conflict share what’s happening on the ground without creating an account, so humanitarian teams can make better-informed decisions.",
    );
    expect(OPERATOR_RECEIPT_NOTE).toContain(OPERATOR_PURPOSE);
  });

  it("keeps every published sentence in the translatable wording list", () => {
    for (const sentence of [
      OPERATOR_PURPOSE,
      OPERATOR_RECEIPT_NOTE,
      OPERATOR_ABOUT_NOTE,
      OPERATOR_SETTINGS_SUMMARY,
      OPERATOR_CONTACT_LABEL,
      OPERATOR_PURPOSE_LABEL,
    ]) {
      expect(catalog).toContain(sentence);
    }
  });

  it("counts operator details as ready only with a reachable contact and a real purpose", () => {
    expect(operatorDetailsComplete()).toBe(true);
    expect(operatorDetailsComplete({ contact: "", purpose: OPERATOR_PURPOSE })).toBe(false);
    expect(operatorDetailsComplete({ contact: "not-an-email", purpose: OPERATOR_PURPOSE })).toBe(false);
    expect(operatorDetailsComplete({ contact: OPERATOR.contact, purpose: "" })).toBe(false);
  });
});
