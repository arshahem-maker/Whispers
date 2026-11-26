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

// Keep the published contact and prototype description accurate, and make sure a
// real-operator readiness check cannot pass without an explicitly supplied name.
describe("published operator details", () => {
  it("describes the project without claiming an unverified legal form", () => {
    expect(OPERATOR.organisation).toBe("Whispers prototype");
    expect("legalForm" in OPERATOR).toBe(false);
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
      "Whispers is an early-stage humanitarian reporting and review prototype. The project owner is the temporary operator for demonstrations. All demonstration information is fictional. Real-information intake is disabled. This is not an emergency response service.",
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

  it("requires a confirmed legal operator name, a reachable contact, and a purpose", () => {
    expect(operatorDetailsComplete()).toBe(false);
    const confirmed = { legalOperatorName: "Confirmed legal entity", contact: OPERATOR.contact, purpose: OPERATOR_PURPOSE };
    expect(operatorDetailsComplete(confirmed)).toBe(true);
    expect(operatorDetailsComplete({ ...confirmed, legalOperatorName: " " })).toBe(false);
    expect(operatorDetailsComplete({ ...confirmed, contact: "not-an-email" })).toBe(false);
    expect(operatorDetailsComplete({ ...confirmed, purpose: "" })).toBe(false);
  });
});
