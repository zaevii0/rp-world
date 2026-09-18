export type ThemeId =
  | "black"
  | "white"
  | "midnight"
  | "rose"
  | "blush"
  | "lavender"
  | "ocean"
  | "emerald"
  | "sage"
  | "gold"
  | "champagne"
  | "peach"
  | "coral"
  | "sky"
  | "mint"
  | "plum";

export type Appearance = "dark" | "light" | "system";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  accent: string;
  accentSoft: string;
}

export const themes: ThemeDefinition[] = [
  { id: "black", label: "Black", accent: "#8b8b92", accentSoft: "rgba(139,139,146,.16)" },
  { id: "white", label: "White", accent: "#5f6368", accentSoft: "rgba(95,99,104,.13)" },
  { id: "midnight", label: "Midnight", accent: "#777dff", accentSoft: "rgba(119,125,255,.16)" },
  { id: "rose", label: "Rose", accent: "#e76f9a", accentSoft: "rgba(231,111,154,.16)" },
  { id: "blush", label: "Blush", accent: "#f0a6c1", accentSoft: "rgba(240,166,193,.17)" },
  { id: "lavender", label: "Lavender", accent: "#9b8cf2", accentSoft: "rgba(155,140,242,.16)" },
  { id: "ocean", label: "Ocean", accent: "#5e9fe8", accentSoft: "rgba(94,159,232,.16)" },
  { id: "emerald", label: "Emerald", accent: "#57b98b", accentSoft: "rgba(87,185,139,.16)" },
  { id: "sage", label: "Sage", accent: "#8fae91", accentSoft: "rgba(143,174,145,.16)" },
  { id: "gold", label: "Gold", accent: "#caa65b", accentSoft: "rgba(202,166,91,.16)" },
  { id: "champagne", label: "Champagne", accent: "#d8c19a", accentSoft: "rgba(216,193,154,.18)" },
  { id: "peach", label: "Peach", accent: "#efa77d", accentSoft: "rgba(239,167,125,.17)" },
  { id: "coral", label: "Coral", accent: "#e87972", accentSoft: "rgba(232,121,114,.16)" },
  { id: "sky", label: "Sky", accent: "#78bce8", accentSoft: "rgba(120,188,232,.16)" },
  { id: "mint", label: "Mint", accent: "#75c9ae", accentSoft: "rgba(117,201,174,.16)" },
  { id: "plum", label: "Plum", accent: "#a978b5", accentSoft: "rgba(169,120,181,.16)" },
];
