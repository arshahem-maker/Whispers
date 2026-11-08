import { describe, expect, it } from "vitest";
import { applyVoiceDraft, type VoiceResult } from "./voice-schema";
import { emptyDraft } from "./context";
const result: VoiceResult = { language: "Arabic", originalTranscript: "رأيت العيادة مغلقة", englishTranscript: "I saw the clinic closed today in Ukraine.", sounds: [], category: "health", basis: "saw", country: "UA", area: "ua-kyiv", time: "today", impacts: ["healthcare"] };
describe("voice report prefill", () => {
  it("fills the relevant report answers from the English result", () => {
    const draft = applyVoiceDraft(emptyDraft(), result);
    expect(draft.text).toBe("I saw the clinic closed today in Ukraine.");
    expect([draft.category,draft.basis,draft.country,draft.area,draft.time]).toEqual(["health","saw","UA","ua-kyiv","today"]);
    expect(draft.impacts).toEqual(["healthcare"]);
  });
  it("keeps sound observations separate and explicitly uncertain", () => {
    const draft = applyVoiceDraft(emptyDraft(), { ...result, sounds: ["Loud bangs of unknown cause"] });
    expect(draft.text).toBe("I saw the clinic closed today in Ukraine.\n\nUnverified AI sound observations (not proof of their cause):\n• Loud bangs of unknown cause");
  });
  it("never grants report consent or public permission from a recording", () => {
    const draft = applyVoiceDraft({ ...emptyDraft(), ack: true, publicPermission: true }, result);
    expect(draft.ack).toBe(false); expect(draft.publicPermission).toBe(false);
  });
  it("does not infer a pilot location when the language or accent is known", () => {
    const draft = applyVoiceDraft(emptyDraft(), { ...result, country: null, area: "ua-kyiv", basis: null, time: null });
    expect(draft.country).toBe(null); expect(draft.area).toBe("unknown"); expect(draft.basis).toBe(null); expect(draft.time).toBe(null);
  });
});