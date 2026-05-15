import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawSource, formatCompact, hexToRgba } from "./canvas-utils";

export async function renderMetricCard(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 320, h = spec.height ?? 180;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme, { top: 20, right: 20, bottom: 20, left: 20 });
  const { ctx } = cc;

  drawBackground(cc);

  const value = spec.data?.[0] ?? spec.current ?? 0;
  const delta = spec.delta;
  const deltaColor = delta == null ? theme.text_secondary
    : delta >= 0 ? theme.positive : theme.negative;

  // Title
  ctx.font = `500 12px system-ui`;
  ctx.fillStyle = theme.text_secondary;
  ctx.textAlign = "left";
  ctx.fillText(spec.title.toUpperCase(), 20, 38);

  // Main value
  const valStr = formatCompact(value, spec.unit);
  ctx.font = `700 48px "SF Pro Display", system-ui, sans-serif`;
  ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "left";
  ctx.fillText(valStr, 20, 100);

  // Delta
  if (delta != null) {
    const sign = delta >= 0 ? "+" : "";
    const dStr = `${sign}${delta.toFixed(1)}%`;
    ctx.font = `600 14px system-ui`;
    ctx.fillStyle = deltaColor;
    ctx.textAlign = "left";
    ctx.fillText(dStr, 20, 128);

    if (spec.delta_label) {
      ctx.font = `400 11px system-ui`;
      ctx.fillStyle = theme.text_muted;
      const dw = ctx.measureText(dStr).width;
      ctx.fillText(` ${spec.delta_label}`, 20 + dw + 4, 128);
    }

    // Delta indicator stripe
    ctx.fillStyle = hexToRgba(deltaColor, 0.15);
    ctx.beginPath();
    ctx.roundRect(w - 12, 0, 12, h, [0, 16, 16, 0]);
    ctx.fill();
    ctx.fillStyle = deltaColor;
    ctx.fillRect(w - 4, h * 0.3, 4, h * 0.4);
  }

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
