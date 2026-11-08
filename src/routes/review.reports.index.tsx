import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { StaffShell, fmtTime } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import { CATEGORY_LABEL, EVIDENCE_LABEL, PROCESSING_LABEL } from "@/lib/whispers/i18n";
import { broadAreaLabel } from "@/lib/whispers/locations";
import type { Report } from "@/lib/whispers/types";

export const Route = createFileRoute("/review/reports/")({
  head: () => ({
    meta: [
      { title: "Inbox — Whispers review" },
      { name: "description", content: "Reviewer intake queue." },
      { property: "og:title", content: "Inbox — Whispers review" },
      { property: "og:description", content: "Reviewer intake queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="reviewer" title={tr("Inbox")}><Inbox /></StaffShell>,
});

const FILTERS: { id: string; label: string; test: (r: Report, me: string) => boolean }[] = [
  { id: "new", label: tr("New"), test: (r) => r.processingState === "received" || r.processingState === "triage" },
  { id: "mine", label: tr("Assigned to me"), test: (r, me) => r.assignedReviewerId === me },
  { id: "info", label: tr("Needs information"), test: (r) => r.processingState === "awaiting_contributor" },
  { id: "expert", label: tr("Needs expert context"), test: (r) => r.processingState === "awaiting_expert" },
  { id: "done", label: tr("Review complete"), test: (r) => r.processingState === "complete" },
  { id: "restricted", label: tr("Restricted"), test: (r) => r.sensitivity === "restricted" },
  { id: "removal", label: tr("Removal requested"), test: (r) => r.processingState === "removal_requested" },
  { id: "all", label: tr("All"), test: () => true },
];

function Inbox() {
  useTranslationVersion();
  const { store } = useWhispers();
  const me = store.actorId!;
  const reports = store.listReports(me);
  const [f, setF] = useState("new");
  const filter = FILTERS.find((x) => x.id === f)!;
  const rows = reports.filter((r) => filter.test(r, me)).sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.receivedAt.localeCompare(a.receivedAt));
  const next = reports.filter((r) => r.processingState === "received" || r.processingState === "triage").sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.receivedAt.localeCompare(b.receivedAt))[0];
  return (
    <>
      {next && (
        <div className="card p-5 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-60">
            <p className="hint">{tr("Next report needing attention")}</p>
            <p className="mt-1">{tr(CATEGORY_LABEL[next.category])} · {broadAreaLabel(next.countryCode, next.areaId)} {tr("· received")}{fmtTime(next.receivedAt)}</p>
          </div>
          <Link to="/review/reports/$id" params={{ id: next.id }} className="btn btn-primary btn-sm">{tr("Open")}</Link>
        </div>
      )}
      <div role="tablist" aria-label={tr("Queue")} className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((x) => {
          const n = reports.filter((r) => x.test(r, me)).length;
          return (
            <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)}
              className={`px-3 min-h-11 rounded-xl border text-[0.95rem] ${f === x.id ? "border-primary text-primary bg-raised" : "text-muted-foreground"}`}>
              {tr(x.label)} <span className="ml-1 opacity-80">{n}</span>
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? <p className="card p-5">{tr("Nothing in this view.")}</p> : (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to="/review/reports/$id" params={{ id: r.id }} className="card p-4 flex flex-col gap-2 hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center gap-2 text-[0.95rem]">
                  <span className="font-semibold">{tr(CATEGORY_LABEL[r.category])}</span>
                  <span className="text-muted-foreground">· {broadAreaLabel(r.countryCode, r.areaId)} · {fmtTime(r.receivedAt)}</span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    {r.urgent && <span className="chip !text-warning !border-warning/60"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{tr("Priority (not evidence)")}</span>}
                    {r.sensitivity === "restricted" && <span className="chip !text-destructive !border-destructive/60"><Lock className="h-3.5 w-3.5" aria-hidden />{tr("Restricted")}</span>}
                    <span className="chip">{tr(PROCESSING_LABEL[r.processingState])}</span>
                    <span className="chip">{tr(EVIDENCE_LABEL[r.evidenceState])}</span>
                    {r.attachments.some((a) => a.processingState === "failed") && <span className="chip">{tr("Photo failed")}</span>}
                  </span>
                </div>
                <p className="text-muted-foreground text-[0.95rem]">
                  {r.sensitivity === "restricted" ? "Preview hidden — restricted report." : r.redactedSummary || "No redacted summary yet. Open to assess."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="hint mt-6">{tr("Showing contexts:")}{store.staff(me)?.contexts.join(", ")}{tr(". Reports outside your assigned contexts are not returned.")}</p>
    </>
  );
}
