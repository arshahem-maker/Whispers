import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/whispers/Brand";
import { DEMO_MODE, useWhispers } from "@/lib/whispers/context";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/review/sign-in")({
  head: () => ({
    meta: [
      { title: "Staff sign-in — Whispers" },
      { name: "description", content: "Sign-in for authorised Whispers reviewers and invited experts." },
      { property: "og:title", content: "Staff sign-in — Whispers" },
      { property: "og:description", content: "Sign-in for authorised reviewers and experts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  useTranslationVersion();
  const { store } = useWhispers();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const signIn = async (provider: "google" | "lovable") => {
    setError("");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/pilot` });
    if (result.error) setError(result.error.message);
    else if (!result.redirected) await navigate({ to: "/pilot" });
  };
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Wordmark />
        <h1 className="mt-6 text-2xl">{tr("Staff sign-in")}</h1>
        <div className="card p-5 mt-5">
          <p className="font-semibold">{tr("Connected pilot staff sign-in")}</p>
          <div className="grid gap-2 mt-4"><Button onClick={() => void signIn("google")}>{tr("Sign in with Google")}</Button><Button variant="secondary" onClick={() => void signIn("lovable")}>{tr("Sign in with Lovable")}</Button></div>
          {error && <p role="alert" className="text-destructive mt-3">{error}</p>}
          <Link to="/pilot" className="text-primary underline mt-3 inline-block">{tr("Open connected pilot")}</Link>
          <p className="hint mt-2">{tr("A connected deployment uses server-verified accounts, administrator-provisioned roles and multi-factor authentication. Nobody can give themselves reviewer or admin access.")}</p>
        </div>
        {DEMO_MODE && (
          <div className="card p-5 mt-4">
            <h2 className="label mb-3">{tr("Continue as a fictional demo role")}</h2>
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
