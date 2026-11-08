import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { Wordmark } from "@/components/whispers/Brand";
import { t } from "@/lib/whispers/i18n";
import { VoiceRecorder } from "@/components/whispers/VoiceRecorder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Whispers — Share what’s happening around you" },
      { name: "description", content: "Send a private report to a humanitarian review team. No name or account required." },
      { property: "og:title", content: "Whispers — Share what’s happening around you" },
      { property: "og:description", content: "Send a private report to a humanitarian review team. No name or account required." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  useTranslationVersion();
  return (
    <CitizenShell>
      <section className="pt-4">
        <div className="flex flex-col items-center text-center py-6">
          <Wordmark large />
          <h1 className="mt-8 text-xl">{t("home.title")}</h1>
          <p className="mt-10 text-muted-foreground text-base max-w-sm">{t("home.lede")}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <Link to="/report" className="btn btn-primary btn-sm w-full">{t("home.make")}</Link>
          <VoiceRecorder />
          <Link to="/check" className="btn btn-secondary btn-sm w-full">{t("home.check")}</Link>
        </div>
        <ol className="mt-6 grid gap-2.5 text-sm">
          {[t("home.step1"), t("home.step2"), t("home.step3")].map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-raised text-primary text-sm font-semibold flex items-center justify-center" aria-hidden>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="card mt-6 p-4 text-sm">
          <p className="flex gap-2.5"><ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden />{t("home.privacy")}</p>
          <Link to="/help" hash="privacy" className="btn-ghost inline-flex items-center !px-0 !min-h-0 mt-1 text-sm">{t("home.privacyLink")}</Link>
        </div>
        <p className="mt-4 hint text-sm">{t("home.notEmergency")}</p>
      </section>
    </CitizenShell>
  );
}
