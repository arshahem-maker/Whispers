import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { NeonReviewerWorkspace } from "@/components/whispers/NeonReviewerWorkspace";

const LegacyPilot = lazy(() =>
  import("@/components/whispers/LegacyPilot").then(({ LegacyPilot: Component }) => ({ default: Component })),
);

export const Route = createFileRoute("/pilot")({
  head: () => ({
    meta: [
      { title: "Connected pilot — Whispers" },
      { name: "description", content: "Connected report storage and authorized staff workflows." },
      { property: "og:title", content: "Connected pilot — Whispers" },
      { property: "og:description", content: "Connected report storage and authorized staff workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pilot,
});

function Pilot() {
  if (import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon") {
    return <CitizenShell sensitive><h1>Connected pilot</h1><p className="card p-4 mt-4">This is a restricted staging demonstration. Real-information intake is available only to one authorized account. Submissions are private but unmonitored; there is no response or emergency service. Do not use this page to submit sensitive or urgent information.</p><NeonReviewerWorkspace /></CitizenShell>;
  }

  return (
    <Suspense fallback={<p role="status">Loading pilot workspace…</p>}>
      <LegacyPilot />
    </Suspense>
  );
}
