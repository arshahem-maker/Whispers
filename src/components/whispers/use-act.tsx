import { useState } from "react";

export function useAct() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const act = (fn: () => void, msg = "Saved.") => {
    setErr(null);
    setOk(null);
    try {
      fn();
      setOk(msg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };
  const Status = () => (
    <div aria-live="polite" className="mt-2">
      {err && <p role="alert" className="text-destructive">⚠ {err}</p>}
      {ok && <p className="text-primary">{ok}</p>}
    </div>
  );
  return { act, Status };
}
