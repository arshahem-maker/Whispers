import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { DEMO_CONTROLS_ENABLED } from "@/lib/whispers/context";
import { t } from "@/lib/whispers/i18n";
import {
  OPERATOR,
  OPERATOR_ABOUT_NOTE,
  OPERATOR_CONTACT_LABEL,
  OPERATOR_PURPOSE_LABEL,
  OPERATOR_RECEIPT_NOTE,
} from "@/lib/whispers/operator";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help and privacy — Whispers" },
      { name: "description", content: "What the Whispers demo and restricted staging pilot do, what they cannot guarantee, and how to request removal." },
      { property: "og:title", content: "Help and privacy — Whispers" },
      { property: "og:description", content: "What the Whispers demo and restricted staging pilot do, and what they cannot guarantee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const QA: { id?: string; q: string; a: string; more?: string }[] = [
  { id: "use", q: tr("Who receives my report?"), a: tr("The public demo keeps fictional reports in this browser tab. The staging preview accepts real-information submissions only from one authorized Google account. Those submissions stay in private staging and are not monitored or answered. Photos, follow-up messages, and public sharing are disabled in that mode. The full release remains off. This is not an emergency response service."),
    more: tr(OPERATOR_RECEIPT_NOTE) },
  { q: tr("Do I need to give my name?"), a: tr("The fictional browser demo does not require an account. Real-information staging access requires an authorized Google sign-in, but the report form does not ask for a name or phone number. Your account, device, network, or report details could still identify you or someone else.") },
  { id: "privacy", q: tr("Can this app guarantee anonymity?"), a: tr("No. The fictional browser demo does not require an account. Real-information staging access requires an authorized Google sign-in. Your device, network, hosting service, account, or details in a report may reveal information about you. This prototype does not guarantee anonymity."),
    more: tr("Connections use HTTPS, which protects content in transit. The service running Whispers can read reports so that people can review them — this is not end-to-end encryption. Internet providers and hosting services may keep their own records, such as connection logs, that this app does not control.") },
  { q: tr("What should I avoid including?"), a: tr("Names, phone numbers, exact addresses, and anything that points to you or someone else. A broad area is enough.") },
  { q: tr("How do I check for a reply?"), a: tr("The fictional demo simulates follow-up. The restricted staging demonstration does not monitor reports or accept follow-up messages. A private code can still be used to request removal.") },
  { q: tr("What if I lose the code?"), a: tr("We cannot recover it. Anyone with the code can open your report, so keep it somewhere safe or don’t keep it at all.") },
  { q: tr("Does a report bring emergency help?"), a: tr("No. This is not an emergency response service, and nobody is dispatched because of a report.") },
  { q: tr("What happens to photos?"), a: tr("Photos are optional in the standard pilot. The staging partner demo disables photos for real-information reports."),
    more: tr("What a photo shows can still identify people or places. Cloud pilot photos are decoded and re-encoded again on the server and kept in private storage. The local demo only processes photos in your browser.") },
  { q: tr("How long are Cloud test reports kept?"), a: tr("The staging database is configured to expire private reports after 30 days. An administrator can record a reason and extend access once, for up to another 30 days. Scheduled cleanup removes expired records and retries private-photo deletion after failures. This is not a complete retention policy: backups and hosting records have separate retention, and those periods still need operator review.") },
  { q: tr("What request information is kept?"), a: tr("Cloud submission and voice limits use a hashed network-derived identifier, not a raw address. Private-code lookups use a code hash for limits. These are still pseudonymous metadata; daily cleanup removes limit records older than one day. Hosting services may keep their own connection records.") },
  { q: tr("How do I request removal?"), a: tr("Open your report with your code and choose “Request removal”. Your code stops working once removal is done."),
    more: tr("Copies in backups may remain for a period, and a reviewed public summary that was already published may stay as published.") },
  { q: tr("What happens when I press Leave?"), a: t("leave.note"), more: tr("It clears your draft, code and replies from this page’s memory and shows a neutral page. It does not erase your clipboard, downloads or records kept by your device or network.") },
  { q: tr("Can I use the app with a weak connection?"), a: tr("Yes, it is kept small. If sending fails, your draft stays on the page while it is open and you can try again. Drafts are not saved to the device.") },
];

function Help() {
  useTranslationVersion();
  return (
    <CitizenShell>
      <h1>{t("help.title")}</h1>
      <div className="mt-6 grid gap-3">
        {QA.map((x) => (
          <details key={tr(x.q)} id={x.id} className="card p-5 group" open={x.id === "privacy"}>
            <summary className="cursor-pointer font-semibold list-none flex justify-between gap-3 min-h-8 items-center">
              {tr(x.q)}<span aria-hidden className="text-primary group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3">{tr(x.a)}</p>
            {x.more && <p className="mt-2 hint">{tr(x.more)}</p>}
          </details>
        ))}
      </div>
      <p className="mt-8 hint">{tr("Don’t put yourself at risk to report. Only share what you already know and can safely provide.")}</p>
      <div className="mt-8 border-t pt-6">
        <h2 className="label mb-2">{tr("About")}</h2>
        <p className="hint">{tr("Whispers is an early-stage humanitarian reporting and review prototype. The public demonstration uses fictional information. Real-information intake is limited to a restricted staging demonstration and is not monitored or an emergency response service.")}</p>
        <p className="hint mt-2">{tr(OPERATOR_ABOUT_NOTE)}</p>
        <p className="hint mt-2">{tr(OPERATOR_PURPOSE_LABEL)} {tr(OPERATOR.purpose)}</p>
        <p className="hint mt-2">{tr(OPERATOR_CONTACT_LABEL)} <a className="underline" href={`mailto:${OPERATOR.contact}`}>{OPERATOR.contact}</a></p>
        {DEMO_CONTROLS_ENABLED && <Link to="/about" className="btn-ghost !px-0 mt-2 inline-flex">{tr("Demo controls")}</Link>}
        <Link to="/partners" className="btn-ghost !px-0 mt-2 inline-flex">{tr("For organizations")}</Link>
      </div>
    </CitizenShell>
  );
}
