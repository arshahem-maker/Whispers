import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Languages, Loader2, X } from "lucide-react";
import { PRIORITY_LANGUAGES } from "@/lib/whispers/languages";
import { installTranslations, tr, useTranslationVersion } from "@/lib/whispers/translation";
import { prepareInterfaceTranslation, translateInterface } from "@/lib/whispers/translate.functions";

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
  const [progress, setProgress] = useState(0);
  const [cache] = useState(() => new Map<string, Record<string, string>>());
  useEffect(() => {
    document.documentElement.lang = code;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [code, rtl]);
  const select = async (language: string, langCode: string, isRtl: boolean) => {
    if (busy) return;
    setError("");
    if (langCode === "en") {
      installTranslations({}); setName("English"); setCode("en"); setRtl(false); setOpened(false); return;
    }
    const saved = cache.get(language);
    if (saved) {
      installTranslations(saved); setName(language); setCode(langCode); setRtl(isRtl); setOpened(false); return;
    }
    setBusy(true); setProgress(0);
    try {
      let offset: number | null = 0;
      let waits = 0;
      const phrases: Record<string, string> = {};
      while (offset !== null) {
        let batch = await translateInterface({ data: { language, offset } });
        if (batch.status === "unavailable") {
          batch = await prepareInterfaceTranslation({ data: { language, offset } }).catch(() => { throw new Error(tr("This language hasn't been prepared yet. Please choose a listed language.")); });
        }
        if (batch.status === "pending") {
          if (++waits > 20) throw new Error(tr("Translation unavailable. English is still available."));
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        Object.assign(phrases, batch.phrases);
        offset = batch.next;
        setProgress((p) => p + 1);
      }
      cache.set(language, phrases);
      installTranslations(phrases); setName(language); setCode(langCode); setRtl(isRtl); setOpened(false);
    } catch (e) { setError(e instanceof Error ? e.message : tr("Translation unavailable. English is still available.")); }
    finally { setBusy(false); }
  };
  return <LanguageContext.Provider value={{ open: () => setOpened(true), name, busy }}>
    {children}
    {code !== "en" && <aside className="fixed top-0 inset-x-0 z-40 bg-warning text-warning-foreground text-sm px-4 py-2 text-center" role="status">
      {tr("Machine translation — not reviewed by a native speaker.")} <button className="underline font-semibold mx-2" onClick={() => void select("English", "en", false)}>English</button>
    </aside>}
    {opened && <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) setOpened(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="language-title" className="bg-surface border rounded-lg w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex justify-between items-center gap-3"><h2 id="language-title">{tr("Choose a language")}</h2><button className="btn btn-secondary btn-sm !px-3" aria-label={tr("Close")} disabled={busy} onClick={() => setOpened(false)}><X className="h-5 w-5" /></button></div>
        <p className="hint mt-3">{tr("Machine translation — not reviewed by a native speaker.")}</p>
        <p className="hint mt-2">{tr("Private reports, messages and codes stay in their original language.")}</p>
        <input autoFocus className="field mt-4" aria-label={tr("Search languages")} placeholder={tr("Search languages")} value={query} disabled={busy} onChange={(e) => setQuery(e.target.value)} />
        <h3 className="label mt-4 mb-2">{tr("Priority languages")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_LANGUAGES.filter((l) => `${l.name} ${l.native}`.toLowerCase().includes(query.toLowerCase())).map((l) => <button className="choice flex-col !items-start !gap-0.5 min-w-0" disabled={busy} key={l.code} onClick={() => void select(l.name, l.code, l.rtl)}><span lang={l.code} dir={l.rtl ? "rtl" : "ltr"} className="break-words">{l.native}</span><span className="text-sm text-muted-foreground">{l.name}</span></button>)}
        </div>
        <label htmlFor="custom-language" className="label block mt-5">{tr("Other language")}</label>
        <div className="flex gap-2 mt-2"><input id="custom-language" className="field min-w-0" placeholder={tr("Language name")} maxLength={60} value={custom} disabled={busy} onChange={(e) => setCustom(e.target.value)} /><button className="btn btn-primary btn-sm" disabled={busy || custom.trim().length < 2} onClick={() => void select(custom.trim(), "und", /arabic|urdu|persian|dari|pashto|hebrew|sorani/i.test(custom))}>{tr("Translate")}</button></div>
        {busy && <p role="status" className="flex gap-2 items-center mt-4"><Loader2 className="h-5 w-5 animate-spin" />{tr("Translating…")} {progress > 0 ? `${progress}/8` : ""}</p>}
        {error && <p role="alert" className="text-destructive mt-4 break-words">{error}</p>}
      </section>
    </div>}
  </LanguageContext.Provider>;
}

export function LanguageButton({ compact = false, tiny = false }: { compact?: boolean; tiny?: boolean }) {
  useTranslationVersion();
  const { open, name, busy } = useContext(LanguageContext);
  if (tiny) {
    return <button className="btn btn-secondary btn-sm !min-h-9 !px-2.5 !text-xs" onClick={open} aria-label={tr("Change language")}><Languages className="h-4 w-4 shrink-0" aria-hidden />{name}</button>;
  }
  return <button className={`btn btn-secondary ${compact ? "btn-sm !px-3" : "w-full"}`} onClick={open} aria-label={tr("Change language")}><Languages className="h-5 w-5 shrink-0" aria-hidden />{compact ? name : tr("Change language")}</button>;
}