import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { NeonReviewerWorkspace } from "@/components/whispers/NeonReviewerWorkspace";
import { CONNECTED_BACKEND, DEMO_ONLY_BUILD } from "@/lib/whispers/context";

export const Route = createFileRoute("/pilot")({
  head: () => ({
    meta: [
      { title: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Owner-run demo — Whispers" : "Connected pilot — Whispers" },
      { name: "description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Fictional browser-only demonstration. No connected services or staff sign-in." : "Connected Whispers reporting and review workspace for invited accounts. Intake limits are shown before submission." },
      { property: "og:title", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Owner-run demo — Whispers" : "Connected pilot — Whispers" },
      { property: "og:description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Fictional browser-only demonstration. No connected services or staff sign-in." : "Connected Whispers reporting and review workspace for invited accounts. Intake limits are shown before submission." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pilot,
});

function Pilot() {
  if (DEMO_ONLY_BUILD) {
    return <CitizenShell><h1>Owner-run fictional demo</h1><p className="card p-4 mt-4">This isolated preview does not connect to Neon, Supabase, or staff sign-in. Use fictional roles and records in the demo controls; all saved reports stay in this browser tab.</p><Link className="btn btn-primary mt-5" to="/about">Open demo controls</Link></CitizenShell>;
  }

  if (CONNECTED_BACKEND) {
    return <CitizenShell sensitive><h1>Connected Whispers pilot</h1><p className="card p-4 mt-4">This workspace uses live Neon services and account-based access. Only invited accounts can open the reviewer workspace. The citizen report form checks the current intake mode before it sends anything. Reports are not automatically published, and this is not an emergency response service.</p><NeonReviewerWorkspace /></CitizenShell>;
  }

  return <CitizenShell><h1>Fictional reviewer demonstration</h1><p className="card p-4 mt-4">This browser-only demonstration does not connect to Neon, Lovable Cloud, or a live response team. Use fictional reports and sample roles only.</p><Link className="btn btn-primary mt-5" to="/review/sign-in">Open fictional reviewer roles</Link></CitizenShell>;
}
