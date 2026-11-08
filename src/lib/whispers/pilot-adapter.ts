import type { ContributorView, ContributorStatus, TimeBucket } from "./types";

export function pilotContributorView(v: { text: string; area: string; state: string; removalRequested: boolean; messages: { id: string; text: string; sender: string; at: string }[]; photos: number; time: TimeBucket; receivedAt: string } | null): ContributorView | null {
  if (!v) return null;
  const status: ContributorStatus = v.state === "complete" ? "complete" : v.state === "awaiting_contributor" ? "more_info" : v.state === "received" ? "received" : "under_review";
  return { originalText: v.text, areaLabel: v.area, timeBucket: v.time, status, removalRequested: v.removalRequested,
    timeline: [{ status: "received", at: v.receivedAt }, ...(status === "received" ? [] : [{ status, at: v.receivedAt }])],
    messages: v.messages.map((m) => ({ id: m.id, text: m.text, sender: m.sender === "reviewer" ? "reviewer" : "contributor", createdAt: m.at })), attachments: [] };
}