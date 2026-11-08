import { describe, expect, it } from "vitest";
import { isListedLanguage, normaliseLanguage } from "./translate.functions";

describe("translation cost bounds", () => {
  it("lets visitors trigger new translations only for listed languages", () => {
    expect(isListedLanguage("Ukrainian")).toBe(true);
    expect(isListedLanguage("  arabic ")).toBe(true);
    expect(isListedLanguage("Klingon")).toBe(false);
    expect(isListedLanguage("English")).toBe(false);
  });
  it("saves one shared copy per language regardless of spelling case", () => {
    expect(normaliseLanguage(" Haitian   Creole")).toBe("haitian creole");
  });
});
