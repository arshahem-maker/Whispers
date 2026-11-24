// Proof-of-work gate for anonymous voice processing: browser-safe helpers.
export const VOICE_POW_BITS = 20;
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");

export async function powOk(challenge: string, counter: string, bits = VOICE_POW_BITS) {
  if (!/^\d{1,12}$/.test(counter)) return false;
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${challenge}:${counter}`)));
  let left = bits;
  for (const byte of h) {
    if (left <= 0) return true;
    if (left >= 8) { if (byte !== 0) return false; left -= 8; }
    else return (byte >> (8 - left)) === 0;
  }
  return left <= 0;
}

export async function solvePow(challenge: string, signal?: AbortSignal) {
  for (let i = 0; ; i++) {
    if (await powOk(challenge, String(i))) return String(i);
    if (i % 2000 === 0) { if (signal?.aborted) throw new DOMException("Aborted", "AbortError"); await new Promise((r) => setTimeout(r, 0)); }
  }
}

export async function signChallenge(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`voice-pow:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
