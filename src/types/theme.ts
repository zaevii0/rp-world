export type ThemeId =
  | "midnight"
  | "black"
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
  { id: "midnight", label: "⚫ Midnight", accent: "#8f8f98", accentSoft: "rgba(143,143,152,.16)" },
  { id: "black", label: "⬛ Black", accent: "#000000", accentSoft: "rgba(0,0,0,.16)" },
  { id: "rose", label: "🔴 Red", accent: "#d7263d", accentSoft: "rgba(215,38,61,.16)" },
  { id: "lavender", label: "💜 Lavender", accent: "#9b8cf2", accentSoft: "rgba(155,140,242,.16)" },
  { id: "ocean", label: "🌊 Ocean", accent: "#5e9fe8", accentSoft: "rgba(94,159,232,.16)" },
  { id: "emerald", label: "💚 Emerald", accent: "#57b98b", accentSoft: "rgba(87,185,139,.16)" },
  { id: "gold", label: "☕ Mocha", accent: "#9B7253", accentSoft: "rgba(155,114,83,.18)" },
  { id: "coquette", label: "🎀 Coquette", accent: "#f28bb5", accentSoft: "rgba(242,139,181,.18)" },
];
