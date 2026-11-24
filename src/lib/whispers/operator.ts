// Published operator details. This is the single source of truth: citizen help copy,
// the staff settings panel and the connected release record all read from here, so a
// change here is the only place the published contact or purpose needs editing.
export const OPERATOR = {
  organisation: "Whispers",
  legalForm: "private company",
  contact: "arshahem@gmail.com",
  purpose:
    "Whispers helps people affected by conflict share what’s happening on the ground without creating an account, so humanitarian teams can make better-informed decisions.",
} as const;

export const OPERATOR_CONTACT_LABEL = "Contact:";
export const OPERATOR_PURPOSE_LABEL = "Purpose:";

export const OPERATOR_PURPOSE = OPERATOR.purpose;

export const OPERATOR_RECEIPT_NOTE =
  `${OPERATOR.organisation} is operated by ${OPERATOR.organisation}, a ${OPERATOR.legalForm}. ` +
  `${OPERATOR_PURPOSE_LABEL} ${OPERATOR.purpose} ` +
  `${OPERATOR_CONTACT_LABEL} ${OPERATOR.contact}. ` +
  "Reports are read by authorised reviewers. Reviewers may share a shortened, de-identified version with a small number of invited experts. " +
  "Reports are not forwarded automatically to police, armed forces, governments, media or partners.";

export const OPERATOR_ABOUT_NOTE =
  `${OPERATOR.organisation} is operated by ${OPERATOR.organisation}, a ${OPERATOR.legalForm}.`;

export const OPERATOR_SETTINGS_SUMMARY =
  `${OPERATOR.organisation} (${OPERATOR.legalForm}) — ${OPERATOR_CONTACT_LABEL} ${OPERATOR.contact}.`;

// Readiness only counts as met when a reachable contact address and a real purpose
// statement are both present, so the checklist cannot be ticked by an empty field.
export function operatorDetailsComplete(
  operator: { contact: string; purpose: string } = OPERATOR,
) {
  const contact = operator.contact.trim();
  const purpose = operator.purpose.trim();
  const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const validPurpose = purpose.split(/\s+/).length >= 12;
  return validContact && validPurpose;
}
