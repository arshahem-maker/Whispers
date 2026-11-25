import { createContext } from "react";

export const LanguagePickerContext = createContext({
  open: () => {},
  name: "English",
  busy: false,
});
