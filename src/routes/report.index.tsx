import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shield, Home as HomeIcon, Droplets, Stethoscope, Radio, AlertTriangle, MoreHorizontal } from "lucide-react";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { ActionBar, MultiToggle, RadioGroup, StepHeader } from "@/components/whispers/Form";
import { useWhispers } from "@/lib/whispers/context";
import { BASIS_LABEL, CATEGORY_LABEL, IMPACT_LABEL, TIME_LABEL, t } from "@/lib/whispers/i18n";
import { PILOT_COUNTRIES } from "@/lib/whispers/locations";
import type { Category, Impact, KnowledgeBasis, TimeBucket } from "@/lib/whispers/types";

export const Route = createFileRoute("/report/")({
  validateSearch: (s: Record<string, unknown>): { step?: 1 | 2 } => (s["step"] === 2 || s["step"] === "2" ? { step: 2 } : {}),
  head: () => ({
    meta: [
      { title: "Make a report — Whispers" },
      { name: "description", content: "Describe what happened in your own words. No name or account required." },
      { property: "og:title", content: "Make a report — Whispers" },
      { property: "og:description", content: "Describe what happened in your own words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportSteps,
});

const CAT_ICONS: Record<Exclude<Category, "not_selected">, React.ReactNode> = {
  safety: <Shield className="h-5 w-5" />, shelter: <HomeIcon className="h-5 w-5" />, food_water: <Droplets className="h-5 w-5" />,
  health: <Stethoscope className="h-5 w-5" />, infrastructure: <Radio className="h-5 w-5" />, aid_concern: <AlertTriangle className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
};

function ReportSteps() {
  useTranslationVersion();
  const { step = 1 } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => { document.getElementById("step-title")?.focus(); }, [step]);
  return (
    <CitizenShell sensitive hideNav>
      {step === 1 ? <StepOne onNext={() => navigate({ to: "/report", search: { step: 2 } })} /> :
        <StepTwo onBack={() => navigate({ to: "/report", search: {} })} onNext={() => navigate({ to: "/report/review" })} />}
    </CitizenShell>
  );
}

function StepOne({ onNext }: { onNext: () => void }) {
  useTranslationVersion();
  const { draft, setDraft } = useWhispers();
  const [errors, setErrors] = useState<{ text?: string; basis?: string }>({});
  const textRef = useRef<HTMLTextAreaElement>(null);
  const len = draft.text.trim().length;
  const next = () => {
    const e: typeof errors = {};
    if (len < 10) e.text = t("s1.errShort");
    else if (len > 2000) e.text = t("s1.errLong");
    if (!draft.basis) e.basis = t("s1.errBasis");
    setErrors(e);
    if (e.text) textRef.current?.focus();
    else if (e.basis) document.getElementById("basis")?.focus();
    else onNext();
  };
  return (
    <>
      <StepHeader n={1} title={t("s1.title")} />
      <div className="mb-6">
        <label htmlFor="desc" className="label block mb-2">{t("s1.label")} <span className="hint">{tr("(required)")}</span></label>
        <p id="desc-help" className="hint mb-3">{t("s1.helper")}</p>
        <textarea id="desc" ref={textRef} rows={6} maxLength={2200} className="field min-h-40 resize-y"
          aria-invalid={!!errors.text} aria-describedby={`desc-help desc-count${errors.text ? " desc-err" : ""}`}
          value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} />
        <p id="desc-count" className="hint mt-1 text-right">{t("s1.count", { n: len })}</p>
        {errors.text && <p id="desc-err" role="alert" className="text-destructive text-[0.95rem]">⚠ {errors.text}</p>}
      </div>
      <RadioGroup<Category> id="cat" label={t("s1.category")} columns={2} value={draft.category === "not_selected" ? null : draft.category}
        onChange={(v) => setDraft((d) => ({ ...d, category: d.category === v ? "not_selected" : v }))}
        options={(Object.keys(CAT_ICONS) as (keyof typeof CAT_ICONS)[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k], icon: CAT_ICONS[k] }))} />
      {draft.category === "safety" && <p className="card p-4 -mt-3 mb-6 text-[0.98rem] border-warning/50">{t("s1.armedHelp")}</p>}
      <RadioGroup<KnowledgeBasis> id="basis" label={t("s1.basis")} value={draft.basis} error={errors.basis}
        onChange={(v) => setDraft((d) => ({ ...d, basis: v }))}
        options={(Object.keys(BASIS_LABEL) as KnowledgeBasis[]).map((k) => ({ value: k, label: BASIS_LABEL[k] }))} />
      <p className="hint mb-24">{t("draft.memory")}</p>
      <ActionBar><button className="btn btn-primary flex-1" onClick={next}>{t("common.continue")}</button></ActionBar>
    </>
  );
}

function StepTwo({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  useTranslationVersion();
  const { draft, setDraft } = useWhispers();
  const [q, setQ] = useState("");
  const countries = [
    ...PILOT_COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
    { value: "other", label: t("s2.otherCountry") },
  ].filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  const pilot = PILOT_COUNTRIES.find((c) => c.code === draft.country);
  return (
    <>
      <StepHeader n={2} title={t("s2.title")} />
      <div className="mb-3">
        <label htmlFor="csearch" className="label block mb-2">{t("s2.country")}</label>
        <input id="csearch" className="field mb-3" placeholder={t("s2.countrySearch")} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <RadioGroup<string> id="country" label={t("s2.country")} value={draft.country}
        onChange={(v) => setDraft((d) => ({ ...d, country: v, area: "unknown" }))}
        options={[...countries, { value: "not_shared", label: t("s2.rather") }]} />
      {pilot && (
        <div className="mb-6">
          <label htmlFor="area" className="label block mb-2">{t("s2.area")}</label>
          <p className="hint mb-3">{t("s2.areaHint")}</p>
          <select id="area" className="field" value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}>
            <option value="unknown">{t("s2.otherArea")}</option>
            {pilot.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="hint mt-2">{t("s2.areaPartial")}</p>
        </div>
      )}
      <RadioGroup<TimeBucket> id="time" label={t("s2.when")} columns={2} value={draft.time}
        onChange={(v) => setDraft((d) => ({ ...d, time: v }))}
        options={(Object.keys(TIME_LABEL) as TimeBucket[]).map((k) => ({ value: k, label: TIME_LABEL[k] }))} />
      <div className="mb-24">
        <MultiToggle<Impact> label={t("s2.affected")} value={draft.impacts} onChange={(v) => setDraft((d) => ({ ...d, impacts: v }))}
          options={(Object.keys(IMPACT_LABEL) as Impact[]).map((k) => ({ value: k, label: IMPACT_LABEL[k] }))} />
      </div>
      <ActionBar>
        <button className="btn btn-secondary" onClick={onBack}>{t("common.back")}</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>{t("common.continue")}</button>
      </ActionBar>
    </>
  );
}
