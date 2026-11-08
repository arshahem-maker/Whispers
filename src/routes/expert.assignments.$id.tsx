import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StaffShell } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import type { ExpertChoice } from "@/lib/whispers/types";

export const Route = createFileRoute("/expert/assignments/$id")({
  head: () => ({
    meta: [
      { title: "Expert check — Whispers" },
      { name: "description", content: "Redacted evidence packet." },
      { property: "og:title", content: "Expert check — Whispers" },
      { property: "og:description", content: "Redacted evidence packet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="expert" title={tr("Expert check")}><Packet /></StaffShell>,
});

const CHOICES: [ExpertChoice, string][] = [["consistent", "Consistent with what I know"], ["conflicting", "I have conflicting information"], ["cannot_assess", "I can’t assess this"]];

function Packet() {
  useTranslationVersion();
  const { id } = Route.useParams();
  const { store } = useWhispers();
  const [choice, setChoice] = useState<ExpertChoice | null>(null);
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [err, setErr] = useState<string | null>(null);
  let p;
  try { p = store.getAssignment(store.actorId, id); } catch { return <div className="card p-5">{tr("This check is not assigned to you.")}<Link to="/expert/assignments" className="text-primary underline">{tr("Back")}</Link></div>; }
  return (
    <div className="grid gap-4 max-w-2xl">
      <section className="card p-5">
        <p className="hint">{p.context} · {p.period}</p>
        <h2 className="mt-3">{tr("Claim (redacted)")}</h2><p className="mt-1">{p.claim}</p>
        {p.materials && <><h2 className="mt-4">{tr("Context material")}</h2><p className="mt-1">{p.materials}</p></>}
        <h2 className="mt-4">{tr("Question")}</h2><p className="mt-1">{p.question}</p>
        <p className="hint mt-4">{tr("Your answer adds context; it is not treated as verification.")}</p>
      </section>
      {!p.mine ? (
        <section className="card p-5">
          <div role="radiogroup" aria-label={tr("Your assessment")} className="grid gap-2">
            {CHOICES.map(([v, l]) => <button key={v} role="radio" aria-checked={choice === v} className="choice" onClick={() => setChoice(v)}>{l}</button>)}
          </div>
          <label htmlFor="ex" className="label block mt-4">{tr("Short explanation")}</label>
          <textarea id="ex" rows={4} maxLength={600} className="field mt-1" value={text} onChange={(e) => setText(e.target.value)} />
          <p className="hint text-right">{text.length} / 600</p>
          <label htmlFor="src" className="label block mt-2">{tr("Public source (optional)")}</label>
          <input id="src" className="field mt-1" value={source} onChange={(e) => setSource(e.target.value)} />
          {err && <p role="alert" className="text-destructive mt-2">⚠ {err}</p>}
          <button className="btn btn-primary mt-4" disabled={!choice || !text.trim()} onClick={() => {
            try { store.submitExpertResponse(store.actorId, id, choice!, text, source); setErr(null); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
          }}>{tr("Submit independently")}</button>
          <p className="hint mt-2">{tr("Other experts’ answers are hidden until you submit.")}</p>
        </section>
      ) : (
        <section className="card p-5">
          <p className="label">{tr("Your response:")}{CHOICES.find(([v]) => v === p.mine!.choice)?.[1]}</p>
          <p className="mt-1">{p.mine.explanation}</p>
          {p.aggregate ? (
            <div className="mt-4">
              <p className="label">{tr("Panel overview (anonymised)")}</p>
              <p className="hint">{tr("Consistent")}{p.aggregate.counts.consistent} {tr("· Conflicting")}{p.aggregate.counts.conflicting} {tr("· Can’t assess")}{p.aggregate.counts.cannot_assess}</p>
              <ul className="mt-2 list-disc pl-5 grid gap-1">{p.aggregate.themes.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="hint mt-2">{tr("Shown because")}{p.threshold} {tr("responses were reached. That threshold does not guarantee anonymity.")}</p>
            </div>
          ) : <p className="hint mt-3">{p.responseCount} {tr("of")}{p.threshold} {tr("responses so far. The anonymised overview appears once")}{p.threshold} {tr("experts respond.")}</p>}
        </section>
      )}
    </div>
  );
}
