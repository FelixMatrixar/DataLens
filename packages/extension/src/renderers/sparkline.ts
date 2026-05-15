import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, linearScale, hexToRgba } from "./canvas-utils";

export async function renderSparkline(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 200, h = spec.height ?? 80;
  const theme = getTheme(spec);
  const margin = { top: 24, right: 12, bottom: 8, left: 12 };
  const cc = createCanvas(w, h, theme, margin);
  const { ctx, chartWidth, chartHeight } = cc;

  drawBackground(cc);

  // Title
  ctx.font = "500 11px system-ui"; ctx.fillStyle = theme.text_secondary;
  ctx.textAlign = "left";
  ctx.fillText(spec.title, margin.left, 16);

  const data = spec.data ?? [];
  if (data.length < 2) return cc.canvas;

  const min = Math.min(...data);
  const max = Math.max(...data, min + 1);
  const xStep = chartWidth / (data.length - 1);
  const yScale = linearScale([min, max], [chartHeight, 0]);

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = margin.left + i * xStep;
    const y = margin.top + yScale(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  const lastX = margin.left + (data.length - 1) * xStep;
  ctx.lineTo(lastX, margin.top + chartHeight);
  ctx.lineTo(margin.left, margin.top + chartHeight);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartHeight);
  grad.addColorStop(0, hexToRgba(theme.accent, 0.4));
  grad.addColorStop(1, hexToRgba(theme.accent, 0.02));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = margin.left + i * xStep;
    const y = margin.top + yScale(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  return cc.canvas;
}
