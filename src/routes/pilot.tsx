import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { NeonReviewerWorkspace } from "@/components/whispers/NeonReviewerWorkspace";
import { DEMO_ONLY_BUILD } from "@/lib/whispers/context";

const LegacyPilot = lazy(() =>
  import("@/components/whispers/LegacyPilot").then(({ LegacyPilot: Component }) => ({ default: Component })),
);

export const Route = createFileRoute("/pilot")({
  head: () => ({
    meta: [
      { title: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Owner-run demo — Whispers" : "Connected pilot — Whispers" },
      { name: "description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Fictional browser-only demonstration. No connected services or staff sign-in." : "Owner-run staging workspace for fictional test records only. Real intake is disabled." },
      { property: "og:title", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Owner-run demo — Whispers" : "Connected pilot — Whispers" },
      { property: "og:description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Fictional browser-only demonstration. No connected services or staff sign-in." : "Owner-run staging workspace for fictional test records only. Real intake is disabled." },
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

  if (import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon") {
    return <CitizenShell sensitive><h1>Connected fictional pilot</h1><p className="card p-4 mt-4">This is an owner-run demonstration. The account owner is the temporary operator. Only fictional test reports are accepted in this connected staging workspace; real-information intake is disabled. All other staff, reports, and review outcomes shown in the demo are fictional.</p><NeonReviewerWorkspace /></CitizenShell>;
  }

  return (
    <Suspense fallback={<p role="status">Loading pilot workspace…</p>}>
      <LegacyPilot />
    </Suspense>
  );
}
