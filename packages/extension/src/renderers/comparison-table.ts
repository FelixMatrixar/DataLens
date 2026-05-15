import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawTitle, drawSource, formatCompact, hexToRgba } from "./canvas-utils";

export async function renderComparisonTable(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme, { top: 52, right: 20, bottom: 20, left: 20 });
  const { ctx, margin } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const series = spec.series ?? [];
  const labels = spec.labels ?? [];
  const rowH = Math.min(36, (h - margin.top - margin.bottom) / Math.max(labels.length, 1));
  const col1W = 160, col2W = 100, col3W = 100, col4W = 120;

  // Header
  ctx.font = "500 11px system-ui"; ctx.fillStyle = theme.text_muted;
  ctx.textAlign = "left";
  ctx.fillText("METRIC", margin.left + 8, margin.top + 14);
  ctx.textAlign = "right";
  ctx.fillText("BEFORE", margin.left + col1W + col2W - 8, margin.top + 14);
  ctx.fillText("AFTER", margin.left + col1W + col2W + col3W - 8, margin.top + 14);
  ctx.fillText("CHANGE", margin.left + col1W + col2W + col3W + col4W - 8, margin.top + 14);

  labels.forEach((label, i) => {
    const y = margin.top + 24 + i * rowH;

    // Alternating row background
    if (i % 2 === 0) {
      ctx.fillStyle = hexToRgba(theme.surface, 0.6);
      ctx.fillRect(margin.left, y, w - margin.left - margin.right, rowH);
    }

    ctx.font = "400 12px system-ui"; ctx.fillStyle = theme.text_primary;
    ctx.textAlign = "left";
    ctx.fillText(label, margin.left + 8, y + rowH / 2 + 4);

    if (series[0]?.values[i] != null) {
      ctx.textAlign = "right"; ctx.fillStyle = theme.text_secondary;
      ctx.fillText(
        formatCompact(series[0].values[i], spec.unit),
        margin.left + col1W + col2W - 8, y + rowH / 2 + 4
      );
    }
    if (series[1]?.values[i] != null) {
      ctx.textAlign = "right"; ctx.fillStyle = theme.text_primary;
      ctx.fillText(
        formatCompact(series[1].values[i], spec.unit),
        margin.left + col1W + col2W + col3W - 8, y + rowH / 2 + 4
      );
    }

    // Delta pill
    if (series[0]?.values[i] != null && series[1]?.values[i] != null) {
      const before = series[0].values[i];
      const after = series[1].values[i];
      const pct = before !== 0 ? ((after - before) / before) * 100 : 0;
      const positive = pct >= 0;
      const pillColor = positive ? theme.positive : theme.negative;
      const pillText = `${positive ? "+" : ""}${pct.toFixed(1)}%`;

      const px = margin.left + col1W + col2W + col3W + 8;
      const pw = col4W - 16;
      const ph = rowH * 0.55;
      const py = y + (rowH - ph) / 2;

      ctx.fillStyle = hexToRgba(pillColor, 0.18);
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
      ctx.font = "600 11px system-ui"; ctx.fillStyle = pillColor;
      ctx.textAlign = "center";
      ctx.fillText(pillText, px + pw / 2, py + ph * 0.72);
    }
  });

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
