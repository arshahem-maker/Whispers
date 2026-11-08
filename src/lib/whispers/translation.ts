import { useSyncExternalStore } from "react";

let phrases: Record<string, string> = {};
let version = 0;
const listeners = new Set<() => void>();
export function tr(text: string | undefined): string {
  return text === undefined ? "" : phrases[text] ?? text;
}
export function installTranslations(next: Record<string, string>) {
  phrases = next;
  version += 1;
  listeners.forEach((listener) => listener());
}
export function useTranslationVersion() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => version, () => 0);
}