import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawSource, formatCompact, hexToRgba } from "./canvas-utils";

export async function renderProgressBar(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 480, h = spec.height ?? 140;
  const theme = getTheme(spec);
  const margin = { top: 44, right: 24, bottom: 28, left: 24 };
  const cc = createCanvas(w, h, theme, margin);
  const { ctx, chartWidth } = cc;

  drawBackground(cc);

  const current = spec.current ?? spec.data?.[0] ?? 0;
  const goal = spec.goal ?? spec.target ?? 100;
  const pct = Math.min(current / goal, 1);

  // Title
  ctx.font = "500 12px system-ui"; ctx.fillStyle = theme.text_secondary;
  ctx.textAlign = "left";
  ctx.fillText(spec.title.toUpperCase(), margin.left, 28);

  // Value label
  ctx.font = `700 22px system-ui`; ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "right";
  ctx.fillText(formatCompact(current, spec.unit), w - margin.right, 28);

  // Track
  const trackY = margin.top + 10, trackH = 16;
  ctx.fillStyle = hexToRgba(theme.accent, 0.15);
  ctx.beginPath(); ctx.roundRect(margin.left, trackY, chartWidth, trackH, trackH / 2); ctx.fill();

  // Fill
  const fillW = pct * chartWidth;
  const grad = ctx.createLinearGradient(margin.left, 0, margin.left + fillW, 0);
  grad.addColorStop(0, theme.accent);
  grad.addColorStop(1, hexToRgba(theme.positive, 0.8));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(margin.left, trackY, fillW, trackH, trackH / 2); ctx.fill();

  // Percentage label
  ctx.font = "600 12px system-ui"; ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(pct * 100)}% of ${formatCompact(goal, spec.unit)}`,
    margin.left + chartWidth / 2, trackY + trackH + 18);

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
