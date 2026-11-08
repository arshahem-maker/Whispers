import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, Newspaper, LifeBuoy, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Wordmark } from "./Brand";
import { DEMO_MODE, useWhispers } from "@/lib/whispers/context";
import { t } from "@/lib/whispers/i18n";
import { LanguageButton } from "./LanguagePicker";

export function useLeave() {
  const { wipe } = useWhispers();
  const navigate = useNavigate();
  return () => {
    wipe();
    document.querySelectorAll("dialog[open]").forEach((d) => (d as HTMLDialogElement).close());
    navigate({ to: "/closed", replace: true });
  };
}

export function CitizenShell({ children, sensitive = false, hideNav = false }: { children: ReactNode; sensitive?: boolean; hideNav?: boolean }) {
  useTranslationVersion();
  const leave = useLeave();
  const { connected } = useWhispers();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/" as const, label: t("nav.report"), icon: FileText, active: path === "/" || path.startsWith("/report") || path === "/check" },
    { to: "/updates" as const, label: t("nav.updates"), icon: Newspaper, active: path === "/updates" },
    { to: "/help" as const, label: t("nav.help"), icon: LifeBuoy, active: path === "/help" || path === "/about" },
  ];
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between gap-3">
          <Link to="/" aria-label={tr("Whispers home")}><Wordmark /></Link>
          <div className="flex items-center gap-2">
            <LanguageButton compact tiny />
            {sensitive && (
              <button onClick={leave} className="btn btn-secondary btn-sm" aria-label={t("header.leave")}>
                <LogOut className="h-4 w-4" aria-hidden /> {t("header.leave")}
              </button>
            )}
          </div>
        </div>
        {DEMO_MODE && (
          <div className="bg-warning/15 text-warning text-sm text-center py-1.5 px-4">{connected ? tr("Connected pilot — fictional data only. Real-source intake remains disabled.") : t("demo.banner")}</div>
        )}
      </header>
      <main className={`flex-1 mx-auto w-full max-w-xl px-5 py-6 ${hideNav ? "pb-8" : "pb-28"}`}>{children}</main>
      {!hideNav && (
        <nav aria-label={t("nav.main")} className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto max-w-xl grid grid-cols-3">
            {items.map(({ to, label, icon: Icon, active }) => (
              <li key={to}>
                <Link to={to} aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 h-16 text-sm font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
