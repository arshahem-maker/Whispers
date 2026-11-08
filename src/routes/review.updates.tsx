import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StaffShell } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import type { PublicUpdate } from "@/lib/whispers/types";
import { Panel, useAct } from "@/components/whispers/Panel";

export const Route = createFileRoute("/review/updates")({
  head: () => ({
    meta: [
      { title: "Publication review — Whispers review" },
      { name: "description", content: "Draft, review and publish updates." },
      { property: "og:title", content: "Publication review — Whispers review" },
      { property: "og:description", content: "Draft, review and publish updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="reviewer" title={tr("Updates")}><Updates /></StaffShell>,
});

const STATE = { draft: "Draft", under_review: "Under publication review", approved: "Approved", published: "Published", withdrawn: "Withdrawn" };

function Updates() {
  useTranslationVersion();
  const { store } = useWhispers();
  const list = store.listUpdatesForStaff(store.actorId);
  return (
    <div className="grid gap-4">
      <p className="hint">{tr("Updates are separate from reports. Nothing is copied from a report automatically. Publishing needs a reviewed summary, an uncertainty note, use permission for any citizen-derived material, a recorded human disclosure review, and a publisher.")}<Link to="/updates" className="text-primary underline">{tr("View public page")}</Link></p>
      <NewDraft />
      {list.map((u) => <Item key={u.id} u={u} />)}
    </div>
  );
}

function NewDraft() {
  useTranslationVersion();
  const { store } = useWhispers();
  const blank = { title: "", broadContext: "", summary: "", known: "", uncertain: "", sources: "", sourceReportIds: "" };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  const { act, Status } = useAct();
  if (!open) return <button className="btn btn-primary btn-sm w-fit" onClick={() => setOpen(true)}>{tr("New update draft")}</button>;
  return (
    <Panel title={tr("New update draft")}>
      <div className="grid gap-2">
        {([["title", "Title"], ["broadContext", "Broad context (general area and period)"], ["summary", "Humanitarian summary"], ["known", "What is known"], ["uncertain", "What remains uncertain"], ["sources", "Public sources (one per line)"], ["sourceReportIds", "Source report IDs (private, comma separated)"]] as const).map(([k, l]) => (
          <label key={k} className="grid gap-1"><span className="hint">{l}</span>
            <textarea rows={k === "summary" ? 3 : 1} className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
      </div>
      <p className="hint mt-2">{tr("Write in your own reviewed words. Don’t include exact times, sensitive locations, identities or raw photos.")}</p>
      <button className="btn btn-primary btn-sm mt-2" onClick={() => act(() => {
        store.createUpdateDraft(store.actorId, { ...f, sources: f.sources.split("\n").map((s) => s.trim()).filter(Boolean), sourceReportIds: f.sourceReportIds.split(",").map((s) => s.trim()).filter(Boolean) });
        setF(blank); setOpen(false);
      }, "Draft created.")}>{tr("Save draft")}</button>
      <Status />
    </Panel>
  );
}

function Item({ u }: { u: PublicUpdate }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const me = store.actorId;
  const isPub = !!store.staff(me)?.roles.includes("publisher");
  const blockers = store.publicationBlockers(u);
  const [note, setNote] = useState("");
  const { act, Status } = useAct();
  return (
    <Panel title={u.title}>
      <div className="flex flex-wrap gap-1.5 mb-2"><span className="chip">{STATE[u.state]}</span>{u.demo && <span className="chip !text-warning">{tr("Example")}</span>}</div>
      <p className="hint">{u.broadContext}</p>
      <p className="mt-2">{u.summary}</p>
      <p className="hint mt-2">{tr("Private source reports:")}{u.sourceReportIds.join(", ") || "none"} {tr("· Disclosure review:")}{u.disclosureReviewed ? `done by ${store.staff(u.disclosureReviewerId ?? null)?.name}` : "not recorded"}</p>
      {(u.state === "draft" || u.state === "under_review") && blockers.length > 0 && (
        <ul className="mt-2 text-warning text-[0.95rem]">{blockers.map((b) => <li key={b}>⚠ {b}</li>)}</ul>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {u.state === "draft" && <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.submitForPublicationReview(me, u.id))}>{tr("Submit for publication review")}</button>}
        {u.state === "under_review" && !u.disclosureReviewed && <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.recordDisclosureReview(me, u.id), "Disclosure review recorded.")}>{tr("Record disclosure review")}</button>}
        {u.state === "under_review" && <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.approveUpdate(me, u.id), "Approved.")}>{tr("Step 1: Approve")}</button>}
        {u.state === "approved" && <button className="btn btn-primary btn-sm" onClick={() => act(() => store.publishUpdate(me, u.id), "Published.")}>{tr("Step 2: Publish")}</button>}
      </div>
      {u.state === "published" && (
        <div className="mt-3 grid gap-2">
          <input aria-label={tr("Correction note")} placeholder={tr("Correction note (shown publicly)")} className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => act(() => { store.correctUpdate(me, u.id, note); setNote(""); }, "Correction published.")}>{tr("Publish correction")}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.withdrawUpdate(me, u.id, note), "Withdrawn.")}>{tr("Withdraw")}</button>
          </div>
        </div>
      )}
      {!isPub && u.state !== "draft" && <p className="hint mt-2">{tr("Your role has no publication authority; approval and publishing are refused for you.")}</p>}
      <Status />
    </Panel>
  );
}
