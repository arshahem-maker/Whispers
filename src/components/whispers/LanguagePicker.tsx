import { lazy, Suspense, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { LanguagePickerContext } from "./language-picker-context";

const isNeonBackend = () => import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon";
const LanguagePickerDialog = lazy(() =>
  import("./LanguagePickerDialog").then(({ LanguagePickerDialog: Dialog }) => ({ default: Dialog })),
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const [name, setName] = useState("English");
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback(() => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialogLoaded(true);
    setOpened(true);
  }, []);
  const contextValue = { open, name, busy };

  return (
    <LanguagePickerContext.Provider value={contextValue}>
      {children}
      {dialogLoaded && (
        <Suspense fallback={<p role="status" className="sr-only">Loading language options…</p>}>
          <LanguagePickerDialog
            open={opened}
            onOpenChange={setOpened}
            onNameChange={setName}
            busy={busy}
            onBusyChange={setBusy}
            triggerRef={trigger}
          />
        </Suspense>
      )}
    </LanguagePickerContext.Provider>
  );
}

export function LanguageButton({ compact = false, tiny = false }: { compact?: boolean; tiny?: boolean }) {
  useTranslationVersion();
  const { open, name, busy } = useContext(LanguagePickerContext);
  if (isNeonBackend()) {
    return (
      <span
        className="text-xs text-muted-foreground whitespace-nowrap"
        aria-label="Language: English only"
        title="Language translation is unavailable in this Neon pilot; English remains available."
      >
        English only
      </span>
    );
  }

  if (tiny) {
    return <button className="btn btn-secondary btn-sm !min-h-9 !px-2.5 !text-xs" disabled={busy} onClick={open} aria-label={tr("Change language")}><Languages className="h-4 w-4 shrink-0" aria-hidden />{name}</button>;
  }
  return <button className={`btn btn-secondary ${compact ? "btn-sm !px-3" : "w-full"}`} disabled={busy} onClick={open} aria-label={tr("Change language")}><Languages className="h-5 w-5 shrink-0" aria-hidden />{compact ? name : tr("Change language")}</button>;
}
