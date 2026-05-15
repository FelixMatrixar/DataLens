import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawTitle, drawSource, hexToRgba } from "./canvas-utils";

export async function renderHeatmap(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme, { top: 52, right: 20, bottom: 40, left: 80 });
  const { ctx, margin, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const cells = spec.cells ?? [];
  const rows = [...new Set(cells.map(c => c.row))];
  const cols = [...new Set(cells.map(c => c.col))];
  const max = Math.max(...cells.map(c => c.value), 1);

  const cellW = chartWidth / cols.length;
  const cellH = chartHeight / rows.length;

  cells.forEach(({ row, col, value }) => {
    const ri = rows.indexOf(row), ci = cols.indexOf(col);
    const x = margin.left + ci * cellW;
    const y = margin.top + ri * cellH;
    const intensity = value / max;

    ctx.fillStyle = hexToRgba(theme.accent, 0.1 + intensity * 0.85);
    ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

    if (cellW > 30) {
      ctx.font = "400 9px system-ui";
      ctx.fillStyle = intensity > 0.6 ? "#fff" : theme.text_muted;
      ctx.textAlign = "center";
      ctx.fillText(String(value), x + cellW / 2, y + cellH / 2 + 3);
    }
  });

  // Row labels
  rows.forEach((row, i) => {
    ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary;
    ctx.textAlign = "right";
    ctx.fillText(row, margin.left - 6, margin.top + i * cellH + cellH / 2 + 4);
  });

  // Col labels
  cols.forEach((col, i) => {
    ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary;
    ctx.textAlign = "center";
    ctx.fillText(col, margin.left + i * cellW + cellW / 2, margin.top + chartHeight + 14);
  });

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
