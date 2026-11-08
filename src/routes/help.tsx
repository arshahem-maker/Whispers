import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { DEMO_MODE } from "@/lib/whispers/context";
import { t } from "@/lib/whispers/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help and privacy — Whispers" },
      { name: "description", content: "What Whispers does with your report, what it cannot guarantee, and how to check for replies." },
      { property: "og:title", content: "Help and privacy — Whispers" },
      { property: "og:description", content: "What Whispers does with your report and what it cannot guarantee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const QA: { id?: string; q: string; a: string; more?: string }[] = [
  { id: "use", q: tr("Who receives my report?"), a: DEMO_MODE ? "This is a demonstration. No live humanitarian review team is connected, and reports stay in this browser tab." : "The configured review team for your area.",
    more: tr("In a real deployment, the operating organisation and the purpose of reporting will be named here. Reports are read by authorised reviewers. Reviewers may share a shortened, de-identified version with a small number of invited experts. Reports are not forwarded automatically to police, armed forces, governments, media or partners.") },
  { q: tr("Do I need to give my name?"), a: tr("No. There is no account, email or phone number.") },
  { id: "privacy", q: tr("Can this app guarantee anonymity?"), a: tr("No. Whispers does not require your name or an account. Your device, network, hosting service, or details in your report may still reveal information about you. This prototype does not guarantee anonymity."),
    more: tr("Connections use HTTPS, which protects content in transit. The service running Whispers can read reports so that people can review them — this is not end-to-end encryption. Internet providers and hosting services may keep their own records, such as connection logs, that this app does not control.") },
  { q: tr("What should I avoid including?"), a: tr("Names, phone numbers, exact addresses, and anything that points to you or someone else. A broad area is enough.") },
  { q: tr("How do I check for a reply?"), a: tr("Choose “Check a report” and enter your private code.") },
  { q: tr("What if I lose the code?"), a: tr("We cannot recover it. Anyone with the code can open your report, so keep it somewhere safe or don’t keep it at all.") },
  { q: tr("Does a report bring emergency help?"), a: tr("No. This is not an emergency response service, and nobody is dispatched because of a report.") },
  { q: tr("What happens to photos?"), a: tr("Photos are optional. Before sending, your phone makes a smaller copy, covers any areas you marked, and removes embedded details like camera and GPS data."),
    more: tr("What a photo shows — faces, signs, buildings — can still identify people or places. In this demo, photo checks run only in your browser; server-side checking is not connected.") },
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
        <p className="hint">{tr("Whispers is an independent reporting and review application.")}{DEMO_MODE && "This build runs in demo mode with fictional data."}</p>
        {DEMO_MODE && <Link to="/about" className="btn-ghost !px-0 mt-2 inline-flex">{tr("Demo controls")}</Link>}
      </div>
    </CitizenShell>
  );
}
