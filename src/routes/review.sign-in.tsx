import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/whispers/Brand";
import { DEMO_CONTROLS_ENABLED, DEMO_ONLY_BUILD } from "@/lib/whispers/context";
import { useWhispers } from "@/lib/whispers/use-whispers";

export const Route = createFileRoute("/review/sign-in")({
  head: () => ({
    meta: [
      { title: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Demo reviewer roles — Whispers" : "Staff sign-in — Whispers" },
      { name: "description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Choose a fictional reviewer role for the owner-run demonstration." : "Sign-in for authorised Whispers reviewers and invited experts." },
      { property: "og:title", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Demo reviewer roles — Whispers" : "Staff sign-in — Whispers" },
      { property: "og:description", content: import.meta.env["VITE_WHISPERS_DEMO_ONLY"] === "true" ? "Choose a fictional reviewer role for the owner-run demonstration." : "Sign-in for authorised reviewers and experts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    if (import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon") throw redirect({ to: "/pilot" });
  },
  component: SignIn,
});

function SignIn() {
  useTranslationVersion();
  const { store } = useWhispers();
  const navigate = useNavigate();
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Wordmark />
        <h1 className="mt-6 text-2xl">{tr(DEMO_ONLY_BUILD ? "Demo reviewer roles" : "Staff sign-in")}</h1>
        {DEMO_CONTROLS_ENABLED && (
          <div className="card p-5 mt-4">
            <h2 className="label mb-3">{tr(DEMO_ONLY_BUILD ? "Choose a fictional reviewer role for this demo" : "Continue as a fictional demo role")}</h2>
            {DEMO_ONLY_BUILD && <p className="hint mb-3">{tr("This isolated preview does not connect to staff sign-in or an external database. The project owner can simulate these fictional roles.")}</p>}
            <div className="grid gap-2">
              {store.state.staff.filter((s) => !s.roles.includes("expert") || s.id === "ex-4").map((s) => (
                <button key={s.id} className="choice" onClick={() => { store.setDemoActor(s.id); navigate({ to: s.roles.includes("expert") ? "/expert/assignments" : "/review/reports" }); }}>
                  <span className="flex-1">{s.name}</span><span className="chip">{s.roles.join(" + ")}</span>
                </button>
              ))}
            </div>
            <Link to="/about" className="btn-ghost !px-0 mt-3 inline-flex">{tr("All demo controls")}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
