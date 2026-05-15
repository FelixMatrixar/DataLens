import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import {
  createCanvas, drawBackground, drawTitle, drawGrid,
  drawXLabels, drawSource, linearScale, bandScale,
  niceTickValues, formatCompact, hexToRgba,
} from "./canvas-utils";

export async function renderBar(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const horizontal = (spec as any)._horizontal === true;

  const margin = horizontal
    ? { top: 52, right: 40, bottom: 24, left: 120 }
    : { top: 52, right: 28, bottom: 44, left: 56 };

  const cc = createCanvas(w, h, theme, margin);
  const { ctx, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const data = spec.data ?? [];
  const labels = spec.labels ?? data.map((_, i) => String(i + 1));
  const max = Math.max(...data, 0);
  const ticks = niceTickValues(0, max, 4);
  const maxTick = Math.max(...ticks);

  if (horizontal) {
    const xScale = linearScale([0, maxTick], [0, chartWidth]);
    const { scale: yPos, bandwidth: bh } = bandScale(labels, [0, chartHeight]);

    // Grid lines (vertical)
    ticks.forEach(tick => {
      const x = margin.left + xScale(tick);
      ctx.beginPath(); ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
      ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + chartHeight); ctx.stroke();
      ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted;
      ctx.textAlign = "center";
      ctx.fillText(formatCompact(tick, spec.unit), x, margin.top + chartHeight + 14);
    });

    data.forEach((v, i) => {
      const y = margin.top + yPos(labels[i]);
      const barW = xScale(v);
      const color = theme.palette[i % theme.palette.length];

      // Gradient
      const grad = ctx.createLinearGradient(margin.left, 0, margin.left + barW, 0);
      grad.addColorStop(0, color);
      grad.addColorStop(1, hexToRgba(color, 0.6));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(margin.left, y, barW, bh, 4);
      ctx.fill();

      // Y-axis labels
      ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary;
      ctx.textAlign = "right";
      ctx.fillText(labels[i], margin.left - 6, y + bh / 2 + 4);

      // Value labels
      if (spec.show_values) {
        ctx.font = "500 10px system-ui"; ctx.fillStyle = theme.text_primary;
        ctx.textAlign = "left";
        ctx.fillText(formatCompact(v, spec.unit), margin.left + barW + 4, y + bh / 2 + 4);
      }
    });
  } else {
    const yScale = linearScale([0, maxTick], [chartHeight, 0]);
    const { scale: xPos, bandwidth: bw } = bandScale(labels, [0, chartWidth]);

    drawGrid(cc, yScale, ticks);

    data.forEach((v, i) => {
      const x = margin.left + xPos(labels[i]);
      const barH = chartHeight - yScale(v);
      const y = margin.top + yScale(v);
      const color = theme.palette[i % theme.palette.length];

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, hexToRgba(color, 0.5));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, barH, [4, 4, 0, 0]);
      ctx.fill();

      if (spec.show_values) {
        ctx.font = "500 10px system-ui"; ctx.fillStyle = theme.text_primary;
        ctx.textAlign = "center";
        ctx.fillText(formatCompact(v, spec.unit), x + bw / 2, y - 4);
      }
    });

    drawXLabels(cc, labels, labels.map(l => xPos(l) + bw / 2));
  }

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
