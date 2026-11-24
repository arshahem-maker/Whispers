import { createFileRoute } from "@tanstack/react-router";
import { signChallenge, VOICE_POW_BITS } from "@/lib/whispers/voice-challenge";

export const Route = createFileRoute("/api/public/voice-challenge")({
  server: { handlers: { POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) return Response.json({ message: "This request must come from Whispers." }, { status: 403 });
    const secret = process.env["LOVABLE_API_KEY"];
    if (!secret) return Response.json({ message: "Voice reporting is not configured." }, { status: 503 });
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const challenge = `${nonce}.${Date.now() + 5 * 60_000}`;
    return Response.json({ challenge, signature: await signChallenge(secret, challenge), bits: VOICE_POW_BITS }, { headers: { "Cache-Control": "no-store" } });
  } } },
});
