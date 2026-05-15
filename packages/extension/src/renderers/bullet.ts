import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawSource, formatCompact, hexToRgba } from "./canvas-utils";

export async function renderBullet(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 480, h = spec.height ?? 140;
  const theme = getTheme(spec);
  const margin = { top: 44, right: 60, bottom: 28, left: 24 };
  const cc = createCanvas(w, h, theme, margin);
  const { ctx, chartWidth } = cc;

  drawBackground(cc);

  const current = spec.current ?? 0;
  const target = spec.target ?? 100;
  const max = target * 1.25;

  const xScale = (v: number) => (v / max) * chartWidth;

  // Title
  ctx.font = "500 12px system-ui"; ctx.fillStyle = theme.text_secondary;
  ctx.textAlign = "left";
  ctx.fillText(spec.title.toUpperCase(), margin.left, 28);

  const trackY = margin.top + 8, trackH = 20;

  // Qualitative bands (poor / satisfactory / good) via alpha
  [[0, 0.5, 0.12], [0.5, 0.75, 0.2], [0.75, 1.0, 0.3]].forEach(([s, e, a]) => {
    ctx.fillStyle = hexToRgba(theme.accent, a);
    ctx.fillRect(margin.left + xScale(s * max), trackY, xScale((e - s) * max), trackH);
  });

  // Actual bar (narrower, centered)
  const barH = trackH * 0.5, barY = trackY + (trackH - barH) / 2;
  ctx.fillStyle = theme.text_primary;
  ctx.fillRect(margin.left, barY, xScale(current), barH);

  // Target marker
  const tx = margin.left + xScale(target);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(tx - 2, trackY - 4, 4, trackH + 8);

  // Labels
  ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted;
  ctx.textAlign = "center";
  ctx.fillText(formatCompact(target, spec.unit), tx, trackY + trackH + 14);
  ctx.fillText("Target", tx, trackY + trackH + 24);

  ctx.font = "600 18px system-ui"; ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "right";
  ctx.fillText(formatCompact(current, spec.unit), w - margin.right + 50, trackY + trackH - 2);

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
