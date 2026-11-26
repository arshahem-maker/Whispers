import type { ReactNode } from "react";
import { tr, useTranslationVersion } from "@/lib/whispers/translation";

// Machine translations previously depended on the retired Lovable/Supabase AI
// path. Keep the interface honest until a reviewed, supported translation path
// is available; do not silently invoke a legacy provider.
export function LanguageProvider({ children }: { children: ReactNode }) {
  return children;
}

export function LanguageButton(_props: { compact?: boolean; tiny?: boolean }) {
  useTranslationVersion();
  return (
    <span
      className="text-xs text-muted-foreground whitespace-nowrap"
      aria-label="Language: English only"
      title="Only English is available in this pilot."
    >
      {tr("English only")}
    </span>
  );
}
