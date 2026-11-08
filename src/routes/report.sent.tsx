import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, AlertTriangle, Loader2 } from "lucide-react";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { DEMO_MODE, emptyDraft, useWhispers } from "@/lib/whispers/context";
import { groupCode } from "@/lib/whispers/crypto";
import { t } from "@/lib/whispers/i18n";

export const Route = createFileRoute("/report/sent")({
  head: () => ({
    meta: [
      { title: "Report received — Whispers" },
      { name: "description", content: "Keep your private code to check for replies." },
      { property: "og:title", content: "Report received — Whispers" },
      { property: "og:description", content: "Keep your private code to check for replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sent,
});

function Sent() {
  useTranslationVersion();
  const { submission, draft, setDraft, store, setSubmission, setHeldCode } = useWhispers();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const upload = async (id: string) => {
    if (!submission) return;
    const p = draft.photos.find((x) => x.id === id);
    if (!p) return;
    setDraft((d) => ({ ...d, photos: d.photos.map((x) => (x.id === id ? { ...x, status: "sending" } : x)) }));
    let ok = false;
    try { ok = (await store.addAttachment(submission.code, { bytes: p.bytes, width: p.width, height: p.height, type: "image/jpeg", previewUrl: p.url })).ok; } catch { ok = false; }
    setDraft((d) => ({ ...d, photos: d.photos.map((x) => (x.id === id ? { ...x, status: ok ? "processed" : "failed" } : x)) }));
  };

  useEffect(() => {
    if (started.current || !submission?.accepted) return;
    started.current = true;
    (async () => { for (const p of draft.photos) if (p.status === "local") await upload(p.id); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission]);

  if (!submission?.accepted) {
    return (
      <CitizenShell>
        <p className="mb-4">{tr("Nothing to show here.")}</p>
        <Link to="/" className="btn btn-primary w-full">{t("sent.done")}</Link>
      </CitizenShell>
    );
  }

  const finish = (to: "/" | "/check") => {
    // Photo object URLs stay alive only for the demo reviewer preview; the draft text is cleared.
    setDraft(() => emptyDraft());
    if (to === "/check") setHeldCode(submission!.code);
    setSubmission(null);
    navigate({ to, replace: true });
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(groupCode(submission.code)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* user can select manually */ }
  };

  return (
    <CitizenShell sensitive>
      <h1 tabIndex={-1} ref={(el) => el?.focus()}>{DEMO_MODE ? t("sent.titleDemo") : t("sent.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("sent.keep")}</p>

      <div className="card p-5 mt-6">
        <p className="label mb-2">{t("check.label")}</p>
        <p className="font-mono text-xl tracking-wider break-all select-all leading-relaxed" aria-label={tr("Your private code")}>{groupCode(submission.code)}</p>
        <button className="btn btn-primary w-full mt-4" onClick={copy}>
          {copied ? <><Check className="h-5 w-5" aria-hidden /> {t("sent.copied")}</> : <><Copy className="h-5 w-5" aria-hidden /> {t("sent.copy")}</>}
        </button>
        <span className="sr-only" aria-live="polite">{copied ? t("sent.copied") : ""}</span>
        <ul className="mt-4 grid gap-1.5 hint">
          <li>• {t("sent.anyone")}</li>
          <li>• {t("sent.lost")}</li>
          <li>{tr("• Copying puts the code on this device’s clipboard. Think about who else uses this device.")}</li>
        </ul>
      </div>

      <ul className="mt-6 grid gap-2" aria-live="polite">
        <li className="flex gap-2"><Check className="h-5 w-5 text-primary shrink-0" aria-hidden />{t("sent.textOk")}</li>
        {draft.photos.map((p, i) => (
          <li key={p.id} className="flex gap-2 items-center flex-wrap">
            {p.status === "processed" && <><Check className="h-5 w-5 text-primary" aria-hidden />{t("sent.photoOk", { n: i + 1 })}</>}
            {(p.status === "sending" || p.status === "local") && <><Loader2 className="h-5 w-5 animate-spin" aria-hidden />{t("sent.photoPending", { n: i + 1 })}</>}
            {p.status === "failed" && <>
              <AlertTriangle className="h-5 w-5 text-warning" aria-hidden /><span className="flex-1">{t("sent.photoFail", { n: i + 1 })}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => upload(p.id)}>{t("sent.retry")}</button>
            </>}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3">
        <button className="btn btn-secondary w-full" onClick={() => finish("/check")}>{t("sent.check")}</button>
        <button className="btn-ghost w-full" onClick={() => finish("/")}>{t("sent.done")}</button>
      </div>
    </CitizenShell>
  );
}
