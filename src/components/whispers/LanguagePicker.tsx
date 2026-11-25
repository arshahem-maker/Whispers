import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Languages, Loader2 } from "lucide-react";
import { PRIORITY_LANGUAGES } from "@/lib/whispers/languages";
import { installTranslations, tr, useTranslationVersion } from "@/lib/whispers/translation";
import { translateInterface, type TranslationBatch } from "@/lib/whispers/translate.functions";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const LanguageContext = createContext({ open: () => {}, name: "English", busy: false });

export function LanguageProvider({ children }: { children: ReactNode }) {
  useTranslationVersion();
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("English");
  const [code, setCode] = useState("en");
  const [rtl, setRtl] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => { generation.current++; setBusy(false); setOpened(false); };
  const [cache] = useState(() => new Map<string, Record<string, string>>());
  useEffect(() => {
    document.documentElement.lang = code;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [code, rtl]);
  const select = async (language: string, langCode: string, isRtl: boolean) => {
    if (busy && langCode !== "en") return;
    setError("");
    if (langCode === "en") {
      installTranslations({}); setName("English"); setCode("en"); setRtl(false); close(); return;
    }
    const saved = cache.get(language);
    if (saved) {
      installTranslations(saved); setName(language); setCode(langCode); setRtl(isRtl); setOpened(false); return;
    }
    const run = ++generation.current;
    setBusy(true);
    try {
      let offset: number | null = 0;
      let waits = 0;
      const phrases: Record<string, string> = {};
      while (offset !== null && run === generation.current) {
        const batch: TranslationBatch = await translateInterface({ data: { language, offset } });
        if (run !== generation.current) return;
        if (batch.status === "unavailable") {
          throw new Error(tr("This language hasn't been prepared yet. Please choose a listed language."));
        }
        if (batch.status === "pending") {
          if (++waits > 20) throw new Error(tr("Translation unavailable. English is still available."));
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        Object.assign(phrases, batch.phrases);
        offset = batch.next;
      }
      if (run !== generation.current) return;
      cache.set(language, phrases);
      installTranslations(phrases); setName(language); setCode(langCode); setRtl(isRtl); setOpened(false);
    } catch (e) { if (run === generation.current) setError(e instanceof Error ? e.message : tr("Translation unavailable. English is still available.")); }
    finally { if (run === generation.current) setBusy(false); }
  };
  return <LanguageContext.Provider value={{ open: () => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setError(""); setOpened(true); }, name, busy }}>
    {children}
    {code !== "en" && <aside className="fixed top-0 inset-x-0 z-40 bg-warning text-warning-foreground text-sm px-4 py-2 text-center" role="status">
      {tr("Machine translation — not reviewed by a native speaker.")} <button className="underline font-semibold mx-2" onClick={() => void select("English", "en", false)}>English</button>
    </aside>}
    <Dialog open={opened} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogTitle>{tr("Choose a language")}</DialogTitle>
        <DialogDescription>{tr("Machine translation — not reviewed by a native speaker.")}</DialogDescription>
        <p className="hint">{tr("Private reports, messages and codes stay in their original language.")}</p>
        <input className="field mt-4" aria-label={tr("Search languages")} placeholder={tr("Search languages")} value={query} disabled={busy} onChange={(e) => setQuery(e.target.value)} />
        <h3 className="label mt-4 mb-2">{tr("Priority languages")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_LANGUAGES.filter((l) => `${l.name} ${l.native}`.toLowerCase().includes(query.toLowerCase())).map((l) => <button className="choice flex-col !items-start !gap-0.5 min-w-0" disabled={busy} key={l.code} onClick={() => void select(l.name, l.code, l.rtl)}><span lang={l.code} dir={l.rtl ? "rtl" : "ltr"} className="break-words">{l.native}</span><span className="text-sm text-muted-foreground">{l.name}</span></button>)}
        </div>
        <label htmlFor="custom-language" className="label block mt-5">{tr("Other language")}</label>
        <div className="flex gap-2 mt-2"><input id="custom-language" className="field min-w-0" placeholder={tr("Language name")} maxLength={60} value={custom} disabled={busy} onChange={(e) => setCustom(e.target.value)} /><button className="btn btn-primary btn-sm" disabled={busy || custom.trim().length < 2} onClick={() => void select(custom.trim(), "und", /arabic|urdu|persian|dari|pashto|hebrew|sorani/i.test(custom))}>{tr("Translate")}</button></div>
        {busy && <p role="status" className="flex gap-2 items-center mt-4"><Loader2 className="h-5 w-5 animate-spin" />{tr("Translating…")}</p>}
        {error && <p role="alert" className="text-destructive mt-4 break-words">{error}</p>}
      </DialogContent>
    </Dialog>
  </LanguageContext.Provider>;
}

export function LanguageButton({ compact = false, tiny = false }: { compact?: boolean; tiny?: boolean }) {
  useTranslationVersion();
  const { open, name, busy } = useContext(LanguageContext);
  if (import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] === "neon") {
    return <span
      className="text-xs text-muted-foreground whitespace-nowrap"
      aria-label="Language: English only"
      title="Language translation is unavailable in this Neon pilot; English remains available."
    >English only</span>;
  }
  if (tiny) {
    return <button className="btn btn-secondary btn-sm !min-h-9 !px-2.5 !text-xs" disabled={busy} onClick={open} aria-label={tr("Change language")}><Languages className="h-4 w-4 shrink-0" aria-hidden />{name}</button>;
  }
  return <button className={`btn btn-secondary ${compact ? "btn-sm !px-3" : "w-full"}`} disabled={busy} onClick={open} aria-label={tr("Change language")}><Languages className="h-5 w-5 shrink-0" aria-hidden />{compact ? name : tr("Change language")}</button>;
}
