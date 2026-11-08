import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import type { ReactNode } from "react";
import { t } from "@/lib/whispers/i18n";

export function StepHeader({ n, title }: { n: number; title: string }) {
  useTranslationVersion();
  return (
    <div className="mb-6">
      <p className="hint mb-2">{t("step.of", { n })}</p>
      <div className="flex gap-1.5 mb-5" aria-hidden>
        {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= n ? "bg-primary" : "bg-raised"}`} />)}
      </div>
      <h1 tabIndex={-1} id="step-title">{title}</h1>
    </div>
  );
}

export function RadioGroup<T extends string>({ label, options, value, onChange, error, id, columns = 1 }: {
  label: string; options: { value: T; label: string; icon?: ReactNode }[]; value: T | null; onChange: (v: T) => void;
  error?: string | undefined; id: string; columns?: 1 | 2;
}) {
  useTranslationVersion();
  return (
    <fieldset className="mb-6" aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="label mb-3">{label}</legend>
      <div role="radiogroup" id={id} tabIndex={-1} className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((o) => (
          <button type="button" role="radio" aria-checked={value === o.value} key={o.value} className="choice" onClick={() => onChange(o.value)}>
            {o.icon && <span className="text-primary" aria-hidden>{o.icon}</span>}
            <span>{tr(o.label)}</span>
          </button>
        ))}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="mt-2 text-destructive text-[0.95rem]">⚠ {error}</p>}
    </fieldset>
  );
}

export function MultiToggle<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void;
}) {
  useTranslationVersion();
  return (
    <fieldset className="mb-6">
      <legend className="label mb-3">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button type="button" key={o.value} aria-pressed={on} className="choice"
              onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}>
              <span aria-hidden className={`h-5 w-5 rounded-md border flex items-center justify-center text-xs ${on ? "bg-primary text-primary-foreground border-primary" : ""}`}>{on ? "✓" : ""}</span>
              {tr(o.label)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  useTranslationVersion();
  return (
    <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-xl px-5 py-3 flex gap-3">{children}</div>
    </div>
  );
}
