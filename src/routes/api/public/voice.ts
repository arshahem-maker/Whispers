import { createFileRoute } from "@tanstack/react-router";
import { VOICE_MAX_BYTES } from "@/lib/whispers/voice-schema";

export const Route = createFileRoute("/api/public/voice")({
  server: { handlers: { POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) return Response.json({ message: "This request must come from Whispers." }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return Response.json({ message: "An audio upload is required." }, { status: 400 });
    const { processVoice, voiceFailure, VoiceError } = await import("@/lib/whispers/ai/voice.server");
    try {
      const maximum = VOICE_MAX_BYTES + 64 * 1024;
      if (Number(request.headers.get("content-length")) > maximum) throw new VoiceError(413, "Recording is too large.");
      if (!request.body) throw new VoiceError(400, "Recording is missing.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = request.body.getReader();
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length;
        if (size > maximum) { await reader.cancel(); throw new VoiceError(413, "Recording is too large."); }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const form = await new Response(bytes, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
      if (form.get("consent") !== "yes") throw new VoiceError(400, "Consent is required before audio processing.");
      const file = form.get("file");
      if (!(file instanceof File) || file.type !== "audio/wav" || file.size < 2048 || file.size > VOICE_MAX_BYTES) throw new VoiceError(400, "Please send a complete WAV recording.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Hash edge-provided network identity; never persist raw addresses or audio.
      const address = request.headers.get("cf-connecting-ip") ?? "local-preview";
      const secret = process.env['LOVABLE_API_KEY'];
      if (!secret) throw new VoiceError(401, "Voice reporting is not configured.");
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + address));
      const bucket = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
      const { data: permitted, error } = await supabaseAdmin.rpc("reserve_voice_request", { p_bucket: bucket });
      if (error) throw new VoiceError(503, "Unable to check recording limits.");
      if (!permitted) throw new VoiceError(429, "Recording limit reached. Please try later or type your report.");
      const result = await processVoice(file, request);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      const failure = await voiceFailure(error);
      return Response.json({ message: failure.message }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
    }
  } } },
});