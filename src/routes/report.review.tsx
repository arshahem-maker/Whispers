import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { ActionBar, StepHeader } from "@/components/whispers/Form";
import { PhotoEditor } from "@/components/whispers/PhotoEditor";
import { DEMO_MODE, useWhispers } from "@/lib/whispers/context";
import { generatePrivateCode, hashCode, randomId } from "@/lib/whispers/crypto";
import { BASIS_LABEL, CATEGORY_LABEL, IMPACT_LABEL, TIME_LABEL, t } from "@/lib/whispers/i18n";
import { decodeImage, ImageError } from "@/lib/whispers/image";
import { broadAreaLabel } from "@/lib/whispers/locations";
import { ValidationError } from "@/lib/whispers/store";

export const Route = createFileRoute("/report/review")({
  head: () => ({
    meta: [
      { title: "Check your report — Whispers" },
      { name: "description", content: "Review your report before sending it to the review team." },
      { property: "og:title", content: "Check your report — Whispers" },
      { property: "og:description", content: "Review your report before sending it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Review,
});

function Row({ label, value, edit }: { label: string; value: string; edit: () => void }) {
  useTranslationVersion();
  return (
    <div className="py-4 border-b last:border-b-0 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <p className="hint">{label}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words">{value}</p>
      </div>
      <button className="btn-ghost text-[0.95rem]" onClick={edit} aria-label={`${t("s3.edit")}: ${label}`}>{t("s3.edit")}</button>
    </div>
  );
}

function Review() {
  useTranslationVersion();
  const { draft, setDraft, store, submission, setSubmission } = useWhispers();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "sending" | "failed" | "timeout" | "offline">("idle");
  const [ackErr, setAckErr] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImageBitmap | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.getElementById("step-title")?.focus(); }, []);
  if (draft.text.trim().length < 10 || !draft.basis) {
    return (
      <CitizenShell sensitive>
        <p className="mb-4">{tr("There’s no report draft open.")}</p>
        <Link to="/report" className="btn btn-primary w-full">{t("home.make")}</Link>
      </CitizenShell>
    );
  }

  const pick = async (f: File | undefined) => {
    setPhotoErr(null);
    if (!f) return;
    try { setEditing(await decodeImage(f)); } catch (e) { setPhotoErr(e instanceof ImageError ? e.message : "This photo couldn’t be opened."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = async () => {
    if (!draft.ack) { setAckErr(true); document.getElementById("ack")?.focus(); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setState("offline"); return; }
    setState("sending");
    const sub = submission ?? { code: generatePrivateCode(), idempotencyKey: randomId("idem"), accepted: false };
    if (!submission) setSubmission(sub);
    try {
      await store.submitReport({
        codeHash: await hashCode(sub.code), idempotencyKey: sub.idempotencyKey,
        payload: {
          text: draft.text, category: draft.category, knowledgeBasis: draft.basis!, countryCode: draft.country ?? "not_shared",
          areaId: draft.area, timeBucket: draft.time ?? "not_sure", impacts: draft.impacts,
          publicSummaryPermission: draft.publicPermission, acknowledged: draft.ack,
        },
      });
      setSubmission({ ...sub, accepted: true });
      navigate({ to: "/report/sent", replace: true });
    } catch (e) {
      if (e instanceof Error && e.message === "timeout") setState("timeout");
      else if (e instanceof ValidationError && e.message === "idempotency_conflict") {
        // Draft changed after an unconfirmed attempt: start a fresh attempt with a new code.
        setSubmission(null); setState("failed");
      } else setState("failed");
    }
  };

  const go = (step: 1 | 2) => navigate({ to: "/report", search: step === 2 ? { step: 2 } : {} });

  return (
    <CitizenShell sensitive hideNav>
      <StepHeader n={3} title={t("s3.title")} />
      <div className="card px-5">
        <Row label={t("s3.description")} value={draft.text.trim()} edit={() => go(1)} />
        <Row label={t("s3.basis")} value={tr(BASIS_LABEL[draft.basis])} edit={() => go(1)} />
        <Row label={t("s3.category")} value={tr(CATEGORY_LABEL[draft.category])} edit={() => go(1)} />
        <Row label={t("s3.area")} value={draft.country ? broadAreaLabel(draft.country, draft.area) : t("common.notShared")} edit={() => go(2)} />
        <Row label={t("s3.when")} value={draft.time ? TIME_LABEL[draft.time] : t("common.notShared")} edit={() => go(2)} />
        <Row label={t("s3.affected")} value={draft.impacts.length ? draft.impacts.map((i) => IMPACT_LABEL[i]).join(", ") : t("common.notSelected")} edit={() => go(2)} />
      </div>

      <section className="mt-6" aria-labelledby="ph">
        <h2 id="ph" className="label mb-2">{t("s3.photos")}</h2>
        {draft.photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 mb-3">
            {draft.photos.map((p, i) => (
              <li key={p.id} className="relative">
                <img src={p.url} alt={`Photo ${i + 1} (processed copy)`} className="aspect-square w-full object-cover rounded-xl border" />
                <button className="absolute top-1 right-1 h-9 w-9 rounded-full bg-background/90 flex items-center justify-center" aria-label={`Remove photo ${i + 1}`}
                  onClick={() => { URL.revokeObjectURL(p.url); setDraft((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== p.id) })); }}>
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {draft.photos.length < 3 && (
          <>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="photo" onChange={(e) => pick(e.target.files?.[0])} />
            <label htmlFor="photo" className="btn btn-secondary btn-sm cursor-pointer"><ImagePlus className="h-4 w-4" aria-hidden /> {t("s3.addPhoto")}</label>
          </>
        )}
        <p className="hint mt-2">{tr("Up to 3 still photos (JPEG, PNG or WebP). A photo is never required.")}</p>
        {photoErr && <p role="alert" className="text-destructive mt-2">⚠ {photoErr}</p>}
      </section>

      <p className="card p-4 mt-6">{t("s3.safe")}</p>

      <div className="mt-6 grid gap-3">
        <button id="ack" type="button" role="checkbox" aria-checked={draft.ack} className="choice" aria-describedby={ackErr ? "ack-err" : undefined}
          onClick={() => { setAckErr(false); setDraft((d) => ({ ...d, ack: !d.ack })); }}>
          <Box on={draft.ack} /> <span>{t("s3.ack")} <span className="hint">{tr("(required)")}</span></span>
        </button>
        <Link to="/help" hash="use" className="btn-ghost !px-0 w-fit">{t("s3.ackLink")}</Link>
        {ackErr && <p id="ack-err" role="alert" className="text-destructive">⚠ {t("s3.errAck")}</p>}
        <button type="button" role="switch" aria-checked={draft.publicPermission} className="choice" aria-describedby="pub-help"
          onClick={() => setDraft((d) => ({ ...d, publicPermission: !d.publicPermission }))}>
          <Box on={draft.publicPermission} /> <span>{t("s3.public")}</span>
        </button>
        <p id="pub-help" className="hint">{t("s3.publicHelp")}</p>
      </div>

      <div aria-live="polite" className="mt-4 mb-28">
        {state === "failed" && <p role="alert" className="text-destructive">⚠ {t("s3.failed")}</p>}
        {state === "timeout" && <p role="alert" className="text-warning">⚠ {t("s3.timeout")}</p>}
        {state === "offline" && <p role="alert" className="text-warning">⚠ {t("s3.offline")}</p>}
        {DEMO_MODE && <p className="hint mt-2">{tr("Demo: this is saved only in this browser tab. No review team receives it.")}</p>}
      </div>

      <ActionBar>
        <button className="btn btn-secondary" onClick={() => go(2)} disabled={state === "sending"}>{t("common.back")}</button>
        <button className="btn btn-primary flex-1" onClick={send} disabled={state === "sending"} aria-busy={state === "sending"}>
          {state === "sending" ? t("s3.sending") : DEMO_MODE ? t("s3.sendDemo") : t("s3.send")}
        </button>
      </ActionBar>

      {editing && (
        <PhotoEditor bitmap={editing}
          onCancel={() => { editing.close(); setEditing(null); }}
          onDone={(r) => { editing.close(); setEditing(null); setDraft((d) => ({ ...d, photos: [...d.photos, { id: randomId("ph"), ...r, status: "local" }] })); }} />
      )}
    </CitizenShell>
  );
}

function Box({ on }: { on: boolean }) {
  useTranslationVersion();
  return <span aria-hidden className={`h-6 w-6 shrink-0 rounded-md border flex items-center justify-center text-sm ${on ? "bg-primary text-primary-foreground border-primary" : ""}`}>{on ? "✓" : ""}</span>;
}
