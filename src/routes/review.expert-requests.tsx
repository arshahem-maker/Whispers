import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StaffShell, fmtTime } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import { Panel, useAct } from "@/components/whispers/Panel";

export const Route = createFileRoute("/review/expert-requests")({
  head: () => ({
    meta: [
      { title: "Expert checks — Whispers review" },
      { name: "description", content: "Moderate expert-check requests." },
      { property: "og:title", content: "Expert checks — Whispers review" },
      { property: "og:description", content: "Moderate expert-check requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="reviewer" title={tr("Expert checks")}><List /></StaffShell>,
});

const CHOICE = { consistent: "Consistent with what I know", conflicting: "I have conflicting information", cannot_assess: "I can’t assess this" };

function List() {
  useTranslationVersion();
  const { store } = useWhispers();
  const items = store.listExpertRequestsForModerator(store.actorId);
  return (
    <div className="grid gap-4">
      <p className="hint">{tr("Moderator view: you can read individual expert contributions before the peer threshold. Experts cannot see each other’s responses until they submit and the threshold is met. Agreement is context, not verification.")}</p>
      {items.length === 0 && <p className="card p-5">{tr("No expert checks in your contexts.")}</p>}
      {items.map(({ request: x, responses }) => <Item key={x.id} x={x} responses={responses} />)}
    </div>
  );
}

function Item({ x, responses }: { x: ReturnType<ReturnType<typeof useWhispers>["store"]["listExpertRequestsForModerator"]>[number]["request"]; responses: ReturnType<ReturnType<typeof useWhispers>["store"]["listExpertRequestsForModerator"]>[number]["responses"] }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const [text, setText] = useState(x.moderatorInterpretation ?? "");
  const { act, Status } = useAct();
  const counts = { consistent: 0, conflicting: 0, cannot_assess: 0 };
  responses.forEach((r) => counts[r.choice]++);
  return (
    <Panel title={`${x.id} · ${x.state === "open" ? "Open" : "Closed"}`}>
      <p className="hint">{x.context} · {x.period} {tr("· reports")}{x.reportIds.join(", ")}</p>
      <p className="mt-2"><strong>{tr("Claim:")}</strong> {x.claim}</p>
      <p className="mt-1"><strong>{tr("Question:")}</strong> {x.question}</p>
      <p className="mt-3 label">{tr("Responses")}{responses.length} {tr("of")}{x.permittedExpertIds.length} {tr("(peer threshold")}{x.threshold})</p>
      <p className="hint">{tr("Consistent")}{counts.consistent} {tr("· Conflicting")}{counts.conflicting} {tr("· Can’t assess")}{counts.cannot_assess}</p>
      <ul className="grid gap-2 mt-2">{responses.map((r) => (
        <li key={r.id} className="border rounded-xl p-3 text-[0.95rem]">
          <p className="hint">{store.staff(r.expertId)?.name} · {fmtTime(r.submittedAt)}</p>
          <p><strong>{CHOICE[r.choice]}</strong> — {r.explanation}</p>{r.source && <p className="hint">{tr("Source:")}{r.source}</p>}
        </li>))}
      </ul>
      <label htmlFor={`int-${x.id}`} className="label block mt-4">{tr("Analyst interpretation")}</label>
      <textarea id={`int-${x.id}`} rows={3} className="field mt-1" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2 mt-2">
        <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.setInterpretation(store.actorId, x.id, text, false))}>{tr("Save")}</button>
        {x.state === "open" && <button className="btn btn-secondary btn-sm" onClick={() => act(() => store.setInterpretation(store.actorId, x.id, text, true))}>{tr("Save and close check")}</button>}
      </div>
      <Status />
    </Panel>
  );
}
