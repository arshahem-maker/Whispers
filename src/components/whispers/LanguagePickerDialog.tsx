import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2 } from "lucide-react";
import { PRIORITY_LANGUAGES } from "@/lib/whispers/languages";
import { installTranslations, tr, useTranslationVersion } from "@/lib/whispers/translation";
import { translateInterface, type TranslationBatch } from "@/lib/whispers/translate.functions";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type LanguagePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
};

export function LanguagePickerDialog({
  open,
  onOpenChange,
  onNameChange,
  busy,
  onBusyChange,
  triggerRef,
}: LanguagePickerDialogProps) {
  useTranslationVersion();
  const [code, setCode] = useState("en");
  const [rtl, setRtl] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const [cache] = useState(() => new Map<string, Record<string, string>>());

  useEffect(() => {
    document.documentElement.lang = code;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [code, rtl]);

  const close = () => {
    generation.current++;
    onBusyChange(false);
    onOpenChange(false);
  };

  const select = async (language: string, langCode: string, isRtl: boolean) => {
    if (busy && langCode !== "en") return;
    setError("");
    if (langCode === "en") {
      installTranslations({});
      onNameChange("English");
      setCode("en");
      setRtl(false);
      close();
      return;
    }
    const saved = cache.get(language);
    if (saved) {
      installTranslations(saved);
      onNameChange(language);
      setCode(langCode);
      setRtl(isRtl);
      onOpenChange(false);
      return;
    }
    const run = ++generation.current;
    onBusyChange(true);
    try {
      let offset: number | null = 0;
      let waits = 0;
      const phrases: Record<string, string> = {};
      while (offset !== null && run === generation.current) {
        const batch: TranslationBatch = await translateInterface({ data: { language, offset } });
        if (run !== generation.current) return;
        if (batch.status === "unavailable") {
          throw new Error("This language hasn't been prepared yet. Please choose a listed language.");
        }
        if (batch.status === "pending") {
          if (++waits > 20) throw new Error("Translation unavailable. English is still available.");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }
        Object.assign(phrases, batch.phrases);
        offset = batch.next;
      }
      if (run !== generation.current) return;
      cache.set(language, phrases);
      installTranslations(phrases);
      onNameChange(language);
      setCode(langCode);
      setRtl(isRtl);
      onOpenChange(false);
    } catch (cause) {
      if (run === generation.current) {
        setError(cause instanceof Error ? cause.message : "Translation unavailable. English is still available.");
      }
    } finally {
      if (run === generation.current) onBusyChange(false);
    }
  };

  return (
    <>
      {code !== "en" && (
        <aside className="fixed top-0 inset-x-0 z-40 bg-warning text-warning-foreground text-sm px-4 py-2 text-center" role="status">
          {tr("Machine translation — not reviewed by a native speaker.")} <button className="underline font-semibold mx-2" onClick={() => void select("English", "en", false)}>{tr("English")}</button>
        </aside>
      )}
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}>
          <DialogTitle>{tr("Choose a language")}</DialogTitle>
          <DialogDescription>{tr("Machine translation — not reviewed by a native speaker.")}</DialogDescription>
          <p className="hint">{tr("Private reports, messages and codes stay in their original language.")}</p>
          <input className="field mt-4" aria-label={tr("Search languages")} placeholder={tr("Search languages")} value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} />
          <h3 className="label mt-4 mb-2">{tr("Priority languages")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITY_LANGUAGES.filter((language) => `${language.name} ${language.native}`.toLowerCase().includes(query.toLowerCase())).map((language) => (
              <button className="choice flex-col !items-start !gap-0.5 min-w-0" disabled={busy} key={language.code} onClick={() => void select(language.name, language.code, language.rtl)}>
                <span lang={language.code} dir={language.rtl ? "rtl" : "ltr"} className="break-words">{language.native}</span>
                <span className="text-sm text-muted-foreground">{language.name}</span>
              </button>
            ))}
          </div>
          <label htmlFor="custom-language" className="label block mt-5">{tr("Other language")}</label>
          <div className="flex gap-2 mt-2">
            <input id="custom-language" className="field min-w-0" placeholder={tr("Language name")} maxLength={60} value={custom} disabled={busy} onChange={(event) => setCustom(event.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={busy || custom.trim().length < 2} onClick={() => void select(custom.trim(), "und", /arabic|urdu|persian|dari|pashto|hebrew|sorani/i.test(custom))}>{tr("Translate")}</button>
          </div>
          {busy && <p role="status" className="flex gap-2 items-center mt-4"><Loader2 className="h-5 w-5 animate-spin" />{tr("Translating…")}</p>}
          {error && <p role="alert" className="text-destructive mt-4 break-words">{tr(error)}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
