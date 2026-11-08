import { describe, expect, it } from "vitest";
import { generatePrivateCode, hashCode, groupCode } from "./crypto";
import { WhispersStore, type ReportPayload } from "./store";

const payload = (text = "Water stopped in our area yesterday."): ReportPayload => ({
  text, category: "food_water", knowledgeBasis: "saw", countryCode: "UA", areaId: "ua-kharkiv", timeBucket: "yesterday",
  impacts: [], publicSummaryPermission: false, acknowledged: true,
});
async function submit(s: WhispersStore, text?: string) {
  const code = generatePrivateCode();
  await s.submitReport({ payload: payload(text), codeHash: await hashCode(code), idempotencyKey: "k-" + code });
  return code;
}

describe("Whispers demo provider rules", () => {
  it("code is 32 Base32 chars (160 bits)", () => expect(generatePrivateCode()).toMatch(/^[A-Z2-7]{32}$/));
  it("rejects too-short text server-side", async () => {
    const s = new WhispersStore();
    await expect(s.submitReport({ payload: payload("short"), codeHash: await hashCode(generatePrivateCode()), idempotencyKey: "x" })).rejects.toThrow();
  });
  it("raw code is never stored and code A cannot open report B", async () => {
    const s = new WhispersStore();
    const a = await submit(s, "Report A about water access here.");
    const b = await submit(s, "Report B about clinic supplies here.");
    expect(JSON.stringify(s.state)).not.toContain(a);
    expect((await s.openReceipt(groupCode(a).toLowerCase()))?.originalText).toContain("Report A");
    expect((await s.openReceipt(b))?.originalText).toContain("Report B");
    expect(await s.openReceipt(generatePrivateCode())).toBeNull();
  });
  it("retry with the same idempotency key does not duplicate", async () => {
    const s = new WhispersStore();
    const code = generatePrivateCode(); const h = await hashCode(code);
    const before = s.state.reports.length;
    s.network = "timeout_after_accept";
    await expect(s.submitReport({ payload: payload(), codeHash: h, idempotencyKey: "same" })).rejects.toThrow("timeout");
    await s.submitReport({ payload: payload(), codeHash: h, idempotencyKey: "same" });
    expect(s.state.reports.length).toBe(before + 1);
  });
  it("contributor view excludes internal notes", async () => {
    const s = new WhispersStore();
    const code = await submit(s);
    const id = s.state.reports[0]!.id;
    s.addNote("st-mara", id, "assessment", "INTERNAL-SECRET-NOTE");
    expect(JSON.stringify(await s.openReceipt(code))).not.toContain("INTERNAL-SECRET-NOTE");
  });
  it("completed removal revokes the code", async () => {
    const s = new WhispersStore();
    const code = await submit(s);
    await s.requestRemoval(code);
    s.completeRemoval("st-lena", s.state.reports[0]!.id);
    expect(await s.openReceipt(code)).toBeNull();
  });
  it("staff cannot read other contexts; anonymous cannot list", () => {
    const s = new WhispersStore();
    expect(() => s.getReport("st-idris", "rp-01")).toThrow();
    expect(() => s.listReports(null)).toThrow();
    expect(s.listReports("st-idris").every((r) => r.workspaceId === "td")).toBe(true);
  });
  it("expert cannot see peers before submitting; unassigned expert denied", () => {
    const s = new WhispersStore();
    const p = s.getAssignment("ex-4", "xr-01");
    expect(p.aggregate).toBeNull(); expect(p.responseCount).toBeNull();
    expect(JSON.stringify(p)).not.toContain("rp-01");
    expect(() => s.getAssignment("st-mara", "xr-01")).toThrow();
  });
  it("reviewer without publication authority cannot publish; missing permission blocks approval", () => {
    const s = new WhispersStore();
    s.submitForPublicationReview("st-idris", "up-02");
    expect(() => s.approveUpdate("st-idris", "up-02")).toThrow();
    s.recordDisclosureReview("st-tomas", "up-02");
    expect(() => s.approveUpdate("st-tomas", "up-02")).toThrow(/permission/i);
  });
  it("public projection contains no drafts or private source IDs", () => {
    const s = new WhispersStore();
    const pub = JSON.stringify(s.listPublicUpdates());
    expect(pub).not.toContain("up-02");
    expect(pub).not.toContain("rp-0");
  });
});
