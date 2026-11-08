import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), rotated: vi.fn(), deleted: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: async () => ({ data: 0, error: null }),
  from: (table: string) => ({
    select: () => ({
      order: () => ({ limit: async () => ({ data: [{ report_id: "first" }, { report_id: "second" }], error: null }) }),
      eq: () => ({ eq: async () => ({ data: [], error: null }), maybeSingle: async () => ({ data: { revoked_at: "2026-01-01" }, error: null }) }),
    }),
    update: () => ({ eq: mocks.rotated }),
    delete: () => ({ eq: mocks.deleted, lt: async () => ({ error: null }) }),
  }),
  storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
} }));
import { runRetention } from "./retention.server";
describe("cleanup failures", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rotated.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null }); });
  it("continues later media jobs after a storage failure and reports retry needed", async () => {
    mocks.list.mockResolvedValueOnce({ data: [], error: new Error("unavailable") }).mockResolvedValueOnce({ data: [{ name: "photo.jpg" }], error: null });
    await expect(runRetention()).rejects.toThrow("need retrying");
    expect(mocks.list.mock.calls.map((c) => c[0])).toEqual(["first", "second"]);
    expect(mocks.remove).toHaveBeenCalledWith(["second/photo.jpg"]);
    expect(mocks.rotated).toHaveBeenCalledTimes(2);
  });
});