/**
 * Demo provider. Every operation below mirrors a server contract and performs its own
 * authorisation from the staff record, never from UI state. Data lives in memory only.
 * A connected provider must implement the same checks on the server.
 */
import { hashCode, isWellFormedCode, normalizeCode, randomId, sha256Hex } from "./crypto";
import * as D from "./demo-data";
import { broadAreaLabel, workspaceFor } from "./locations";
import type {
  Attachment, Category, ContributorMessage, ContributorStatus, ContributorView, EvidenceLink, EvidenceState, ExpertChoice,
  ExpertRequest, ExpertResponse, Impact, KnowledgeBasis, ProcessingState, PublicUpdate, PublicUpdateView, ReceiptCapability,
  Report, ReviewNote, RiskLink, Role, Sensitivity, StaffMember, TimeBucket, AuditEvent,
} from "./types";

export class AccessDenied extends Error { constructor(m = "Not permitted") { super(m); } }
export class ValidationError extends Error {}

export interface ReportPayload {
  text: string;
  category: Category;
  knowledgeBasis: KnowledgeBasis;
  countryCode: string;
  areaId: string;
  timeBucket: TimeBucket;
  impacts: Impact[];
  publicSummaryPermission: boolean;
  acknowledged: boolean;
}

export type NetworkSim = "normal" | "fail" | "timeout_after_accept";

const CATS: Category[] = ["safety", "shelter", "food_water", "health", "infrastructure", "aid_concern", "other", "not_selected"];
const BASES: KnowledgeBasis[] = ["saw", "happened_to_me", "told", "not_sure"];
const TIMES: TimeBucket[] = ["today", "yesterday", "last_week", "earlier", "not_sure"];
const IMPACTS: Impact[] = ["safety", "food_water", "healthcare", "movement", "shelter", "not_sure"];
const SENSITIVE_HINTS = /\b(uniform|soldier|troop|armed|weapon|checkpoint|militia|pay to|bribe|commander)\b/i;

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 1_500_000;
export const MAX_PIXELS = 1600 * 1600;

const clone = <T,>(x: T): T => structuredClone(x);
const now = () => new Date().toISOString();

export function contributorStatusFor(p: ProcessingState, prev: ContributorStatus): ContributorStatus {
  switch (p) {
    case "received": case "triage": return "received";
    case "in_review": case "awaiting_expert": return "under_review";
    case "awaiting_contributor": return "more_info";
    case "complete": case "archived": return "complete";
    default: return prev;
  }
}

export interface WhispersState {
  reports: Report[];
  receipts: ReceiptCapability[];
  messages: ContributorMessage[];
  notes: ReviewNote[];
  evidence: EvidenceLink[];
  expertRequests: ExpertRequest[];
  expertResponses: ExpertResponse[];
  riskLinks: RiskLink[];
  updates: PublicUpdate[];
  audit: AuditEvent[];
  staff: StaffMember[];
  removalRequests: Record<string, string>;
  intakeOpen: boolean;
  realDataMode: false;
}

export class WhispersStore {
  state!: WhispersState;
  private idem = new Map<string, { payloadHash: string; reportId: string }>();
  private failedLookups: number[] = [];
  private listeners = new Set<() => void>();
  private ready: Promise<void>;
  version = 0;
  network: NetworkSim = "normal";
  photoSim: "normal" | "fail_next" = "normal";
  actorId: string | null = null; // demo session only

  constructor() {
    this.state = {
      reports: clone(D.REPORTS), receipts: [], messages: clone(D.MESSAGES), notes: clone(D.NOTES), evidence: clone(D.EVIDENCE),
      expertRequests: clone(D.EXPERT_REQUESTS), expertResponses: clone(D.EXPERT_RESPONSES), riskLinks: clone(D.RISK_LINKS),
      updates: clone(D.UPDATES), audit: [], staff: clone(D.STAFF), removalRequests: { "rp-11": "2026-11-01T10:00:00Z" },
      intakeOpen: true, realDataMode: false,
    };
    this.ready = (async () => {
      for (const [reportId, code] of Object.entries(D.FIXTURE_CODES)) {
        this.state.receipts.push({ reportId, codeHash: await hashCode(code), createdAt: "2026-11-01T00:00:00Z", expiresAt: "2026-12-06T00:00:00Z", revokedAt: null });
      }
    })();
  }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getVersion = () => this.version;
  private emit() { this.version++; this.listeners.forEach((l) => l()); }

  // ---------- auth helpers ----------
  staff(id: string | null) { return this.state.staff.find((s) => s.id === id && s.active) ?? null; }
  private require(actorId: string | null, role: Role): StaffMember {
    const s = this.staff(actorId);
    if (!s || !s.roles.includes(role)) { this.log(actorId ?? "anonymous", `require:${role}`, "-", "denied"); throw new AccessDenied(); }
    return s;
  }
  private requireReport(actorId: string | null, reportId: string): { s: StaffMember; r: Report } {
    const s = this.require(actorId, "reviewer");
    const r = this.state.reports.find((x) => x.id === reportId && !x.removedAt);
    if (!r || !s.contexts.includes(r.workspaceId)) { this.log(s.id, "open_report", reportId, "denied"); throw new AccessDenied(); }
    return { s, r };
  }
  private log(actorId: string, action: string, targetId: string, outcome: "ok" | "denied") {
    this.state.audit.unshift({ id: randomId("au"), actorId, action, targetId, at: now(), outcome });
  }

  // ---------- public intake ----------
  validate(p: ReportPayload): ReportPayload {
    const text = (p.text ?? "").trim();
    if (text.length < 10 || text.length > 2000) throw new ValidationError("text_length");
    if (!CATS.includes(p.category)) throw new ValidationError("category");
    if (!BASES.includes(p.knowledgeBasis)) throw new ValidationError("basis");
    if (!TIMES.includes(p.timeBucket)) throw new ValidationError("time");
    if (!Array.isArray(p.impacts) || p.impacts.some((i) => !IMPACTS.includes(i))) throw new ValidationError("impacts");
    if (p.acknowledged !== true) throw new ValidationError("ack");
    return { ...p, text, impacts: [...new Set(p.impacts)], publicSummaryPermission: p.publicSummaryPermission === true };
  }

  async submitReport(input: { payload: ReportPayload; codeHash: string; idempotencyKey: string }): Promise<{ accepted: true }> {
    await this.ready;
    await delay(500);
    if (this.network === "fail") throw new Error("network");
    if (!this.state.intakeOpen) throw new Error("intake_closed");
    const p = this.validate(input.payload);
    if (!/^[0-9a-f]{64}$/.test(input.codeHash)) throw new ValidationError("receipt");
    const payloadHash = await sha256Hex(JSON.stringify(p) + input.codeHash);
    const prior = this.idem.get(input.idempotencyKey);
    if (prior) {
      if (prior.payloadHash !== payloadHash) throw new ValidationError("idempotency_conflict");
      return { accepted: true };
    }
    if (this.state.receipts.some((c) => c.codeHash === input.codeHash)) throw new ValidationError("receipt_conflict");
    const id = randomId("rp");
    const at = now();
    const report: Report = {
      id, workspaceId: workspaceFor(p.countryCode), originalText: p.text, originalLanguage: "en", category: p.category,
      knowledgeBasis: p.knowledgeBasis, countryCode: p.countryCode, areaId: p.areaId, eventTimeBucket: p.timeBucket,
      impacts: p.impacts, receivedAt: at, processingState: "received", evidenceState: "unassessed",
      sensitivity: SENSITIVE_HINTS.test(p.text) || p.category === "safety" || p.category === "aid_concern" ? "restricted" : "standard",
      urgent: false, assignedReviewerId: null, publicSummaryPermission: p.publicSummaryPermission, consentVersion: "demo-2026-11",
      retentionExpiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), removedAt: null, redactedSummary: "",
      relatedIds: [], sourceIndependence: {}, attachments: [], timeline: [{ status: "received", at }], demo: true,
    };
    this.state.reports.unshift(report);
    this.state.receipts.push({ reportId: id, codeHash: input.codeHash, createdAt: at, expiresAt: report.retentionExpiresAt, revokedAt: null });
    this.idem.set(input.idempotencyKey, { payloadHash, reportId: id });
    this.emit();
    if (this.network === "timeout_after_accept") { this.network = "normal"; throw new Error("timeout"); }
    return { accepted: true };
  }

  /** Attachment already processed client-side; re-validate as a server would. */
  async addAttachment(code: string, file: { bytes: Uint8Array; width: number; height: number; type: string; previewUrl?: string }) {
    await delay(400);
    const cap = await this.capability(code);
    if (!cap) throw new AccessDenied();
    const r = this.state.reports.find((x) => x.id === cap.reportId)!;
    if (r.attachments.filter((a) => a.processingState === "processed").length >= MAX_ATTACHMENTS) throw new ValidationError("too_many");
    const isJpeg = file.bytes[0] === 0xff && file.bytes[1] === 0xd8 && file.bytes[2] === 0xff;
    const fail = this.photoSim === "fail_next";
    if (fail) this.photoSim = "normal";
    const ok = !fail && isJpeg && file.type === "image/jpeg" && file.bytes.length <= MAX_ATTACHMENT_BYTES && file.width * file.height <= MAX_PIXELS;
    const a: Attachment = {
      id: randomId("at"), objectKey: "q/" + randomId("o"), processingState: ok ? "processed" : "failed", mediaType: "image/jpeg",
      byteSize: file.bytes.length, width: file.width, height: file.height, sha256: ok ? await sha256Hex(file.bytes) : "",
      processingVersion: "demo-img-1", metadataRemoval: ok ? "re-encoded-client" : "not-run", previewUrl: ok ? file.previewUrl : undefined,
    };
    r.attachments.push(a);
    this.emit();
    return { ok, id: a.id };
  }

  listPublicUpdates(): PublicUpdateView[] {
    return this.state.updates
      .filter((u) => u.state === "published" || (u.state === "withdrawn" && u.publishedAt))
      .map((u) => ({
        id: u.id, title: u.title, broadContext: u.broadContext, summary: u.summary, known: u.known, uncertain: u.uncertain,
        sources: [...u.sources], publishedAt: u.publishedAt!, corrections: clone(u.corrections), withdrawn: u.state === "withdrawn", demo: true,
      }));
  }

  // ---------- receipt-protected ----------
  private async capability(code: string): Promise<ReceiptCapability | null> {
    await this.ready;
    const n = normalizeCode(code);
    if (!isWellFormedCode(n)) return null;
    const h = await hashCode(n);
    const cap = this.state.receipts.find((c) => c.codeHash === h);
    if (!cap || cap.revokedAt || new Date(cap.expiresAt) < new Date()) return null;
    const r = this.state.reports.find((x) => x.id === cap.reportId);
    if (!r || r.removedAt) return null;
    return cap;
  }

  async openReceipt(code: string): Promise<ContributorView | null> {
    await delay(300);
    const t = Date.now();
    this.failedLookups = this.failedLookups.filter((x) => t - x < 60_000);
    if (this.failedLookups.length >= 10) return null; // short-lived rate limit, same generic answer
    const cap = await this.capability(code);
    if (!cap) { this.failedLookups.push(t); return null; }
    return this.contributorView(cap.reportId);
  }

  private contributorView(reportId: string): ContributorView {
    const r = this.state.reports.find((x) => x.id === reportId)!;
    const status = r.timeline.at(-1)!.status;
    return {
      originalText: r.originalText,
      areaLabel: broadAreaLabel(r.countryCode, r.areaId),
      timeBucket: r.eventTimeBucket,
      status,
      statusMessage: r.statusMessage,
      timeline: clone(r.timeline),
      messages: this.state.messages.filter((m) => m.reportId === reportId).map(({ id, sender, text, createdAt }) => ({ id, sender, text, createdAt })),
      removalRequested: !!this.state.removalRequests[reportId],
      attachments: r.attachments.map((a) => ({ id: a.id, state: a.processingState })),
    };
  }

  async addContributorMessage(code: string, text: string): Promise<ContributorView> {
    const cap = await this.capability(code);
    if (!cap) throw new AccessDenied();
    const tx = text.trim();
    if (tx.length < 1 || tx.length > 2000) throw new ValidationError("text_length");
    this.state.messages.push({ id: randomId("m"), reportId: cap.reportId, sender: "contributor", text: tx, createdAt: now() });
    const r = this.state.reports.find((x) => x.id === cap.reportId)!;
    if (r.processingState === "awaiting_contributor") this.transition(r, "in_review");
    this.emit();
    return this.contributorView(cap.reportId);
  }

  async requestRemoval(code: string): Promise<ContributorView> {
    const cap = await this.capability(code);
    if (!cap) throw new AccessDenied();
    const r = this.state.reports.find((x) => x.id === cap.reportId)!;
    this.state.removalRequests[r.id] = now();
    r.processingState = "removal_requested";
    this.emit();
    return this.contributorView(r.id);
  }

  // ---------- staff ----------
  listReports(actorId: string | null): Report[] {
    const s = this.require(actorId, "reviewer");
    return this.state.reports.filter((r) => !r.removedAt && s.contexts.includes(r.workspaceId));
  }
  getReport(actorId: string | null, id: string) {
    const { r } = this.requireReport(actorId, id);
    return {
      report: r,
      messages: this.state.messages.filter((m) => m.reportId === id),
      notes: this.state.notes.filter((n) => n.reportId === id),
      evidence: this.state.evidence.filter((e) => e.reportId === id),
      expertRequests: this.state.expertRequests.filter((x) => x.reportIds.includes(id)),
      riskLinks: this.state.riskLinks.filter((l) => l.targetId === id),
      history: this.state.audit.filter((a) => a.targetId === id),
      removalRequestedAt: this.state.removalRequests[id] ?? null,
    };
  }
  duplicateSuggestions(actorId: string | null, id: string) {
    const { r } = this.requireReport(actorId, id);
    const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
    const w = words(r.originalText);
    return this.listReports(actorId)
      .filter((o) => o.id !== id && !r.relatedIds.includes(o.id))
      .map((o) => {
        const ow = words(o.originalText);
        const inter = [...w].filter((x) => ow.has(x)).length;
        const sim = inter / Math.max(1, new Set([...w, ...ow]).size);
        const score = sim + (o.areaId === r.areaId && r.areaId !== "unknown" ? 0.3 : 0) + (o.category === r.category ? 0.2 : 0) + (o.eventTimeBucket === r.eventTimeBucket ? 0.1 : 0);
        return { id: o.id, score, preview: o.redactedSummary || o.originalText.slice(0, 80) };
      })
      .filter((x) => x.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private transition(r: Report, p: ProcessingState) {
    r.processingState = p;
    const prev = r.timeline.at(-1)!.status;
    const next = contributorStatusFor(p, prev);
    if (next !== prev) r.timeline.push({ status: next, at: now() });
  }

  updateReport(actorId: string | null, id: string, patch: {
    processingState?: ProcessingState; evidenceState?: EvidenceState; sensitivity?: Sensitivity; urgent?: boolean;
    assignToMe?: boolean; redactedSummary?: string; statusMessage?: string;
  }) {
    const { s, r } = this.requireReport(actorId, id);
    if (patch.processingState === "removal_requested") throw new ValidationError("state");
    if (patch.processingState) this.transition(r, patch.processingState);
    if (patch.evidenceState) {
      if (patch.evidenceState === "supported" && !this.state.evidence.some((e) => e.reportId === id && e.supports === "supports"))
        throw new ValidationError("Record a supporting source before marking as supported.");
      r.evidenceState = patch.evidenceState;
    }
    if (patch.sensitivity) r.sensitivity = patch.sensitivity;
    if (patch.urgent !== undefined) r.urgent = patch.urgent;
    if (patch.assignToMe) r.assignedReviewerId = s.id;
    if (patch.redactedSummary !== undefined) r.redactedSummary = patch.redactedSummary.slice(0, 1000);
    if (patch.statusMessage !== undefined) r.statusMessage = patch.statusMessage.slice(0, 300) || undefined;
    this.log(s.id, "update_report:" + Object.keys(patch).join(","), id, "ok");
    this.emit();
  }

  addNote(actorId: string | null, id: string, type: ReviewNote["type"], text: string) {
    const { s } = this.requireReport(actorId, id);
    if (!text.trim()) throw new ValidationError("empty");
    this.state.notes.push({ id: randomId("n"), reportId: id, authorId: s.id, type, text: text.trim().slice(0, 2000), createdAt: now() });
    this.log(s.id, "add_note", id, "ok");
    this.emit();
  }

  addEvidence(actorId: string | null, id: string, e: Omit<EvidenceLink, "id" | "reportId" | "authorId" | "createdAt">) {
    const { s } = this.requireReport(actorId, id);
    if (!e.source.trim() || !e.claim.trim()) throw new ValidationError("Source and claim are required.");
    this.state.evidence.push({ ...e, id: randomId("ev"), reportId: id, authorId: s.id, createdAt: now() });
    this.log(s.id, "add_evidence", id, "ok");
    this.emit();
  }

  linkRelated(actorId: string | null, id: string, otherId: string, independence: "known_independent" | "uncertain" | "shared_origin") {
    const { s, r } = this.requireReport(actorId, id);
    const { r: o } = this.requireReport(actorId, otherId);
    if (!r.relatedIds.includes(o.id)) r.relatedIds.push(o.id);
    if (!o.relatedIds.includes(r.id)) o.relatedIds.push(r.id);
    r.sourceIndependence[o.id] = independence;
    o.sourceIndependence[r.id] = independence;
    this.log(s.id, "link_related", id, "ok");
    this.emit();
  }

  sendReply(actorId: string | null, id: string, text: string, askForInfo: boolean) {
    const { s, r } = this.requireReport(actorId, id);
    const tx = text.trim();
    if (!tx || tx.length > 600) throw new ValidationError("Reply must be 1–600 characters.");
    this.state.messages.push({ id: randomId("m"), reportId: id, sender: "reviewer", text: tx, createdAt: now() });
    if (askForInfo) this.transition(r, "awaiting_contributor");
    this.log(s.id, "send_reply", id, "ok");
    this.emit();
  }

  createExpertRequest(actorId: string | null, x: Pick<ExpertRequest, "reportIds" | "context" | "claim" | "period" | "materials" | "question">) {
    const s = this.require(actorId, "reviewer");
    const reports = x.reportIds.map((id) => this.requireReport(actorId, id).r);
    const ws = reports[0]?.workspaceId;
    if (!ws || reports.some((r) => r.workspaceId !== ws)) throw new ValidationError("Reports must share one context.");
    if (!x.claim.trim() || !x.question.trim()) throw new ValidationError("Claim and question are required.");
    const experts = this.state.staff.filter((m) => m.active && m.roles.includes("expert") && m.contexts.includes(ws)).map((m) => m.id);
    const req: ExpertRequest = { ...x, id: randomId("xr"), workspaceId: ws, permittedExpertIds: experts, state: "open", threshold: 5, createdAt: now() };
    this.state.expertRequests.unshift(req);
    reports.forEach((r) => this.transition(r, "awaiting_expert"));
    this.log(s.id, "create_expert_request", req.id, "ok");
    this.emit();
    return req;
  }

  /** Moderator view: all responses with expert identity, within context. */
  listExpertRequestsForModerator(actorId: string | null) {
    const s = this.require(actorId, "reviewer");
    return this.state.expertRequests.filter((x) => s.contexts.includes(x.workspaceId)).map((x) => ({
      request: x, responses: this.state.expertResponses.filter((r) => r.requestId === x.id),
    }));
  }

  setInterpretation(actorId: string | null, requestId: string, text: string, close: boolean) {
    const s = this.require(actorId, "reviewer");
    const x = this.state.expertRequests.find((r) => r.id === requestId);
    if (!x || !s.contexts.includes(x.workspaceId)) throw new AccessDenied();
    x.moderatorInterpretation = text.trim().slice(0, 2000);
    if (close) x.state = "closed";
    this.log(s.id, "interpretation", requestId, "ok");
    this.emit();
  }

  addRiskLink(actorId: string | null, targetId: string, l: Pick<RiskLink, "trigger" | "implication" | "decision" | "rationale">) {
    const s = this.require(actorId, "reviewer");
    const report = this.state.reports.find((r) => r.id === targetId);
    const req = this.state.expertRequests.find((r) => r.id === targetId);
    const ws = report?.workspaceId ?? req?.workspaceId;
    if (!ws || !s.contexts.includes(ws)) throw new AccessDenied();
    if (!l.rationale.trim()) throw new ValidationError("Rationale is required.");
    this.state.riskLinks.push({ ...l, id: randomId("rl"), targetId, riskId: D.DEMO_RISK.id, riskTitle: D.DEMO_RISK.title, demonstration: true, createdAt: now() });
    this.log(s.id, "risk_link", targetId, "ok");
    this.emit();
  }

  // ---------- expert ----------
  listAssignments(actorId: string | null) {
    const s = this.require(actorId, "expert");
    return this.state.expertRequests.filter((x) => x.permittedExpertIds.includes(s.id)).map((x) => this.packet(x, s.id));
  }
  getAssignment(actorId: string | null, id: string) {
    const s = this.require(actorId, "expert");
    const x = this.state.expertRequests.find((r) => r.id === id);
    if (!x || !x.permittedExpertIds.includes(s.id)) { this.log(s.id, "open_packet", id, "denied"); throw new AccessDenied(); }
    return this.packet(x, s.id);
  }
  private packet(x: ExpertRequest, expertId: string) {
    const all = this.state.expertResponses.filter((r) => r.requestId === x.id);
    const mine = all.find((r) => r.expertId === expertId) ?? null;
    let aggregate: null | { counts: Record<ExpertChoice, number>; themes: string[] } = null;
    if (mine && all.length >= x.threshold) {
      const counts = { consistent: 0, conflicting: 0, cannot_assess: 0 };
      all.forEach((r) => counts[r.choice]++);
      aggregate = { counts, themes: all.filter((r) => r.expertId !== expertId).map((r) => r.explanation).sort() };
    }
    // Redacted packet only: no report IDs, original text, codes, messages or attachments.
    return {
      id: x.id, context: x.context, claim: x.claim, period: x.period, materials: x.materials, question: x.question, state: x.state,
      threshold: x.threshold, responseCount: mine ? all.length : null, mine: mine ? clone(mine) : null, aggregate,
    };
  }
  submitExpertResponse(actorId: string | null, id: string, choice: ExpertChoice, explanation: string, source?: string) {
    const s = this.require(actorId, "expert");
    const x = this.state.expertRequests.find((r) => r.id === id);
    if (!x || !x.permittedExpertIds.includes(s.id)) throw new AccessDenied();
    if (x.state !== "open") throw new ValidationError("This check is closed.");
    if (this.state.expertResponses.some((r) => r.requestId === id && r.expertId === s.id)) throw new ValidationError("Already submitted.");
    if (!["consistent", "conflicting", "cannot_assess"].includes(choice)) throw new ValidationError("choice");
    const ex = explanation.trim();
    if (!ex || ex.length > 600) throw new ValidationError("Explanation must be 1–600 characters.");
    this.state.expertResponses.push({ id: randomId("er"), requestId: id, expertId: s.id, choice, explanation: ex, source: source?.trim() || undefined, submittedAt: now() });
    this.log(s.id, "expert_response", id, "ok");
    this.emit();
  }

  // ---------- publication ----------
  listUpdatesForStaff(actorId: string | null) { this.require(actorId, "reviewer"); return this.state.updates; }

  createUpdateDraft(actorId: string | null, d: Pick<PublicUpdate, "title" | "broadContext" | "summary" | "known" | "uncertain" | "sources" | "sourceReportIds">) {
    const s = this.require(actorId, "reviewer");
    d.sourceReportIds.forEach((id) => this.requireReport(actorId, id));
    if (!d.title.trim() || !d.summary.trim()) throw new ValidationError("Title and summary are required.");
    const u: PublicUpdate = { ...d, id: randomId("up"), state: "draft", usesCitizenMaterial: d.sourceReportIds.length > 0, disclosureReviewed: false, authorId: s.id, corrections: [], demo: true };
    this.state.updates.unshift(u);
    this.log(s.id, "create_update", u.id, "ok");
    this.emit();
    return u;
  }

  private upd(id: string) { const u = this.state.updates.find((x) => x.id === id); if (!u) throw new ValidationError("missing"); return u; }

  submitForPublicationReview(actorId: string | null, id: string) {
    const s = this.require(actorId, "reviewer");
    const u = this.upd(id);
    if (u.state !== "draft") throw new ValidationError("Only drafts can be submitted.");
    u.state = "under_review";
    this.log(s.id, "submit_update", id, "ok");
    this.emit();
  }

  publicationBlockers(u: PublicUpdate): string[] {
    const b: string[] = [];
    if (!u.summary.trim()) b.push("Reviewed summary is missing.");
    if (!u.uncertain.trim()) b.push("Uncertainty note is missing.");
    if (!u.disclosureReviewed) b.push("Human disclosure review not recorded.");
    if (u.usesCitizenMaterial) {
      const missing = u.sourceReportIds.filter((id) => !this.state.reports.find((r) => r.id === id)?.publicSummaryPermission);
      if (missing.length) b.push(`Use permission missing for ${missing.length} source report(s).`);
      if (u.sourceReportIds.some((id) => this.state.reports.find((r) => r.id === id)?.sensitivity === "restricted"))
        b.push("A source report is restricted; restricted material is not released through updates.");
    }
    return b;
  }

  recordDisclosureReview(actorId: string | null, id: string) {
    const s = this.require(actorId, "publisher");
    const u = this.upd(id);
    if (u.state !== "under_review") throw new ValidationError("Submit for publication review first.");
    u.disclosureReviewed = true; u.disclosureReviewerId = s.id;
    this.log(s.id, "disclosure_review", id, "ok");
    this.emit();
  }

  approveUpdate(actorId: string | null, id: string) {
    const s = this.require(actorId, "publisher");
    const u = this.upd(id);
    if (u.state !== "under_review") throw new ValidationError("Not under review.");
    const b = this.publicationBlockers(u);
    if (b.length) throw new ValidationError(b.join(" "));
    u.state = "approved"; u.approverId = s.id;
    this.log(s.id, "approve_update", id, "ok");
    this.emit();
  }

  publishUpdate(actorId: string | null, id: string) {
    const s = this.require(actorId, "publisher");
    const u = this.upd(id);
    if (u.state !== "approved") throw new ValidationError("Approve before publishing.");
    if (this.publicationBlockers(u).length) throw new ValidationError("Blockers remain.");
    u.state = "published"; u.publisherId = s.id; u.publishedAt = now();
    this.log(s.id, "publish_update", id, "ok");
    this.emit();
  }

  correctUpdate(actorId: string | null, id: string, note: string, summary?: string) {
    const s = this.require(actorId, "publisher");
    const u = this.upd(id);
    if (u.state !== "published") throw new ValidationError("Only published updates can be corrected.");
    if (!note.trim()) throw new ValidationError("Correction note is required.");
    if (summary?.trim()) u.summary = summary.trim();
    u.corrections.push({ date: now().slice(0, 10), note: note.trim() });
    this.log(s.id, "correct_update", id, "ok");
    this.emit();
  }

  withdrawUpdate(actorId: string | null, id: string, note: string) {
    const s = this.require(actorId, "publisher");
    const u = this.upd(id);
    if (u.state !== "published") throw new ValidationError("Only published updates can be withdrawn.");
    u.state = "withdrawn";
    u.corrections.push({ date: now().slice(0, 10), note: note.trim() || "Withdrawn after review." });
    this.log(s.id, "withdraw_update", id, "ok");
    this.emit();
  }

  // ---------- admin ----------
  completeRemoval(actorId: string | null, reportId: string) {
    const s = this.require(actorId, "admin");
    const r = this.state.reports.find((x) => x.id === reportId);
    if (!r || !s.contexts.includes(r.workspaceId)) throw new AccessDenied();
    r.removedAt = now(); r.originalText = ""; r.redactedSummary = "";
    r.attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    r.attachments = [];
    this.state.messages = this.state.messages.filter((m) => m.reportId !== reportId);
    this.state.notes = this.state.notes.filter((n) => n.reportId !== reportId);
    this.state.receipts.filter((c) => c.reportId === reportId).forEach((c) => (c.revokedAt = now()));
    delete this.state.removalRequests[reportId];
    this.log(s.id, "complete_removal", reportId, "ok");
    this.emit();
  }

  setIntake(actorId: string | null, open: boolean) {
    const s = this.require(actorId, "admin");
    this.state.intakeOpen = open;
    this.log(s.id, "set_intake", "-", "ok");
    this.emit();
  }

  /** Retention sweep against a controllable clock. Returns removed IDs. */
  runRetention(actorId: string | null, at: Date) {
    this.require(actorId, "admin");
    const due = this.state.reports.filter((r) => !r.removedAt && new Date(r.retentionExpiresAt) <= at).map((r) => r.id);
    due.forEach((id) => this.completeRemoval(actorId, id));
    return due;
  }

  /** Demo-only role switch. Not present in any connected provider. */
  setDemoActor(id: string | null) { this.actorId = id; this.emit(); }
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
