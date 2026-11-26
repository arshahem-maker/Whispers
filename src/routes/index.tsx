import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { Wordmark } from "@/components/whispers/Brand";
import { t } from "@/lib/whispers/i18n";
import { CONNECTED_BACKEND, DEMO_CONTROLS_ENABLED, DEMO_ONLY_BUILD } from "@/lib/whispers/context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: CONNECTED_BACKEND ? "Whispers — Connected reporting pilot" : "Whispers — Share what’s happening around you" },
      { name: "description", content: CONNECTED_BACKEND
        ? "Whispers is a connected reporting and review pilot. Current access and intake limits are explained before submission."
        : "Explore a fictional Whispers reporting demo. No live response team receives reports from this demo." },
      { property: "og:title", content: CONNECTED_BACKEND ? "Whispers — Connected reporting pilot" : "Whispers — Share what’s happening around you" },
      { property: "og:description", content: CONNECTED_BACKEND
        ? "Whispers is a connected reporting and review pilot. Current access and intake limits are explained before submission."
        : "Explore a fictional Whispers reporting demo. No live response team receives reports from this demo." },
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
          <h1 className="mt-8 text-xl">{CONNECTED_BACKEND ? tr("Whispers is a connected reporting pilot.") : t("home.title")}</h1>
          <p className="mt-10 text-muted-foreground text-base max-w-sm">{CONNECTED_BACKEND
            ? tr("The app uses a live Neon service. Report access is limited to an invited account, and the report form explains what the current intake mode accepts.")
            : t("home.lede")}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <Link to="/report" className="btn btn-primary btn-sm w-full">{CONNECTED_BACKEND ? tr("Open connected reporting") : t("home.make")}</Link>
          <Link to="/check" className="btn btn-secondary btn-sm w-full">{CONNECTED_BACKEND ? tr("Check a report with your private code") : t("home.check")}</Link>
        </div>
        <ol className="mt-6 grid gap-2.5 text-sm">
          {(CONNECTED_BACKEND
            ? [tr("Describe what happened in your own words."), tr("Choose a broad area and time, if safe to share."), tr("Review the intake notice before submitting.")]
            : [t("home.step1"), t("home.step2"), t("home.step3")]).map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-raised text-primary text-sm font-semibold flex items-center justify-center" aria-hidden>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="card mt-6 p-4 text-sm">
          <p className="flex gap-2.5"><ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden />{DEMO_ONLY_BUILD
            ? tr("This isolated demonstration has no connected database or staff sign-in. Use fictional information only; reports stay in this browser tab and sample roles and reviews are simulated.")
            : CONNECTED_BACKEND
              ? tr("Only the invited account can submit to the connected pilot. The report form checks the current intake mode and explains whether fictional or real information is accepted. This is not an emergency response service.")
              : t("home.privacy")}</p>
          <Link to="/help" hash="privacy" className="btn-ghost inline-flex items-center !px-0 !min-h-0 mt-1 text-sm">{t("home.privacyLink")}</Link>
        </div>
        {!DEMO_CONTROLS_ENABLED && <Link to="/partners" className="btn btn-secondary w-full mt-4">{tr("For organizations: discuss an evaluation")}</Link>}
        <p className="mt-4 hint text-sm">{t("home.notEmergency")}</p>
      </section>
    </CitizenShell>
  );
}
