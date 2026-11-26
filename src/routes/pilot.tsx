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
      { title: "Connected fictional pilot — Whispers" },
      { name: "description", content: "Verify connected report storage and staff workflows with fictional information only." },
      { property: "og:title", content: "Connected fictional pilot — Whispers" },
      { property: "og:description", content: "Fictional-only connected report and review testing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pilot,
});

function Pilot() {
  if (import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon") {
    return <CitizenShell sensitive><h1>Connected fictional pilot</h1><NeonReviewerWorkspace /></CitizenShell>;
  }

  return (
    <Suspense fallback={<p role="status">Loading pilot workspace…</p>}>
      <LegacyPilot />
    </Suspense>
  );
}
