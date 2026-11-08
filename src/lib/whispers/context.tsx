import { createContext, useContext, useState, useSyncExternalStore, useCallback, type ReactNode } from "react";
import { WhispersStore } from "./store";
import type { Category, Impact, KnowledgeBasis, TimeBucket } from "./types";

export const DEMO_MODE = true; // Cloud powers interface translation; report intake still uses the demo provider.

export interface ProcessedPhoto {
  id: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  url: string; // object URL of the processed copy
  status: "local" | "sending" | "processed" | "failed";
}

export interface Draft {
  text: string;
  category: Category;
  basis: KnowledgeBasis | null;
  country: string | null; // "UA" | "TD" | "other" | "not_shared"
  area: string; // area id or "unknown"
  time: TimeBucket | null;
  impacts: Impact[];
  publicPermission: boolean;
  ack: boolean;
  photos: ProcessedPhoto[];
}

export const emptyDraft = (): Draft => ({
  text: "", category: "not_selected", basis: null, country: null, area: "unknown", time: null, impacts: [],
  publicPermission: false, ack: false, photos: [],
});

interface Submission { code: string; idempotencyKey: string; accepted: boolean; provider?: "demo" | "pilot" }

interface Ctx {
  store: WhispersStore;
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  submission: Submission | null;
  setSubmission: (s: Submission | null) => void;
  heldCode: string | null; // code held in memory for "Check my report"
  setHeldCode: (c: string | null) => void;
  wipe: () => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

const C = createContext<Ctx | null>(null);

export function WhispersProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new WhispersStore());
  const [draft, setDraftState] = useState<Draft>(emptyDraft);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [heldCode, setHeldCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const setDraft = useCallback((fn: (d: Draft) => Draft) => setDraftState(fn), []);
  const wipe = useCallback(() => {
    setDraftState((d) => { d.photos.forEach((p) => URL.revokeObjectURL(p.url)); return emptyDraft(); });
    setSubmission(null);
    setHeldCode(null);
    setConnected(false);
  }, []);
  return <C.Provider value={{ store, draft, setDraft, submission, setSubmission, heldCode, setHeldCode, wipe, connected, setConnected }}>{children}</C.Provider>;
}

export function useWhispers() {
  const c = useContext(C);
  if (!c) throw new Error("WhispersProvider missing");
  useSyncExternalStore(c.store.subscribe, c.store.getVersion, c.store.getVersion);
  return c;
}
