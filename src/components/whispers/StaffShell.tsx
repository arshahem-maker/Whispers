import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "./Brand";
import { DEMO_MODE, useWhispers } from "@/lib/whispers/context";
import type { Role } from "@/lib/whispers/types";
import { LanguageButton } from "./LanguagePicker";

export function StaffShell({ children, need, title }: { children: ReactNode; need: Role; title: string }) {
  useTranslationVersion();
  const { store } = useWhispers();
  const me = store.staff(store.actorId);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const allowed = !!me && me.roles.includes(need);
  const nav = need === "expert"
    ? [{ to: "/expert/assignments" as const, label: tr("Assignments") }]
    : [
        { to: "/review/reports" as const, label: tr("Inbox") },
        { to: "/review/expert-requests" as const, label: tr("Expert checks") },
        { to: "/review/updates" as const, label: tr("Updates") },
        ...(me?.roles.includes("admin") ? [{ to: "/review/settings" as const, label: tr("Settings") }] : []),
      ];
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to={need === "expert" ? "/expert/assignments" : "/review/reports"} className="flex items-center gap-2">
            <Wordmark /><span className="chip">{tr(need === "expert" ? "Expert" : "Review")}</span>
          </Link>
          {allowed && (
            <nav aria-label={tr("Workspace")} className="flex gap-1 flex-wrap">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} aria-current={path.startsWith(n.to) ? "page" : undefined}
                  className={`px-3 min-h-11 inline-flex items-center rounded-xl text-[0.95rem] ${path.startsWith(n.to) ? "bg-raised text-primary" : "text-muted-foreground hover:text-foreground"}`}>{tr(n.label)}</Link>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <LanguageButton compact />
            {DEMO_MODE && <Link to="/about" className="text-primary underline">{tr("Demo controls")}</Link>}
            {DEMO_MODE && <Link to="/" className="text-primary underline">{tr("Citizen view")}</Link>}
            {me && <span className="text-muted-foreground">{me.name}</span>}
            {me && <button className="btn btn-secondary btn-sm" onClick={() => store.setDemoActor(null)}>{tr("Sign out")}</button>}
          </div>
        </div>
        {DEMO_MODE && <div className="bg-warning/15 text-warning text-sm text-center py-1.5 px-4">{tr("Demo workspace — all reports, people and outcomes are fictional.")}</div>}
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        {allowed ? (<><h1 className="mb-6">{tr(title)}</h1>{children}</>) : (
          <div className="card p-6 max-w-lg">
            <h1 className="text-2xl">{tr("Access required")}</h1>
            <p className="mt-2 text-muted-foreground">{tr("This area is for")}{need === "expert" ? "invited experts" : need === "admin" ? "administrators" : "authorised reviewers"}{tr(". Your current role cannot open it.")}</p>
            <Link to="/review/sign-in" className="btn btn-primary mt-4">{tr("Go to sign-in")}</Link>
          </div>
        )}
      </main>
    </div>
  );
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
