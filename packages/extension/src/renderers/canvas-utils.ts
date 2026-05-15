import type { ColorTheme } from "./theme";

export interface CanvasContext {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  theme: ColorTheme;
  margin: { top: number; right: number; bottom: number; left: number };
  chartWidth: number;
  chartHeight: number;
}

export function createCanvas(
  width: number,
  height: number,
  theme: ColorTheme,
  margin = { top: 52, right: 28, bottom: 44, left: 56 }
): CanvasContext {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  return {
    canvas, ctx, width, height, theme, margin,
    chartWidth:  width  - margin.left - margin.right,
    chartHeight: height - margin.top  - margin.bottom,
  };
}

export function drawBackground(cc: CanvasContext, radius = 16) {
  const { ctx, width, height, theme } = cc;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fillStyle = theme.background;
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawTitle(cc: CanvasContext, title: string, subtitle?: string) {
  const { ctx, theme } = cc;
  ctx.textAlign = "left";
  ctx.font = `600 15px "SF Pro Display", system-ui, sans-serif`;
  ctx.fillStyle = theme.text_primary;
  ctx.fillText(title, cc.margin.left, 28);
  if (subtitle) {
    ctx.font = `400 11px "SF Pro Text", system-ui, sans-serif`;
    ctx.fillStyle = theme.text_secondary;
    ctx.fillText(subtitle, cc.margin.left, 42);
  }
}

export function drawGrid(
  cc: CanvasContext,
  yScale: (v: number) => number,
  ticks: number[]
) {
  const { ctx, margin, chartWidth, theme } = cc;
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ticks.forEach(tick => {
    const y = margin.top + yScale(tick);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();
    ctx.font = "400 10px system-ui";
    ctx.fillStyle = theme.text_muted;
    ctx.textAlign = "right";
    ctx.fillText(formatCompact(tick), margin.left - 6, y + 3.5);
  });
}

export function drawXLabels(
  cc: CanvasContext,
  labels: string[],
  xPositions: number[]
) {
  const { ctx, margin, height, theme } = cc;
  ctx.font = "400 10px system-ui";
  ctx.fillStyle = theme.text_secondary;
  ctx.textAlign = "center";
  labels.forEach((l, i) =>
    ctx.fillText(l, margin.left + xPositions[i], height - margin.bottom + 14)
  );
}

export function drawSource(cc: CanvasContext, source: string) {
  const { ctx, width, height, theme } = cc;
  ctx.font = "400 9px system-ui";
  ctx.fillStyle = theme.text_muted;
  ctx.textAlign = "right";
  ctx.fillText(`Source: ${source}`, width - 12, height - 6);
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain, [r0, r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

export function bandScale(
  cats: string[],
  range: [number, number],
  padding = 0.25
) {
  const step = (range[1] - range[0]) / cats.length;
  const bw = step * (1 - padding);
  const off = (step - bw) / 2;
  const map = new Map(cats.map((c, i) => [c, range[0] + i * step + off]));
  return { scale: (c: string) => map.get(c) ?? 0, bandwidth: bw };
}

export function niceTickValues(
  min: number,
  max: number,
  count: number
): number[] {
  const step = Math.ceil(max / count / 10) * 10 || 1;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(min + i * step))
    .filter(v => v <= max * 1.1);
}

export function formatCompact(v: number, unit?: string): string {
  const a = Math.abs(v);
  let s = a >= 1e9 ? (v / 1e9).toFixed(1) + "B"
        : a >= 1e6 ? (v / 1e6).toFixed(1) + "M"
        : a >= 1e3 ? (v / 1e3).toFixed(1) + "K"
        : v.toLocaleString();
  return unit ? `${unit}${s}` : s;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
