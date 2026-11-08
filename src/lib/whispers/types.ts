export type Category =
  | "safety" | "shelter" | "food_water" | "health" | "infrastructure" | "aid_concern" | "other" | "not_selected";
export type KnowledgeBasis = "saw" | "happened_to_me" | "told" | "not_sure";
export type TimeBucket = "today" | "yesterday" | "last_week" | "earlier" | "not_sure";
export type Impact = "safety" | "food_water" | "healthcare" | "movement" | "shelter" | "not_sure";
export type ProcessingState =
  | "received" | "triage" | "in_review" | "awaiting_contributor" | "awaiting_expert" | "complete" | "archived" | "removal_requested";
export type EvidenceState =
  | "unassessed" | "not_enough_info" | "supported" | "conflicting" | "duplicate" | "outside_scope";
export type Sensitivity = "standard" | "restricted";
export type ContributorStatus = "received" | "under_review" | "more_info" | "complete";

export interface Attachment {
  id: string;
  objectKey: string; // random, no original filename
  processingState: "processed" | "failed" | "pending";
  mediaType: "image/jpeg";
  byteSize: number;
  width: number;
  height: number;
  sha256: string;
  processingVersion: string;
  metadataRemoval: "re-encoded-client" | "not-run";
  /** In-memory demo preview only (object URL). Never present in connected mode. */
  previewUrl?: string | undefined;
}

export interface Report {
  id: string;
  workspaceId: string; // context: "ua" | "td"
  originalText: string;
  originalLanguage: "en";
  category: Category;
  knowledgeBasis: KnowledgeBasis;
  countryCode: string | "not_shared";
  areaId: string | "unknown";
  eventTimeBucket: TimeBucket;
  impacts: Impact[];
  receivedAt: string;
  processingState: ProcessingState;
  evidenceState: EvidenceState;
  sensitivity: Sensitivity;
  urgent: boolean;
  assignedReviewerId: string | null;
  publicSummaryPermission: boolean;
  consentVersion: string;
  retentionExpiresAt: string;
  removedAt: string | null;
  redactedSummary: string;
  relatedIds: string[];
  sourceIndependence: Record<string, "known_independent" | "uncertain" | "shared_origin">;
  attachments: Attachment[];
  closingNote?: string | undefined;
  statusMessage?: string | undefined;
  timeline: { status: ContributorStatus; at: string }[];
  demo: true;
}

export interface ReceiptCapability {
  reportId: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface ContributorMessage {
  id: string;
  reportId: string;
  sender: "contributor" | "reviewer";
  text: string;
  createdAt: string;
}

export interface ReviewNote {
  id: string;
  reportId: string;
  authorId: string;
  type: "triage" | "assessment" | "disclosure" | "analyst";
  text: string;
  createdAt: string;
}

export interface EvidenceLink {
  id: string;
  reportId: string;
  source: string;
  publicUrl?: string | undefined;
  supports: "supports" | "contradicts";
  claim: string;
  independence: "known_independent" | "uncertain" | "shared_origin";
  rationale: string;
  date: string;
  authorId: string;
  createdAt: string;
}

export interface ExpertRequest {
  id: string;
  workspaceId: string;
  reportIds: string[];
  context: string;
  claim: string;
  period: string;
  materials: string;
  question: string;
  permittedExpertIds: string[];
  state: "open" | "closed";
  threshold: number;
  moderatorInterpretation?: string | undefined;
  createdAt: string;
}

export type ExpertChoice = "consistent" | "conflicting" | "cannot_assess";
export interface ExpertResponse {
  id: string;
  requestId: string;
  expertId: string;
  choice: ExpertChoice;
  explanation: string;
  source?: string | undefined;
  submittedAt: string;
}

export interface RiskLink {
  id: string;
  targetId: string; // report or expert request
  riskId: string;
  riskTitle: string;
  trigger: string;
  implication: string;
  decision: string;
  rationale: string;
  demonstration: true;
  createdAt: string;
}

export type UpdateState = "draft" | "under_review" | "approved" | "published" | "withdrawn";
export interface PublicUpdate {
  id: string;
  title: string;
  broadContext: string;
  summary: string;
  known: string;
  uncertain: string;
  sources: string[];
  state: UpdateState;
  sourceReportIds: string[]; // private; never projected publicly
  usesCitizenMaterial: boolean;
  disclosureReviewed: boolean;
  disclosureReviewerId?: string | undefined;
  authorId: string;
  approverId?: string | undefined;
  publisherId?: string | undefined;
  publishedAt?: string | undefined;
  corrections: { date: string; note: string }[];
  demo: true;
}

export interface PublicUpdateView {
  id: string;
  title: string;
  broadContext: string;
  summary: string;
  known: string;
  uncertain: string;
  sources: string[];
  publishedAt: string;
  corrections: { date: string; note: string }[];
  withdrawn: boolean;
  demo: true;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  targetId: string;
  at: string;
  outcome: "ok" | "denied";
}

export type Role = "reviewer" | "publisher" | "admin" | "expert";
export interface StaffMember {
  id: string;
  name: string;
  roles: Role[];
  contexts: string[];
  active: boolean;
  bio?: string | undefined;
}

export interface ContributorView {
  originalText: string;
  areaLabel: string;
  timeBucket: TimeBucket;
  status: ContributorStatus;
  statusMessage?: string | undefined;
  timeline: { status: ContributorStatus; at: string }[];
  messages: { id: string; sender: "contributor" | "reviewer"; text: string; createdAt: string }[];
  removalRequested: boolean;
  attachments: { id: string; state: Attachment["processingState"] }[];
}
