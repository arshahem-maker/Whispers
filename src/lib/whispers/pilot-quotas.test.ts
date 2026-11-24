import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn(), prior: null as null | { payload_hash: string }, inserted: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: m.rpc,
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.prior, error: null }), is: () => ({ gt: () => ({ maybeSingle: async () => ({ data: { id: "r1", workspace: "ua", body: {}, removal_requested_at: null, received_at: "2026-01-01" }, error: null }) }) }), in: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    insert: (v: unknown) => { m.inserted(v); return { select: () => ({ single: async () => ({ data: { id: "r1" }, error: null }) }), then: (f: (x: unknown) => void) => f({ error: null }) }; },
  }),
} }));
import { submitPilot, receiptPilot, PILOT_QUOTAS } from "./pilot.server";
import { sha256Hex } from "./crypto";
const payload = { text: "Fictional clinic temporarily closed.", category: "health", knowledgeBasis: "saw", countryCode: "UA", areaId: "unknown", timeBucket: "today", impacts: [] as ("safety")[], publicSummaryPermission: false, acknowledged: true as const } as const;
const input = { payload, codeHash: "a".repeat(64), idempotencyKey: "retry-key-1", fictional: true } as const;
const req = new Request("http://x");
describe("pilot quotas are separate from voice", () => {
  beforeEach(() => { vi.clearAllMocks(); m.prior = null; process.env["LOVABLE_API_KEY"] = "test"; m.rpc.mockResolvedValue({ data: true, error: null }); });
  it("never calls the voice limiter for intake", async () => {
    await submitPilot(input, req);
    expect(m.rpc.mock.calls.map((c) => c[0])).not.toContain("reserve_voice_request");
    expect(m.rpc.mock.calls[0]?.[1]).toMatchObject({ p_limit: 6 });
  });
  it("an idempotent retry of an accepted report uses no quota", async () => {
    m.prior = { payload_hash: await sha256Hex(JSON.stringify(payload) + input.codeHash) };
    await expect(submitPilot(input, req)).resolves.toEqual({ accepted: true });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("three photo uploads cannot exhaust receipt opening", () => {
    expect(PILOT_QUOTAS.receipt.limit).toBe(30);
    expect(PILOT_QUOTAS.upload.limit).toBeGreaterThanOrEqual(3);
  });
  it("removal uses the atomic removal function and its own bucket", async () => {
    await receiptPilot({ code: "A".repeat(32), action: "removal" });
    const names = m.rpc.mock.calls.map((c) => c[0]);
    expect(names).toContain("whispers_request_removal");
    expect(String(m.rpc.mock.calls[0]?.[1]?.p_bucket)).toMatch(/^removal:/);
  });
});
