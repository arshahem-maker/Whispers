import { tr, useTranslationVersion } from "@/lib/whispers/translation";
export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  useTranslationVersion();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 19c4-7 10-9 20-7" />
      <path d="M8 25c4-4 9-5 15-4" opacity="0.6" />
    </svg>
  );
}

export function Wordmark({ large = false }: { large?: boolean }) {
  useTranslationVersion();
  if (large) {
    return (
      <span className="flex flex-col items-center gap-6 text-primary">
        <Mark className="h-72 w-72 logo-shimmer" />
        <span className="text-6xl font-semibold tracking-tight text-foreground">{tr("Whispers")}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-primary">
      <Mark className="h-12 w-12" />
      <span className="sr-only">{tr("Whispers")}</span>
    </span>
  );
}
