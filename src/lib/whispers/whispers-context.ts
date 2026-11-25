import { createContext } from "react";
import type { WhispersContextValue } from "./context";

export const WhispersContext = createContext<WhispersContextValue | null>(null);
