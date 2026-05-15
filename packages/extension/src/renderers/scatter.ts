import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import {
  createCanvas, drawBackground, drawTitle, drawSource,
  linearScale, niceTickValues, formatCompact,
} from "./canvas-utils";

export async function renderScatter(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme);
  const { ctx, margin, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const series = spec.series ?? [];
  const allX: number[] = [], allY: number[] = [];
  series.forEach(s => {
    s.values.forEach((v, i) => {
      if (i % 2 === 0) allX.push(v);
      else allY.push(v);
    });
  });

  const xMax = Math.max(...allX, 1);
  const yMax = Math.max(...allY, 1);
  const xTicks = niceTickValues(0, xMax, 4);
  const yTicks = niceTickValues(0, yMax, 4);

  const xScale = linearScale([0, Math.max(...xTicks)], [0, chartWidth]);
  const yScale = linearScale([0, Math.max(...yTicks)], [chartHeight, 0]);

  // Grid
  yTicks.forEach(tick => {
    const y = margin.top + yScale(tick);
    ctx.beginPath(); ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartWidth, y); ctx.stroke();
    ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted; ctx.textAlign = "right";
    ctx.fillText(formatCompact(tick), margin.left - 5, y + 3);
  });
  xTicks.forEach(tick => {
    const x = margin.left + xScale(tick);
    ctx.beginPath(); ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + chartHeight); ctx.stroke();
    ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted; ctx.textAlign = "center";
    ctx.fillText(formatCompact(tick), x, margin.top + chartHeight + 14);
  });

  // Scatter points + regression per series
  series.forEach((s, si) => {
    const color = s.color ?? theme.palette[si % theme.palette.length];
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < s.values.length; i += 2) {
      pts.push([s.values[i], s.values[i + 1]]);
    }

    pts.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(
        margin.left + xScale(x),
        margin.top + yScale(y),
        5, 0, Math.PI * 2
      );
      ctx.fillStyle = color + "CC";
      ctx.fill();
    });

    // Linear regression
    if (pts.length > 1) {
      const n = pts.length;
      const sumX = pts.reduce((a, p) => a + p[0], 0);
      const sumY = pts.reduce((a, p) => a + p[1], 0);
      const sumXY = pts.reduce((a, p) => a + p[0] * p[1], 0);
      const sumXX = pts.reduce((a, p) => a + p[0] * p[0], 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
      const intercept = (sumY - slope * sumX) / n;

      const x1 = 0, y1 = intercept;
      const x2 = Math.max(...xTicks), y2 = slope * x2 + intercept;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.moveTo(margin.left + xScale(x1), margin.top + yScale(y1));
      ctx.lineTo(margin.left + xScale(x2), margin.top + yScale(y2));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
