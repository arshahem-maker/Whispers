import type { Draft } from "./context";

export const emptyDraft = (): Draft => ({
  text: "",
  category: "not_selected",
  basis: null,
  country: null,
  area: "unknown",
  time: null,
  impacts: [],
  publicPermission: false,
  ack: false,
  photos: [],
});
