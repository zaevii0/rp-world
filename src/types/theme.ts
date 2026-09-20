export type ThemeId =
  | "midnight"
  | "rose"
  | "lavender"
  | "ocean"
  | "emerald"
  | "gold"
  | "coquette";

export type Appearance = "dark" | "light" | "system";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  accent: string;
  accentSoft: string;
}

export const themes: ThemeDefinition[] = [
  { id: "midnight", label: "Midnight", accent: "#8f8f98", accentSoft: "rgba(143,143,152,.16)" },
  { id: "rose", label: "Rose", accent: "#e76f9a", accentSoft: "rgba(231,111,154,.16)" },
  { id: "lavender", label: "Lavender", accent: "#9b8cf2", accentSoft: "rgba(155,140,242,.16)" },
  { id: "ocean", label: "Ocean", accent: "#5e9fe8", accentSoft: "rgba(94,159,232,.16)" },
  { id: "emerald", label: "Emerald", accent: "#57b98b", accentSoft: "rgba(87,185,139,.16)" },
  { id: "gold", label: "Gold", accent: "#caa65b", accentSoft: "rgba(202,166,91,.16)" },
  { id: "coquette", label: "Coquette", accent: "#f28bb5", accentSoft: "rgba(242,139,181,.18)" },
];
