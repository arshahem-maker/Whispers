import { useContext, useSyncExternalStore } from "react";
import { WhispersContext } from "./whispers-context";

export function useWhispers() {
  const context = useContext(WhispersContext);
  if (!context) throw new Error("WhispersProvider missing");
  useSyncExternalStore(context.store.subscribe, context.store.getVersion, context.store.getVersion);
  return context;
}
