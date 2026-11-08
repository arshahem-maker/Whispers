import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { CitizenShell, useLeave } from "@/components/whispers/CitizenShell";
import { useWhispers } from "@/lib/whispers/context";
import { TIME_LABEL, t } from "@/lib/whispers/i18n";
import type { ContributorStatus, ContributorView } from "@/lib/whispers/types";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check a report — Whispers" },
      { name: "description", content: "Use your private code to see replies from the review team." },
      { property: "og:title", content: "Check a report — Whispers" },
      { property: "og:description", content: "Use your private code to see replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckPage,
});

const ORDER: ContributorStatus[] = ["received", "under_review", "more_info", "complete"];

function CheckPage() {
  useTranslationVersion();
  const { store, heldCode, setHeldCode } = useWhispers();
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [view, setView] = useState<ContributorView | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const open = async (c: string) => {
    setBusy(true); setErr(false);
    const v = await store.openReceipt(c);
    setBusy(false);
    if (!v) { setErr(true); return; }
    setView(v); setActive(c); setCode("");
  };

  useEffect(() => { if (heldCode) { const c = heldCode; setHeldCode(null); void open(c); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // Refresh when the store changes (e.g. demo reviewer reply).
  useWhispers();
  useEffect(() => { if (active) store.openReceipt(active).then((v) => (v ? setView(v) : (setView(null), setActive(null)))); }, [store.version, active, store]);

  const close = () => { setView(null); setActive(null); setReply(""); setConfirmRemove(false); };

  return (
    <CitizenShell sensitive>
      {!view ? (
        <form onSubmit={(e) => { e.preventDefault(); void open(code); }} autoComplete="off">
          <h1>{t("check.title")}</h1>
          <label htmlFor="code" className="label block mt-6 mb-2">{t("check.label")}</label>
          <div className="flex gap-2">
            <input id="code" className="field font-mono tracking-wider" type={show ? "text" : "password"} value={code}
              onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              aria-describedby={`code-hint${err ? " code-err" : ""}`} aria-invalid={err} />
            <button type="button" className="btn btn-secondary btn-sm !min-h-[3.25rem]" onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />} {show ? t("check.hide") : t("check.show")}
            </button>
          </div>
          <p id="code-hint" className="hint mt-2">{t("check.hint")}</p>
          {err && <p id="code-err" role="alert" className="text-destructive mt-3">⚠ {t("check.generic")}</p>}
          <button className="btn btn-primary w-full mt-6" disabled={busy || !code.trim()}>{busy ? "…" : t("check.open")}</button>
        </form>
      ) : (
        <ContributorPanel view={view} reply={reply} setReply={setReply} confirmRemove={confirmRemove} setConfirmRemove={setConfirmRemove}
          onSend={async () => { if (!active || !reply.trim()) return; setView(await store.addContributorMessage(active, reply)); setReply(""); }}
          onRemove={async () => { if (!active) return; setView(await store.requestRemoval(active)); setConfirmRemove(false); }}
          onClose={close} />
      )}
    </CitizenShell>
  );
}

function ContributorPanel({ view, reply, setReply, onSend, onRemove, onClose, confirmRemove, setConfirmRemove }: {
  view: ContributorView; reply: string; setReply: (s: string) => void; onSend: () => void; onRemove: () => void; onClose: () => void;
  confirmRemove: boolean; setConfirmRemove: (b: boolean) => void;
}) {
  useTranslationVersion();
  const leave = useLeave();
  const reached = new Set(view.timeline.map((x) => x.status));
  return (
    <div>
      <h1>{t("check.yourReport")}</h1>
      <div className="card p-5 mt-5">
        <p className="whitespace-pre-wrap break-words">{view.originalText}</p>
        <p className="hint mt-3">{view.areaLabel} · {tr(TIME_LABEL[view.timeBucket])}</p>
      </div>

      <section className="mt-6" aria-labelledby="tl">
        <h2 id="tl" className="mb-3">{t("check.timeline")}</h2>
        <ol className="grid gap-2">
          {ORDER.filter((s) => s !== "more_info" || reached.has("more_info")).map((s) => {
            const on = reached.has(s); const current = view.status === s;
            return (
              <li key={s} className={`flex items-center gap-3 ${on ? "" : "text-muted-foreground"}`}>
                {on ? <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden /> : <Circle className="h-5 w-5" aria-hidden />}
                <span>{t(`status.${s}` as const)}{current && <span className="chip ml-2">{tr("Current")}</span>}</span>
              </li>
            );
          })}
        </ol>
        <p className="hint mt-3">{t("status.note")}</p>
        {view.statusMessage && <p className="card p-4 mt-3">{view.statusMessage}</p>}
        {view.removalRequested && <p className="card p-4 mt-3 border-warning/60">{t("check.removeDone")}</p>}
      </section>

      <section className="mt-6" aria-labelledby="msgs">
        <h2 id="msgs" className="mb-3">{t("check.messages")}</h2>
        {view.messages.length === 0 ? <p className="hint">{t("check.noMessages")}</p> : (
          <ul className="grid gap-2">
            {view.messages.map((m) => (
              <li key={m.id} className={`p-4 rounded-2xl ${m.sender === "reviewer" ? "bg-raised" : "bg-surface border ml-8"}`}>
                <p className="hint mb-1">{m.sender === "reviewer" ? "Review team" : "You"}</p>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
        {!view.removalRequested && (
          <div className="mt-4">
            <label htmlFor="reply" className="label block mb-2">{t("check.add")}</label>
            <p className="hint mb-2">{tr("Leave out names or details that could identify you. Don’t take risks to find out more.")}</p>
            <textarea id="reply" rows={3} maxLength={2000} className="field" value={reply} onChange={(e) => setReply(e.target.value)} />
            <button className="btn btn-primary btn-sm mt-2" disabled={!reply.trim()} onClick={onSend}>{t("check.addSend")}</button>
          </div>
        )}
      </section>

      {!view.removalRequested && (
        <section className="mt-8 card p-5" aria-labelledby="rm">
          <h2 id="rm" className="mb-2">{t("check.removeTitle")}</h2>
          <p className="hint">{t("check.removeBody")}</p>
          {!confirmRemove ? <button className="btn btn-secondary btn-sm mt-3" onClick={() => setConfirmRemove(true)}>{t("check.removeBtn")}</button> : (
            <div className="flex gap-2 mt-3">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRemove(false)}>{tr("Cancel")}</button>
              <button className="btn btn-primary btn-sm" onClick={onRemove}>{tr("Confirm removal request")}</button>
            </div>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-2">
        <button className="btn btn-secondary w-full" onClick={onClose}>{t("check.close")}</button>
        <button className="btn-ghost w-full" onClick={leave}>{t("header.leave")}</button>
        <p className="hint text-center">{t("leave.note")}</p>
      </div>
    </div>
  );
}
