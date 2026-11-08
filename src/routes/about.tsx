import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { DEMO_MODE, useWhispers } from "@/lib/whispers/context";
import { groupCode } from "@/lib/whispers/crypto";
import { FIXTURE_CODES } from "@/lib/whispers/demo-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About and demo controls — Whispers" },
      { name: "description", content: "About Whispers and controls for the fictional demonstration." },
      { property: "og:title", content: "About — Whispers" },
      { property: "og:description", content: "About Whispers and the fictional demonstration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: About,
});

function About() {
  useTranslationVersion();
  const { store } = useWhispers();
  if (!DEMO_MODE) return <CitizenShell><h1>{tr("About")}</h1></CitizenShell>;
  const me = store.staff(store.actorId);
  return (
    <CitizenShell>
      <h1>{tr("Demo controls")}</h1>
      <p className="mt-2 text-muted-foreground">{tr("For presenters. Switch fictional roles and simulate conditions. This panel exists only with the synthetic demo provider; a connected build has no client-side role switch.")}</p>

      <section className="card p-5 mt-6">
        <h2 className="mb-3">{tr("Role")}</h2>
        <p className="hint mb-3">{tr("Current:")}{me ? me.name : "Citizen (no staff role)"}</p>
        <div className="grid gap-2">
          <button className="choice" aria-pressed={!me} onClick={() => store.setDemoActor(null)}>{tr("Citizen (no staff role)")}</button>
          {store.state.staff.map((s) => (
            <button key={s.id} className="choice" aria-pressed={store.actorId === s.id} onClick={() => store.setDemoActor(s.id)}>
              <span className="flex-1">{s.name}</span><span className="chip">{s.roles.join("+")} · {s.contexts.join(",")}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/review/reports" className="btn btn-secondary btn-sm">{tr("Open review workspace")}</Link>
          <Link to="/expert/assignments" className="btn btn-secondary btn-sm">{tr("Open expert workspace")}</Link>
        </div>
      </section>

      <section className="card p-5 mt-4">
        <h2 className="mb-3">{tr("Simulate conditions")}</h2>
        <div className="grid gap-2">
          {([["normal", "Normal sending"], ["fail", "Next send fails (draft kept)"], ["timeout_after_accept", "Next send times out after the server accepted it"]] as const).map(([v, l]) => (
            <button key={v} className="choice" aria-pressed={store.network === v} onClick={() => { store.network = v; store.setDemoActor(store.actorId); }}>{l}</button>
          ))}
          <button className="choice" aria-pressed={store.photoSim === "fail_next"} onClick={() => { store.photoSim = store.photoSim === "fail_next" ? "normal" : "fail_next"; store.setDemoActor(store.actorId); }}>
            {tr("Next photo fails processing")}</button>
        </div>
      </section>

      <section className="card p-5 mt-4">
        <h2 className="mb-2">{tr("Fictional fixture codes")}</h2>
        <p className="hint mb-3">{tr("Private codes for two example reports, so presenters can open them. Real codes are never displayed anywhere but to the person who sent the report.")}</p>
        <p className="label">{tr("Awaiting a contributor reply")}</p>
        <p className="font-mono break-all mb-3">{groupCode(FIXTURE_CODES["rp-03"]!)}</p>
        <p className="label">{tr("Removal requested")}</p>
        <p className="font-mono break-all">{groupCode(FIXTURE_CODES["rp-11"]!)}</p>
      </section>

      <section className="card p-5 mt-4">
        <h2 className="mb-2">{tr("Reset")}</h2>
        <p className="hint mb-3">{tr("Demo data is held in this tab’s memory. Refreshing the page or pressing reset restores the original fictional dataset and discards new reports.")}</p>
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.assign("/about")}>{tr("Reset demo")}</button>
      </section>
    </CitizenShell>
  );
}
