import { describe, expect, it } from "vitest";
import { isListedLanguage, normaliseLanguage } from "./language-utils";

describe("translation cost bounds", () => {
  it("recognizes the reviewed list of languages without enabling a translation provider", () => {
    expect(isListedLanguage("Ukrainian")).toBe(true);
    expect(isListedLanguage("  arabic ")).toBe(true);
    expect(isListedLanguage("Klingon")).toBe(false);
    expect(isListedLanguage("English")).toBe(false);
  });
  it("saves one shared copy per language regardless of spelling case", () => {
    expect(normaliseLanguage(" Haitian   Creole")).toBe("haitian creole");
  });
});
