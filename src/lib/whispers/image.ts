export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 40_000_000;
export const LONGEST_EDGE = 1600;
export const TARGET_BYTES = 1_000_000;

export interface Rect { x: number; y: number; w: number; h: number } // fractions 0..1 of the source

export class ImageError extends Error {}

export async function decodeImage(file: File): Promise<ImageBitmap> {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
    throw new ImageError("HEIC photos aren’t supported yet. Please choose a JPEG, PNG or WebP image.");
  if (!ACCEPTED_TYPES.includes(file.type)) throw new ImageError("Please choose a JPEG, PNG or WebP image.");
  if (file.size > MAX_ORIGINAL_BYTES) throw new ImageError("This photo is too large (over 15 MB).");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("This file couldn’t be read as an image.");
  }
  if (bmp.width * bmp.height > MAX_DECODED_PIXELS) { bmp.close(); throw new ImageError("This photo has too many pixels to process."); }
  return bmp;
}

/** Crop, burn masks into pixels, resize, re-encode as JPEG. Re-encoding through canvas drops embedded metadata. */
export async function processImage(bmp: ImageBitmap, crop: Rect | null, masks: Rect[]) {
  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = c.x * bmp.width, sy = c.y * bmp.height, sw = c.w * bmp.width, sh = c.h * bmp.height;
  const scale = Math.min(1, LONGEST_EDGE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  ctx.fillStyle = "#000";
  for (const m of masks) {
    // masks are in source fractions; map into crop space
    const mx = ((m.x * bmp.width - sx) / sw) * w, my = ((m.y * bmp.height - sy) / sh) * h;
    ctx.fillRect(mx, my, (m.w * bmp.width / sw) * w, (m.h * bmp.height / sh) * h);
  }
  let q = 0.85, blob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= TARGET_BYTES) break;
    q -= 0.12;
  }
  if (!blob) throw new ImageError("The photo couldn’t be processed.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { bytes, width: w, height: h, url: URL.createObjectURL(blob) };
}
