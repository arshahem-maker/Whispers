import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StaffShell } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";
import { Panel, useAct } from "@/components/whispers/Panel";

export const Route = createFileRoute("/review/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Whispers review" },
      { name: "description", content: "Operator settings and real-data readiness." },
      { property: "og:title", content: "Settings — Whispers review" },
      { property: "og:description", content: "Operator settings and real-data readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="admin" title={tr("Settings")}><Settings /></StaffShell>,
});

const READINESS: [string, boolean][] = [
  ["Operating organisation, contact and reporting purpose configured", false],
  ["Connected backend with server-side intake, receipt hashing and role checks", false],
  ["Staff accounts provisioned by an administrator, with MFA", false],
  ["Private storage with server-side image validation, re-processing and quarantine", false],
  ["Scheduled retention cleanup running on the server", false],
  ["Hosting/network logging reviewed and documented", false],
  ["Context-specific threat assessment", false],
  ["Independent security review", false],
  ["Native-speaker review of safety and consent wording", false],
  ["Synthetic demo provider (fictional data, in-memory)", true],
];

function Settings() {
  useTranslationVersion();
  const { store } = useWhispers();
  const [clock, setClock] = useState("2026-12-07");
  const [removed, setRemoved] = useState<string[] | null>(null);
  const { act, Status } = useAct();
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Panel title={tr("Real-data readiness")}>
        <p className="mb-3"><strong>{tr("Real-data intake: disabled.")}</strong> {tr("This build only runs the synthetic demonstration.")}</p>
        <ul className="grid gap-1.5">{READINESS.map(([l, ok]) => <li key={l} className="flex gap-2"><span aria-hidden>{ok ? "✓" : "○"}</span><span className={ok ? "" : "text-muted-foreground"}>{l} — {ok ? "done" : "not done"}</span></li>)}</ul>
      </Panel>
      <Panel title={tr("Operation")}>
        <dl className="grid grid-cols-2 gap-2 text-[0.95rem]">
          <dt className="hint">{tr("Operating organisation")}</dt><dd>{tr("Whispers (private company) — CEO: Arsh Ahmed. Contact not yet set.")}</dd>
          <dt className="hint">{tr("Contexts")}</dt><dd>{tr("Ukraine, Eastern Chad (demo)")}</dd>
          <dt className="hint">{tr("Languages")}</dt><dd>{tr("English")}</dd>
          <dt className="hint">{tr("AI assistance")}</dt><dd>{tr("Disabled")}</dd>
        </dl>
        <p className="mt-4 label">{tr("Demo intake:")}{store.state.intakeOpen ? "open" : "paused"}</p>
        <button className="btn btn-secondary btn-sm mt-2" onClick={() => act(() => store.setIntake(store.actorId, !store.state.intakeOpen))}>{store.state.intakeOpen ? "Pause intake" : "Resume intake"}</button>
        <Status />
      </Panel>
      <Panel title={tr("Staff and contexts")}>
        <ul className="grid gap-1 text-[0.95rem]">{store.state.staff.map((s) => <li key={s.id}>{s.name} — {s.roles.join(", ")} — {s.contexts.join(", ")}</li>)}</ul>
        <p className="hint mt-2">{tr("In a connected build, roles are granted only through an administrative process and checked on the server.")}</p>
      </Panel>
      <Panel title={tr("Retention (proposed defaults)")}>
        <ul className="grid gap-1 text-[0.95rem] list-disc pl-5">
          <li>{tr("Raw private reports: review after 30 days for deletion or documented extension.")}</li>
          <li>{tr("Abandoned uploads: remove within 24 hours.")}</li>
          <li>{tr("Follow-up access: expires with the report.")}</li>
          <li>{tr("Sanitised analytical records: separate policy.")}</li>
        </ul>
        <p className="hint mt-2">{tr("Automatic deletion is")}<strong>{tr("not scheduled")}</strong> {tr("in this build. Run a sweep against a test date:")}</p>
        <div className="flex gap-2 mt-2">
          <input aria-label={tr("Test date")} type="date" className="field" value={clock} onChange={(e) => setClock(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => act(() => setRemoved(store.runRetention(store.actorId, new Date(clock))))}>{tr("Run sweep")}</button>
        </div>
        {removed && <p className="mt-2">{removed.length} {tr("report(s) removed and their codes revoked.")}</p>}
      </Panel>
      <Panel title={tr("Audit trail")}>
        <ul className="grid gap-1 text-sm max-h-80 overflow-auto">{store.state.audit.slice(0, 50).map((a) => <li key={a.id}>{a.at.slice(0, 19)} · {a.actorId} · {a.action} · {a.targetId} · {a.outcome}</li>)}</ul>
      </Panel>
    </div>
  );
}
