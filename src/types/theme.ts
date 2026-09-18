export type ThemeId =
  | "black"
  | "midnight"
  | "rose"
  | "lavender"
  | "gold";

export type Appearance = "dark" | "light" | "system";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  accent: string;
  accentSoft: string;
}

export const themes: ThemeDefinition[] = [
  { id: "black", label: "Black", accent: "#8b8b92", accentSoft: "rgba(139,139,146,.16)" },
  { id: "midnight", label: "Midnight", accent: "#777dff", accentSoft: "rgba(119,125,255,.16)" },
  { id: "rose", label: "Rose", accent: "#e76f9a", accentSoft: "rgba(231,111,154,.16)" },
  { id: "lavender", label: "Lavender", accent: "#9b8cf2", accentSoft: "rgba(155,140,242,.16)" },
  { id: "gold", label: "Gold", accent: "#caa65b", accentSoft: "rgba(202,166,91,.16)" },
];
