import type {
  ContributorMessage, EvidenceLink, ExpertRequest, ExpertResponse, PublicUpdate, Report, ReviewNote, RiskLink, StaffMember,
} from "./types";

/** All people, places-as-events, reports and outcomes below are FICTIONAL demo fixtures. */
export const DEMO_RISK = {
  id: "DEMO-RISK-001",
  title: "Disruption to essential services in a fictional pilot area",
  source: "Internal example record (demonstration only)",
  triggers: [
    "Interruption to water supply lasting more than a day",
    "Reduced access to primary healthcare",
    "Civilian movement restricted on main routes",
  ],
};

export const STAFF: StaffMember[] = [
  { id: "st-mara", name: "Mara Ellison (fictional)", roles: ["reviewer"], contexts: ["ua", "td", "general"], active: true },
  { id: "st-idris", name: "Idris Moussa (fictional)", roles: ["reviewer"], contexts: ["td"], active: true },
  { id: "st-tomas", name: "Tomas Reyes (fictional)", roles: ["reviewer", "publisher"], contexts: ["ua", "td", "general"], active: true },
  { id: "st-lena", name: "Lena Okafor (fictional)", roles: ["admin", "reviewer"], contexts: ["ua", "td", "general"], active: true },
  { id: "ex-1", name: "Expert A — water systems (fictional)", roles: ["expert"], contexts: ["ua"], active: true },
  { id: "ex-2", name: "Expert B — public health (fictional)", roles: ["expert"], contexts: ["ua"], active: true },
  { id: "ex-3", name: "Expert C — local governance (fictional)", roles: ["expert"], contexts: ["ua"], active: true },
  { id: "ex-4", name: "Expert D — humanitarian access (fictional)", roles: ["expert"], contexts: ["ua"], active: true },
  { id: "ex-5", name: "Expert E — energy networks (fictional)", roles: ["expert"], contexts: ["ua"], active: true },
];

/** Fixture receipt codes. Shown only in Demo controls. Never used in connected mode. */
export const FIXTURE_CODES: Record<string, string> = {
  "rp-03": "DEMOAWAITREPLYCODE234567ABCDEFGH",
  "rp-11": "DEMOREMOVALREQUESTCODE234567ABCD",
};

const base = {
  originalLanguage: "en" as const,
  consentVersion: "demo-2026-11",
  removedAt: null,
  relatedIds: [] as string[],
  sourceIndependence: {},
  attachments: [],
  demo: true as const,
};

const r = (o: Partial<Report> & Pick<Report, "id" | "workspaceId" | "originalText" | "receivedAt">): Report => ({
  ...base,
  category: "not_selected",
  knowledgeBasis: "not_sure",
  countryCode: "not_shared",
  areaId: "unknown",
  eventTimeBucket: "not_sure",
  impacts: [],
  processingState: "received",
  evidenceState: "unassessed",
  sensitivity: "standard",
  urgent: false,
  assignedReviewerId: null,
  publicSummaryPermission: false,
  retentionExpiresAt: "2026-12-06T00:00:00Z",
  redactedSummary: "",
  timeline: [{ status: "received", at: o.receivedAt }],
  ...o,
});

export const REPORTS: Report[] = [
  r({
    id: "rp-01", workspaceId: "ua", countryCode: "UA", areaId: "ua-kharkiv", category: "food_water", knowledgeBasis: "saw",
    eventTimeBucket: "yesterday", impacts: ["food_water"], receivedAt: "2026-11-05T08:12:00Z",
    originalText: "The tap water in our block stopped yesterday morning and came back in the evening. People queued at a tanker near the school.",
    processingState: "in_review", evidenceState: "supported", assignedReviewerId: "st-mara", publicSummaryPermission: true,
    redactedSummary: "Water supply to a residential area was interrupted for most of a day; residents relied on a temporary tanker.",
    relatedIds: ["rp-02", "rp-12"], sourceIndependence: { "rp-02": "known_independent" },
    timeline: [{ status: "received", at: "2026-11-05T08:12:00Z" }, { status: "under_review", at: "2026-11-05T10:00:00Z" }],
  }),
  r({
    id: "rp-02", workspaceId: "ua", countryCode: "UA", areaId: "ua-kharkiv", category: "food_water", knowledgeBasis: "happened_to_me",
    eventTimeBucket: "yesterday", impacts: ["food_water"], receivedAt: "2026-11-05T11:40:00Z",
    originalText: "No water at home for about ten hours. We used bottled water we had stored.",
    processingState: "awaiting_expert", evidenceState: "supported", assignedReviewerId: "st-mara", publicSummaryPermission: true,
    redactedSummary: "A household reported about ten hours without piped water.",
    relatedIds: ["rp-01"], sourceIndependence: { "rp-01": "known_independent" },
    timeline: [{ status: "received", at: "2026-11-05T11:40:00Z" }, { status: "under_review", at: "2026-11-05T13:00:00Z" }],
  }),
  r({
    id: "rp-03", workspaceId: "ua", countryCode: "UA", areaId: "ua-dnipro", category: "health", knowledgeBasis: "saw",
    eventTimeBucket: "last_week", impacts: ["healthcare"], receivedAt: "2026-11-03T15:05:00Z",
    originalText: "The clinic said they had run out of some medicines and asked people to come back next week.",
    processingState: "awaiting_contributor", evidenceState: "not_enough_info", assignedReviewerId: "st-mara",
    redactedSummary: "A local clinic reportedly ran short of some medicines.",
    timeline: [
      { status: "received", at: "2026-11-03T15:05:00Z" },
      { status: "under_review", at: "2026-11-04T09:00:00Z" },
      { status: "more_info", at: "2026-11-04T09:20:00Z" },
    ],
  }),
  r({
    id: "rp-04", workspaceId: "ua", countryCode: "UA", areaId: "ua-kyiv", category: "safety", knowledgeBasis: "saw",
    eventTimeBucket: "today", impacts: ["movement", "safety"], receivedAt: "2026-11-06T07:30:00Z",
    originalText: "People in uniform stopped cars on the main road this morning. Many people turned back and could not reach the market.",
    processingState: "triage", sensitivity: "restricted", urgent: true, assignedReviewerId: "st-mara",
    redactedSummary: "Civilian travel on a main route was disrupted; people could not reach a market.",
  }),
  r({
    id: "rp-05", workspaceId: "td", countryCode: "TD", areaId: "td-ouaddai", category: "shelter", knowledgeBasis: "told",
    eventTimeBucket: "last_week", impacts: ["shelter"], receivedAt: "2026-11-02T10:00:00Z",
    originalText: "A neighbour told me several families left their homes and are staying with relatives in another village for now.",
    processingState: "in_review", assignedReviewerId: "st-idris",
    redactedSummary: "Second-hand account of several families temporarily staying with relatives.",
    relatedIds: ["rp-06"], sourceIndependence: { "rp-06": "uncertain" },
    timeline: [{ status: "received", at: "2026-11-02T10:00:00Z" }, { status: "under_review", at: "2026-11-02T14:00:00Z" }],
  }),
  r({
    id: "rp-06", workspaceId: "td", countryCode: "TD", areaId: "td-ouaddai", category: "shelter", knowledgeBasis: "told",
    eventTimeBucket: "last_week", receivedAt: "2026-11-02T16:20:00Z",
    originalText: "I heard that nobody has left the village and the families are still at home.",
    processingState: "in_review", evidenceState: "conflicting", assignedReviewerId: "st-idris",
    redactedSummary: "Second-hand account contradicting reports of families leaving.",
    relatedIds: ["rp-05"], sourceIndependence: { "rp-05": "uncertain" },
    timeline: [{ status: "received", at: "2026-11-02T16:20:00Z" }, { status: "under_review", at: "2026-11-03T08:00:00Z" }],
  }),
  r({
    id: "rp-07", workspaceId: "td", countryCode: "TD", areaId: "td-sila", category: "aid_concern", knowledgeBasis: "saw",
    eventTimeBucket: "earlier", receivedAt: "2026-10-28T09:00:00Z",
    originalText: "At the last distribution some people were told to pay to get on the list. I don't want to say more about who.",
    processingState: "in_review", sensitivity: "restricted", assignedReviewerId: "st-idris",
    redactedSummary: "Concern that some people were asked to pay to be registered for a distribution.",
    timeline: [{ status: "received", at: "2026-10-28T09:00:00Z" }, { status: "under_review", at: "2026-10-28T12:00:00Z" }],
  }),
  r({
    id: "rp-08", workspaceId: "ua", countryCode: "UA", areaId: "ua-odesa", category: "infrastructure", knowledgeBasis: "happened_to_me",
    eventTimeBucket: "today", impacts: ["movement"], receivedAt: "2026-11-06T06:45:00Z",
    originalText: "The bridge road is very damaged after the rain, buses are not running on it today.",
    processingState: "received",
  }),
  r({
    id: "rp-09", workspaceId: "general", category: "other", knowledgeBasis: "not_sure", receivedAt: "2026-11-06T05:10:00Z",
    originalText: "Things are getting harder here, prices went up.",
    processingState: "received",
  }),
  r({
    id: "rp-10", workspaceId: "ua", countryCode: "UA", areaId: "ua-kharkiv", category: "food_water", knowledgeBasis: "told",
    eventTimeBucket: "yesterday", receivedAt: "2026-11-05T19:00:00Z",
    originalText: "Message going around: 'water will be off for a whole week, store everything'. Forwarded from a group chat.",
    processingState: "in_review", evidenceState: "duplicate", assignedReviewerId: "st-mara",
    redactedSummary: "Circulating message claiming a week-long water cut.",
    relatedIds: ["rp-12"], sourceIndependence: { "rp-12": "shared_origin" },
    timeline: [{ status: "received", at: "2026-11-05T19:00:00Z" }, { status: "under_review", at: "2026-11-05T20:00:00Z" }],
  }),
  r({
    id: "rp-11", workspaceId: "ua", countryCode: "UA", areaId: "ua-lviv", category: "shelter", knowledgeBasis: "happened_to_me",
    eventTimeBucket: "earlier", receivedAt: "2026-10-30T12:00:00Z",
    originalText: "We were moved to a different temporary accommodation last month.",
    processingState: "removal_requested", assignedReviewerId: "st-mara",
    timeline: [{ status: "received", at: "2026-10-30T12:00:00Z" }, { status: "under_review", at: "2026-10-31T09:00:00Z" }],
  }),
  r({
    id: "rp-12", workspaceId: "ua", countryCode: "UA", areaId: "ua-kharkiv", category: "food_water", knowledgeBasis: "told",
    eventTimeBucket: "yesterday", receivedAt: "2026-11-05T19:30:00Z",
    originalText: "Someone sent me that the water will be off for a week. Is it true? Photo attached.",
    processingState: "triage", evidenceState: "duplicate",
    relatedIds: ["rp-10"], sourceIndependence: { "rp-10": "shared_origin" },
    attachments: [{
      id: "at-12a", objectKey: "q/7f3k2m9x", processingState: "failed", mediaType: "image/jpeg", byteSize: 0, width: 0, height: 0,
      sha256: "", processingVersion: "demo-img-1", metadataRemoval: "not-run",
    }],
  }),
];

export const MESSAGES: ContributorMessage[] = [
  { id: "m-1", reportId: "rp-03", sender: "reviewer", createdAt: "2026-11-04T09:20:00Z",
    text: "Thank you. You mentioned a clinic. You can describe the type of service without naming staff — was it a general clinic or a pharmacy?" },
];

export const NOTES: ReviewNote[] = [
  { id: "n-1", reportId: "rp-04", authorId: "st-mara", type: "triage", createdAt: "2026-11-06T08:00:00Z",
    text: "Restricted: describes armed personnel on a route. Keep outward wording to civilian impact only; no route or timing in any packet." },
  { id: "n-2", reportId: "rp-01", authorId: "st-mara", type: "assessment", createdAt: "2026-11-05T10:30:00Z",
    text: "Consistent with rp-02 (different household, separate wording)." },
];

export const EVIDENCE: EvidenceLink[] = [
  { id: "ev-1", reportId: "rp-01", source: "Fictional municipal maintenance notice (demo)", supports: "supports",
    claim: "Planned supply interruption in the area that day", independence: "known_independent",
    rationale: "Public notice predates the reports.", date: "2026-11-04", authorId: "st-mara", createdAt: "2026-11-05T10:40:00Z" },
];

export const EXPERT_REQUESTS: ExpertRequest[] = [
  {
    id: "xr-01", workspaceId: "ua", reportIds: ["rp-01", "rp-02"],
    context: "Fictional pilot area, eastern Ukraine (demo context)",
    claim: "Residents in one district report piped water was interrupted for most of a day; a temporary tanker was used.",
    period: "Early November 2026 (approximate)",
    materials: "A fictional public maintenance notice mentions planned works in the district.",
    question: "Is a day-long interruption of this kind consistent with what you know, and what are the likely humanitarian implications if it recurs?",
    permittedExpertIds: ["ex-1", "ex-2", "ex-3", "ex-4", "ex-5"], state: "open", threshold: 5, createdAt: "2026-11-05T14:00:00Z",
  },
];

export const EXPERT_RESPONSES: ExpertResponse[] = [
  { id: "er-1", requestId: "xr-01", expertId: "ex-1", choice: "consistent", submittedAt: "2026-11-05T16:00:00Z",
    explanation: "Planned works of this kind often run a full day. Repeat interruptions would strain households without storage." },
  { id: "er-2", requestId: "xr-01", expertId: "ex-2", choice: "consistent", submittedAt: "2026-11-05T17:10:00Z",
    explanation: "Main health concern is hygiene for families with infants if it recurs." },
  { id: "er-3", requestId: "xr-01", expertId: "ex-3", choice: "conflicting", submittedAt: "2026-11-05T18:00:00Z",
    explanation: "I understood the works were postponed; the interruption may have another cause." },
];

export const RISK_LINKS: RiskLink[] = [];

export const UPDATES: PublicUpdate[] = [
  {
    id: "up-01", title: "Temporary water interruptions in a fictional pilot district",
    broadContext: "Fictional pilot area, eastern Ukraine — early November 2026",
    summary: "Several residents described a day-long interruption to piped water. Temporary water distribution was reported.",
    known: "Interruptions lasted most of one day according to separate accounts and a public notice.",
    uncertain: "Whether further interruptions are planned. A circulating message about a week-long cut could not be confirmed.",
    sources: ["Fictional municipal maintenance notice (demo)"], state: "published", sourceReportIds: ["rp-01", "rp-02"],
    usesCitizenMaterial: true, disclosureReviewed: true, disclosureReviewerId: "st-tomas", authorId: "st-mara",
    approverId: "st-tomas", publisherId: "st-tomas", publishedAt: "2026-11-06T09:00:00Z",
    corrections: [{ date: "2026-11-06", note: "Clarified that the week-long cut message is unconfirmed." }], demo: true,
  },
  {
    id: "up-02", title: "Reports of families staying with relatives",
    broadContext: "Fictional area, eastern Chad",
    summary: "Draft: accounts differ on whether families have temporarily left their homes.",
    known: "Two second-hand accounts.", uncertain: "Accounts conflict; source independence unclear.",
    sources: [], state: "draft", sourceReportIds: ["rp-05"], usesCitizenMaterial: true, disclosureReviewed: false,
    authorId: "st-idris", corrections: [], demo: true,
  },
];
