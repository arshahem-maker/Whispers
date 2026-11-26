import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const { databaseQuery, storageSend } = vi.hoisted(() => ({
  databaseQuery: vi.fn(),
  storageSend: vi.fn(),
}));

vi.mock("@/integrations/neon/database.server", () => ({
  neonDatabase: () => databaseQuery,
}));

vi.mock("@/integrations/neon/storage.server", () => ({
  NEON_PHOTO_BUCKET: "whispers-private",
  neonStorage: () => ({ send: storageSend }),
}));

import { runNeonRetention } from "./neon-retention.server";

const reportId = "00000000-0000-4000-8000-000000000001";
const otherReportId = "00000000-0000-4000-8000-000000000002";
const day = 86_400_000;

describe("runNeonRetention media grace period", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00.000Z"));
    databaseQuery.mockReset();
    storageSend.mockReset();
  });

  it("does not inspect or delete revoked media before 24 hours", async () => {
    const recentRevocation = new Date(Date.now() - day + 1);
    databaseQuery.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ");
      if (query.includes("whispers_expire_private")) return [{ expired: 0 }];
      if (query.includes("from public.whispers_media_cleanup job")) {
        return [{ report_id: reportId, queued_at: new Date().toISOString(), revoked_at: recentRevocation }];
      }
      return [];
    });

    await expect(runNeonRetention()).resolves.toEqual({ ok: true, expired: 0 });

    const cleanupQuery = databaseQuery.mock.calls.find(([strings]) =>
      (strings as TemplateStringsArray).join(" ").includes("from public.whispers_media_cleanup job"),
    );
    expect(cleanupQuery?.[0].join(" ")).toContain("report.revoked_at <= now() - interval '1 day'");
    expect(storageSend).not.toHaveBeenCalled();
    expect(databaseQuery.mock.calls.some(([strings]) =>
      (strings as TemplateStringsArray).join(" ").includes("delete from public.whispers_media_cleanup"),
    )).toBe(false);
  });

  it("deletes revoked media after the original revocation grace period", async () => {
    const elapsedRevocation = new Date(Date.now() - day - 1);
    databaseQuery.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ");
      if (query.includes("whispers_expire_private")) return [{ expired: 0 }];
      if (query.includes("from public.whispers_media_cleanup job")) {
        return [
          { report_id: reportId, queued_at: new Date().toISOString(), revoked_at: elapsedRevocation },
          { report_id: otherReportId, queued_at: new Date().toISOString(), revoked_at: new Date(Date.now() - day + 1) },
        ];
      }
      return [];
    });
    storageSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: [{ Key: `${reportId}/photo.jpg`, LastModified: new Date() }] };
      }
      if (command instanceof DeleteObjectsCommand) return { Errors: [] };
      throw new Error("Unexpected storage command");
    });

    await expect(runNeonRetention()).resolves.toEqual({ ok: true, expired: 0 });

    expect(storageSend).toHaveBeenCalledTimes(2);
    expect(storageSend.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
    expect(storageSend.mock.calls[1]?.[0]).toBeInstanceOf(DeleteObjectsCommand);
    expect(databaseQuery.mock.calls.some(([strings]) =>
      (strings as TemplateStringsArray).join(" ").includes("delete from public.whispers_media_cleanup"),
    )).toBe(true);
  });
});
