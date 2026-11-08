export interface Country { code: string; name: string; areas: { id: string; name: string }[] }

/** Small bundled pilot dataset. Region lists are partial by design; "other" is always offered. */
export const PILOT_COUNTRIES: Country[] = [
  {
    code: "UA",
    name: "Ukraine",
    areas: [
      { id: "ua-kyiv-city", name: "Kyiv (city)" },
      { id: "ua-kyiv", name: "Kyiv region" },
      { id: "ua-kharkiv", name: "Kharkiv region" },
      { id: "ua-dnipro", name: "Dnipropetrovsk region" },
      { id: "ua-odesa", name: "Odesa region" },
      { id: "ua-lviv", name: "Lviv region" },
    ],
  },
  {
    code: "TD",
    name: "Chad",
    areas: [
      { id: "td-ouaddai", name: "Ouaddaï" },
      { id: "td-sila", name: "Sila" },
      { id: "td-wadifira", name: "Wadi Fira" },
      { id: "td-ennedi-est", name: "Ennedi Est" },
    ],
  },
];

export function countryName(code: string): string {
  if (code === "not_shared") return "Not shared";
  if (code === "other") return "Another country";
  return PILOT_COUNTRIES.find((c) => c.code === code)?.name ?? "Not shared";
}

export function areaName(areaId: string): string | null {
  for (const c of PILOT_COUNTRIES) {
    const a = c.areas.find((x) => x.id === areaId);
    if (a) return a.name;
  }
  return null;
}

export function broadAreaLabel(countryCode: string, areaId: string): string {
  if (countryCode === "not_shared") return "Not shared";
  const a = areaName(areaId);
  return a ? `${a}, ${countryName(countryCode)}` : countryName(countryCode);
}

export function workspaceFor(countryCode: string): string {
  if (countryCode === "UA") return "ua";
  if (countryCode === "TD") return "td";
  return "general";
}

export const WORKSPACE_LABEL: Record<string, string> = {
  ua: "Ukraine (demo context)",
  td: "Eastern Chad (demo context)",
  general: "Unspecified location",
};
