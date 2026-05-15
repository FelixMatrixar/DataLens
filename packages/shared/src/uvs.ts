export type ChartType =
  | "bar" | "bar_horizontal"
  | "line" | "line_multi" | "area"
  | "metric_card"
  | "donut"
  | "scatter"
  | "text_callout"
  | "comparison_table"
  | "sparkline"
  | "progress_bar"
  | "heatmap"
  | "waterfall"
  | "bullet";

export type Theme = "dark" | "light" | "midnight" | "amber";

export interface SeriesData {
  name: string;
  values: number[];
  color?: string;
}

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export interface UVS {
  type: ChartType;
  title: string;
  labels?: string[];
  data?: number[];
  series?: SeriesData[];
  cells?: HeatmapCell[];
  target?: number;
  current?: number;
  goal?: number;
  subtitle?: string;
  unit?: string;
  delta?: number;
  delta_label?: string;
  quote?: string;
  source?: string;
  theme?: Theme;
  accent_color?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  show_grid?: boolean;
  show_legend?: boolean;
  show_values?: boolean;
}
