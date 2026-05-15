import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawSource, formatCompact } from "./canvas-utils";

export async function renderDonut(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 480, h = spec.height ?? 300;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme, { top: 52, right: 160, bottom: 24, left: 24 });
  const { ctx, margin } = cc;

  drawBackground(cc);

  const data = spec.data ?? [];
  const labels = spec.labels ?? data.map((_, i) => `Slice ${i + 1}`);
  const total = data.reduce((a, b) => a + b, 0) || 1;

  const cx = (w - margin.right) / 2;
  const cy = margin.top + (h - margin.top - margin.bottom) / 2;
  const outerR = Math.min(cx - margin.left, (h - margin.top - margin.bottom) / 2) - 4;
  const innerR = outerR * 0.55;

  let angle = -Math.PI / 2;
  data.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    const color = theme.palette[i % theme.palette.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Percentage label on large slices
    if (v / total > 0.05) {
      const mid = angle + slice / 2;
      const lr = (outerR + innerR) / 2;
      const lx = cx + Math.cos(mid) * lr;
      const ly = cy + Math.sin(mid) * lr;
      ctx.font = "600 11px system-ui";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(v / total * 100)}%`, lx, ly);
      ctx.textBaseline = "alphabetic";
    }

    angle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = theme.background;
  ctx.fill();

  // Center label
  ctx.font = `700 22px system-ui`;
  ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatCompact(total, spec.unit), cx, cy);
  ctx.textBaseline = "alphabetic";

  // Title
  ctx.font = "600 15px system-ui"; ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "left";
  ctx.fillText(spec.title, margin.left, 28);

  // Legend (right side)
  const legendX = w - margin.right + 12;
  labels.forEach((label, i) => {
    const ly = margin.top + i * 22;
    ctx.fillStyle = theme.palette[i % theme.palette.length];
    ctx.beginPath();
    ctx.roundRect(legendX, ly, 10, 10, 2);
    ctx.fill();
    ctx.font = "400 11px system-ui";
    ctx.fillStyle = theme.text_secondary;
    ctx.textAlign = "left";
    ctx.fillText(label, legendX + 14, ly + 9);
  });

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
