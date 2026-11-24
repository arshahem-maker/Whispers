import { useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { tr } from "@/lib/whispers/translation";

export function PrivatePilotPhoto({ storageKey }: { storageKey: string }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const download = useRef<AbortController | null>(null);
  useEffect(() => () => download.current?.abort(), []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const open = async () => {
    const controller = new AbortController();
    download.current = controller;
    setBusy(true); setError(false);
    try {
      // The authenticated Storage read applies workspace/report RLS on every request.
      const result = await supabase.storage.from("whispers-private").download(storageKey);
      if (controller.signal.aborted) return;
      if (result.error || !result.data) throw new Error("Unavailable");
      setUrl(URL.createObjectURL(result.data));
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  return <div className="mt-2">
    <Button variant="outline" disabled={busy} onClick={() => url ? setUrl("") : void open()}>{url ? <X aria-hidden className="size-4" /> : <ImageIcon aria-hidden className="size-4" />}{tr(url ? "Close private photo" : busy ? "Loading…" : "Open private photo")}</Button>
    {url && <img src={url} alt={tr("Private report photo")} className="mt-3 max-h-96 w-full object-contain" />}
    {error && <p role="alert" className="text-destructive mt-2">{tr("Photo unavailable or access no longer permitted.")}</p>}
  </div>;
}