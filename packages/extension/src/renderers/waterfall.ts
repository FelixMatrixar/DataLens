import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import {
  createCanvas, drawBackground, drawTitle, drawSource,
  linearScale, niceTickValues, formatCompact, hexToRgba,
} from "./canvas-utils";

export async function renderWaterfall(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme);
  const { ctx, margin, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const data = spec.data ?? [];
  const labels = spec.labels ?? data.map((_, i) => String(i));

  let running = 0;
  const bars: { start: number; end: number; label: string; v: number }[] = [];
  data.forEach((v, i) => {
    bars.push({ start: running, end: running + v, label: labels[i], v });
    running += v;
  });

  const allVals = bars.flatMap(b => [b.start, b.end]);
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, 0);
  const ticks = niceTickValues(min, max, 4);
  const yScale = linearScale([Math.min(...ticks), Math.max(...ticks)], [chartHeight, 0]);

  const bw = chartWidth / bars.length * 0.65;
  const gap = chartWidth / bars.length;

  // Zero line
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  const zeroY = margin.top + yScale(0);
  ctx.beginPath(); ctx.moveTo(margin.left, zeroY); ctx.lineTo(margin.left + chartWidth, zeroY); ctx.stroke();

  // Ticks
  ticks.forEach(tick => {
    const y = margin.top + yScale(tick);
    ctx.beginPath(); ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartWidth, y); ctx.stroke();
    ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted; ctx.textAlign = "right";
    ctx.fillText(formatCompact(tick, spec.unit), margin.left - 5, y + 3);
  });

  bars.forEach((bar, i) => {
    const x = margin.left + i * gap + (gap - bw) / 2;
    const y1 = margin.top + yScale(bar.start);
    const y2 = margin.top + yScale(bar.end);
    const top = Math.min(y1, y2), barH = Math.abs(y1 - y2) || 2;
    const positive = bar.v >= 0;
    const color = positive ? theme.positive : theme.negative;

    ctx.fillStyle = hexToRgba(color, 0.85);
    ctx.beginPath(); ctx.roundRect(x, top, bw, barH, [4, 4, 0, 0]); ctx.fill();

    // Connector
    if (i < bars.length - 1) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = theme.text_muted; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + bw, margin.top + yScale(bar.end));
      ctx.lineTo(x + gap, margin.top + yScale(bar.end));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Value label
    ctx.font = "500 10px system-ui"; ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(
      formatCompact(bar.v, spec.unit),
      x + bw / 2,
      positive ? top - 4 : top + barH + 12
    );

    // X label
    ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary;
    ctx.textAlign = "center";
    ctx.fillText(bar.label, x + bw / 2, margin.top + chartHeight + 14);
  });

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
