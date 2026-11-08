import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { useState, type ReactNode } from "react";

export function Panel({ title, children, step }: { title: string; children: ReactNode; step?: number }) {
  useTranslationVersion();
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2">{step && <span className="h-7 w-7 rounded-full bg-raised text-primary text-sm flex items-center justify-center">{step}</span>}{tr(title)}</h2>
      {children}
    </section>
  );
}

export function useAct() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const act = (fn: () => void, msg = "Saved.") => { setErr(null); setOk(null); try { fn(); setOk(msg); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } };
  const Status = () => <div aria-live="polite" className="mt-2">{err && <p role="alert" className="text-destructive">⚠ {err}</p>}{ok && <p className="text-primary">{ok}</p>}</div>;
  return { act, Status };
}

