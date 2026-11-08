import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordWav } from "@/lib/whispers/record-wav";
import { applyVoiceDraft, voiceResultSchema, VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from "@/lib/whispers/voice-schema";
import { useWhispers } from "@/lib/whispers/context";
import { t } from "@/lib/whispers/i18n";
import { useTranslationVersion } from "@/lib/whispers/translation";

export function VoiceRecorder() {
  useTranslationVersion();
  const { draft, setDraft } = useWhispers();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const elapsed = useRef(0);
  const mounted = useRef(true);
  const operation = useRef(0);
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "processing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const close = async () => {
    operation.current += 1;
    abort.current?.abort(); abort.current = null;
    const current = recorder.current; recorder.current = null;
    if (current) await current.stop().catch(() => {});
    setPhase("idle"); setError(""); setConsent(false); dialog.current?.close();
  };
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; abort.current?.abort();
    const current = recorder.current; recorder.current = null;
    if (current) void current.stop().catch(() => {});
  }; }, []);
  const finish = async () => {
    const current = recorder.current; if (!current) return;
    const token = operation.current;
    recorder.current = null; setPhase("processing");
    try {
      const file = await current.stop();
      if (!mounted.current || token !== operation.current || !dialog.current?.open) return;
      if (file.size > VOICE_MAX_BYTES) throw new Error(t("voice.tooLarge"));
      const controller = new AbortController(); abort.current = controller;
      const body = new FormData(); body.append("file", file); body.append("consent", "yes");
      const response = await fetch("/api/public/voice", { method: "POST", body, signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? t("voice.failed"));
      const result = voiceResultSchema.parse(payload);
      if (!mounted.current || controller.signal.aborted) return;
      setDraft((d) => applyVoiceDraft(d, result));
      setPhase("idle"); dialog.current?.close();
      await navigate({ to: "/report", search: {} });
    } catch (e) {
      if (!mounted.current || (e instanceof Error && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : t("voice.failed")); setPhase("idle");
    }
  };
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => { elapsed.current += 1; setSeconds(elapsed.current); if (elapsed.current >= VOICE_MAX_SECONDS) void finish(); }, 1000);
    return () => clearInterval(timer);
  }, [phase]);
  const start = async () => {
    if (!consent) return;
    const token = ++operation.current;
    setError(""); setPhase("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("voice.unavailable"));
      const current = await recordWav();
      if (!mounted.current || token !== operation.current || !dialog.current?.open) { await current.stop().catch(() => {}); return; }
      recorder.current = current; elapsed.current = 0; setSeconds(0); setPhase("recording");
    } catch (e) { setError(e instanceof Error && e.name === "NotAllowedError" ? t("voice.permission") : t("voice.unavailable")); setPhase("idle"); }
  };
  return <>
    <Button variant="record" className="btn btn-sm w-full" onClick={() => dialog.current?.showModal()}><Mic aria-hidden />{t("voice.record")}</Button>
    <dialog ref={dialog} aria-labelledby="voice-title" className="bg-surface text-foreground border rounded-lg p-6 w-[calc(100%-2rem)] max-w-md backdrop:bg-background/80" onCancel={(e) => { e.preventDefault(); void close(); }}>
      <div className="flex items-center justify-between gap-4"><h2 id="voice-title">{t("voice.title")}</h2><Button variant="ghost" size="icon" aria-label={t("voice.cancel")} onClick={() => void close()}><X /></Button></div>
      <p className="hint mt-4">{t("voice.privacy")}</p>
      <p className="hint mt-3">{t("voice.warning")}</p>
      {draft.text && <p className="text-warning mt-3 text-sm">{t("voice.replace")}</p>}
      {phase === "idle" && <label className="flex gap-3 mt-5 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{t("voice.consent")}</label>}
      {phase === "recording" && <p role="status" className="text-primary font-mono text-center py-6">{t("voice.listening")} {seconds}s / {VOICE_MAX_SECONDS}s</p>}
      {(phase === "starting" || phase === "processing") && <p role="status" className="mt-5">{t(phase === "starting" ? "voice.starting" : "voice.processing")}</p>}
      {error && <p role="alert" className="text-destructive mt-4">{error}</p>}
      <div className="flex gap-3 mt-6">
        {phase === "idle" && <Button disabled={!consent} onClick={() => void start()}><Mic />{t("voice.start")}</Button>}
        {phase === "recording" && <Button onClick={() => void finish()}><Square />{t("voice.finish")}</Button>}
        <Button variant="outline" onClick={() => void close()}>{t("voice.cancel")}</Button>
      </div>
    </dialog>
  </>;
}