import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, useAct } from "@/components/whispers/Panel";
import { StaffShell, fmtTime } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import { DEMO_RISK } from "@/lib/whispers/demo-data";
import { BASIS_LABEL, CATEGORY_LABEL, EVIDENCE_LABEL, IMPACT_LABEL, PROCESSING_LABEL, TIME_LABEL } from "@/lib/whispers/i18n";
import { broadAreaLabel, WORKSPACE_LABEL } from "@/lib/whispers/locations";
import { AccessDenied } from "@/lib/whispers/store";
import type { EvidenceState, ProcessingState, ReviewNote } from "@/lib/whispers/types";

export const Route = createFileRoute("/review/reports/$id")({
  head: () => ({
    meta: [
      { title: "Report assessment — Whispers review" },
      { name: "description", content: "Assess a report." },
      { property: "og:title", content: "Report assessment — Whispers review" },
      { property: "og:description", content: "Assess a report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="reviewer" title={tr("Report assessment")}><Detail /></StaffShell>,
});

const REPLY_TEMPLATES = [
  "Was the water supply interrupted for part of the day or longer?",
  "You can describe the type of service without naming staff.",
  "We reviewed your report alongside other information. Thank you.",
];

function Detail() {
  useTranslationVersion();
  const { id } = Route.useParams();
  const { store } = useWhispers();
  const me = store.actorId;
  let data: ReturnType<typeof store.getReport>;
  try { data = store.getReport(me, id); } catch (e) {
    return <div className="card p-6"><p>{e instanceof AccessDenied ? "This report is not available to your role or context." : "Report not found."}</p><Link to="/review/reports" className="btn-ghost !px-0">{tr("Back to inbox")}</Link></div>;
  }
  const { report: r } = data;
  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 items-start">
      <div className="grid gap-4">
        <Panel title={tr("Original report")}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="chip">{WORKSPACE_LABEL[r.workspaceId]}</span>
            <span className="chip">{tr(PROCESSING_LABEL[r.processingState])}</span>
            <span className="chip">{tr(EVIDENCE_LABEL[r.evidenceState])}</span>
            {r.sensitivity === "restricted" && <span className="chip !text-destructive">{tr("Restricted")}</span>}
            {r.urgent && <span className="chip !text-warning">{tr("Priority — not evidence")}</span>}
          </div>
          {/* Rendered strictly as text: no HTML, markdown or link previews. */}
          <p className="whitespace-pre-wrap break-words bg-background rounded-xl p-4 border">{r.originalText}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-[0.95rem]">
            <dt className="hint">{tr("Knowledge basis")}</dt><dd>{tr(BASIS_LABEL[r.knowledgeBasis])}</dd>
            <dt className="hint">{tr("Category")}</dt><dd>{tr(CATEGORY_LABEL[r.category])}</dd>
            <dt className="hint">{tr("Broad area")}</dt><dd>{broadAreaLabel(r.countryCode, r.areaId)}</dd>
            <dt className="hint">{tr("Reported time")}</dt><dd>{tr(TIME_LABEL[r.eventTimeBucket])}</dd>
            <dt className="hint">{tr("Received (server)")}</dt><dd>{fmtTime(r.receivedAt)}</dd>
            <dt className="hint">{tr("Affected")}</dt><dd>{r.impacts.map((i) => IMPACT_LABEL[i]).join(", ") || "—"}</dd>
            <dt className="hint">{tr("Public summary permission")}</dt><dd>{r.publicSummaryPermission ? "Given" : "Not given"}</dd>
            <dt className="hint">{tr("Assigned")}</dt><dd>{store.staff(r.assignedReviewerId)?.name ?? "Unassigned"}</dd>
          </dl>
          {r.assignedReviewerId !== me && <button className="btn btn-secondary btn-sm mt-4" onClick={() => store.updateReport(me, id, { assignToMe: true })}>{tr("Assign to me")}</button>}
          {r.attachments.length > 0 && (
            <div className="mt-4">
              <p className="label mb-2">{tr("Photos")}</p>
              <ul className="grid grid-cols-3 gap-2">
                {r.attachments.map((a) => (
                  <li key={a.id} className="text-sm">
                    {a.processingState === "processed" && a.previewUrl ? <img src={a.previewUrl} alt={tr("Processed photo copy")} className="rounded-xl border aspect-square object-cover w-full" /> :
                      <div className="rounded-xl border aspect-square flex items-center justify-center p-2 text-center hint">{a.processingState === "failed" ? "Processing failed — not available" : "Quarantined"}</div>}
                    {a.processingState === "processed" && <p className="hint mt-1 break-all">{a.width}×{a.height} · {(a.byteSize / 1024).toFixed(0)} {tr("KB · sha256")}{a.sha256.slice(0, 10)}{tr("… (copy received, not proof of event)")}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.removalRequestedAt && <Removal id={id} at={data.removalRequestedAt} />}
        </Panel>
        <Thread id={id} messages={data.messages} />
        <Related id={id} />
        <Notes id={id} notes={data.notes} />
      </div>
      <div className="grid gap-4">
        <Assessment id={id} />
        <Evidence id={id} evidence={data.evidence} />
        <ExpertPacket id={id} existing={data.expertRequests.map((x) => x.id)} />
        <Risk id={id} links={data.riskLinks} />
        <Panel title={tr("Decision history")}>
          {data.history.length === 0 ? <p className="hint">{tr("No actions recorded in this session.")}</p> :
            <ul className="grid gap-1 text-[0.95rem]">{data.history.map((h) => <li key={h.id}>{fmtTime(h.at)} · {store.staff(h.actorId)?.name ?? h.actorId} · {h.action} · {h.outcome}</li>)}</ul>}
          <p className="hint mt-2">{tr("Audit entries record actor, action and target only — never report text or codes.")}</p>
        </Panel>
      </div>
    </div>
  );
}

function Assessment({ id }: { id: string }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const me = store.actorId;
  const r = store.getReport(me, id).report;
  const [summary, setSummary] = useState(r.redactedSummary);
  const [msg, setMsg] = useState(r.statusMessage ?? "");
  const { act, Status } = useAct();
  return (
    <Panel title={tr("Assessment")}>
      <ol className="grid gap-5">
        <li>
          <p className="label">{tr("1. Within humanitarian scope?")}</p>
          <div className="flex gap-2 mt-2">
            <button className="choice !min-h-11" aria-pressed={r.evidenceState !== "outside_scope"} onClick={() => act(() => store.updateReport(me, id, { evidenceState: r.evidenceState === "outside_scope" ? "unassessed" : r.evidenceState }))}>{tr("In scope")}</button>
            <button className="choice !min-h-11" aria-pressed={r.evidenceState === "outside_scope"} onClick={() => act(() => store.updateReport(me, id, { evidenceState: "outside_scope" }))}>{tr("Outside scope")}</button>
          </div>
        </li>
        <li>
          <p className="label">{tr("2. Restricted handling needed?")}</p>
          <p className="hint">{tr("Check every report, including ordinary-looking ones. Keyword flags are only an aid.")}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button className="choice !min-h-11" aria-pressed={r.sensitivity === "standard"} onClick={() => act(() => store.updateReport(me, id, { sensitivity: "standard" }))}>{tr("Standard")}</button>
            <button className="choice !min-h-11" aria-pressed={r.sensitivity === "restricted"} onClick={() => act(() => store.updateReport(me, id, { sensitivity: "restricted" }))}>{tr("Restricted")}</button>
            <button className="choice !min-h-11" aria-pressed={r.urgent} onClick={() => act(() => store.updateReport(me, id, { urgent: !r.urgent }))}>{tr("Priority flag")}</button>
          </div>
        </li>
        <li>
          <label htmlFor="rs" className="label">{tr("3. Reported claim — redacted summary")}</label>
          <p className="hint">{tr("Remove names, exact places and identifying circumstances. This is what experts and drafts may use.")}</p>
          <textarea id="rs" rows={3} className="field mt-2" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => store.updateReport(me, id, { redactedSummary: summary }))}>{tr("Save summary")}</button>
        </li>
        <li><p className="label">{tr("4. Supporting or conflicting information")}</p><p className="hint">{tr("Record it in Evidence below.")}</p></li>
        <li><p className="label">{tr("5. Expert context needed?")}</p><p className="hint">{tr("Use Expert check below.")}</p></li>
        <li>
          <p className="label">{tr("6. Next step")}</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <label className="grid gap-1"><span className="hint">{tr("Processing state")}</span>
              <select className="field" value={r.processingState} onChange={(e) => act(() => store.updateReport(me, id, { processingState: e.target.value as ProcessingState }))}>
                {(Object.keys(PROCESSING_LABEL) as ProcessingState[]).filter((s) => s !== "removal_requested" || r.processingState === s).map((s) => <option key={s} value={s} disabled={s === "removal_requested"}>{tr(PROCESSING_LABEL[s])}</option>)}
              </select>
            </label>
            <label className="grid gap-1"><span className="hint">{tr("Evidence state")}</span>
              <select className="field" value={r.evidenceState} onChange={(e) => act(() => store.updateReport(me, id, { evidenceState: e.target.value as EvidenceState }))}>
                {(Object.keys(EVIDENCE_LABEL) as EvidenceState[]).map((s) => <option key={s} value={s}>{tr(EVIDENCE_LABEL[s])}</option>)}
              </select>
            </label>
          </div>
          <label htmlFor="sm" className="hint block mt-3">{tr("Contributor-facing explanation (optional)")}</label>
          <input id="sm" className="field mt-1" value={msg} placeholder={tr("We could not confirm this information from the sources available.")} onChange={(e) => setMsg(e.target.value)} />
          <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => store.updateReport(me, id, { statusMessage: msg }))}>{tr("Save explanation")}</button>
        </li>
      </ol>
      <Status />
    </Panel>
  );
}

function Thread({ id, messages }: { id: string; messages: { id: string; sender: string; text: string; createdAt: string }[] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const [text, setText] = useState("");
  const [ask, setAsk] = useState(true);
  const { act, Status } = useAct();
  return (
    <Panel title={tr("Contributor thread")}>
      {messages.length === 0 ? <p className="hint">{tr("No messages.")}</p> : (
        <ul className="grid gap-2 mb-4">{messages.map((m) => (
          <li key={m.id} className={`p-3 rounded-xl ${m.sender === "reviewer" ? "bg-raised" : "border"}`}>
            <p className="hint">{m.sender === "reviewer" ? "Review team" : "Contributor"} · {fmtTime(m.createdAt)}</p>
            <p className="whitespace-pre-wrap break-words">{m.text}</p>
          </li>))}
        </ul>
      )}
      <p className="hint mb-2">{tr("Ask short, purposeful questions. Never ask for ID, more footage, or to follow anyone. Don’t promise help.")}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">{REPLY_TEMPLATES.map((tpl) => <button key={tpl} className="chip hover:text-foreground" onClick={() => setText(tpl)}>{tpl.slice(0, 38)}…</button>)}</div>
      <label htmlFor="rep" className="sr-only">{tr("Reply")}</label>
      <textarea id="rep" rows={3} maxLength={600} className="field" value={text} onChange={(e) => setText(e.target.value)} />
      <label className="flex items-center gap-2 mt-2 text-[0.95rem]"><input type="checkbox" className="h-5 w-5" checked={ask} onChange={(e) => setAsk(e.target.checked)} /> {tr("This asks for more information")}</label>
      <button className="btn btn-primary btn-sm mt-3" disabled={!text.trim()} onClick={() => act(() => { store.sendReply(store.actorId, id, text, ask); setText(""); }, "Reply sent to the contributor’s private thread.")}>{tr("Send reply")}</button>
      <Status />
    </Panel>
  );
}

function Related({ id }: { id: string }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const me = store.actorId;
  const r = store.getReport(me, id).report;
  const sugg = store.duplicateSuggestions(me, id);
  const [ind, setInd] = useState<"known_independent" | "uncertain" | "shared_origin">("uncertain");
  const visible = new Set(store.listReports(me).map((x) => x.id));
  return (
    <Panel title={tr("Related reports and possible duplicates")}>
      {r.relatedIds.length === 0 ? <p className="hint">{tr("No linked reports.")}</p> : (
        <ul className="grid gap-1 mb-3">{r.relatedIds.map((rid) => (
          <li key={rid} className="text-[0.95rem]">
            {visible.has(rid) ? <Link to="/review/reports/$id" params={{ id: rid }} className="text-primary underline">{rid}</Link> : <span>{rid} {tr("(outside your context)")}</span>}
            {tr(" — source independence: ")}<strong>{(r.sourceIndependence[rid] ?? "uncertain").replace("_", " ")}</strong>
          </li>))}
        </ul>
      )}
      <p className="label mt-2">{tr("Suggestions (area, time, topic and wording similarity — suggestions only)")}</p>
      {sugg.length === 0 ? <p className="hint">{tr("No suggestions.")}</p> : (
        <>
          <label className="hint flex items-center gap-2 my-2">{tr("Link as")}<select className="field !w-auto !min-h-11 !py-1" value={ind} onChange={(e) => setInd(e.target.value as typeof ind)}>
              <option value="known_independent">{tr("Known independent")}</option><option value="uncertain">{tr("Independence uncertain")}</option><option value="shared_origin">{tr("Shared origin")}</option>
            </select>
          </label>
          <ul className="grid gap-2">{sugg.map((s) => (
            <li key={s.id} className="flex gap-2 items-center"><span className="flex-1 text-[0.95rem]">{s.id}: {s.preview}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => store.linkRelated(me, id, s.id, ind)}>{tr("Link")}</button></li>))}
          </ul>
        </>
      )}
      <p className="hint mt-2">{tr("Linking never merges reports; each keeps its own provenance.")}</p>
    </Panel>
  );
}

function Notes({ id, notes }: { id: string; notes: ReviewNote[] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const [text, setText] = useState("");
  const [type, setType] = useState<ReviewNote["type"]>("assessment");
  return (
    <Panel title={tr("Internal notes (never shown to the contributor)")}>
      <ul className="grid gap-2 mb-3">{notes.map((n) => <li key={n.id} className="border rounded-xl p-3"><p className="hint">{n.type} · {store.staff(n.authorId)?.name} · {fmtTime(n.createdAt)}</p><p className="whitespace-pre-wrap">{n.text}</p></li>)}</ul>
      <div className="flex gap-2">
        <select aria-label={tr("Note type")} className="field !w-auto" value={type} onChange={(e) => setType(e.target.value as ReviewNote["type"])}>
          <option value="triage">{tr("Triage")}</option><option value="assessment">{tr("Assessment")}</option><option value="disclosure">{tr("Disclosure")}</option><option value="analyst">{tr("Analyst")}</option>
        </select>
        <input aria-label={tr("Note")} className="field" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button className="btn btn-secondary btn-sm mt-2" disabled={!text.trim()} onClick={() => { store.addNote(store.actorId, id, type, text); setText(""); }}>{tr("Add note")}</button>
    </Panel>
  );
}

function Evidence({ id, evidence }: { id: string; evidence: ReturnType<ReturnType<typeof useWhispers>["store"]["getReport"]>["evidence"] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const blank = { source: "", claim: "", supports: "supports" as const, independence: "uncertain" as const, rationale: "", date: "", publicUrl: "" };
  const [f, setF] = useState<{ source: string; claim: string; supports: "supports" | "contradicts"; independence: "known_independent" | "uncertain" | "shared_origin"; rationale: string; date: string; publicUrl: string }>(blank);
  const { act, Status } = useAct();
  return (
    <Panel title={tr("Evidence")}>
      <ul className="grid gap-2 mb-3">{evidence.map((e) => (
        <li key={e.id} className="border rounded-xl p-3 text-[0.95rem]">
          <p><strong>{e.supports === "supports" ? "Supports" : "Contradicts"}:</strong> {e.claim}</p>
          <p className="hint">{tr("Source:")}{e.source} · {e.independence.replace("_", " ")} · {e.date || "no date"} · {store.staff(e.authorId)?.name} {fmtTime(e.createdAt)}</p>
          {e.rationale && <p className="hint">{tr("Rationale:")}{e.rationale}</p>}
        </li>))}
      </ul>
      <div className="grid gap-2">
        <input aria-label={tr("Source")} placeholder={tr("Source or note")} className="field" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
        <input aria-label={tr("What it supports or contradicts")} placeholder={tr("What it supports or contradicts")} className="field" value={f.claim} onChange={(e) => setF({ ...f, claim: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label={tr("Direction")} className="field" value={f.supports} onChange={(e) => setF({ ...f, supports: e.target.value as "supports" })}><option value="supports">{tr("Supports")}</option><option value="contradicts">{tr("Contradicts")}</option></select>
          <select aria-label={tr("Independence")} className="field" value={f.independence} onChange={(e) => setF({ ...f, independence: e.target.value as "uncertain" })}><option value="known_independent">{tr("Independent")}</option><option value="uncertain">{tr("Uncertain")}</option><option value="shared_origin">{tr("Shared origin")}</option></select>
        </div>
        <input aria-label={tr("Relevant date")} type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input aria-label={tr("Rationale and remaining uncertainty")} placeholder={tr("Rationale and remaining uncertainty")} className="field" value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} />
      </div>
      <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => { store.addEvidence(store.actorId, id, { ...f, publicUrl: f.publicUrl || undefined }); setF(blank); }, "Evidence recorded.")}>{tr("Record evidence")}</button>
      <Status />
    </Panel>
  );
}

function ExpertPacket({ id, existing }: { id: string; existing: string[] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const r = store.getReport(store.actorId, id).report;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ context: `Fictional pilot area — ${WORKSPACE_LABEL[r.workspaceId]}`, claim: r.redactedSummary, period: "Approximate: " + TIME_LABEL[r.eventTimeBucket].toLowerCase(), materials: "", question: "" });
  const [includeRelated, setIncludeRelated] = useState(false);
  const { act, Status } = useAct();
  return (
    <Panel title={tr("Expert check")}>
      {existing.length > 0 && <p className="mb-2 text-[0.95rem]">{tr("Linked checks:")}{existing.map((x) => <Link key={x} to="/review/expert-requests" className="text-primary underline mr-2">{x}</Link>)}</p>}
      {!open ? <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>{tr("Prepare redacted packet")}</button> : (
        <div className="grid gap-2">
          <p className="hint">{tr("Experts see only these fields. No code, original text, conversation, exact location or raw photos.")}</p>
          {(["context", "claim", "period", "materials", "question"] as const).map((k) => (
            <label key={k} className="grid gap-1"><span className="hint capitalize">{k === "materials" ? "Approved context / public material" : k}</span>
              <textarea rows={k === "claim" || k === "question" ? 3 : 1} className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
          ))}
          {r.relatedIds.length > 0 && <label className="flex gap-2 items-center text-[0.95rem]"><input type="checkbox" className="h-5 w-5" checked={includeRelated} onChange={(e) => setIncludeRelated(e.target.checked)} /> {tr("Include linked reports in this check")}</label>}
          {r.sensitivity === "restricted" && <p className="text-warning">{tr("⚠ Restricted report: keep the packet to civilian impact only.")}</p>}
          <button className="btn btn-primary btn-sm" onClick={() => act(() => { store.createExpertRequest(store.actorId, { ...f, reportIds: includeRelated ? [id, ...r.relatedIds] : [id] }); setOpen(false); }, "Expert check sent to assigned context experts.")}>{tr("Send to assigned experts")}</button>
        </div>
      )}
      <Status />
    </Panel>
  );
}

function Risk({ id, links }: { id: string; links: { id: string; riskId: string; trigger: string; decision: string; rationale: string }[] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const [f, setF] = useState({ trigger: DEMO_RISK.triggers[0]!, implication: "", decision: "Monitor", rationale: "" });
  const { act, Status } = useAct();
  return (
    <Panel title={tr("Risk link (illustrative)")}>
      <p className="hint mb-2">{DEMO_RISK.id}: {DEMO_RISK.title}{tr(". Internal example record — no external system is connected or changed, and no rating changes automatically.")}</p>
      {links.map((l) => <p key={l.id} className="border rounded-xl p-3 mb-2 text-[0.95rem]">{l.riskId} · {l.trigger} {tr("· Decision:")}{l.decision} — {l.rationale}</p>)}
      <div className="grid gap-2">
        <select aria-label={tr("Trigger")} className="field" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })}>{DEMO_RISK.triggers.map((x) => <option key={x}>{x}</option>)}</select>
        <input aria-label={tr("Possible humanitarian implication")} placeholder={tr("Possible humanitarian implication")} className="field" value={f.implication} onChange={(e) => setF({ ...f, implication: e.target.value })} />
        <select aria-label={tr("Decision")} className="field" value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })}><option>{tr("Monitor")}</option><option>{tr("Relevant to trigger")}</option><option>{tr("Not relevant")}</option></select>
        <input aria-label={tr("Analyst rationale")} placeholder={tr("Analyst rationale (required)")} className="field" value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} />
      </div>
      <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => store.addRiskLink(store.actorId, id, f), "Linked to illustrative risk.")}>{tr("Link to")}{DEMO_RISK.id}</button>
      <Status />
    </Panel>
  );
}

function Removal({ id, at }: { id: string; at: string }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const isAdmin = store.staff(store.actorId)?.roles.includes("admin");
  const { act, Status } = useAct();
  return (
    <div className="mt-4 border border-warning/60 rounded-xl p-4">
      <p className="font-semibold text-warning">{tr("Removal requested")}{fmtTime(at)}</p>
      <p className="hint">{tr("Completing removal deletes the text, messages, notes and photos from the app and revokes the private code. Backups and any published summary are handled separately.")}</p>
      {isAdmin ? <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => store.completeRemoval(store.actorId, id), "Removed.")}>{tr("Complete removal")}</button> : <p className="hint mt-2">{tr("An administrator completes removal.")}</p>}
      <Status />
    </div>
  );
}
