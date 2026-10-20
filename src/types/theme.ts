export type ThemeId =
  | "black"
  | "emerald"
  | "gold"
  | "coquette"
  | "sage"
  | "oat-milk"
  | "cherry"
  | "plum"
  | "powder-blue"
  | "graphite";

export type Appearance = "dark" | "light" | "system";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  accent: string;
  accentSoft: string;
}

export const themes: ThemeDefinition[] = [
  { id: "black", label: "⬛ Black", accent: "#000000", accentSoft: "rgba(0,0,0,.16)" },
  { id: "sage", label: "🌿 Sage", accent: "#849780", accentSoft: "rgba(132,151,128,.18)" },
  { id: "oat-milk", label: "🥛 Oat Milk", accent: "#B69A78", accentSoft: "rgba(182,154,120,.18)" },
  { id: "cherry", label: "🍒 Cherry", accent: "#B5364B", accentSoft: "rgba(181,54,75,.18)" },
  { id: "plum", label: "🍇 Plum", accent: "#95749A", accentSoft: "rgba(149,116,154,.18)" },
  { id: "powder-blue", label: "🩵 Powder Blue", accent: "#86B6D9", accentSoft: "rgba(134,182,217,.18)" },
  { id: "graphite", label: "🩶 Graphite", accent: "#9298A3", accentSoft: "rgba(146,152,163,.18)" },
  { id: "emerald", label: "💚 Emerald", accent: "#57b98b", accentSoft: "rgba(87,185,139,.16)" },
  { id: "gold", label: "☕ Mocha", accent: "#9B7253", accentSoft: "rgba(155,114,83,.18)" },
  { id: "coquette", label: "🎀 Coquette", accent: "#f28bb5", accentSoft: "rgba(242,139,181,.18)" },
];
