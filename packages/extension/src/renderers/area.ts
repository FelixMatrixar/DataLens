import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import {
  createCanvas, drawBackground, drawTitle, drawGrid,
  drawXLabels, drawSource, linearScale, niceTickValues, hexToRgba,
} from "./canvas-utils";

export async function renderArea(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme);
  const { ctx, margin, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const data = spec.data ?? [];
  const labels = spec.labels ?? data.map((_, i) => String(i + 1));
  const max = Math.max(...data, 0);
  const ticks = niceTickValues(0, max, 4);
  const maxTick = Math.max(...ticks);

  const yScale = linearScale([0, maxTick], [chartHeight, 0]);
  const xStep = chartWidth / Math.max(labels.length - 1, 1);

  drawGrid(cc, yScale, ticks);
  drawXLabels(cc, labels, labels.map((_, i) => i * xStep));

  // Area fill
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = margin.left + i * xStep;
    const y = margin.top + yScale(v);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const px = margin.left + (i - 1) * xStep;
      const py = margin.top + yScale(data[i - 1]);
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  const lastX = margin.left + (data.length - 1) * xStep;
  ctx.lineTo(lastX, margin.top + chartHeight);
  ctx.lineTo(margin.left, margin.top + chartHeight);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartHeight);
  grad.addColorStop(0, hexToRgba(theme.accent, 0.45));
  grad.addColorStop(1, hexToRgba(theme.accent, 0.02));
  ctx.fillStyle = grad;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  data.forEach((v, i) => {
    const x = margin.left + i * xStep;
    const y = margin.top + yScale(v);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const px = margin.left + (i - 1) * xStep;
      const py = margin.top + yScale(data[i - 1]);
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  ctx.stroke();

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
