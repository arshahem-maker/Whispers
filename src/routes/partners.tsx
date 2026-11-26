import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "For humanitarian organizations — Whispers" },
      { name: "description", content: "Discuss an early-stage Whispers prototype evaluation. It is not an operational reporting or emergency response service." },
      { property: "og:title", content: "For humanitarian organizations — Whispers" },
      { property: "og:description", content: "Discuss an early-stage Whispers prototype evaluation. It is not an operational reporting or emergency response service." },
    ],
  }),
  component: Partners,
});

function Partners() {
  const subject = encodeURIComponent("Whispers prototype evaluation");
  const connectedStaging = import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon";
  return (
    <CitizenShell>
      <h1>{"For humanitarian organizations"}</h1>
      <p className="mt-3 text-muted-foreground">
        Whispers is an early-stage prototype exploring private reporting and review workflows. We are looking to speak with humanitarian organizations and companies about whether this approach could be useful, safe, and workable in practice.
      </p>

      <section className="card p-5 mt-6" aria-labelledby="status-title">
        <h2 id="status-title">Current status</h2>
        <ul className="mt-3 grid gap-2 list-disc pl-5">
          <li>This is an owner-run demonstration. The account owner is the temporary presenter and operator.</li>
          <li>All demonstration reports, people, staff, and review outcomes are fictional. {connectedStaging ? "Connected fictional test reports are stored in private staging." : "New reports stay in this browser tab and are discarded when the demo is reset or refreshed."}</li>
          <li>Reviewer and expert roles are simulated in the owner-run demo; they do not represent independent people or real approvals.</li>
          {connectedStaging && <li>Connected staging access is limited to one authorized account and is not open to partner organizations or the public.</li>}
          <li>No live humanitarian team monitors these demonstrations or promises a response.</li>
          <li>This is not an emergency, protection, or aid-delivery channel. Do not submit real case details, names, exact locations, photos, or urgent requests.</li>
          <li>No organization partnership or endorsement is implied.</li>
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="discuss-title">
        <h2 id="discuss-title">Discuss an evaluation</h2>
        <p className="mt-2">A conversation can cover intended users, safe operating arrangements, language needs, data protection, and what evidence an organization would need before considering a pilot.</p>
        <p className="hint mt-3">Please do not include personal, case, or other sensitive information in an email.</p>
        <a className="btn btn-primary w-full mt-4" href={`mailto:arshahem@gmail.com?subject=${subject}`}>
          Email about a partner evaluation
        </a>
      </section>

      <Link to="/help" className="btn-ghost mt-5 inline-flex">Read the current privacy and safety information</Link>
    </CitizenShell>
  );
}
