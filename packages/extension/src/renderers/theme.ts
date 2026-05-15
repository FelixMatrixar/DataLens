import type { UVS } from "../types/uvs";

export interface ColorTheme {
  background: string;
  surface: string;
  border: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  accent: string;
  palette: string[];
  grid: string;
  positive: string;
  negative: string;
}

export const THEMES: Record<string, ColorTheme> = {
  dark: {
    background:    "#0B0B0B",
    surface:       "#141414",
    border:        "#2A2A2A",
    text_primary:  "#F0F0F0",
    text_secondary:"#A0A0A0",
    text_muted:    "#555555",
    accent:        "#E50000",
    palette: ["#E50000","#FF6B35","#FFD700","#00D4AA","#4FC3F7","#CE93D8"],
    grid:          "#1E1E1E",
    positive:      "#00D4AA",
    negative:      "#E50000",
  },
  light: {
    background:    "#FAFAFA",
    surface:       "#FFFFFF",
    border:        "#E0E0E0",
    text_primary:  "#111111",
    text_secondary:"#555555",
    text_muted:    "#AAAAAA",
    accent:        "#C00000",
    palette: ["#C00000","#E65C00","#B8860B","#007A5E","#1565C0","#6A1B9A"],
    grid:          "#F0F0F0",
    positive:      "#007A5E",
    negative:      "#C00000",
  },
  midnight: {
    background:    "#05050F",
    surface:       "#0D0D1F",
    border:        "#1A1A3A",
    text_primary:  "#E8E8FF",
    text_secondary:"#8888CC",
    text_muted:    "#333366",
    accent:        "#7C6FFF",
    palette: ["#7C6FFF","#FF6B9D","#00CFFF","#FFD166","#06D6A0","#EF476F"],
    grid:          "#111128",
    positive:      "#06D6A0",
    negative:      "#EF476F",
  },
  amber: {
    background:    "#0F0A00",
    surface:       "#1A1000",
    border:        "#3A2800",
    text_primary:  "#FFE4A0",
    text_secondary:"#CC9933",
    text_muted:    "#664400",
    accent:        "#FF9900",
    palette: ["#FF9900","#FF6600","#FFCC00","#FF3300","#FFAA44","#CC6600"],
    grid:          "#1F1500",
    positive:      "#FFCC00",
    negative:      "#FF3300",
  },
};

export function getTheme(spec: UVS): ColorTheme {
  const base = THEMES[spec.theme ?? "dark"];
  return spec.accent_color ? { ...base, accent: spec.accent_color } : base;
}
