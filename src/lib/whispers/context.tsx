import { useState, useCallback, type ReactNode } from "react";
import { WhispersStore } from "./store";
import type { Category, Impact, KnowledgeBasis, TimeBucket } from "./types";
import { emptyDraft } from "./draft";
import { WhispersContext } from "./whispers-context";

// This app keeps its local fictional demonstration available in every build.
// The separate connected staff workspace must not inherit fake role controls.
export const DEMO_MODE = true;
export const DEMO_CONTROLS_ENABLED = import.meta.env["VITE_WHISPERS_REVIEWER_BACKEND"] !== "neon";

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

interface Submission { code: string; idempotencyKey: string; accepted: boolean; provider?: "demo" | "pilot" }

export interface WhispersContextValue {
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
  return <WhispersContext.Provider value={{ store, draft, setDraft, submission, setSubmission, heldCode, setHeldCode, wipe, connected, setConnected }}>{children}</WhispersContext.Provider>;
}
