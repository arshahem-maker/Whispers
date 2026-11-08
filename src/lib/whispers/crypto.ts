const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648 Base32

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** 20 random bytes = 160 bits → 32 Base32 characters. */
export function generatePrivateCode(): string {
  return base32(randomBytes(20));
}

export function groupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

/** Strip spaces/dashes and uppercase. No fuzzy correction of characters. */
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isWellFormedCode(normalized: string): boolean {
  return /^[A-Z2-7]{32}$/.test(normalized);
}

export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buf =
    typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashCode(code: string): Promise<string> {
  return sha256Hex("whispers-receipt-v1:" + normalizeCode(code));
}

export function randomId(prefix: string): string {
  return prefix + "-" + base32(randomBytes(10)).toLowerCase();
}
