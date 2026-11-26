import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { useEffect, useRef, useState } from "react";
import { processImage, type Rect } from "@/lib/whispers/image";

/** Crop + opaque masking. Output is a flattened, re-encoded copy; the original is never kept. */
export function PhotoEditor({ bitmap, onDone, onCancel }: {
  bitmap: ImageBitmap; onDone: (r: Awaited<ReturnType<typeof processImage>>) => void; onCancel: () => void;
}) {
  useTranslationVersion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"mask" | "crop">("mask");
  const [masks, setMasks] = useState<Rect[]>([]);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; r: Rect } | null>(null);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState({ x: 25, y: 25, w: 50, h: 50 });
  const [error, setError] = useState(false);
  const keyboardRect = { x: selection.x / 100, y: selection.y / 100, w: Math.min(selection.w, 100 - selection.x) / 100, h: Math.min(selection.h, 100 - selection.y) / 100 };

  useEffect(() => {
    const c = canvasRef.current!;
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    c.width = Math.round(bitmap.width * scale); c.height = Math.round(bitmap.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    ctx.fillStyle = "#000";
    [...masks, ...(drag && mode === "mask" ? [drag.r] : [])].forEach((m) => ctx.fillRect(m.x * c.width, m.y * c.height, m.w * c.width, m.h * c.height));
    const cr = drag && mode === "crop" ? drag.r : crop;
    if (cr) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath(); ctx.rect(0, 0, c.width, c.height);
      ctx.rect(cr.x * c.width, cr.y * c.height, cr.w * c.width, cr.h * c.height);
      ctx.fill("evenodd");
      ctx.strokeStyle = "#A6E4D9"; ctx.lineWidth = 2;
      ctx.strokeRect(cr.x * c.width, cr.y * c.height, cr.w * c.width, cr.h * c.height);
    }
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(keyboardRect.x * c.width, keyboardRect.y * c.height, keyboardRect.w * c.width, keyboardRect.h * c.height);
  }, [bitmap, masks, crop, drag, mode, keyboardRect.x, keyboardRect.y, keyboardRect.w, keyboardRect.h]);

  const pos = (e: React.PointerEvent) => {
    const b = canvasRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
  };
  const rect = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) });

  const apply = (area: Rect) => {
    if (mode === "mask") setMasks((previous) => [...previous, area]);
    else setCrop(area);
  };

  const done = async () => {
    setBusy(true);
    setError(false);
    try { onDone(await processImage(bitmap, crop, masks)); } catch { setError(true); } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pe-title" className="fixed inset-0 z-50 bg-background/95 overflow-y-auto">
      <div className="mx-auto max-w-xl px-5 py-6">
        <h2 id="pe-title" className="mb-2">{tr("Prepare your photo")}</h2>
        <p className="hint mb-4">{tr("Drag over faces, names, number plates or anything identifying to cover it. Photos can reveal who or where you are through what they show, even after technical details are removed.")}</p>
        <div className="flex gap-2 mb-3" role="group" aria-label={tr("Editing tool")}>
          <button className="choice !min-h-11 flex-1 justify-center" aria-pressed={mode === "mask"} onClick={() => setMode("mask")}>{tr("Cover area")}</button>
          <button className="choice !min-h-11 flex-1 justify-center" aria-pressed={mode === "crop"} onClick={() => setMode("crop")}>{tr("Crop")}</button>
        </div>
        <canvas ref={canvasRef} className="w-full rounded-2xl border touch-none cursor-crosshair"
          aria-label={tr("Photo preview. Drag to draw a rectangle.")}
          onPointerDown={(e) => { const p = pos(e); (e.target as Element).setPointerCapture(e.pointerId); setDrag({ x0: p.x, y0: p.y, r: rect(p.x, p.y, p.x, p.y) }); }}
          onPointerMove={(e) => { if (!drag) return; const p = pos(e); setDrag({ ...drag, r: rect(drag.x0, drag.y0, p.x, p.y) }); }}
          onPointerCancel={() => setDrag(null)}
          onPointerUp={() => {
            if (drag && drag.r.w > 0.01 && drag.r.h > 0.01) apply(drag.r);
            setDrag(null);
          }} />
        <div className="flex flex-wrap gap-2 mt-3">
          <button className="btn btn-secondary btn-sm" disabled={!masks.length} onClick={() => setMasks((m) => m.slice(0, -1))}>{tr("Undo cover")}</button>
          <button className="btn btn-secondary btn-sm" disabled={!crop} onClick={() => setCrop(null)}>{tr("Reset crop")}</button>
        </div>
        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          <legend className="label">{tr("Adjust selection using percentages")}</legend>
          {([["x", "Left"], ["y", "Top"], ["w", "Width"], ["h", "Height"]] as const).map(([key, label]) => (
            <label key={key}>{tr(label)} <input className="field" type="number" min={key === "x" || key === "y" ? 0 : 1} max={key === "x" || key === "y" ? 99 : 100} value={selection[key]} onChange={(event) => {
              const position = key === "x" || key === "y";
              const value = Math.max(position ? 0 : 1, Math.min(position ? 99 : 100, Number(event.target.value)));
              setSelection((previous) => ({ ...previous, [key]: value }));
            }} /></label>
          ))}
          <button className="btn btn-secondary" type="button" onClick={() => apply(keyboardRect)}>{tr("Apply selection")}</button>
        </fieldset>
        {error && <p role="alert">{tr("The photo could not be prepared. Please try again.")}</p>}
        <div className="flex gap-3 mt-6">
          <button className="btn btn-secondary" onClick={onCancel}>{tr("Remove photo")}</button>
          <button className="btn btn-primary flex-1" disabled={busy} onClick={done}>{busy ? "Processing…" : "Use this photo"}</button>
        </div>
      </div>
    </div>
  );
}
