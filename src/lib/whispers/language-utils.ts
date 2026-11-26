import { PRIORITY_LANGUAGES } from "./languages";

export function normaliseLanguage(language: string) {
  return language.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isListedLanguage(language: string) {
  const normalised = normaliseLanguage(language);
  return PRIORITY_LANGUAGES.some(
    (languageOption) => languageOption.code !== "en" && languageOption.name.toLowerCase() === normalised,
  );
}
