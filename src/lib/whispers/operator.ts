// Public prototype details for the citizen help copy and the synthetic settings
// screen. These do not establish the legal operator or satisfy the connected
// release gate, which records a named operator separately in Neon.
export const OPERATOR = {
  organisation: "Whispers prototype",
  contact: "arshahem@gmail.com",
  purpose:
    "Whispers is an early-stage humanitarian reporting and review prototype. The public demonstration uses fictional information. Real-information intake is limited to a restricted staging demonstration and is not monitored or an emergency response service.",
} as const;

export const OPERATOR_CONTACT_LABEL = "Contact:";
export const OPERATOR_PURPOSE_LABEL = "Purpose:";

export const OPERATOR_PURPOSE = OPERATOR.purpose;

export const OPERATOR_RECEIPT_NOTE =
  `${OPERATOR.organisation}. ${OPERATOR.purpose} ` +
  `${OPERATOR_CONTACT_LABEL} ${OPERATOR.contact}. ` +
  "Do not send identifying, sensitive, or urgent information through the staging demonstration.";

export const OPERATOR_ABOUT_NOTE =
  `${OPERATOR.organisation} is an early-stage prototype. Its legal operator and legal form have not yet been confirmed.`;

export const OPERATOR_SETTINGS_SUMMARY =
  `${OPERATOR.organisation} — ${OPERATOR_CONTACT_LABEL} ${OPERATOR.contact}.`;

// Readiness only counts as met when a reachable contact address and a real purpose
// statement are both present, so the checklist cannot be ticked by an empty field.
export function operatorDetailsComplete(
  operator: { legalOperatorName?: string | null; contact: string; purpose: string } = OPERATOR,
) {
  const legalOperatorName = operator.legalOperatorName?.trim() ?? "";
  const contact = operator.contact.trim();
  const purpose = operator.purpose.trim();
  const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const validPurpose = purpose.split(/\s+/).length >= 12;
  return legalOperatorName.length >= 2 && validContact && validPurpose;
}
