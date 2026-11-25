import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import type { ReactNode } from "react";

export function Panel({ title, children, step }: { title: string; children: ReactNode; step?: number }) {
  useTranslationVersion();
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2">{step && <span className="h-7 w-7 rounded-full bg-raised text-primary text-sm flex items-center justify-center">{step}</span>}{tr(title)}</h2>
      {children}
    </section>
  );
}

